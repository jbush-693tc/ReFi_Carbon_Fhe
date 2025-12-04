import React, { useState, useEffect, useRef } from 'react';
import { Wallet, LogOut, RefreshCw } from 'lucide-react';

interface WalletManagerProps {
  account: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function WalletManager({ account, onConnect, onDisconnect }: WalletManagerProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [theme, setTheme] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const lastBgColorRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateThemeFromBackground = () => {
      const bgColor = getDominantBackgroundColor(containerRef.current!);
      
      if (bgColor === lastBgColorRef.current) return;
      lastBgColorRef.current = bgColor;
      
      const isDark = isDarkBackground(bgColor);
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
      if (!match) return;
      
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      
      const newTheme = generateThemeFromBackground(r, g, b, isDark);
      setTheme(newTheme);
    };

    updateThemeFromBackground();
    
    const observer = new MutationObserver(() => {
      updateThemeFromBackground();
    });
    
    const resizeObserver = new ResizeObserver(() => {
      updateThemeFromBackground();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  const getDominantBackgroundColor = (element: HTMLElement): string => {
    let currentElement: HTMLElement | null = element;
    let bgColor = '';
    
    while (currentElement && currentElement !== document.body) {
      const computedBg = getComputedStyle(currentElement).backgroundColor;
      
      if (computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
        bgColor = computedBg;
        break;
      }
      
      currentElement = currentElement.parentElement;
    }
    
    return bgColor || getComputedStyle(document.body).backgroundColor;
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
  };

  if (!account) {
    return (
      <div ref={containerRef} style={theme as React.CSSProperties}>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="wallet-connect-button"
        >
          <Wallet size={16} />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={theme as React.CSSProperties} className="wallet-container">
      {/* Account Info */}
      <div className="wallet-account">
        <span>
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleConnect}
        className="wallet-refresh-button"
        title="Refresh connection"
      >
        <RefreshCw size={16} />
      </button>

      {/* Disconnect Button */}
      <button
        onClick={handleDisconnect}
        className="wallet-disconnect-button"
        title="Disconnect wallet"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

function generateThemeFromBackground(r: number, g: number, b: number, isDark: boolean): Record<string, string> {
  const hsl = rgbToHsl(r, g, b);
  let [h, s, l] = hsl;
  

  const primaryHue = (h + 30) % 360;
  const secondaryHue = (h + 180) % 360;
  
  s = Math.min(s + 20, 100);
  
  const textL = isDark ? 90 : 10;
  const buttonL = isDark ? Math.min(l + 20, 95) : Math.max(l - 20, 5);
  const hoverL = isDark ? Math.min(l + 30, 98) : Math.max(l - 30, 2);
  const dangerL = isDark ? 60 : 40;
  
  const primary = `hsla(${primaryHue}, ${s}%, ${buttonL}%, 0.9)`;
  const primaryHover = `hsla(${primaryHue}, ${s}%, ${hoverL}%, 1)`;
  
  const secondary = `hsla(${h}, ${s}%, ${isDark ? l + 10 : l - 10}%, 0.7)`;
  const secondaryHover = `hsla(${h}, ${s}%, ${isDark ? l + 15 : l - 15}%, 0.85)`;
  
  const danger = `hsla(0, 70%, ${dangerL}%, 0.9)`;
  const dangerHover = `hsla(0, 70%, ${dangerL + 10}%, 1)`;
  
  const text = `hsla(${h}, ${s}%, ${textL}%, 1)`;
  const border = `hsla(${h}, ${s}%, ${isDark ? l + 20 : l - 20}%, 0.3)`;

  const shadowIntensity = isDark ? 0.3 : 0.1;
  const shadowHoverIntensity = shadowIntensity + 0.1;
  
  const bgBlur = isDark ? 'blur(8px)' : 'blur(6px)';
  
  return {
    '--wallet-primary': primary,
    '--wallet-primary-hover': primaryHover,
    '--wallet-secondary': secondary,
    '--wallet-secondary-hover': secondaryHover,
    '--wallet-danger': danger,
    '--wallet-danger-hover': dangerHover,
    '--wallet-text': text,
    '--wallet-text-inverted': isDark ? '#ffffff' : '#000000',
    '--wallet-border': border,
    '--wallet-shadow': `0 4px 12px rgba(0, 0, 0, ${shadowIntensity})`,
    '--wallet-shadow-hover': `0 6px 16px rgba(0, 0, 0, ${shadowHoverIntensity})`,
    '--wallet-bg': isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
    '--wallet-border-radius': '12px',
    '--wallet-backdrop-filter': bgBlur,
  };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h = Math.round(h * 60);
  }
  
  s = Math.round(s * 100);
  return [h, s, Math.round(l * 100)];
}

function isDarkBackground(color: string): boolean {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
  if (!match) return false;
  
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  
  // 更精确的亮度计算 (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  
  return luminance < 0.4;
}

const styles = `
.wallet-connect-button {
  padding: 10px 16px;
  border-radius: var(--wallet-border-radius);
  background: var(--wallet-primary);
  border: none;
  color: var(--wallet-text-inverted);
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--wallet-shadow);
  transition: all 0.2s ease;
  opacity: 1;
  position: relative;
  overflow: hidden;
  z-index: 1;
  backdrop-filter: var(--wallet-backdrop-filter);
}

.wallet-connect-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.wallet-connect-button:not(:disabled):hover {
  transform: translateY(-2px);
  background: var(--wallet-primary-hover);
  box-shadow: var(--wallet-shadow-hover);
}

.wallet-connect-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, 
    rgba(255, 255, 255, 0.2) 0%, 
    rgba(255, 255, 255, 0.1) 50%, 
    rgba(255, 255, 255, 0.2) 100%);
  z-index: -1;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.wallet-connect-button:hover:before {
  opacity: 0.8;
}

.wallet-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--wallet-bg);
  border-radius: var(--wallet-border-radius);
  padding: 6px;
  backdrop-filter: var(--wallet-backdrop-filter);
}

.wallet-account {
  background: var(--wallet-secondary);
  border: 1px solid var(--wallet-border);
  border-radius: var(--wallet-border-radius);
  padding: 10px 16px;
  color: var(--wallet-text);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  backdrop-filter: var(--wallet-backdrop-filter);
}

.wallet-account:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 50%, 
    rgba(255, 255, 255, 0.1) 100%);
  z-index: -1;
  opacity: 0.3;
}

.wallet-refresh-button,
.wallet-disconnect-button {
  background: var(--wallet-secondary);
  border: 1px solid var(--wallet-border);
  color: var(--wallet-text);
  padding: 10px;
  border-radius: var(--wallet-border-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  backdrop-filter: var(--wallet-backdrop-filter);
}

.wallet-refresh-button:hover,
.wallet-disconnect-button:hover {
  transform: translateY(-2px);
}

.wallet-refresh-button:before,
.wallet-disconnect-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 50%, 
    rgba(255, 255, 255, 0.1) 100%);
  z-index: -1;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.wallet-refresh-button:hover:before,
.wallet-disconnect-button:hover:before {
  opacity: 0.5;
}

.wallet-refresh-button:hover {
  background: var(--wallet-secondary-hover);
}

.wallet-disconnect-button {
  background: var(--wallet-danger);
  color: var(--wallet-text-inverted);
}

.wallet-disconnect-button:hover {
  background: var(--wallet-danger-hover);
}
`;

if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
}