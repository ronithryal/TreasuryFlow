import { useContracts } from './contracts';
import { useAppProvider } from './provider';
import { ContractTransactionResponse } from 'ethers';

export function useWeb3Intents() {
  const contracts = useContracts();
  const provider = useAppProvider();

  const createPolicy = async (name: string, type: string, source: string, dest: string, conditions: string) => {
    if (!contracts || !provider) throw new Error("Wallet not connected");
    const signer = await provider.getSigner();
    const engine = contracts.policyEngine.connect(signer) as any;
    const tx: ContractTransactionResponse = await engine.createPolicy(name, type, source, dest, conditions);
    return await tx.wait();
  };

  const createIntent = async (policyId: number, amount: number, dest: string) => {
    if (!contracts || !provider) throw new Error("Wallet not connected");
    const signer = await provider.getSigner();
    const registry = contracts.intentRegistry.connect(signer) as any;
    const tx: ContractTransactionResponse = await registry.createIntent(policyId, amount, dest);
    return await tx.wait();
  };

  const approveIntent = async (intentId: number) => {
    if (!contracts || !provider) throw new Error("Wallet not connected");
    const signer = await provider.getSigner();
    const registry = contracts.intentRegistry.connect(signer) as any;
    const tx: ContractTransactionResponse = await registry.approveIntent(intentId, await signer.getAddress());
    return await tx.wait();
  };

  const executeIntent = async (intentId: number, txHash: string) => {
    if (!contracts || !provider) throw new Error("Wallet not connected");
    const signer = await provider.getSigner();
    const registry = contracts.intentRegistry.connect(signer) as any;
    const tx: ContractTransactionResponse = await registry.executeIntent(intentId, txHash);
    return await tx.wait();
  };

  return { createPolicy, createIntent, approveIntent, executeIntent };
}
