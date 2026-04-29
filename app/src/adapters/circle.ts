export interface CircleMintStatus {
  status: "pending" | "complete" | "failed";
  mintId: string;
  amount: number;
}

export interface CircleAdapter {
  mintUsdc(fiatAmount: number, bankAccountId: string): Promise<string>; // returns mintId
  checkStatus(mintId: string): Promise<CircleMintStatus>;
}

export class MockCircleAdapter implements CircleAdapter {
  async mintUsdc(_fiatAmount: number, _bankAccountId: string): Promise<string> {
    return "mint_" + Date.now();
  }

  async checkStatus(mintId: string): Promise<CircleMintStatus> {
    return {
      status: "complete",
      mintId,
      amount: 100000,
    };
  }
}

export const circle = new MockCircleAdapter();
