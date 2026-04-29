export interface CoinbaseAccount {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

export interface CoinbaseAdapter {
  getAccounts(): Promise<CoinbaseAccount[]>;
  sweepToVault(accountId: string, amount: number): Promise<string>;
}

export class MockCoinbaseAdapter implements CoinbaseAdapter {
  async getAccounts(): Promise<CoinbaseAccount[]> {
    return [
      { id: "cb_usdc_01", name: "Coinbase Prime USDC", currency: "USDC", balance: 1250000 },
      { id: "cb_usd_01", name: "Coinbase Prime Fiat", currency: "USD", balance: 50000 },
    ];
  }

  async sweepToVault(_accountId: string, _amount: number): Promise<string> {
    return "tx_cb_" + Date.now();
  }
}

export const coinbase = new MockCoinbaseAdapter();
