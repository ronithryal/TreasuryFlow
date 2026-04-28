/**
 * Testnet wiring: ABIs, addresses, and `as const` typed contract objects
 * suitable for wagmi `useReadContract` / `useWriteContract`.
 *
 * Addresses are loaded from Vite env at build time. When VITE_APP_MODE=mock,
 * these can stay empty; the app never references them in mock mode.
 */
import type { Address } from "viem";
import { baseSepolia } from "wagmi/chains";

export const TESTNET_CHAIN = baseSepolia;

const rawUsdc = (import.meta.env.VITE_MOCK_USDC_ADDRESS as string | undefined) ?? "";
const rawVault = (import.meta.env.VITE_TREASURY_VAULT_ADDRESS as string | undefined) ?? "";

export const MOCK_USDC_ADDRESS = (rawUsdc || "0x0000000000000000000000000000000000000000") as Address;
export const TREASURY_VAULT_ADDRESS = (rawVault || "0x0000000000000000000000000000000000000000") as Address;

export const TESTNET_CONFIGURED = !!rawUsdc && !!rawVault;

export const MOCK_USDC_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "", type: "address" }, { name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const TREASURY_VAULT_ABI = [
  { type: "function", name: "executePolicy", stateMutability: "nonpayable", inputs: [
    { name: "policyId", type: "string" },
    { name: "destination", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "action", type: "string" },
  ], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "balance", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "event", name: "PolicyExecuted", inputs: [
    { name: "policyId", type: "string", indexed: false },
    { name: "source", type: "address", indexed: true },
    { name: "destination", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "action", type: "string", indexed: false },
    { name: "timestamp", type: "uint256", indexed: false },
  ], anonymous: false },
] as const;

export const USDC_DECIMALS = 6;

/** Format a uint256 USDC amount (6 decimals) as a human number. */
export function formatUsdc(raw: bigint | undefined): number {
  if (!raw) return 0;
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/** Convert a human USDC number into the uint256 amount (6 decimals). */
export function toUsdcUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export const BASESCAN_TX = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;
export const BASESCAN_ADDR = (addr: string) => `https://sepolia.basescan.org/address/${addr}`;
