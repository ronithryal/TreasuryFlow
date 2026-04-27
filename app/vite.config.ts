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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), perplexityProxy(env.PERPLEXITY_API_KEY)],
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
