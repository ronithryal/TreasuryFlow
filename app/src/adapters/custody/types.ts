export interface CustodyAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  custodian: string;
}

export interface TransferResult {
  transferId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface CustodyAdapter {
  listAccounts(): Promise<CustodyAccount[]>;
  getBalance(accountId: string): Promise<number>;
  initiateTransfer(
    from: string,
    to: string,
    amount: number,
    currency: string
  ): Promise<TransferResult>;
}
