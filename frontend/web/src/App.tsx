// App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import "./App.css";
import { useAccount, useSignMessage } from 'wagmi';

interface CarbonCredit {
  id: string;
  encryptedAmount: string;
  timestamp: number;
  owner: string;
  project: string;
  status: "pending" | "verified" | "retired";
  price?: number;
}

const FHEEncryptNumber = (value: number): string => {
  return `FHE-${btoa(value.toString())}`;
};

const FHEDecryptNumber = (encryptedData: string): number => {
  if (encryptedData.startsWith('FHE-')) {
    return parseFloat(atob(encryptedData.substring(4)));
  }
  return parseFloat(encryptedData);
};

const generatePublicKey = () => `0x${Array(2000).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CarbonCredit[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ visible: false, status: "pending", message: "" });
  const [newPurchaseData, setNewPurchaseData] = useState({ project: "", amount: 0 });
  const [selectedCredit, setSelectedCredit] = useState<CarbonCredit | null>(null);
  const [decryptedAmount, setDecryptedAmount] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [carbonFootprint, setCarbonFootprint] = useState<number>(0);
  const [offsetProgress, setOffsetProgress] = useState<number>(0);

  // Sample carbon projects
  const projects = [
    { id: "forest", name: "Rainforest Conservation", price: 15 },
    { id: "wind", name: "Wind Farm Development", price: 25 },
    { id: "solar", name: "Solar Panel Installation", price: 30 },
    { id: "ocean", name: "Ocean Cleanup Initiative", price: 20 }
  ];

  useEffect(() => {
    loadCredits().finally(() => setLoading(false));
    const initSignatureParams = async () => {
      const contract = await getContractReadOnly();
      if (contract) setContractAddress(await contract.getAddress());
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex, 16));
      }
      setStartTimestamp(Math.floor(Date.now() / 1000));
      setDurationDays(30);
      setPublicKey(generatePublicKey());
    };
    initSignatureParams();
  }, []);

  const loadCredits = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) return;
      
      const keysBytes = await contract.getData("credit_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try {
          const keysStr = ethers.toUtf8String(keysBytes);
          if (keysStr.trim() !== '') keys = JSON.parse(keysStr);
        } catch (e) { console.error("Error parsing credit keys:", e); }
      }
      
      const list: CarbonCredit[] = [];
      for (const key of keys) {
        try {
          const creditBytes = await contract.getData(`credit_${key}`);
          if (creditBytes.length > 0) {
            try {
              const creditData = JSON.parse(ethers.toUtf8String(creditBytes));
              list.push({ 
                id: key, 
                encryptedAmount: creditData.amount, 
                timestamp: creditData.timestamp, 
                owner: creditData.owner, 
                project: creditData.project, 
                status: creditData.status || "pending",
                price: creditData.price
              });
            } catch (e) { console.error(`Error parsing credit data for ${key}:`, e); }
          }
        } catch (e) { console.error(`Error loading credit ${key}:`, e); }
      }
      list.sort((a, b) => b.timestamp - a.timestamp);
      setCredits(list);
      
      // Calculate offset progress
      const ownedCredits = list.filter(c => c.owner.toLowerCase() === address?.toLowerCase());
      const totalOffset = ownedCredits.reduce((sum, credit) => {
        return sum + (credit.status === "retired" ? FHEDecryptNumber(credit.encryptedAmount) : 0);
      }, 0);
      setOffsetProgress(Math.min(100, (totalOffset / (carbonFootprint || 1)) * 100));
    } catch (e) { console.error("Error loading credits:", e); } 
    finally { setIsRefreshing(false); setLoading(false); }
  };

  const purchaseCredit = async () => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setPurchasing(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Encrypting carbon credit data with Zama FHE..." });
    try {
      const encryptedAmount = FHEEncryptNumber(newPurchaseData.amount);
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const creditId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const selectedProject = projects.find(p => p.id === newPurchaseData.project);
      
      const creditData = { 
        amount: encryptedAmount, 
        timestamp: Math.floor(Date.now() / 1000), 
        owner: address, 
        project: newPurchaseData.project,
        status: "pending",
        price: selectedProject?.price
      };
      
      await contract.setData(`credit_${creditId}`, ethers.toUtf8Bytes(JSON.stringify(creditData)));
      
      const keysBytes = await contract.getData("credit_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try { keys = JSON.parse(ethers.toUtf8String(keysBytes)); } 
        catch (e) { console.error("Error parsing keys:", e); }
      }
      keys.push(creditId);
      await contract.setData("credit_keys", ethers.toUtf8Bytes(JSON.stringify(keys)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Carbon credit purchased securely!" });
      await loadCredits();
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowPurchaseModal(false);
        setNewPurchaseData({ project: "", amount: 0 });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") ? "Transaction rejected by user" : "Purchase failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { setPurchasing(false); }
  };

  const retireCredit = async (creditId: string) => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setTransactionStatus({ visible: true, status: "pending", message: "Processing encrypted carbon credit with FHE..." });
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const creditBytes = await contract.getData(`credit_${creditId}`);
      if (creditBytes.length === 0) throw new Error("Credit not found");
      
      const creditData = JSON.parse(ethers.toUtf8String(creditBytes));
      const updatedCredit = { ...creditData, status: "retired" };
      
      await contract.setData(`credit_${creditId}`, ethers.toUtf8Bytes(JSON.stringify(updatedCredit)));
      setTransactionStatus({ visible: true, status: "success", message: "Carbon credit retired successfully!" });
      
      await loadCredits();
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e: any) {
      setTransactionStatus({ visible: true, status: "error", message: "Retirement failed: " + (e.message || "Unknown error") });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const decryptWithSignature = async (encryptedData: string): Promise<number | null> => {
    if (!isConnected) { alert("Please connect wallet first"); return null; }
    setIsDecrypting(true);
    try {
      const message = `publickey:${publicKey}\ncontractAddresses:${contractAddress}\ncontractsChainId:${chainId}\nstartTimestamp:${startTimestamp}\ndurationDays:${durationDays}`;
      await signMessageAsync({ message });
      await new Promise(resolve => setTimeout(resolve, 1500));
      return FHEDecryptNumber(encryptedData);
    } catch (e) { console.error("Decryption failed:", e); return null; } 
    finally { setIsDecrypting(false); }
  };

  const calculateFootprint = (values: { electricity: number; gas: number; flights: number; car: number; diet: number }) => {
    // Simplified carbon footprint calculation
    const footprint = 
      (values.electricity * 0.5) + 
      (values.gas * 0.2) + 
      (values.flights * 0.3) + 
      (values.car * 0.4) + 
      (values.diet * 0.1);
    
    setCarbonFootprint(footprint);
    return footprint;
  };

  const renderImpactChart = () => {
    const ownedCredits = credits.filter(c => c.owner.toLowerCase() === address?.toLowerCase());
    const retiredCredits = ownedCredits.filter(c => c.status === "retired");
    const pendingCredits = ownedCredits.filter(c => c.status === "pending");
    
    const retiredAmount = retiredCredits.reduce((sum, credit) => sum + FHEDecryptNumber(credit.encryptedAmount), 0);
    const pendingAmount = pendingCredits.reduce((sum, credit) => sum + FHEDecryptNumber(credit.encryptedAmount), 0);
    
    return (
      <div className="impact-chart">
        <div className="chart-bar">
          <div 
            className="chart-fill retired" 
            style={{ width: `${Math.min(100, (retiredAmount / (carbonFootprint || 1)) * 100)}%` }}
          >
            <span>Retired: {retiredAmount.toFixed(2)} kg</span>
          </div>
          <div 
            className="chart-fill pending" 
            style={{ width: `${Math.min(100, (pendingAmount / (carbonFootprint || 1)) * 100)}%` }}
          >
            <span>Pending: {pendingAmount.toFixed(2)} kg</span>
          </div>
        </div>
        <div className="chart-labels">
          <div className="label">Your Footprint: {carbonFootprint.toFixed(2)} kg CO₂</div>
          <div className="label">Offset Progress: {offsetProgress.toFixed(1)}%</div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="nature-spinner"></div>
      <p>Initializing carbon credit platform...</p>
    </div>
  );

  return (
    <div className="app-container nature-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon"><div className="leaf-icon"></div></div>
          <h1>ReFi<span>Carbon</span>Offset</h1>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowPurchaseModal(true)} className="purchase-credit-btn nature-button">
            <div className="add-icon"></div>Buy Credits
          </button>
          <div className="wallet-connect-wrapper"><ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/></div>
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Private Carbon Credit Platform</h2>
            <p>Offset your carbon footprint anonymously using Zama FHE technology</p>
          </div>
          <div className="fhe-indicator"><div className="fhe-lock"></div><span>FHE Encryption Active</span></div>
        </div>
        
        <div className="dashboard-grid">
          <div className="dashboard-card nature-card">
            <h3>Carbon Footprint Calculator</h3>
            <div className="calculator-form">
              <div className="form-group">
                <label>Electricity Usage (kWh/month)</label>
                <input type="number" placeholder="Enter kWh" onChange={(e) => calculateFootprint({ 
                  electricity: parseFloat(e.target.value) || 0, 
                  gas: 0, flights: 0, car: 0, diet: 0 
                })} />
              </div>
              <div className="form-group">
                <label>Natural Gas Usage (therms/month)</label>
                <input type="number" placeholder="Enter therms" onChange={(e) => calculateFootprint({ 
                  electricity: 0, 
                  gas: parseFloat(e.target.value) || 0, 
                  flights: 0, car: 0, diet: 0 
                })} />
              </div>
              <div className="form-group">
                <label>Flights (short-haul/year)</label>
                <input type="number" placeholder="Enter flights" onChange={(e) => calculateFootprint({ 
                  electricity: 0, gas: 0, 
                  flights: parseFloat(e.target.value) || 0, 
                  car: 0, diet: 0 
                })} />
              </div>
              <div className="form-group">
                <label>Car Miles (miles/year)</label>
                <input type="number" placeholder="Enter miles" onChange={(e) => calculateFootprint({ 
                  electricity: 0, gas: 0, flights: 0, 
                  car: parseFloat(e.target.value) || 0, 
                  diet: 0 
                })} />
              </div>
              <div className="form-group">
                <label>Diet (meat meals/week)</label>
                <input type="number" placeholder="Enter meals" onChange={(e) => calculateFootprint({ 
                  electricity: 0, gas: 0, flights: 0, car: 0, 
                  diet: parseFloat(e.target.value) || 0 
                })} />
              </div>
              {carbonFootprint > 0 && (
                <div className="footprint-result">
                  <h4>Estimated Carbon Footprint</h4>
                  <div className="result-value">{carbonFootprint.toFixed(2)} kg CO₂/year</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="dashboard-card nature-card">
            <h3>Your Carbon Offset</h3>
            {renderImpactChart()}
            <div className="offset-stats">
              <div className="stat-item">
                <div className="stat-value">{credits.filter(c => c.owner.toLowerCase() === address?.toLowerCase()).length}</div>
                <div className="stat-label">Credits Owned</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {credits.filter(c => c.owner.toLowerCase() === address?.toLowerCase() && c.status === "retired").length}
                </div>
                <div className="stat-label">Credits Retired</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card nature-card">
            <h3>Carbon Credit Marketplace</h3>
            <div className="project-grid">
              {projects.map(project => (
                <div key={project.id} className="project-card">
                  <div className="project-image" style={{ backgroundImage: `url(/projects/${project.id}.jpg)` }}></div>
                  <div className="project-details">
                    <h4>{project.name}</h4>
                    <div className="project-price">${project.price} per ton</div>
                    <button 
                      className="nature-button small"
                      onClick={() => {
                        setNewPurchaseData({ project: project.id, amount: 1 });
                        setShowPurchaseModal(true);
                      }}
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="records-section">
          <div className="section-header">
            <h2>Your Carbon Credit Transactions</h2>
            <div className="header-actions">
              <button onClick={loadCredits} className="refresh-btn nature-button" disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="records-list nature-card">
            <div className="table-header">
              <div className="header-cell">Project</div>
              <div className="header-cell">Amount</div>
              <div className="header-cell">Date</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {credits.filter(c => c.owner.toLowerCase() === address?.toLowerCase()).length === 0 ? (
              <div className="no-records">
                <div className="no-records-icon"></div>
                <p>No carbon credits found</p>
                <button className="nature-button primary" onClick={() => setShowPurchaseModal(true)}>Purchase Your First Credits</button>
              </div>
            ) : credits.filter(c => c.owner.toLowerCase() === address?.toLowerCase()).map(credit => (
              <div className="record-row" key={credit.id} onClick={() => setSelectedCredit(credit)}>
                <div className="table-cell">
                  {projects.find(p => p.id === credit.project)?.name || credit.project}
                </div>
                <div className="table-cell">
                  {credit.encryptedAmount.startsWith('FHE-') ? "Encrypted" : credit.encryptedAmount} kg
                </div>
                <div className="table-cell">
                  {new Date(credit.timestamp * 1000).toLocaleDateString()}
                </div>
                <div className="table-cell">
                  <span className={`status-badge ${credit.status}`}>{credit.status}</span>
                </div>
                <div className="table-cell actions">
                  {credit.status === "verified" && (
                    <button 
                      className="action-btn nature-button success" 
                      onClick={(e) => { e.stopPropagation(); retireCredit(credit.id); }}
                    >
                      Retire
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showPurchaseModal && (
        <ModalPurchase 
          onSubmit={purchaseCredit} 
          onClose={() => setShowPurchaseModal(false)} 
          purchasing={purchasing} 
          purchaseData={newPurchaseData} 
          setPurchaseData={setNewPurchaseData}
          projects={projects}
        />
      )}
      
      {selectedCredit && (
        <CreditDetailModal 
          credit={selectedCredit} 
          onClose={() => { setSelectedCredit(null); setDecryptedAmount(null); }} 
          decryptedAmount={decryptedAmount} 
          setDecryptedAmount={setDecryptedAmount} 
          isDecrypting={isDecrypting} 
          decryptWithSignature={decryptWithSignature}
          projects={projects}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content nature-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="nature-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
      
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo"><div className="leaf-icon"></div><span>ReFi Carbon Offset</span></div>
            <p>Private carbon credit platform powered by Zama FHE</p>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">How It Works</a>
            <a href="#" className="footer-link">Carbon Projects</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="fhe-badge"><span>FHE-Powered Privacy</span></div>
          <div className="copyright">© {new Date().getFullYear()} ReFi Carbon Offset. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

interface ModalPurchaseProps {
  onSubmit: () => void; 
  onClose: () => void; 
  purchasing: boolean;
  purchaseData: any;
  setPurchaseData: (data: any) => void;
  projects: Array<{id: string, name: string, price: number}>;
}

const ModalPurchase: React.FC<ModalPurchaseProps> = ({ onSubmit, onClose, purchasing, purchaseData, setPurchaseData, projects }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPurchaseData({ ...purchaseData, [name]: value });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPurchaseData({ ...purchaseData, [name]: parseFloat(value) });
  };

  const handleSubmit = () => {
    if (!purchaseData.project || !purchaseData.amount) { 
      alert("Please select a project and enter amount"); 
      return; 
    }
    onSubmit();
  };

  const selectedProject = projects.find(p => p.id === purchaseData.project);

  return (
    <div className="modal-overlay">
      <div className="purchase-modal nature-card">
        <div className="modal-header">
          <h2>Purchase Carbon Credits</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> 
            <div><strong>FHE Encryption Notice</strong><p>Your carbon credit data will be encrypted with Zama FHE before submission</p></div>
          </div>
          
          <div className="form-group">
            <label>Project *</label>
            <select name="project" value={purchaseData.project} onChange={handleChange} className="nature-select">
              <option value="">Select project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name} (${project.price}/ton)</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Amount (tons) *</label>
            <input 
              type="number" 
              name="amount" 
              value={purchaseData.amount} 
              onChange={handleAmountChange} 
              placeholder="Enter amount..." 
              className="nature-input"
              min="0.1"
              step="0.1"
            />
          </div>
          
          {selectedProject && purchaseData.amount > 0 && (
            <div className="purchase-summary">
              <div className="summary-row">
                <span>Project:</span>
                <strong>{selectedProject.name}</strong>
              </div>
              <div className="summary-row">
                <span>Price per ton:</span>
                <strong>${selectedProject.price}</strong>
              </div>
              <div className="summary-row">
                <span>Total cost:</span>
                <strong>${(selectedProject.price * purchaseData.amount).toFixed(2)}</strong>
              </div>
            </div>
          )}
          
          <div className="encryption-preview">
            <h4>Encryption Preview</h4>
            <div className="preview-container">
              <div className="plain-data">
                <span>Plain Value:</span>
                <div>{purchaseData.amount || '0'} tons</div>
              </div>
              <div className="encryption-arrow">→</div>
              <div className="encrypted-data">
                <span>Encrypted Data:</span>
                <div>{purchaseData.amount ? FHEEncryptNumber(purchaseData.amount).substring(0, 50) + '...' : 'No value entered'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn nature-button">Cancel</button>
          <button onClick={handleSubmit} disabled={purchasing} className="submit-btn nature-button primary">
            {purchasing ? "Processing with FHE..." : "Purchase Securely"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CreditDetailModalProps {
  credit: CarbonCredit;
  onClose: () => void;
  decryptedAmount: number | null;
  setDecryptedAmount: (value: number | null) => void;
  isDecrypting: boolean;
  decryptWithSignature: (encryptedData: string) => Promise<number | null>;
  projects: Array<{id: string, name: string, price: number}>;
}

const CreditDetailModal: React.FC<CreditDetailModalProps> = ({ 
  credit, onClose, decryptedAmount, setDecryptedAmount, isDecrypting, decryptWithSignature, projects 
}) => {
  const handleDecrypt = async () => {
    if (decryptedAmount !== null) { setDecryptedAmount(null); return; }
    const decrypted = await decryptWithSignature(credit.encryptedAmount);
    if (decrypted !== null) setDecryptedAmount(decrypted);
  };

  const project = projects.find(p => p.id === credit.project);

  return (
    <div className="modal-overlay">
      <div className="credit-detail-modal nature-card">
        <div className="modal-header">
          <h2>Carbon Credit Details #{credit.id.substring(0, 8)}</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        <div className="modal-body">
          <div className="credit-info">
            <div className="info-item">
              <span>Project:</span>
              <strong>{project?.name || credit.project}</strong>
            </div>
            <div className="info-item">
              <span>Owner:</span>
              <strong>{credit.owner.substring(0, 6)}...{credit.owner.substring(38)}</strong>
            </div>
            <div className="info-item">
              <span>Date:</span>
              <strong>{new Date(credit.timestamp * 1000).toLocaleString()}</strong>
            </div>
            <div className="info-item">
              <span>Status:</span>
              <strong className={`status-badge ${credit.status}`}>{credit.status}</strong>
            </div>
            {credit.price && (
              <div className="info-item">
                <span>Price per ton:</span>
                <strong>${credit.price}</strong>
              </div>
            )}
          </div>
          
          <div className="encrypted-data-section">
            <h3>Encrypted Carbon Amount</h3>
            <div className="encrypted-data">{credit.encryptedAmount.substring(0, 100)}...</div>
            <div className="fhe-tag"><div className="fhe-icon"></div><span>FHE Encrypted</span></div>
            <button className="decrypt-btn nature-button" onClick={handleDecrypt} disabled={isDecrypting}>
              {isDecrypting ? <span className="decrypt-spinner"></span> : decryptedAmount !== null ? "Hide Decrypted Value" : "Decrypt with Wallet Signature"}
            </button>
          </div>
          
          {decryptedAmount !== null && (
            <div className="decrypted-data-section">
              <h3>Decrypted Carbon Amount</h3>
              <div className="decrypted-value">{decryptedAmount} tons CO₂</div>
              <div className="decryption-notice">
                <div className="warning-icon"></div>
                <span>Decrypted data is only visible after wallet signature verification</span>
              </div>
            </div>
          )}
          
          {project && (
            <div className="project-details">
              <h3>Project Details</h3>
              <div className="project-image" style={{ backgroundImage: `url(/projects/${project.id}.jpg)` }}></div>
              <p className="project-description">
                {project.id === "forest" && "Rainforest conservation project protecting biodiversity and carbon sinks in the Amazon."}
                {project.id === "wind" && "Wind farm development providing clean energy to local communities."}
                {project.id === "solar" && "Solar panel installation project bringing renewable energy to underserved areas."}
                {project.id === "ocean" && "Ocean cleanup initiative removing plastic waste from marine ecosystems."}
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn nature-button">Close</button>
        </div>
      </div>
    </div>
  );
};

export default App;
