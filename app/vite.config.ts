import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Dev-only proxy for the Perplexity Agent API. Keeps the bearer token on the
// Node side; the browser only ever sees /api/agent-proxy. PERPLEXITY_API_KEY
// is read from process.env at dev startup, never bundled into client code.
function perplexityProxy(apiKey: string | undefined): Plugin {
  return {
    name: "perplexity-agent-proxy",
    configureServer(server) {
      server.middlewares.use("/api/agent-proxy", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "no_api_key", message: "PERPLEXITY_API_KEY is not set in .env" }));
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks).toString("utf-8");
          const upstream = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${apiKey}`,
            },
            body,
          });
          res.statusCode = upstream.status;
          upstream.headers.forEach((value, key) => {
            if (key.toLowerCase() === "content-encoding") return;
            res.setHeader(key, value);
          });
          const text = await upstream.text();
          res.end(text);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "upstream_error", message: String(err) }));
        }
      });
    },
  };
}

/**
 * Dev-only proxy for /api/demo-approve.
 * Uses DEMO_APPROVER_KEY + BASE_SEPOLIA_RPC_URL from process.env (never bundled).
 * In production, Vercel serves the real serverless function at app/api/demo-approve.ts.
 */
function demoApproverProxy(approverKey: string | undefined, rpcUrl: string | undefined, alchemyKey: string | undefined, intentRegistryAddress: string | undefined): Plugin {
  return {
    name: "demo-approver-proxy",
    configureServer(server) {
      server.middlewares.use("/api/demo-approve", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }
        if (!approverKey) {
          res.statusCode = 503;
          res.end(JSON.stringify({
            error: "Demo approver not configured. Add DEMO_APPROVER_KEY as a server-side Vercel env var.",
          }));
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as { intentId?: string; chainId?: number };
          const { intentId, chainId } = body;

          if (chainId !== undefined && Number(chainId) !== 84532) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Only Base Sepolia (chainId 84532) is supported." }));
            return;
          }
          if (!intentId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "intentId is required." }));
            return;
          }

          const { createWalletClient, createPublicClient, http, parseAbi } = await import("viem");
          const { baseSepolia } = await import("viem/chains");
          const { privateKeyToAccount } = await import("viem/accounts");

          const resolvedRpc = rpcUrl ??
            (alchemyKey ? `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}` : "https://sepolia.base.org");
          const registryAddr = (intentRegistryAddress ?? "0x53eb4406785aa86b64c662102745fc85cf93d459") as `0x${string}`;

          const key = approverKey.startsWith("0x") ? approverKey : `0x${approverKey}`;
          const account = privateKeyToAccount(key as `0x${string}`);

          const publicClient = createPublicClient({ chain: baseSepolia, transport: http(resolvedRpc) });
          const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(resolvedRpc) });

          const abi = parseAbi(["function approveIntent(uint256 intentId) external"]);
          const hash = await walletClient.writeContract({
            address: registryAddr,
            abi,
            functionName: "approveIntent",
            args: [BigInt(intentId)],
          });
          await publicClient.waitForTransactionReceipt({ hash });

          res.statusCode = 200;
          res.end(JSON.stringify({ approvalTxHash: hash, approverAddress: account.address }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: `Approval failed: ${err instanceof Error ? err.message : String(err)}` }));
        }
      });
    },
  };
}

function marketContextProxy(keys: {
  exa: string | undefined;
  perplexity: string | undefined;
  fireworks: string | undefined;
}): Plugin {
  const TTL_MS = 15 * 60 * 1000;
  const cache = new Map<string, { data: unknown; expiresAt: number }>();

  return {
    name: "market-context-proxy",
    configureServer(server) {
      server.middlewares.use("/api/market_context", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = JSON.parse(
          Buffer.concat(chunks).toString("utf-8") || "{}"
        ) as { portfolioId?: string };
        const portfolioId = body.portfolioId ?? "default";

        const cached = cache.get(portfolioId);
        if (cached && cached.expiresAt > Date.now()) {
          res.statusCode = 200;
          res.end(JSON.stringify(cached.data));
          return;
        }

        const { randomUUID } = await import("node:crypto");
        const marketContextId = `ctx_${Date.now()}_${randomUUID().slice(0, 8)}`;

        const buildMock = () => ({
          marketContextId,
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
        });

        if (!keys.exa || !keys.perplexity || !keys.fireworks) {
          const mock = buildMock();
          cache.set(portfolioId, { data: mock, expiresAt: Date.now() + TTL_MS });
          res.statusCode = 200;
          res.end(JSON.stringify(mock));
          return;
        }

        try {
          const Exa = (await import("exa-js")).default;
          const exa = new Exa(keys.exa);
          const queries = [
            "treasury management stablecoin USDC liquidity risk corporate 2025",
            "FX volatility USD cross-border payments corporate treasury hedge 2025",
            "DeFi liquidity Base Ethereum USDC yield stablecoin depeg risk",
          ];
          const batches = await Promise.all(
            queries.map((q) =>
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
          const highlights = batches
            .flat()
            .flatMap(
              (r: { highlights?: string[] }) => r.highlights ?? []
            )
            .filter(Boolean)
            .slice(0, 15);

          const prompt =
            highlights.length > 0
              ? `Based on these market intelligence excerpts, write a 3–4 sentence treasury risk narrative for a CFO:\n\n${highlights.join("\n\n")}`
              : "Provide a 3–4 sentence current market context summary covering FX volatility, stablecoin liquidity, and DeFi risks for a corporate treasury CFO.";

          const pplxRes = await fetch(
            "https://api.perplexity.ai/chat/completions",
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${keys.perplexity}`,
              },
              body: JSON.stringify({
                model: "sonar",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a treasury risk analyst. Synthesize market intelligence into a 3–4 sentence narrative for a CFO audience.",
                  },
                  { role: "user", content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 512,
              }),
            }
          );
          const pplxJson = (await pplxRes.json()) as {
            choices: Array<{ message: { content: string } }>;
          };
          const narrative =
            pplxJson.choices?.[0]?.message?.content ?? prompt;

          const fwRes = await fetch(
            "https://api.fireworks.ai/inference/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${keys.fireworks}`,
              },
              body: JSON.stringify({
                model:
                  "accounts/fireworks/models/llama-v3p1-70b-instruct",
                messages: [
                  {
                    role: "system",
                    content:
                      'Extract a JSON object with: { "summary": string, "riskFactors": string[], "liquidityNotes": string[] }. Output ONLY the JSON object.',
                  },
                  { role: "user", content: narrative },
                ],
                temperature: 0.1,
                max_tokens: 512,
              }),
            }
          );
          const fwJson = (await fwRes.json()) as {
            choices: Array<{ message: { content: string } }>;
          };
          const fwText =
            fwJson.choices?.[0]?.message?.content ?? "{}";
          const fwMatch = fwText.match(/\{[\s\S]*\}/);
          const structured = fwMatch
            ? (JSON.parse(fwMatch[0]) as {
                summary?: string;
                riskFactors?: string[];
                liquidityNotes?: string[];
              })
            : {};

          const result = {
            marketContextId,
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

          cache.set(portfolioId, {
            data: result,
            expiresAt: Date.now() + TTL_MS,
          });
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch {
          const mock = buildMock();
          cache.set(portfolioId, {
            data: mock,
            expiresAt: Date.now() + TTL_MS,
          });
          res.statusCode = 200;
          res.end(JSON.stringify(mock));
        }
      });
    },
  };
}

