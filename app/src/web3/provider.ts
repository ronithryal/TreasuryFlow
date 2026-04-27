import { BrowserProvider, JsonRpcProvider } from 'ethers';
import { useWeb3ModalProvider } from '@web3modal/ethers/react';

export function getRpcProvider() {
  return new JsonRpcProvider('https://sepolia.base.org');
}

export function useAppProvider() {
  const { walletProvider } = useWeb3ModalProvider();
  
  if (!walletProvider) return null;
  return new BrowserProvider(walletProvider as any);
}
