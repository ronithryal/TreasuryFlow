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
          const upstream = await fetch("https://api.perplexity.ai/v1/agent", {
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      perplexityProxy(env.PERPLEXITY_API_KEY),
      demoApproverProxy(
        env.DEMO_APPROVER_KEY,
        env.BASE_SEPOLIA_RPC_URL,
        env.VITE_ALCHEMY_KEY,
        env.VITE_INTENT_REGISTRY_ADDRESS,
      ),
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
