import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'

export const projectId = 'fake_project_id_for_demo'; // In a real app we'd use env var

const baseSepolia = {
  chainId: 84532,
  name: 'Base Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.basescan.org',
  rpcUrl: 'https://sepolia.base.org'
};

const metadata = {
  name: 'TreasuryFlow',
  description: 'Non-custodial Treasury Operations',
  url: 'https://treasuryflow.app',
  icons: ['https://treasuryflow.app/logo.png']
}

export const ethersConfig = defaultConfig({
  metadata,
  defaultChainId: 84532,
});

createWeb3Modal({
  ethersConfig,
  chains: [baseSepolia],
  projectId,
});

export { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