/**
 * Dev-only proxy for POST /api/cdp/wallet-token.
 * Signs a short-lived JWT with CDP_API_KEY + CDP_SECRET_KEY (never bundled).
 * In production, Vercel serves app/api/cdp/wallet-token.ts.
 */
function cdpWalletTokenProxy(apiKey: string | undefined, secretKey: string | undefined): Plugin {
  return {
    name: "cdp-wallet-token-proxy",
    configureServer(server) {
      server.middlewares.use("/api/cdp/wallet-token", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }
        if (!apiKey || !secretKey) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "CDP credentials not configured. Set CDP_API_KEY and CDP_SECRET_KEY." }));
          return;
        }
        try {
          const { createHmac, randomBytes } = await import("crypto");
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const { userId } = JSON.parse(
            Buffer.concat(chunks).toString("utf-8") || "{}"
          ) as { userId?: string };

          function b64url(data: Buffer | string): string {
            const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
            return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
          }

          const secretBytes = Buffer.from(secretKey, "base64");
          const now = Math.floor(Date.now() / 1000);
          const exp = now + 300;
          const header  = b64url(JSON.stringify({ alg: "HS256", kid: apiKey, typ: "JWT" }));
          const payload = b64url(JSON.stringify({
            iss: apiKey, sub: userId ?? "embedded_wallet_demo",
            aud: "cdp_embedded_wallet", iat: now, nbf: now, exp,
            jti: randomBytes(16).toString("hex"),
          }));
          const sigInput = `${header}.${payload}`;
          const sig = b64url(createHmac("sha256", secretBytes).update(sigInput).digest());
          res.statusCode = 200;
          res.end(JSON.stringify({ token: `${sigInput}.${sig}`, expiresAt: exp }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: `CDP token error: ${String(err)}` }));
        }
      });
    },
  };
}

/**
 * Dev-only proxy for GET /api/portfolio_state.
 * Returns static DEMO seed data in the PortfolioState shape.
 * In production, Vercel serves app/api/portfolio_state.ts.
 */
