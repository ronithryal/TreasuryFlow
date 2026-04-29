export interface BankWireTransfer {
  id: string;
  amount: number;
  destinationAccount: string;
  routingNumber: string;
  status: "pending" | "processing" | "settled" | "returned";
}

export interface BankAdapter {
  initiateWire(amount: number, destinationAccount: string, routingNumber: string): Promise<string>;
  checkWireStatus(wireId: string): Promise<BankWireTransfer>;
}

export class MockBankAdapter implements BankAdapter {
  async initiateWire(_amount: number, _destinationAccount: string, _routingNumber: string): Promise<string> {
    return "wire_" + Date.now();
  }

  async checkWireStatus(wireId: string): Promise<BankWireTransfer> {
    return {
      id: wireId,
      amount: 10000,
      destinationAccount: "123456789",
      routingNumber: "987654321",
      status: "settled",
    };
  }
}

export const bank = new MockBankAdapter();
