import { BrowserProvider, JsonRpcProvider } from 'ethers';
import { useWalletClient } from 'wagmi';

export function getRpcProvider() {
  return new JsonRpcProvider('https://sepolia.base.org');
}

export function useAppProvider() {
  const { data: walletClient } = useWalletClient();
  if (!walletClient) return null;
  // Wrap the wagmi wallet client as an ethers BrowserProvider
  const provider = new BrowserProvider(walletClient.transport as any);
  return provider;
}
