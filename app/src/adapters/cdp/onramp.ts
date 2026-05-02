/**
 * CDP Onramp adapter — MOCKED for v1.
 *
 * Returns realistic fake quote/session objects so the rest of the system
 * can use the same interface as a live CDP Onramp integration, without
 * executing any real fiat flows.
 *
 * All UI surfaces that call this adapter MUST display:
 * "Coming soon – mocked fiat rail. No real fiat execution occurs in v1."
 */

export const ONRAMP_MOCKED = true;

export interface BuyQuote {
  quoteId: string;
  /** Fiat currency being used to purchase (e.g. "USD") */
  fiatCurrency: string;
  /** Fiat amount the user pays (inclusive of fees) */
  fiatAmount: number;
  /** Crypto asset being purchased */
  asset: string;
  /** Amount of crypto the user receives */
  cryptoAmount: number;
  /** Exchange rate: 1 fiat unit → x crypto units */
  exchangeRate: number;
  /** Total fee in fiat currency */
  feeUsd: number;
  /** Quote validity window in seconds */
  expiresIn: number;
  /** Human-readable estimated settlement time */
  estimatedSettlement: string;
  /** Always true in v1 */
  mocked: true;
}

export interface OnrampSession {
  sessionId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  quoteId: string;
  /** Destination wallet address */
  destinationAddress: string;
  createdAt: string;
  /** Always true in v1 */
  mocked: true;
}

/**
 * Returns a fake buy quote for purchasing `asset` with `fiatAmount` of `fiatCurrency`.
 * No external API is called.
 */
export async function getBuyQuote(
  asset: string,
  fiatAmount: number,
  fiatCurrency = "USD",
): Promise<BuyQuote> {
  // Realistic exchange-rate simulation (USDC always ≈ $1, ETH ≈ $3 200)
  const rateMap: Record<string, number> = {
    USDC: 1.0,
    ETH: 3_200,
    WETH: 3_200,
    CBETH: 3_150,
  };
  const rate = rateMap[asset.toUpperCase()] ?? 1.0;
  const feeUsd = Math.max(0.5, fiatAmount * 0.015); // 1.5 % fee, min $0.50
  const netFiat = fiatAmount - feeUsd;
  const cryptoAmount = parseFloat((netFiat / rate).toFixed(6));

  return {
    quoteId: `mock_quote_${Date.now().toString(36)}`,
    fiatCurrency,
    fiatAmount,
    asset: asset.toUpperCase(),
    cryptoAmount,
    exchangeRate: rate,
    feeUsd: parseFloat(feeUsd.toFixed(2)),
    expiresIn: 60,
    estimatedSettlement: "1–3 business days",
    mocked: true,
  };
}

/**
 * Initiates a fake onramp session for a previously obtained quote.
 * No real fiat is moved.
 */
export async function initiateOnramp(
  quoteId: string,
  destinationAddress: string,
): Promise<OnrampSession> {
  return {
    sessionId: `mock_onramp_${Date.now().toString(36)}`,
    status: "PENDING",
    quoteId,
    destinationAddress,
    createdAt: new Date().toISOString(),
    mocked: true,
  };
}
