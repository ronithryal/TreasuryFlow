export interface SimulatedQuote {
  id: string;
  corridor: string; // e.g., "USD -> MXN"
  sourceAmount: number;
  destinationAmount: number;
  rate: number;
  spread: number; // e.g., 0.005 (0.5%)
  eta: string;
  expiry: string; // ISO timestamp
  route: string[]; // e.g., ["Ethereum", "OpenFX", "SPEI"]
  status: "pending" | "accepted" | "executed" | "expired";
}

export interface OpenFXAdapter {
  requestQuote(sourceAmount: number, sourceCurrency: string, destinationCurrency: string): Promise<SimulatedQuote>;
  executeQuote(quoteId: string): Promise<void>;
}

export class MockOpenFXAdapter implements OpenFXAdapter {
  private quotes = new Map<string, SimulatedQuote>();

  async requestQuote(sourceAmount: number, sourceCurrency: string, destinationCurrency: string): Promise<SimulatedQuote> {
    const id = "q_fx_" + Date.now();
    const corridor = `${sourceCurrency} -> ${destinationCurrency}`;
    
    // Simulate some logic
    let rate = 1;
    let spread = 0.001;
    let eta = "Same Day";
    let route = ["Source", "OpenFX", "Destination"];

    if (sourceCurrency === "USD" && destinationCurrency === "MXN") {
      rate = 18.50; // Mock rate
      spread = 0.002; // 20 bps
      eta = "24/7 Instant (SPEI)";
      route = ["Base USDC", "OpenFX Aggregator", "MXN SPEI"];
    } else if (sourceCurrency === "USD" && destinationCurrency === "GBP") {
      rate = 0.79;
      spread = 0.0015;
      eta = "Same Day (FPS)";
      route = ["Base USDC", "OpenFX Aggregator", "GBP FPS"];
    }

    const netRate = rate * (1 - spread);
    const destinationAmount = sourceAmount * netRate;

    const quote: SimulatedQuote = {
      id,
      corridor,
      sourceAmount,
      destinationAmount,
      rate,
      spread,
      eta,
      expiry: new Date(Date.now() + 5 * 60000).toISOString(), // 5 mins
      route,
      status: "pending",
    };

    this.quotes.set(id, quote);
    return quote;
  }

  async executeQuote(quoteId: string): Promise<void> {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error("Quote not found");
    if (quote.status !== "pending") throw new Error("Quote is no longer valid");
    
    quote.status = "executed";
    this.quotes.set(quoteId, quote);
  }
}

export const openFx = new MockOpenFXAdapter();
