/**
 * POST /api/cdp/wallet-token — Vercel Serverless Function (Node.js runtime)
 *
 * Issues a short-lived JWT signed with the CDP API key credentials.
 * The secret never leaves the server; the client receives only the token.
 *
 * Used by the frontend CDP SDK (or wagmi coinbaseWallet connector) to
 * authenticate an Embedded Wallet session on Base Sepolia.
 *
 * Returns: { token: string; expiresAt: number }
 * Errors:  { error: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, randomBytes } from "crypto";

function base64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function buildWalletToken(keyId: string, secretBytes: Buffer, userId?: string): { token: string; expiresAt: number } {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 300; // 5-minute window

  const header = base64url(
    JSON.stringify({ alg: "HS256", kid: keyId, typ: "JWT" }),
  );
  const payload = base64url(
    JSON.stringify({
      iss: keyId,
      sub: userId ?? "embedded_wallet_demo",
      aud: "cdp_embedded_wallet",
      iat: now,
      nbf: now,
      exp,
      jti: randomBytes(16).toString("hex"),
    }),
  );

  const sigInput = `${header}.${payload}`;
  const sig = base64url(createHmac("sha256", secretBytes).update(sigInput).digest());
  return { token: `${sigInput}.${sig}`, expiresAt: exp };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("content-type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.CDP_API_KEY;
  const secretKey = process.env.CDP_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(503).json({
      error: "CDP credentials not configured. Set CDP_API_KEY and CDP_SECRET_KEY as server-side env vars.",
    });
  }

  // Extract optional userId from request body (identifies the wallet owner)
  const { userId } = (req.body ?? {}) as { userId?: string };

  const secretBytes = Buffer.from(secretKey, "base64");
  const { token, expiresAt } = buildWalletToken(apiKey, secretBytes, userId);

  return res.status(200).json({ token, expiresAt });
}
