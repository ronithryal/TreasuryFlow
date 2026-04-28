import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, walletConnect } from 'wagmi/connectors';

export const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'fake_project_id_for_demo';
const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({ 
      appName: 'TreasuryFlow',
      preference: { options: 'all' } as any // This enables Embedded Wallets support
    }),
    walletConnect({ projectId }),
  ],
  transports: {
    [baseSepolia.id]: alchemyKey ? http(`https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`) : http(),
  },
});
