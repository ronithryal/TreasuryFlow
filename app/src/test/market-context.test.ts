import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchMarketContext } from "@/services/market-context";
import { buildMockMarketContext } from "../../api/market_context";

// ---------- Shared fixtures ----------

const BASE_MOCK = buildMockMarketContext("portfolio_main", "ctx_1234_abcd1234");

const LIVE_RESPONSE = {
  marketContextId: "ctx_9999_live0001",
  portfolioId: "portfolio_main",
  summary: "USD liquidity is healthy. FX volatility remains elevated near 7%.",
  riskFactors: [
    "USD/EUR 30-day vol at 7.2%",
    "MiCA stablecoin compliance deadline Q4 2025",
  ],
  liquidityNotes: [
    "USDC depth $420M within 0.1% slippage on Base",
    "Circle redemption queue averaging 2 hours",
  ],
  timestamp: "2026-05-02T10:00:00.000Z",
};

// ---------- fetchMarketContext (client service) ----------

describe("fetchMarketContext", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(LIVE_RESPONSE),
      text: () => Promise.resolve(JSON.stringify(LIVE_RESPONSE)),
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /api/market_context", async () => {
    await fetchMarketContext("portfolio_main");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/market_context");
    expect(opts.method).toBe("POST");
  });

  it("sends portfolioId in request body", async () => {
    await fetchMarketContext("portfolio_main");
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { portfolioId: string };
    expect(body.portfolioId).toBe("portfolio_main");
  });

  it("defaults portfolioId to 'default' when omitted", async () => {
    await fetchMarketContext();
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { portfolioId: string };
    expect(body.portfolioId).toBe("default");
  });

  it("returns a MarketContext with all required fields", async () => {
    const ctx = await fetchMarketContext("portfolio_main");
    expect(ctx.marketContextId).toBe(LIVE_RESPONSE.marketContextId);
    expect(ctx.portfolioId).toBe(LIVE_RESPONSE.portfolioId);
    expect(typeof ctx.summary).toBe("string");
    expect(ctx.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(ctx.riskFactors)).toBe(true);
    expect(Array.isArray(ctx.liquidityNotes)).toBe(true);
    expect(typeof ctx.timestamp).toBe("string");
  });

  it("throws a descriptive error on non-OK response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve("Service unavailable"),
    });
    await expect(fetchMarketContext()).rejects.toThrow(
      "market_context failed (503)"
    );
  });

  it("includes the status code in the error message", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    await expect(fetchMarketContext()).rejects.toThrow("401");
  });
});

// ---------- buildMockMarketContext (handler utility) ----------

describe("buildMockMarketContext", () => {
  it("returns a valid MarketContext shape", () => {
    const ctx = buildMockMarketContext("portfolio_main", "ctx_test_00000001");
    expect(ctx.marketContextId).toBe("ctx_test_00000001");
    expect(ctx.portfolioId).toBe("portfolio_main");
    expect(typeof ctx.summary).toBe("string");
    expect(ctx.summary.length).toBeGreaterThan(20);
    expect(Array.isArray(ctx.riskFactors)).toBe(true);
    expect(Array.isArray(ctx.liquidityNotes)).toBe(true);
    expect(ctx.riskFactors.length).toBeGreaterThanOrEqual(3);
    expect(ctx.liquidityNotes.length).toBeGreaterThanOrEqual(2);
    expect(typeof ctx.timestamp).toBe("string");
  });

  it("uses the provided portfolioId", () => {
    const ctx = buildMockMarketContext("portfolio_xyz", "ctx_abc");
    expect(ctx.portfolioId).toBe("portfolio_xyz");
  });

  it("uses the provided marketContextId", () => {
    const ctx = buildMockMarketContext("default", "ctx_custom_id");
    expect(ctx.marketContextId).toBe("ctx_custom_id");
  });

  it("each riskFactor is a non-empty string", () => {
    const ctx = buildMockMarketContext("default", "ctx_1");
    for (const factor of ctx.riskFactors) {
      expect(typeof factor).toBe("string");
      expect(factor.length).toBeGreaterThan(0);
    }
  });

  it("each liquidityNote is a non-empty string", () => {
    const ctx = buildMockMarketContext("default", "ctx_1");
    for (const note of ctx.liquidityNotes) {
      expect(typeof note).toBe("string");
      expect(note.length).toBeGreaterThan(0);
    }
  });

  it("timestamp is a valid ISO 8601 string", () => {
    const ctx = buildMockMarketContext("default", "ctx_1");
    expect(new Date(ctx.timestamp).toISOString()).toBe(ctx.timestamp);
  });

  it("produces stable shape regardless of portfolioId", () => {
    const a = buildMockMarketContext("p1", "id1");
    const b = buildMockMarketContext("p2", "id2");
    expect(a.riskFactors.length).toBe(b.riskFactors.length);
    expect(a.liquidityNotes.length).toBe(b.liquidityNotes.length);
  });
});

// ---------- MarketContext schema contract ----------

describe("MarketContext contract", () => {
  it("BASE_MOCK satisfies the full contract", () => {
    expect(typeof BASE_MOCK.marketContextId).toBe("string");
    expect(typeof BASE_MOCK.portfolioId).toBe("string");
    expect(typeof BASE_MOCK.summary).toBe("string");
    expect(Array.isArray(BASE_MOCK.riskFactors)).toBe(true);
    expect(Array.isArray(BASE_MOCK.liquidityNotes)).toBe(true);
    expect(typeof BASE_MOCK.timestamp).toBe("string");
  });

  it("marketContextId can be used as ActionProposal.rationale.marketContextId", () => {
    // Simulates the reference pattern from ActionProposal
    const rationale = {
      summary: "Rebalancing due to FX pressure",
      marketContextId: BASE_MOCK.marketContextId,
    };
    expect(rationale.marketContextId).toBe(BASE_MOCK.marketContextId);
  });

  it("riskFactors are all under 120 chars (UI-renderable without truncation)", () => {
    for (const factor of BASE_MOCK.riskFactors) {
      expect(factor.length).toBeLessThanOrEqual(120);
    }
  });

  it("liquidityNotes are all under 120 chars (UI-renderable without truncation)", () => {
    for (const note of BASE_MOCK.liquidityNotes) {
      expect(note.length).toBeLessThanOrEqual(120);
    }
  });
});
