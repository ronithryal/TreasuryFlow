import type { MarketContext } from "@/types/domain";

export type { MarketContext };

/**
 * Fetch a fresh (or 15-min cached) MarketContext from the backend.
 * The response always includes a marketContextId that can be stored in
 * ActionProposal.rationale.marketContextId.
 */
export async function fetchMarketContext(
  portfolioId = "default"
): Promise<MarketContext> {
  const res = await fetch("/api/market_context", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portfolioId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `market_context failed (${res.status}): ${body.slice(0, 200)}`
    );
  }
  return res.json() as Promise<MarketContext>;
}
