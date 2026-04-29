import type { Address } from "viem";
import { Contract } from 'ethers';
import { PolicyEngineABI, IntentRegistryABI, LedgerContractABI } from './abis';
import { useAppProvider } from './provider';

// Deployed on Base Sepolia
export const addresses = {
  PolicyEngine: ((import.meta.env.VITE_POLICY_ENGINE_ADDRESS as string | undefined) || '0x01E0149639EB224CCc0557d3bd33b0FB05505a64') as Address,
  IntentRegistry: ((import.meta.env.VITE_INTENT_REGISTRY_ADDRESS as string | undefined) || '0xf510c47823139B6819e4090d4583B518c66ee0d7') as Address,
  LedgerContract: ((import.meta.env.VITE_LEDGER_CONTRACT_ADDRESS as string | undefined) || '0x20cF3fB0A14FEce0889f69e1243a9d9f78AC508b') as Address,
};

export function useContracts() {
  const provider = useAppProvider();

  if (!provider) return null;

  return {
    policyEngine: new Contract(addresses.PolicyEngine, PolicyEngineABI, provider),
    intentRegistry: new Contract(addresses.IntentRegistry, IntentRegistryABI, provider),
    ledgerContract: new Contract(addresses.LedgerContract, LedgerContractABI, provider)
  };
}
