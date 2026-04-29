import React from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, projectId } from './wagmi';

const queryClient = new QueryClient();

const metadata = {
  name: 'TreasuryFlow',
  description: 'Non-custodial Treasury Operations',
  url: 'https://treasuryflow.app',
  icons: ['https://treasuryflow.app/logo.png']
};

// Initialize AppKit (formerly Web3Modal) — supports WalletConnect + CDP Embedded Wallets
export const web3Modal = createWeb3Modal({
  wagmiConfig: wagmiConfig as any,
  projectId,
  metadata,
  enableAnalytics: true,
  themeMode: 'dark',
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
