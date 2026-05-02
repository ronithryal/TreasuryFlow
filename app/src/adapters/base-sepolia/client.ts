/**
 * Shared viem clients for Base Sepolia — server-side only.
 * Import from this module in API routes and server-side adapters; never import
 * from frontend components (these reference process.env, not import.meta.env).
 *
 * RPC priority:
 *   1. BASE_SEPOLIA_RPC_URL (full URL, server-only)
 *   2. VITE_ALCHEMY_KEY (build-time key, assembled into Alchemy URL)
 *   3. Public Base Sepolia RPC (rate-limited fallback)
 */
import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * Minimal structural type covering what the helpers actually call.
 * Using a structural type rather than ReturnType<typeof createPublicClient>
 * avoids viem's chain-specific generic variance issues.
 */
export interface ViemPublicClient {
  getBalance(args: { address: Address }): Promise<bigint>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readContract(args: Record<string, any>): Promise<unknown>;
  waitForTransactionReceipt(args: { hash: `0x${string}` }): Promise<{
    status: "success" | "reverted";
    blockNumber: bigint;
  }>;
}

export interface ViemWalletClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeContract(args: Record<string, any>): Promise<`0x${string}`>;
}

export function getRpcUrl(): string {
  return (
    process.env.BASE_SEPOLIA_RPC_URL ??
    (process.env.VITE_ALCHEMY_KEY
      ? `https://base-sepolia.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`
      : "https://sepolia.base.org")
  );
}

export function makePublicClient(): ViemPublicClient {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
}

export interface WalletClientBundle {
  client: ViemWalletClient;
  // ReturnType is fine here — privateKeyToAccount is not chain-parameterised
  account: ReturnType<typeof privateKeyToAccount>;
}

export function makeWalletClient(privateKey: string): WalletClientBundle {
  const key = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);
  return {
    client: createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(getRpcUrl()),
    }),
    account,
  };
}

/** Uses DEMO_APPROVER_KEY from env — throws if not set. */
export function makeDemoWalletClient(): WalletClientBundle {
  const key = process.env.DEMO_APPROVER_KEY;
  if (!key) throw new Error("DEMO_APPROVER_KEY is not configured in environment");
  return makeWalletClient(key);
}
