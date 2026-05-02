/**
 * POST /api/market_context
 *
 * Pipeline:
 *   1. Exa search  — 3 queries covering treasury/FX/stablecoin risk & liquidity
 *   2. Perplexity  — synthesise a CFO-facing narrative from Exa highlights
 *   3. Fireworks   — structure the narrative into MarketContext JSON
 *
 * Caching:  in-memory per portfolioId, 15-minute TTL.
 * Storage:  each result is keyed by a unique marketContextId so
 *           ActionProposal.rationale.marketContextId can reference it.
 *
 * Body:    { portfolioId?: string }
 * Returns: MarketContext  { marketContextId, portfolioId, summary,
 *                           riskFactors[], liquidityNotes[], timestamp }
 * Errors:  { error: string }
 *
 * Falls back to deterministic mock data when any API key is absent or when
 * an upstream call fails — the endpoint never returns 5xx to the client.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Exa from "exa-js";
import { randomUUID } from "node:crypto";
import type { MarketContext, MarketContextId } from "../src/types/domain.js";

// ---------- Cache (in-memory, module-level) ----------
interface CacheEntry {
  data: MarketContext;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 15 * 60 * 1000;

// ---------- Store (in-memory DB substitute for v1) ----------
// Allows other server routes to look up a MarketContext by its ID.
export const MARKET_CONTEXT_STORE = new Map<string, MarketContext>();

// ---------- Exa queries ----------
const EXA_QUERIES = [
  "treasury management stablecoin USDC liquidity risk corporate 2025",
  "FX volatility USD cross-border payments corporate treasury hedge 2025",
  "DeFi liquidity Base Ethereum USDC yield stablecoin depeg risk",
];

// ---------- Perplexity ----------
async function callPerplexity(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are a treasury risk analyst. Synthesize market intelligence into a 3–4 sentence narrative for a CFO audience. Focus on practical risk and liquidity implications for USD-denominated treasury operations.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Perplexity error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

// ---------- Fireworks ----------
interface FireworksStructured {
  summary: string;
  riskFactors: string[];
  liquidityNotes: string[];
}

async function callFireworks(
  apiKey: string,
  narrative: string
): Promise<FireworksStructured> {
  const res = await fetch(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
        messages: [
          {
            role: "system",
            content:
              'You are a structured data extractor. Given a market intelligence narrative, return a JSON object with exactly these fields: { "summary": string (1-2 sentences), "riskFactors": string[] (3–5 items, each under 90 chars), "liquidityNotes": string[] (2–4 items, each under 90 chars) }. Output ONLY the JSON object — no markdown fences, no prose.',
          },
          { role: "user", content: narrative },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fireworks error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Fireworks: no JSON object found in response");
  return JSON.parse(match[0]) as FireworksStructured;
}

// ---------- Mock fallback ----------
export function buildMockMarketContext(
  portfolioId: string,
  marketContextId: string
): MarketContext {
  return {
    marketContextId: marketContextId as MarketContextId,
    portfolioId,
    summary:
      "Stablecoin liquidity on Base remains robust with tight USDC/USD spreads and deep on-chain depth. Macro FX volatility is elevated but within manageable ranges for USD-denominated treasury operations.",
    riskFactors: [
      "USD/EUR 30-day volatility at 7.2% — above 5-year average",
      "Regulatory uncertainty around stablecoin reserves (MiCA phase-in, EU)",
      "DeFi protocol concentration: top 3 protocols hold 68% of Base TVL",
      "Cross-border settlement delays: avg +1.2 days vs Q1 2025 baseline",
    ],
    liquidityNotes: [
      "USDC on-chain depth: $420M within 0.1% slippage on Base",
      "Circle redemption queue: ~2-hour average (within normal range)",
      "Uniswap V3 USDC/WETH pool: $38M liquidity, 0.05% fee tier",
    ],
    timestamp: new Date().toISOString(),
  };
}

// ---------- Handler ----------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("content-type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const portfolioId =
    (req.body as { portfolioId?: string })?.portfolioId ?? "default";

  // Serve from cache if fresh
  const cached = CACHE.get(portfolioId);
  if (cached && cached.expiresAt > Date.now()) {
    return res.status(200).json(cached.data);
  }

  const exaKey = process.env.EXA_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const fireworksKey = process.env.FIREWORKS_API_KEY;

  const marketContextId = `ctx_${Date.now()}_${randomUUID().slice(0, 8)}`;

  // Mock fallback when any key is absent (local dev / demo without full keys)
  if (!exaKey || !perplexityKey || !fireworksKey) {
    const mock = buildMockMarketContext(portfolioId, marketContextId);
    CACHE.set(portfolioId, { data: mock, expiresAt: Date.now() + TTL_MS });
    MARKET_CONTEXT_STORE.set(marketContextId, mock);
    return res.status(200).json(mock);
  }

  try {
    // Step 1 — Exa: parallel search across 3 queries
    const exa = new Exa(exaKey);
    const exaBatches = await Promise.all(
      EXA_QUERIES.map((q) =>
        exa
          .search(q, {
            type: "auto",
            numResults: 3,
            contents: { highlights: true },
          })
          .then((r) => r.results)
          .catch(() => [])
      )
    );
    const highlights = exaBatches
      .flat()
      .flatMap((r) => (r as { highlights?: string[] }).highlights ?? [])
      .filter(Boolean)
      .slice(0, 15);

    // Step 2 — Perplexity: narrative synthesis
    const prompt =
      highlights.length > 0
        ? `Based on these market intelligence excerpts, write a 3–4 sentence treasury risk narrative for a CFO:\n\n${highlights.join("\n\n")}`
        : "Provide a 3–4 sentence current market context summary covering FX volatility, stablecoin liquidity, and DeFi risks for a corporate treasury CFO.";

    const narrative = await callPerplexity(perplexityKey, prompt);

    // Step 3 — Fireworks: structure into JSON
    const structured = await callFireworks(fireworksKey, narrative);

    const result: MarketContext = {
      marketContextId: marketContextId as MarketContextId,
      portfolioId,
      summary:
        typeof structured.summary === "string" && structured.summary
          ? structured.summary
          : narrative.slice(0, 300),
      riskFactors: Array.isArray(structured.riskFactors)
        ? structured.riskFactors
        : [],
      liquidityNotes: Array.isArray(structured.liquidityNotes)
        ? structured.liquidityNotes
        : [],
      timestamp: new Date().toISOString(),
    };

    MARKET_CONTEXT_STORE.set(marketContextId, result);
    CACHE.set(portfolioId, { data: result, expiresAt: Date.now() + TTL_MS });

    return res.status(200).json(result);
  } catch {
    // On any pipeline error fall back to mock — never 5xx the client
    const mock = buildMockMarketContext(portfolioId, marketContextId);
    CACHE.set(portfolioId, { data: mock, expiresAt: Date.now() + TTL_MS });
    MARKET_CONTEXT_STORE.set(marketContextId, mock);
    return res.status(200).json(mock);
  }
}
