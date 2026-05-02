/**
 * OpenFX adapter factory — scaffold only, gated by OPENFX_ENABLED.
 *
 * Usage:
 *   import { getOpenFXAdapter } from 'integrations/openfx';
 *   const fx = getOpenFXAdapter(); // throws if OPENFX_ENABLED !== 'true'
 *
 * In v1, OPENFX_ENABLED defaults to false and this module is never invoked
 * by any live code path. It exists purely so future tickets can import and
 * unwrap the adapter without restructuring the codebase.
 */

import type { OpenFXAdapter, SimulatedQuote } from "./types.js";

export { OPENFX_CORRIDORS } from "./types.js";
export type { OpenFXAdapter, SimulatedQuote, OpenFXCorridorKey } from "./types.js";

const OPENFX_ENABLED = process.env["OPENFX_ENABLED"] === "true";

/** Mock adapter — returns deterministic simulated quotes for dev/test. */
class MockOpenFXAdapter implements OpenFXAdapter {
  private quotes = new Map<string, SimulatedQuote>();

  async requestQuote(
    sourceAmount: number,
    sourceCurrency: string,
    destinationCurrency: string,
  ): Promise<SimulatedQuote> {
    const id = "q_fx_" + Date.now();
    const corridor = `${sourceCurrency} -> ${destinationCurrency}`;

    let rate = 1;
    let spread = 0.001;
    let eta = "Same Day";
    let route = ["Source", "OpenFX", "Destination"];

    if (sourceCurrency === "USD" && destinationCurrency === "MXN") {
      rate = 18.5;
      spread = 0.002;
      eta = "24/7 Instant (SPEI)";
      route = ["Base USDC", "OpenFX Aggregator", "MXN SPEI"];
    } else if (sourceCurrency === "USD" && destinationCurrency === "GBP") {
      rate = 0.79;
      spread = 0.0015;
      eta = "Same Day (FPS)";
      route = ["Base USDC", "OpenFX Aggregator", "GBP FPS"];
    }

    const netRate = rate * (1 - spread);
    const quote: SimulatedQuote = {
      id,
      corridor,
      sourceAmount,
      destinationAmount: sourceAmount * netRate,
      rate,
      spread,
      eta,
      expiry: new Date(Date.now() + 5 * 60_000).toISOString(),
      route,
      status: "pending",
    };

    this.quotes.set(id, quote);
    return quote;
  }

  async executeQuote(quoteId: string): Promise<void> {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error(`OpenFX: quote ${quoteId} not found`);
    if (quote.status !== "pending") throw new Error(`OpenFX: quote ${quoteId} is no longer valid (status=${quote.status})`);
    quote.status = "executed";
    this.quotes.set(quoteId, quote);
  }
}

/**
 * Returns the active OpenFX adapter.
 * Throws a clear error when OPENFX_ENABLED is false so callers never
 * silently fall through to a no-op path.
 */
export function getOpenFXAdapter(): OpenFXAdapter {
  if (!OPENFX_ENABLED) {
    throw new Error(
      "OpenFX is not enabled. Set OPENFX_ENABLED=true to use this adapter. " +
        "In v1, OpenFX is scaffolded only — see docs/openfx-integration.md.",
    );
  }
  // Future: return a real OpenFXAdapter wired to live API credentials.
  return new MockOpenFXAdapter();
}