function portfolioStateProxy(): Plugin {
  return {
    name: "portfolio-state-proxy",
    configureServer(server) {
      server.middlewares.use("/api/portfolio_state", (_req, res) => {
        res.setHeader("content-type", "application/json");
        const NOW = new Date().toISOString();
        const TODAY = NOW.slice(0, 10);
        const wallets = [
          { id: "tw_demo_base_ops", type: "DEMO", mode: "DEMO", chain: "base", network: "base-sepolia", addresses: ["0x5f88f257cd264d0cfb2844debc8ea04406be8a1d"], label: "Base Ops Wallet (Demo)", custodian: "cdp", maxDailyOutflowUsd: 50000, metadata: { deployedBlock: 40834374 }, createdAt: `${TODAY}T00:00:00.000Z`, updatedAt: NOW },
          { id: "tw_embedded_demo", type: "EMBEDDED", mode: "DEMO", chain: "base", network: "base-sepolia", addresses: [], label: "CDP Embedded Wallet (Demo)", custodian: "cdp", maxDailyOutflowUsd: 10000, metadata: {}, createdAt: `${TODAY}T00:00:00.000Z`, updatedAt: NOW },
          { id: "tw_reserve", type: "DEMO", mode: "DEMO", chain: "base", network: "base-sepolia", addresses: ["0x240fb77d1c6bbe72bb59a08b379c7d94e905839b"], label: "Reserve Wallet (Demo)", custodian: "cdp", maxDailyOutflowUsd: 500000, metadata: {}, createdAt: `${TODAY}T00:00:00.000Z`, updatedAt: NOW },
        ];
        const balanceSnapshots = [
          { id: "bs_001", walletId: "tw_demo_base_ops", chain: "base", asset: "USDC", balance: 1250000, balanceUsd: 1250000, snapshotAt: NOW, source: "cdp" },
          { id: "bs_002", walletId: "tw_embedded_demo", chain: "base", asset: "USDC", balance: 0, balanceUsd: 0, snapshotAt: NOW, source: "cdp" },
          { id: "bs_003", walletId: "tw_reserve",       chain: "base", asset: "USDC", balance: 800000, balanceUsd: 800000, snapshotAt: NOW, source: "onchain" },
        ];
        const totalUsd = 2050000;
        const exposures = [
          { id: "exp_usdc_base", portfolioId: "demo_portfolio_1", asset: "USDC", chain: "base", issuer: "circle", amountUsd: totalUsd, pct: 1.0, concentrationRisk: "MEDIUM", computedAt: NOW },
        ];
        const custodyAccounts = [
          { id: "custody_fireblocks_hot",  name: "Fireblocks Hot Wallet",  balance: 250000,   currency: "USDC", custodian: "Fireblocks"     },
          { id: "custody_bitgo_cold",      name: "BitGo Cold Vault",       balance: 1500000,  currency: "USDC", custodian: "BitGo"          },
          { id: "custody_coinbase_prime",  name: "Coinbase Prime Reserve", balance: 500000,   currency: "USDC", custodian: "Coinbase Prime" },
        ];
        res.statusCode = 200;
        res.end(JSON.stringify({ portfolioId: "demo_portfolio_1", computedAt: NOW, mode: "DEMO", totalUsd, wallets, balanceSnapshots, exposures, custodyAccounts }));
      });
    },
  };
}

function exaSearchProxy(apiKey: string | undefined): Plugin {
  return {
    name: "exa-search-proxy",
    configureServer(server) {
      server.middlewares.use("/api/exa-search", async (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }
        if (!apiKey) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "EXA_API_KEY is not set in .env" }));
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const { query, numResults = 5 } = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as { query: string; numResults?: number };
          const upstream = await fetch("https://api.exa.ai/search", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": apiKey },
            body: JSON.stringify({ query, type: "auto", numResults, contents: { highlights: true } }),
          });
          res.statusCode = upstream.status;
          res.end(await upstream.text());
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: `Exa error: ${String(err)}` }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      perplexityProxy(env.PERPLEXITY_API_KEY),
      exaSearchProxy(env.EXA_API_KEY),
      marketContextProxy({
        exa: env.EXA_API_KEY,
        perplexity: env.PERPLEXITY_API_KEY,
        fireworks: env.FIREWORKS_API_KEY,
      }),
      demoApproverProxy(
        env.DEMO_APPROVER_KEY,
        env.BASE_SEPOLIA_RPC_URL,
        env.VITE_ALCHEMY_KEY,
        env.VITE_INTENT_REGISTRY_ADDRESS,
      ),
      cdpWalletTokenProxy(env.CDP_API_KEY, env.CDP_SECRET_KEY),
      portfolioStateProxy(),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: { port: 5173 },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
