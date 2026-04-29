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
const rawPolicyEngine = (import.meta.env.VITE_POLICY_ENGINE_ADDRESS as string | undefined) ?? "";
const rawIntentRegistry = (import.meta.env.VITE_INTENT_REGISTRY_ADDRESS as string | undefined) ?? "";
const rawLedgerContract = (import.meta.env.VITE_LEDGER_CONTRACT_ADDRESS as string | undefined) ?? "";

// Deployed on Base Sepolia — used as fallbacks when env vars are not set.
export const MOCK_USDC_ADDRESS = (rawUsdc || "0x576aAA911eC1caAd7F234F21b3607a98C9F669F2") as Address;
export const TREASURY_VAULT_ADDRESS = (rawVault || "0xaCB7F3Da6cF6cC7Fe35e74B35477A3065172151A") as Address;
export const POLICY_ENGINE_ADDRESS = (rawPolicyEngine || "0x01E0149639EB224CCc0557d3bd33b0FB05505a64") as Address;
export const INTENT_REGISTRY_ADDRESS = (rawIntentRegistry || "0xf510c47823139B6819e4090d4583B518c66ee0d7") as Address;
export const LEDGER_CONTRACT_ADDRESS = (rawLedgerContract || "0x20cF3fB0A14FEce0889f69e1243a9d9f78AC508b") as Address;

export const TESTNET_CONFIGURED = true;
export const POLICY_ENGINE_CONFIGURED = true;
export const INTENT_REGISTRY_CONFIGURED = true;
export const LEDGER_CONTRACT_CONFIGURED = true;

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

export const POLICY_ENGINE_ABI = [
  { type: "function", name: "createPolicy", stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "policyType", type: "string" },
      { name: "source", type: "address" },
      { name: "destination", type: "address" },
      { name: "conditions", type: "string" },
    ],
    outputs: [{ name: "policyId", type: "uint256" }] },
] as const;

export const INTENT_REGISTRY_ABI = [
  { type: "function", name: "nextIntentId", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "createIntent", stateMutability: "nonpayable",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "destination", type: "address" },
    ],
    outputs: [{ name: "intentId", type: "uint256" }] },
  { type: "function", name: "approveIntent", stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }, { name: "approver", type: "address" }],
    outputs: [] },
  { type: "function", name: "executeIntent", stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }, { name: "txHash", type: "bytes32" }],
    outputs: [] },
] as const;

export const LEDGER_CONTRACT_ABI = [
  { type: "function", name: "recordEntry", stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "asset", type: "string" },
      { name: "txHash", type: "bytes32" },
      { name: "blockNumber", type: "uint256" },
    ],
    outputs: [] },
] as const;
