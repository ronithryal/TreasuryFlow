// Coming soon – custody integration mocked
// Real custody APIs (BitGo, Fireblocks, Coinbase Custody, Anchorage) are out of v1 scope.
// This adapter returns illustrative data so the rest of the system can treat custody
// accounts as first-class objects without blocking on live integrations.

import type { CustodyAdapter, CustodyAccount, TransferResult } from './types';

export const CUSTODY_MOCKED = true;

const MOCK_ACCOUNTS: CustodyAccount[] = [
  {
    id: 'custody_fireblocks_hot',
    name: 'Fireblocks Hot Wallet',
    balance: 250_000,
    currency: 'USDC',
    custodian: 'Fireblocks',
  },
  {
    id: 'custody_bitgo_cold',
    name: 'BitGo Cold Vault',
    balance: 1_500_000,
    currency: 'USDC',
    custodian: 'BitGo',
  },
  {
    id: 'custody_coinbase_prime',
    name: 'Coinbase Prime Reserve',
    balance: 500_000,
    currency: 'USDC',
    custodian: 'Coinbase Prime',
  },
];

export const MockCustodyAdapter: CustodyAdapter = {
  async listAccounts(): Promise<CustodyAccount[]> {
    return MOCK_ACCOUNTS;
  },

  async getBalance(accountId: string): Promise<number> {
    const account = MOCK_ACCOUNTS.find((a) => a.id === accountId);
    return account?.balance ?? 0;
  },

  async initiateTransfer(
    _from: string,
    _to: string,
    _amount: number,
    _currency: string
  ): Promise<TransferResult> {
    // Simulates a custody transfer submission; no real movement occurs
    const mockTransferId = `mock_txfr_${Date.now().toString(36)}`;
    return { transferId: mockTransferId, status: 'PENDING' };
  },
};
