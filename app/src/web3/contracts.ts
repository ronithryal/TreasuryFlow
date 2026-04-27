import { Contract } from 'ethers';
import { PolicyEngineABI, IntentRegistryABI, LedgerContractABI } from './abis';
import { useAppProvider } from './provider';

export const addresses = {
  PolicyEngine: '0x1111111111111111111111111111111111111111',
  IntentRegistry: '0x2222222222222222222222222222222222222222',
  LedgerContract: '0x3333333333333333333333333333333333333333'
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
