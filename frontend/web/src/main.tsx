import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getDefaultConfig, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import { sepolia } from 'wagmi/chains';
import { BrowserRouter } from 'react-router-dom';

const projectId = '4eeb32175359e6b21f4e3ceae163ccea';

const config = getDefaultConfig({
  appName: '',
  projectId: projectId,
  chains: [sepolia],
});

const queryClient = new QueryClient();

const calculateBrightness = (r: number, g: number, b: number) => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

const getBackgroundColor = (element: HTMLElement | null): string | null => {
  if (!element) return null;
  
  const bgColor = getComputedStyle(element).backgroundColor;
  const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  
  if (rgbMatch) {
    return bgColor;
  }
  
  return getBackgroundColor(element.parentElement);
};

const AdaptiveThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState({
    accentColor: '#000000',
    accentColorForeground: '#ffffff'
  });

  useEffect(() => {
    const updateTheme = () => {
      const appContainer = document.getElementById('root');
      const bgColor = getBackgroundColor(appContainer);
      
      if (bgColor) {
        const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          
          const brightness = calculateBrightness(r, g, b);
          
          if (brightness > 180) {
            setTheme({
              accentColor: '#000000',
              accentColorForeground: '#ffffff'
            });
          } else if (brightness > 120) {
            setTheme({
              accentColor: '#333333',
              accentColorForeground: '#ffffff'
            });
          } else if (brightness > 60) {
            setTheme({
              accentColor: '#888888',
              accentColorForeground: '#ffffff'
            });
          } else {
            setTheme({
              accentColor: '#ffffff',
              accentColorForeground: '#000000'
            });
          }
        }
      }
    };

    updateTheme();
    
    window.addEventListener('resize', updateTheme);
    window.addEventListener('scroll', updateTheme);
    
    const observer = new MutationObserver(updateTheme);
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
      });
    }
    
    return () => {
      window.removeEventListener('resize', updateTheme);
      window.removeEventListener('scroll', updateTheme);
      observer.disconnect();
    };
  }, []);

  return (
    <RainbowKitProvider
      locale="en"
      theme={lightTheme({
        accentColor: theme.accentColor,
        accentColorForeground: theme.accentColorForeground,
        borderRadius: 'medium',
      })}
    >
      {children}
    </RainbowKitProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <BrowserRouter>
          <AdaptiveThemeProvider>
            <App />
          </AdaptiveThemeProvider>
        </BrowserRouter>
      </WagmiConfig>
    </QueryClientProvider>
  </React.StrictMode>
);