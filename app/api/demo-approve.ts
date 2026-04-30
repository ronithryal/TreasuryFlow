/**
 * /api/demo-approve — Vercel Serverless Function (Node.js runtime)
 *
 * Signs IntentRegistry.approveIntent(intentId) using the server-side
 * DEMO_APPROVER_KEY. The private key is never exposed to the client.
 *
 * Returns: { approvalTxHash, approverAddress }
 * Errors:  { error: string }
 *
 * Only allows Base Sepolia (chainId 84532).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createWalletClient, createPublicClient, http, parseAbi, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const INTENT_REGISTRY_ABI = parseAbi([
  "function approveIntent(uint256 intentId) external",
]);

// Resolve the IntentRegistry address: prefer env var, fall back to hardcoded deployment.
const INTENT_REGISTRY_ADDRESS: Address =
  (process.env.VITE_INTENT_REGISTRY_ADDRESS as Address | undefined) ??
  "0x53eb4406785aa86b64c662102745fc85cf93d459";

// RPC: use Alchemy key if present, otherwise the public Base Sepolia RPC.
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ??
  (process.env.VITE_ALCHEMY_KEY
    ? `https://base-sepolia.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`
    : "https://sepolia.base.org");

// Demo mode: using seeded approver keypair — set DEMO_APPROVER_KEY in production for real signing.
// This is Hardhat/Anvil account[1], a well-documented test key safe for demo/development.
// IntentRegistry.approveIntent enforces initiator ≠ approver but has no signer allowlist,
// so this key works out of the box as long as the user's wallet is the initiator.
const SEEDED_DEMO_APPROVER_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // DEMO_APPROVER_KEY is optional. Falls back to the seeded demo keypair so the
  // golden path completes out of the box without any Vercel env var configuration.
  const rawKey = process.env.DEMO_APPROVER_KEY ?? SEEDED_DEMO_APPROVER_KEY;

  // Parse and validate request body
  const { intentId, chainId } = req.body ?? {};

  if (chainId !== undefined && Number(chainId) !== 84532) {
    return res.status(400).json({ error: "Only Base Sepolia (chainId 84532) is supported." });
  }

  if (intentId === undefined || intentId === null) {
    return res.status(400).json({ error: "intentId is required." });
  }

  const intentIdBigInt = BigInt(intentId);

  try {
    const key = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    const account = privateKeyToAccount(key as `0x${string}`);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    // Sign and broadcast the approval
    const hash = await walletClient.writeContract({
      address: INTENT_REGISTRY_ADDRESS,
      abi: INTENT_REGISTRY_ABI,
      functionName: "approveIntent",
      args: [intentIdBigInt],
      chain: baseSepolia,
    });

    // Wait for confirmation before returning — ensures approval is onchain
    await publicClient.waitForTransactionReceipt({ hash });

    return res.status(200).json({
      approvalTxHash: hash,
      approverAddress: account.address,
    });
  } catch (err) {
    console.error("[demo-approve] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    // Surface specific revert messages for debugging
    return res.status(500).json({ error: `Approval failed: ${message}` });
  }
}
