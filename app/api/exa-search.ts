/**
 * /api/exa-search — Vercel Serverless Function (Node.js runtime)
 *
 * Proxies requests to the Exa search API, keeping EXA_API_KEY server-side.
 *
 * Body: { query: string; numResults?: number }
 * Returns: { results: ExaResult[] }
 * Errors:  { error: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Exa from "exa-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("content-type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "EXA_API_KEY is not configured" });
  }

  const { query, numResults = 5 } = req.body as { query?: string; numResults?: number };
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const exa = new Exa(apiKey);
    const data = await exa.search(query, {
      type: "auto",
      numResults,
      contents: { highlights: true },
    });
    return res.status(200).json({ results: data.results });
  } catch (err) {
    return res.status(502).json({ error: `Exa error: ${err instanceof Error ? err.message : String(err)}` });
  }
}
