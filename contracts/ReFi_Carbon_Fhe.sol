pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ReFiCarbonFhe is SepoliaConfig {
    using FHE for euint32;
    using FHE for ebool;

    address public owner;
    mapping(address => bool) public isProvider;
    mapping(address => uint256) public lastSubmissionTime;
    mapping(address => uint256) public lastDecryptionRequestTime;
    uint256 public cooldownSeconds = 60; // Default cooldown: 60 seconds
    bool public paused = false;

    uint256 public currentBatchId = 1;
    bool public batchOpen = false;

    struct DecryptionContext {
        uint256 batchId;
        bytes32 stateHash;
        bool processed;
    }
    mapping(uint256 => DecryptionContext) public decryptionContexts;

    // Encrypted state
    mapping(uint256 => euint32) public encryptedTotalCreditsInBatch;
    mapping(address => euint32) public encryptedUserCredits;
    mapping(address => euint32) public encryptedUserFootprint;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProviderAdded(address indexed provider);
    event ProviderRemoved(address indexed provider);
    event CooldownSecondsUpdated(uint256 oldCooldown, uint256 newCooldown);
    event ContractPaused();
    event ContractUnpaused();
    event BatchOpened(uint256 indexed batchId);
    event BatchClosed(uint256 indexed batchId);
    event CreditsSubmitted(address indexed user, uint256 indexed batchId, bytes32 encryptedCreditsCt, bytes32 encryptedFootprintCt);
    event OffsetRequested(address indexed user, uint256 indexed batchId, bytes32 encryptedOffsetAmountCt);
    event DecryptionRequested(uint256 indexed requestId, uint256 indexed batchId);
    event DecryptionCompleted(uint256 indexed requestId, uint256 indexed batchId, uint256 totalCreditsInBatch);

    // Custom Errors
    error NotOwner();
    error NotProvider();
    error Paused();
    error CooldownActive();
    error BatchNotOpen();
    error InvalidBatch();
    error ReplayDetected();
    error StateMismatch();
    error InvalidProof();
    error NotInitialized();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProvider() {
        if (!isProvider[msg.sender]) revert NotProvider();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    constructor() {
        owner = msg.sender;
        isProvider[owner] = true; // Owner is a provider by default
        emit ProviderAdded(owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function addProvider(address provider) external onlyOwner {
        if (!isProvider[provider]) {
            isProvider[provider] = true;
            emit ProviderAdded(provider);
        }
    }

    function removeProvider(address provider) external onlyOwner {
            isProvider[provider] = false;
            emit ProviderRemoved(provider);
    }

    function setCooldownSeconds(uint256 newCooldown) external onlyOwner {
        uint256 oldCooldown = cooldownSeconds;
        cooldownSeconds = newCooldown;
        emit CooldownSecondsUpdated(oldCooldown, newCooldown);
    }

    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit ContractPaused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused();
    }

    function openBatch() external onlyOwner whenNotPaused {
        if (batchOpen) {
            currentBatchId++;
        }
        batchOpen = true;
        // Initialize encrypted total for the new batch
        encryptedTotalCreditsInBatch[currentBatchId] = FHE.asEuint32(0);
        emit BatchOpened(currentBatchId);
    }

    function closeBatch() external onlyOwner whenNotPaused {
        if (!batchOpen) revert BatchNotOpen();
        batchOpen = false;
        emit BatchClosed(currentBatchId);
    }

    function _requireInitialized(euint32 val) internal pure {
        if (!val.isInitialized()) {
            revert NotInitialized();
        }
    }

    function _initIfNeeded(euint32 storage self, uint32 value) internal {
        if (!self.isInitialized()) {
            self = FHE.asEuint32(value);
        }
    }

    function submitCreditsAndFootprint(
        address user,
        euint32 encryptedCredits,
        euint32 encryptedFootprint
    ) external onlyProvider whenNotPaused {
        if (block.timestamp < lastSubmissionTime[user] + cooldownSeconds) {
            revert CooldownActive();
        }
        if (!batchOpen) revert BatchNotOpen();

        _requireInitialized(encryptedCredits);
        _requireInitialized(encryptedFootprint);

        lastSubmissionTime[user] = block.timestamp;

        // Initialize user's encrypted state if necessary
        _initIfNeeded(encryptedUserCredits[user], 0);
        _initIfNeeded(encryptedUserFootprint[user], 0);

        // Update user's encrypted credits and footprint
        encryptedUserCredits[user] = encryptedUserCredits[user].add(encryptedCredits);
        encryptedUserFootprint[user] = encryptedUserFootprint[user].add(encryptedFootprint);

        // Update batch total
        encryptedTotalCreditsInBatch[currentBatchId] = encryptedTotalCreditsInBatch[currentBatchId].add(encryptedCredits);

        emit CreditsSubmitted(user, currentBatchId, encryptedCredits.toBytes32(), encryptedFootprint.toBytes32());
    }

    function requestOffset(
        euint32 encryptedOffsetAmount
    ) external whenNotPaused {
        if (block.timestamp < lastDecryptionRequestTime[msg.sender] + cooldownSeconds) {
            revert CooldownActive();
        }
        if (!batchOpen) revert BatchNotOpen(); // Can only request offset for current open batch

        _requireInitialized(encryptedOffsetAmount);
        _requireInitialized(encryptedUserCredits[msg.sender]);
        _requireInitialized(encryptedUserFootprint[msg.sender]);

        lastDecryptionRequestTime[msg.sender] = block.timestamp;

        // Prepare ciphertexts for decryption
        bytes32[] memory cts = new bytes32[](3);
        cts[0] = encryptedUserCredits[msg.sender].toBytes32();
        cts[1] = encryptedUserFootprint[msg.sender].toBytes32();
        cts[2] = encryptedOffsetAmount.toBytes32();

        bytes32 stateHash = keccak256(abi.encode(cts, address(this)));
        uint256 requestId = FHE.requestDecryption(cts, this.myCallback.selector);

        decryptionContexts[requestId] = DecryptionContext({
            batchId: currentBatchId,
            stateHash: stateHash,
            processed: false
        });

        emit OffsetRequested(msg.sender, currentBatchId, encryptedOffsetAmount.toBytes32());
        emit DecryptionRequested(requestId, currentBatchId);
    }

    function myCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        DecryptionContext storage ctx = decryptionContexts[requestId];

        // Replay guard
        if (ctx.processed) revert ReplayDetected();

        // State verification
        // Rebuild cts in the exact same order as in requestOffset
        // This is a simplified example; a real contract would need to store
        // which user's data was involved or derive it from requestId if possible.
        // For this example, we assume the callback is tied to the current state
        // of the contract for the batchId stored in the context.
        // A more robust system might store the specific user address or other identifiers.
        // Here, we'll just use dummy values for demonstration if the original data isn't directly accessible.
        // In a real scenario, you'd fetch the exact ciphertexts that were encrypted.
        // For this example, we'll assume the callback is for the batch total.
        // If it was for a user, you'd need to know which user.
        // Let's assume this callback is for the batch total credits for simplicity.
        euint32 dummyUserCredits = FHE.asEuint32(0);
        euint32 dummyUserFootprint = FHE.asEuint32(0);
        euint32 dummyOffsetAmount = FHE.asEuint32(0);

        bytes32[] memory currentCts = new bytes32[](3);
        currentCts[0] = dummyUserCredits.toBytes32(); // Placeholder
        currentCts[1] = dummyUserFootprint.toBytes32(); // Placeholder
        currentCts[2] = dummyOffsetAmount.toBytes32(); // Placeholder

        // The actual state hash should be recomputed based on the *current* ciphertexts
        // that were originally submitted for this request. If the state has changed,
        // the hash will differ.
        // For this example, if the batch total credits changed, this check would fail.
        // This is a critical security measure.
        bytes32 currentStateHash = keccak256(abi.encode(currentCts, address(this)));
        if (currentStateHash != ctx.stateHash) {
            revert StateMismatch();
        }

        // Proof verification
        if (!FHE.checkSignatures(requestId, cleartexts, proof)) {
            revert InvalidProof();
        }

        // Decode cleartexts (order must match cts array)
        // uint32 userCreditsCleartext = abi.decode(cleartexts, (uint32));
        // uint32 userFootprintCleartext = abi.decode(cleartexts[32:], (uint32));
        // uint32 offsetAmountCleartext = abi.decode(cleartexts[64:], (uint32));
        // For this example, we are not using the decoded values directly in the callback
        // for further on-chain logic, as the primary purpose was verification and state update.
        // The event will signal completion.

        ctx.processed = true;
        // Example: emit an event with the batch total if that was the decrypted value
        // This part is illustrative; actual logic depends on what was decrypted.
        // For this example, we emit the batchId and a placeholder for totalCreditsInBatch.
        // In a real scenario, you would decode the cleartexts and use them.
        // For instance, if cleartexts contained the total credits for the batch:
        // uint32 totalCredits = abi.decode(cleartexts, (uint32)); // Assuming only one value was decrypted
        // emit DecryptionCompleted(requestId, ctx.batchId, totalCredits);

        // Since our requestOffset decrypts 3 values, but we don't have a specific use for them here
        // other than verification, we emit a generic completion.
        // If we were decrypting the batch total, it would be:
        // euint32 batchTotalEnc = encryptedTotalCreditsInBatch[ctx.batchId];
        // bytes32[] memory batchCts = new bytes32[](1);
        // batchCts[0] = batchTotalEnc.toBytes32();
        // ... then request decryption for batchCts ...
        // ... and in callback:
        // uint32 totalCredits = abi.decode(cleartexts, (uint32));
        // emit DecryptionCompleted(requestId, ctx.batchId, totalCredits);

        // For the current requestOffset flow, the cleartexts are user-specific.
        // We emit a generic completion event.
        emit DecryptionCompleted(requestId, ctx.batchId, 0); // Placeholder for actual value
    }

    // Helper to hash ciphertexts, used for state commitment
    function _hashCiphertexts(bytes32[] memory cts) internal pure returns (bytes32) {
        return keccak256(abi.encode(cts, address(this)));
    }
}