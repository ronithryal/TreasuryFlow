/**
 * CDP Offramp adapter — MOCKED for v1.
 *
 * Returns realistic fake session objects so the rest of the system
 * can use the same interface as a live CDP Offramp integration, without
 * executing any real fiat flows.
 *
 * All UI surfaces that call this adapter MUST display:
 * "Coming soon – mocked fiat rail. No real fiat execution occurs in v1."
 */

export const OFFRAMP_MOCKED = true;

export interface OfframpSession {
  sessionId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  /** Crypto asset being sold */
  asset: string;
  /** Amount of crypto being sold */
  cryptoAmount: number;
  /** Fiat currency the user receives */
  fiatCurrency: string;
  /** Estimated fiat amount after fees */
  estimatedFiatAmount: number;
  /** Total fee in USD */
  feeUsd: number;
  /** Destination bank / payment method identifier (masked) */
  destinationMasked: string;
  /** Human-readable estimated settlement time */
  estimatedSettlement: string;
  createdAt: string;
  /** Always true in v1 */
  mocked: true;
}

/**
 * Initiates a fake offramp session to convert `cryptoAmount` of `asset`
 * to `fiatCurrency` and deliver it to `destination`.
 * No real fiat or crypto moves.
 */
export async function initiateOfframp(
  asset: string,
  cryptoAmount: number,
  destination: string,
  fiatCurrency = "USD",
): Promise<OfframpSession> {
  const rateMap: Record<string, number> = {
    USDC: 1.0,
    ETH: 3_200,
    WETH: 3_200,
    CBETH: 3_150,
  };
  const rate = rateMap[asset.toUpperCase()] ?? 1.0;
  const grossFiat = cryptoAmount * rate;
  const feeUsd = Math.max(0.5, grossFiat * 0.01); // 1 % fee, min $0.50
  const estimatedFiatAmount = parseFloat((grossFiat - feeUsd).toFixed(2));

  // Mask the destination for display (last 4 chars or generic mask)
  const destinationMasked =
    destination.length > 4
      ? `****${destination.slice(-4)}`
      : "****";

  return {
    sessionId: `mock_offramp_${Date.now().toString(36)}`,
    status: "PENDING",
    asset: asset.toUpperCase(),
    cryptoAmount,
    fiatCurrency,
    estimatedFiatAmount,
    feeUsd: parseFloat(feeUsd.toFixed(2)),
    destinationMasked,
    estimatedSettlement: "1–3 business days",
    createdAt: new Date().toISOString(),
    mocked: true,
  };
}
