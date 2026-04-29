export interface RampQuote {
  id: string;
  cryptoAmount: number;
  fiatAmount: number;
  fee: number;
  rate: number;
}

export interface RampAdapter {
  getOfframpQuote(cryptoAmount: number, destinationCurrency: string): Promise<RampQuote>;
  executeOfframp(quoteId: string, destinationBankId: string): Promise<string>;
}

export class MockRampAdapter implements RampAdapter {
  async getOfframpQuote(cryptoAmount: number, _destinationCurrency: string): Promise<RampQuote> {
    const fee = cryptoAmount * 0.005; // 0.5% fee
    return {
      id: "ramp_q_" + Date.now(),
      cryptoAmount,
      fiatAmount: cryptoAmount - fee,
      fee,
      rate: 1, // Assume 1:1 for USDC to USD
    };
  }

  async executeOfframp(_quoteId: string, _destinationBankId: string): Promise<string> {
    return "ramp_tx_" + Date.now();
  }
}

export const ramp = new MockRampAdapter();
