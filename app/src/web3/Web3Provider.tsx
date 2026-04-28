import React from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { wagmiConfig, projectId } from './wagmi';

const queryClient = new QueryClient();

const metadata = {
  name: 'TreasuryFlow',
  description: 'Non-custodial Treasury Operations',
  url: 'https://treasuryflow.app',
  icons: ['https://treasuryflow.app/logo.png']
};

// Initialize Web3Modal (AppKit)
createWeb3Modal({
  wagmiConfig,
  projectId,
  metadata,
  enableAnalytics: true,
  themeMode: 'dark',
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider 
          apiKey="fake_cdp_key_for_demo"
          chain={baseSepolia}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
