/**
 * OpenFX integration types — scaffold only.
 *
 * These interfaces define the expected contract with the OpenFX FX-corridor API.
 * Nothing in this file is wired into any live code path.
 * All usage is gated by OPENFX_ENABLED=false (see index.ts).
 *
 * Source: extracted from p1/openfx-scaffold (not merged) for future reference.
 */

export interface SimulatedQuote {
  id: string;
  corridor: string; // e.g. "USD -> MXN"
  sourceAmount: number;
  destinationAmount: number;
  rate: number;
  spread: number; // e.g. 0.005 = 50 bps
  eta: string; // human-readable settlement window, e.g. "Same Day (SPEI)"
  expiry: string; // ISO timestamp — quotes expire after ~5 minutes
  route: string[]; // ordered settlement hops, e.g. ["Base USDC", "OpenFX Aggregator", "MXN SPEI"]
  status: "pending" | "accepted" | "executed" | "expired";
}

export interface OpenFXAdapter {
  /**
   * Request a live or simulated FX quote.
   * @param sourceAmount  Amount in sourceCurrency to convert
   * @param sourceCurrency  ISO 4217 code, e.g. "USD"
   * @param destinationCurrency  ISO 4217 code, e.g. "MXN"
   */
  requestQuote(
    sourceAmount: number,
    sourceCurrency: string,
    destinationCurrency: string,
  ): Promise<SimulatedQuote>;

  /**
   * Accept and execute a previously requested quote.
   * Throws if quoteId is unknown or quote has expired.
   */
  executeQuote(quoteId: string): Promise<void>;
}

/**
 * Known corridors supported by OpenFX.
 * Expand this list as corridors are confirmed with the OpenFX team.
 */
export const OPENFX_CORRIDORS = [
  { source: "USD", destination: "MXN", rail: "SPEI", availability: "24/7" },
  { source: "USD", destination: "GBP", rail: "FPS", availability: "Mon–Fri, same day" },
] as const;

export type OpenFXCorridorKey = `${string}->${string}`;
