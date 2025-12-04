import React, { useState, useEffect, useRef } from 'react';

interface WalletInfo {
  name: string;
  provider: any;
  icon: string;
  isInstalled: boolean;
}

interface WalletSelectorProps {
  isOpen: boolean;
  onWalletSelect: (wallet: WalletInfo) => void;
  onClose: () => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ isOpen, onWalletSelect, onClose }) => {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [showOtherWallets, setShowOtherWallets] = useState(false);
  const [theme, setTheme] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  const themeStyles = [
    {
      '--modal-bg': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      '--close-btn-bg': 'rgba(255, 255, 255, 0.1)',
      '--close-btn-hover': 'rgba(255, 255, 255, 0.2)',
      '--wallet-item-bg': 'rgba(30, 41, 59, 0.7)',
      '--wallet-item-hover': 'rgba(51, 65, 85, 0.9)',
      '--wallet-item-disabled': 'rgba(15, 23, 42, 0.5)',
      '--info-box-bg': 'rgba(15, 23, 42, 0.5)',
      '--text-color': '#e2e8f0',
      '--text-disabled': '#94a3b8',
      '--border-color': 'rgba(100, 116, 139, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      '--status-installed': '#10b981',
      '--status-not-installed': '#f59e0b',
      '--other-wallet-bg': 'rgba(15, 23, 42, 0.95)',
      '--other-wallet-item-bg': 'rgba(30, 41, 59, 0.7)',
      '--icon-bg': 'rgba(15, 23, 42, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #818cf8, #c084fc)',
      '--modal-shadow': '0 10px 25px rgba(0, 0, 0, 0.5)',
      '--modal-border-radius': '16px',
      '--modal-backdrop-filter': 'blur(10px)',
      '--glow-effect': '0 0 15px rgba(99, 102, 241, 0.5)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      '--close-btn-bg': 'rgba(100, 116, 139, 0.2)',
      '--close-btn-hover': 'rgba(100, 116, 139, 0.3)',
      '--wallet-item-bg': 'rgba(15, 23, 42, 0.7)',
      '--wallet-item-hover': 'rgba(30, 41, 59, 0.9)',
      '--wallet-item-disabled': 'rgba(15, 23, 42, 0.4)',
      '--info-box-bg': 'rgba(2, 6, 23, 0.4)',
      '--text-color': '#f1f5f9',
      '--text-disabled': '#64748b',
      '--border-color': 'rgba(71, 85, 105, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #0ea5e9, #3b82f6)',
      '--status-installed': '#22c55e',
      '--status-not-installed': '#f97316',
      '--other-wallet-bg': 'rgba(2, 6, 23, 0.95)',
      '--other-wallet-item-bg': 'rgba(15, 23, 42, 0.7)',
      '--icon-bg': 'rgba(2, 6, 23, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #38bdf8, #60a5fa)',
      '--modal-shadow': '0 12px 30px rgba(0, 0, 0, 0.6)',
      '--modal-border-radius': '18px',
      '--modal-backdrop-filter': 'blur(12px)',
      '--glow-effect': '0 0 20px rgba(14, 165, 233, 0.4)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
      '--close-btn-bg': 'rgba(107, 114, 128, 0.2)',
      '--close-btn-hover': 'rgba(107, 114, 128, 0.3)',
      '--wallet-item-bg': 'rgba(31, 41, 55, 0.7)',
      '--wallet-item-hover': 'rgba(55, 65, 81, 0.9)',
      '--wallet-item-disabled': 'rgba(17, 24, 39, 0.5)',
      '--info-box-bg': 'rgba(17, 24, 39, 0.5)',
      '--text-color': '#d1d5db',
      '--text-disabled': '#6b7280',
      '--border-color': 'rgba(75, 85, 99, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #8b5cf6, #a855f7)',
      '--status-installed': '#10b981',
      '--status-not-installed': '#f59e0b',
      '--other-wallet-bg': 'rgba(17, 24, 39, 0.95)',
      '--other-wallet-item-bg': 'rgba(31, 41, 55, 0.7)',
      '--icon-bg': 'rgba(17, 24, 39, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #8b5cf6, #d946ef)',
      '--modal-shadow': '0 15px 35px rgba(0, 0, 0, 0.7)',
      '--modal-border-radius': '16px',
      '--modal-backdrop-filter': 'blur(14px)',
      '--glow-effect': '0 0 18px rgba(139, 92, 246, 0.5)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0c0f1d 0%, #1a1f3a 100%)',
      '--close-btn-bg': 'rgba(79, 70, 229, 0.2)',
      '--close-btn-hover': 'rgba(99, 102, 241, 0.3)',
      '--wallet-item-bg': 'rgba(26, 31, 58, 0.7)',
      '--wallet-item-hover': 'rgba(44, 51, 92, 0.9)',
      '--wallet-item-disabled': 'rgba(12, 15, 29, 0.5)',
      '--info-box-bg': 'rgba(12, 15, 29, 0.5)',
      '--text-color': '#e0e7ff',
      '--text-disabled': '#818cf8',
      '--border-color': 'rgba(67, 56, 202, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #ec4899, #f43f5e)',
      '--status-installed': '#22c55e',
      '--status-not-installed': '#f97316',
      '--other-wallet-bg': 'rgba(12, 15, 29, 0.95)',
      '--other-wallet-item-bg': 'rgba(26, 31, 58, 0.7)',
      '--icon-bg': 'rgba(12, 15, 29, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #6366f1, #a855f7)',
      '--modal-shadow': '0 10px 30px rgba(0, 0, 0, 0.8)',
      '--modal-border-radius': '20px',
      '--modal-backdrop-filter': 'blur(16px)',
      '--glow-effect': '0 0 20px rgba(99, 102, 241, 0.4)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
      '--close-btn-bg': 'rgba(110, 118, 129, 0.2)',
      '--close-btn-hover': 'rgba(139, 148, 158, 0.3)',
      '--wallet-item-bg': 'rgba(22, 27, 34, 0.7)',
      '--wallet-item-hover': 'rgba(33, 38, 45, 0.9)',
      '--wallet-item-disabled': 'rgba(13, 17, 23, 0.5)',
      '--info-box-bg': 'rgba(13, 17, 23, 0.5)',
      '--text-color': '#c9d1d9',
      '--text-disabled': '#8b949e',
      '--border-color': 'rgba(48, 54, 61, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #2ea043, #3fb950)',
      '--status-installed': '#3fb950',
      '--status-not-installed': '#d29922',
      '--other-wallet-bg': 'rgba(13, 17, 23, 0.95)',
      '--other-wallet-item-bg': 'rgba(22, 27, 34, 0.7)',
      '--icon-bg': 'rgba(13, 17, 23, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #58a6ff, #79c0ff)',
      '--modal-shadow': '0 12px 28px rgba(0, 0, 0, 0.9)',
      '--modal-border-radius': '14px',
      '--modal-backdrop-filter': 'blur(15px)',
      '--glow-effect': '0 0 15px rgba(46, 160, 67, 0.4)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0d1520 0%, #15202b 100%)',
      '--close-btn-bg': 'rgba(29, 155, 240, 0.2)',
      '--close-btn-hover': 'rgba(29, 155, 240, 0.3)',
      '--wallet-item-bg': 'rgba(21, 32, 43, 0.7)',
      '--wallet-item-hover': 'rgba(25, 39, 52, 0.9)',
      '--wallet-item-disabled': 'rgba(13, 21, 32, 0.5)',
      '--info-box-bg': 'rgba(13, 21, 32, 0.5)',
      '--text-color': '#e7e9ea',
      '--text-disabled': '#71767b',
      '--border-color': 'rgba(47, 51, 54, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #1d9bf0, #1da1f2)',
      '--status-installed': '#00ba7c',
      '--status-not-installed': '#f7a800',
      '--other-wallet-bg': 'rgba(13, 21, 32, 0.95)',
      '--other-wallet-item-bg': 'rgba(21, 32, 43, 0.7)',
      '--icon-bg': 'rgba(13, 21, 32, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #1d9bf0, #8ecdf7)',
      '--modal-shadow': '0 10px 25px rgba(0, 0, 0, 0.7)',
      '--modal-border-radius': '18px',
      '--modal-backdrop-filter': 'blur(12px)',
      '--glow-effect': '0 0 18px rgba(29, 155, 240, 0.4)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0d0d15 0%, #1a1a2e 100%)',
      '--close-btn-bg': 'rgba(91, 33, 182, 0.2)',
      '--close-btn-hover': 'rgba(124, 58, 237, 0.3)',
      '--wallet-item-bg': 'rgba(26, 26, 46, 0.7)',
      '--wallet-item-hover': 'rgba(39, 39, 69, 0.9)',
      '--wallet-item-disabled': 'rgba(13, 13, 21, 0.5)',
      '--info-box-bg': 'rgba(13, 13, 21, 0.5)',
      '--text-color': '#d8d8f6',
      '--text-disabled': '#a9a9d1',
      '--border-color': 'rgba(76, 76, 134, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #7c3aed, #a78bfa)',
      '--status-installed': '#10b981',
      '--status-not-installed': '#f59e0b',
      '--other-wallet-bg': 'rgba(13, 13, 21, 0.95)',
      '--other-wallet-item-bg': 'rgba(26, 26, 46, 0.7)',
      '--icon-bg': 'rgba(13, 13, 21, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #8b5cf6, #c084fc)',
      '--modal-shadow': '0 15px 35px rgba(0, 0, 0, 0.8)',
      '--modal-border-radius': '20px',
      '--modal-backdrop-filter': 'blur(18px)',
      '--glow-effect': '0 0 20px rgba(124, 58, 237, 0.5)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)',
      '--close-btn-bg': 'rgba(41, 121, 255, 0.2)',
      '--close-btn-hover': 'rgba(41, 121, 255, 0.3)',
      '--wallet-item-bg': 'rgba(27, 38, 59, 0.7)',
      '--wallet-item-hover': 'rgba(35, 53, 81, 0.9)',
      '--wallet-item-disabled': 'rgba(13, 27, 42, 0.5)',
      '--info-box-bg': 'rgba(13, 27, 42, 0.5)',
      '--text-color': '#e0e1dd',
      '--text-disabled': '#778da9',
      '--border-color': 'rgba(72, 101, 145, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #415a77, #778da9)',
      '--status-installed': '#4ade80',
      '--status-not-installed': '#fbbf24',
      '--other-wallet-bg': 'rgba(13, 27, 42, 0.95)',
      '--other-wallet-item-bg': 'rgba(27, 38, 59, 0.7)',
      '--icon-bg': 'rgba(13, 27, 42, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #415a77, #1b263b)',
      '--modal-shadow': '0 12px 30px rgba(0, 0, 0, 0.7)',
      '--modal-border-radius': '16px',
      '--modal-backdrop-filter': 'blur(14px)',
      '--glow-effect': '0 0 15px rgba(65, 90, 119, 0.4)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0d0f1a 0%, #1d1e30 100%)',
      '--close-btn-bg': 'rgba(139, 92, 246, 0.2)',
      '--close-btn-hover': 'rgba(167, 139, 250, 0.3)',
      '--wallet-item-bg': 'rgba(29, 30, 48, 0.7)',
      '--wallet-item-hover': 'rgba(44, 45, 72, 0.9)',
      '--wallet-item-disabled': 'rgba(13, 15, 26, 0.5)',
      '--info-box-bg': 'rgba(13, 15, 26, 0.5)',
      '--text-color': '#d1d5f9',
      '--text-disabled': '#a5b4fc',
      '--border-color': 'rgba(79, 70, 229, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #7c3aed, #a78bfa)',
      '--status-installed': '#22c55e',
      '--status-not-installed': '#f97316',
      '--other-wallet-bg': 'rgba(13, 15, 26, 0.95)',
      '--other-wallet-item-bg': 'rgba(29, 30, 48, 0.7)',
      '--icon-bg': 'rgba(13, 15, 26, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #8b5cf6, #c084fc)',
      '--modal-shadow': '0 15px 35px rgba(0, 0, 0, 0.8)',
      '--modal-border-radius': '20px',
      '--modal-backdrop-filter': 'blur(16px)',
      '--glow-effect': '0 0 20px rgba(139, 92, 246, 0.5)'
    },
    {
      '--modal-bg': 'linear-gradient(135deg, #0d1321 0%, #1d2d44 100%)',
      '--close-btn-bg': 'rgba(72, 149, 239, 0.2)',
      '--close-btn-hover': 'rgba(96, 165, 250, 0.3)',
      '--wallet-item-bg': 'rgba(29, 45, 68, 0.7)',
      '--wallet-item-hover': 'rgba(41, 63, 96, 0.9)',
      '--wallet-item-disabled': 'rgba(13, 19, 33, 0.5)',
      '--info-box-bg': 'rgba(13, 19, 33, 0.5)',
      '--text-color': '#e0e7ff',
      '--text-disabled': '#93c5fd',
      '--border-color': 'rgba(59, 130, 246, 0.3)',
      '--back-btn-bg': 'linear-gradient(90deg, #1e40af, #3b82f6)',
      '--status-installed': '#10b981',
      '--status-not-installed': '#f59e0b',
      '--other-wallet-bg': 'rgba(13, 19, 33, 0.95)',
      '--other-wallet-item-bg': 'rgba(29, 45, 68, 0.7)',
      '--icon-bg': 'rgba(13, 19, 33, 0.5)',
      '--title-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)',
      '--modal-shadow': '0 10px 30px rgba(0, 0, 0, 0.7)',
      '--modal-border-radius': '18px',
      '--modal-backdrop-filter': 'blur(14px)',
      '--glow-effect': '0 0 18px rgba(59, 130, 246, 0.4)'
    }
  ];

  useEffect(() => {
    detectWallets();
    
    if (!isOpen) return;
    
    const hour = new Date().getHours();
    const themeIndex = hour % themeStyles.length;
    setTheme(themeStyles[themeIndex]);
  }, [isOpen]);

  const detectWallets = () => {
    const wallets: WalletInfo[] = [];

    const walletIcons: Record<string, string> = {
      'MetaMask': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MetaMask_Fox.svg/1200px-MetaMask_Fox.svg.png',
      'OKX Wallet': 'https://www.okx.com/favicon.ico',
      'Binance Wallet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Binance_Logo.png/600px-Binance_Logo.png',
      'Other Wallets': 'https://cdn-icons-png.flaticon.com/512/126/126472.png'
    };

    // MetaMask
    if (typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isMetaMask) {
      wallets.push({
        name: 'MetaMask',
        provider: (window as any).ethereum,
        icon: walletIcons['MetaMask'],
        isInstalled: true
      });
    } else {
      wallets.push({
        name: 'MetaMask',
        provider: null,
        icon: walletIcons['MetaMask'],
        isInstalled: false
      });
    }

    // OKX Wallet
    if (typeof (window as any).okxwallet !== 'undefined') {
      wallets.push({
        name: 'OKX Wallet',
        provider: (window as any).okxwallet,
        icon: walletIcons['OKX Wallet'],
        isInstalled: true
      });
    } else {
      wallets.push({
        name: 'OKX Wallet',
        provider: null,
        icon: walletIcons['OKX Wallet'],
        isInstalled: false
      });
    }

    // Binance Wallet
    if (typeof (window as any).BinanceChain !== 'undefined') {
      wallets.push({
        name: 'Binance Wallet',
        provider: (window as any).BinanceChain,
        icon: walletIcons['Binance Wallet'],
        isInstalled: true
      });
    } else {
      wallets.push({
        name: 'Binance Wallet',
        provider: null,
        icon: walletIcons['Binance Wallet'],
        isInstalled: false
      });
    }

    wallets.push({
      name: 'Other Wallets',
      provider: null,
      icon: walletIcons['Other Wallets'],
      isInstalled: true
    });

    setAvailableWallets(wallets);
  };

  const handleWalletSelect = async (wallet: WalletInfo) => {
    if (wallet.name === 'Other Wallets') {
      setShowOtherWallets(true);
      return;
    }

    if (!wallet.isInstalled) {
      // Open wallet download page
      const walletUrls: { [key: string]: string } = {
        'MetaMask': 'https://metamask.io/',
        'OKX Wallet': 'https://www.okx.com/web3',
        'Binance Wallet': 'https://www.bnbchain.org/en/binance-wallet',
      };
      
      const url = walletUrls[wallet.name];
      if (url) {
        window.open(url, '_blank');
      }
      return;
    }

    try {
      // Auto-switch to Sepolia testnet
      await switchToSepolia(wallet.provider);
      onWalletSelect(wallet);
    } catch (error) {
      console.error('Error switching network:', error);
      // Continue anyway, let the main app handle the connection
      onWalletSelect(wallet);
    }
  };

  const switchToSepolia = async (provider: any) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'SEP',
                decimals: 18
              },
              rpcUrls: [
                'https://rpc.sepolia.org',
                'https://eth-sepolia.public.blastapi.io',
              ],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            }]
          });
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          // Don't throw, let the main app handle it
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(5px)',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div style={{
        ...theme as React.CSSProperties,
        background: 'var(--modal-bg)',
        borderRadius: 'var(--modal-border-radius)',
        padding: '24px',
        width: '90%',
        maxWidth: '350px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--modal-shadow)',
        color: 'var(--text-color)',
        overflow: 'hidden',
        position: 'relative',
        backdropFilter: 'var(--modal-backdrop-filter)'
      }}>
        {showOtherWallets && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--other-wallet-bg)',
            color: 'var(--text-color)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            borderRadius: 'var(--modal-border-radius)',
            backdropFilter: 'var(--modal-backdrop-filter)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Other Wallets</h3>
              <button
                onClick={() => setShowOtherWallets(false)}
                style={{
                  background: 'var(--close-btn-bg)',
                  border: 'none',
                  color: 'var(--text-color)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--close-btn-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--close-btn-bg)';
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ 
                background: 'var(--info-box-bg)', 
                padding: '15px', 
                borderRadius: '12px',
                marginBottom: '15px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontWeight: '500', marginBottom: '10px' }}>Popular Wallets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {['Coinbase Wallet', 'Trust Wallet', 'WalletConnect', 'Ledger', 'Trezor'].map(name => (
                    <div key={name} style={{
                      background: 'var(--other-wallet-item-bg)',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontSize: '14px'
                    }}>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ 
                background: 'var(--info-box-bg)', 
                padding: '15px', 
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontWeight: '500', marginBottom: '10px' }}>Mobile Wallets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {['TokenPocket', 'MathWallet', 'SafePal', 'BitKeep', 'ImToken'].map(name => (
                    <div key={name} style={{
                      background: 'var(--other-wallet-item-bg)',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontSize: '14px'
                    }}>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                onClick={() => setShowOtherWallets(false)}
                style={{
                  background: 'var(--back-btn-bg)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Back to Main
              </button>
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '22px', 
            fontWeight: '700',
            background: 'var(--title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--close-btn-bg)',
              border: 'none',
              color: 'var(--text-color)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              fontSize: '18px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--close-btn-hover)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--close-btn-bg)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          {availableWallets.map((wallet, index) => (
            <div
              key={index}
              onClick={() => handleWalletSelect(wallet)}
              style={{
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: wallet.isInstalled 
                  ? 'var(--wallet-item-bg)' 
                  : 'var(--wallet-item-disabled)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: wallet.isInstalled ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                opacity: wallet.isInstalled ? 1 : 0.7
              }}
              onMouseOver={(e) => {
                if (wallet.isInstalled) {
                  e.currentTarget.style.background = 'var(--wallet-item-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (wallet.isInstalled) {
                  e.currentTarget.style.background = 'var(--wallet-item-bg)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {/* Wallet icon */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--icon-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                flexShrink: 0
              }}>
                <img 
                  src={wallet.icon} 
                  alt={wallet.name} 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: wallet.isInstalled ? 'none' : 'grayscale(100%)'
                  }}
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/48';
                  }}
                />
              </div>
              
              {/* Wallet name and status */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '500', 
                  fontSize: '16px',
                  marginBottom: '4px',
                  color: wallet.isInstalled ? 'var(--text-color)' : 'var(--text-disabled)'
                }}>
                  {wallet.name}
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.7,
                  color: wallet.isInstalled ? 'var(--text-color)' : 'var(--text-disabled)'
                }}>
                  {wallet.isInstalled ? 'Ready to connect' : 'Click to install'}
                </div>
              </div>
              
              {/* Status indicator */}
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: wallet.isInstalled ? 'var(--status-installed)' : 'var(--status-not-installed)',
                flexShrink: 0
              }}></div>
            </div>
          ))}
        </div>
        
        <div style={{
          fontSize: '13px',
          opacity: 0.7,
          textAlign: 'center',
          fontWeight: '500',
          position: 'relative',
          zIndex: 1,
          padding: '12px',
          background: 'var(--info-box-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ marginBottom: '6px' }}>
            Wallet will automatically switch to Sepolia testnet
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSelector;