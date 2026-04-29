/**
 * Testnet wiring: ABIs, addresses, and `as const` typed contract objects
 * suitable for wagmi `useReadContract` / `useWriteContract`.
 *
 * Addresses reflect the P0 refactor_demo deployment on Base Sepolia (block 40834374).
 * Previous addresses (pre-refactor) are no longer valid — the contract ABIs changed.
 *
 * Addresses are also loadable from Vite env vars at build time.
 * When VITE_APP_MODE=mock these are unused.
 */
import type { Address } from "viem";
import { baseSepolia } from "wagmi/chains";

export const TESTNET_CHAIN = baseSepolia;

const rawUsdc           = (import.meta.env.VITE_MOCK_USDC_ADDRESS         as string | undefined) ?? "";
const rawVault          = (import.meta.env.VITE_TREASURY_VAULT_ADDRESS     as string | undefined) ?? "";
const rawPolicyEngine   = (import.meta.env.VITE_POLICY_ENGINE_ADDRESS      as string | undefined) ?? "";
const rawIntentRegistry = (import.meta.env.VITE_INTENT_REGISTRY_ADDRESS    as string | undefined) ?? "";
const rawLedgerContract = (import.meta.env.VITE_LEDGER_CONTRACT_ADDRESS    as string | undefined) ?? "";

// ── P0 refactor_demo deployment — Base Sepolia, block 40834374 ───────────────
export const MOCK_USDC_ADDRESS         = (rawUsdc           || "0x240fb77d1c6bbe72bb59a08b379c7d94e905839b") as Address;
export const POLICY_ENGINE_ADDRESS     = (rawPolicyEngine   || "0x0f01f0632a35493b63c87a4a422a783213abad0e") as Address;
export const LEDGER_CONTRACT_ADDRESS   = (rawLedgerContract || "0x7e97006ccaf3050ae1f5c2187baab1b03287c12b") as Address;
export const TREASURY_VAULT_ADDRESS    = (rawVault          || "0x5f88f257cd264d0cfb2844debc8ea04406be8a1d") as Address;
export const INTENT_REGISTRY_ADDRESS   = (rawIntentRegistry || "0x53eb4406785aa86b64c662102745fc85cf93d459") as Address;

export const TESTNET_CONFIGURED          = true;
export const POLICY_ENGINE_CONFIGURED    = true;
export const INTENT_REGISTRY_CONFIGURED  = true;
export const LEDGER_CONTRACT_CONFIGURED  = true;

// ── Pre-deployed demo policy IDs (created by Deploy.s.sol) ───────────────────
export const DEMO_POLICIES = {
  VENDOR_PAYMENT:  { id: 1n, name: "Vendor Payment",  maxAmount: 10_000e6  },
  TREASURY_SWEEP:  { id: 2n, name: "Treasury Sweep",  maxAmount: 100_000e6 },
  YIELD_DEPOSIT:   { id: 3n, name: "Yield Deposit",   maxAmount: 500_000e6 },
} as const;

// Default policy for the golden-path demo
export const DEFAULT_DEMO_POLICY_ID = DEMO_POLICIES.VENDOR_PAYMENT.id;

// ── ABIs ─────────────────────────────────────────────────────────────────────

export const MOCK_USDC_ABI = [
  { type: "function", name: "balanceOf",   stateMutability: "view",        inputs: [{ name: "account", type: "address" }],                                 outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "decimals",    stateMutability: "view",        inputs: [],                                                                      outputs: [{ name: "", type: "uint8"   }] },
  { type: "function", name: "symbol",      stateMutability: "view",        inputs: [],                                                                      outputs: [{ name: "", type: "string"  }] },
  { type: "function", name: "allowance",   stateMutability: "view",        inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "mint",        stateMutability: "nonpayable",  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],  outputs: [] },
  { type: "function", name: "approve",     stateMutability: "nonpayable",  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "transfer",    stateMutability: "nonpayable",  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],  outputs: [{ name: "", type: "bool" }] },
  { type: "event",    name: "Transfer",    inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }], anonymous: false },
  { type: "event",    name: "Approval",    inputs: [{ name: "owner", type: "address", indexed: true }, { name: "spender", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }], anonymous: false },
] as const;

// PolicyEngine — createPolicy is onlyOwner (demo uses pre-deployed policies).
// validateIntent and setPolicyActive are included for read/admin use.
export const POLICY_ENGINE_ABI = [
  { type: "function", name: "nextPolicyId",  stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "validateIntent", stateMutability: "view",
    inputs: [
      { name: "policyId",    type: "uint256" },
      { name: "source",      type: "address" },
      { name: "destination", type: "address" },
      { name: "amount",      type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "policies", stateMutability: "view",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      { name: "id",          type: "uint256" },
      { name: "name",        type: "string"  },
      { name: "policyType",  type: "string"  },
      { name: "source",      type: "address" },
      { name: "destination", type: "address" },
      { name: "maxAmount",   type: "uint256" },
      { name: "conditions",  type: "string"  },
      { name: "version",     type: "uint256" },
      { name: "createdAt",   type: "uint256" },
      { name: "active",      type: "bool"    },
    ] },
  { type: "function", name: "createPolicy", stateMutability: "nonpayable",
    inputs: [
      { name: "name",        type: "string"  },
      { name: "policyType",  type: "string"  },
      { name: "source",      type: "address" },
      { name: "destination", type: "address" },
      { name: "maxAmount",   type: "uint256" },
      { name: "conditions",  type: "string"  },
    ],
    outputs: [{ name: "policyId", type: "uint256" }] },
  { type: "function", name: "setPolicyActive", stateMutability: "nonpayable",
    inputs: [{ name: "policyId", type: "uint256" }, { name: "active", type: "bool" }],
    outputs: [] },
  { type: "event", name: "PolicyCreated", inputs: [
    { name: "policyId",   type: "uint256", indexed: true  },
    { name: "name",       type: "string",  indexed: false },
    { name: "policyType", type: "string",  indexed: false },
    { name: "source",     type: "address", indexed: true  },
    { name: "destination",type: "address", indexed: true  },
    { name: "maxAmount",  type: "uint256", indexed: false },
    { name: "conditions", type: "string",  indexed: false },
    { name: "version",    type: "uint256", indexed: false },
  ], anonymous: false },
] as const;

// IntentRegistry — the core P0 flow.
// approveIntent: takes only intentId (msg.sender = approver, enforced onchain).
// executeIntent: takes only intentId (msg.sender must == initiator, enforced onchain).
// txHash is NOT a parameter anywhere — read from receipt.transactionHash.
export const INTENT_REGISTRY_ABI = [
  { type: "function", name: "nextIntentId", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "policyEngine", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "vault",        stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "ledger",       stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "intents", stateMutability: "view",
    inputs: [{ name: "intentId", type: "uint256" }],
    outputs: [
      { name: "id",          type: "uint256" },
      { name: "initiator",   type: "address" },
      { name: "policyId",    type: "uint256" },
      { name: "amount",      type: "uint256" },
      { name: "destination", type: "address" },
      { name: "approver",    type: "address" },
      { name: "status",      type: "uint8"   },
      { name: "createdAt",   type: "uint256" },
    ] },
  { type: "function", name: "createIntent", stateMutability: "nonpayable",
    inputs: [
      { name: "policyId",    type: "uint256" },
      { name: "amount",      type: "uint256" },
      { name: "destination", type: "address" },
    ],
    outputs: [{ name: "intentId", type: "uint256" }] },
  // approveIntent: no address param — msg.sender is the approver (onchain maker-checker)
  { type: "function", name: "approveIntent", stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }],
    outputs: [] },
  // executeIntent: no txHash param — read txHash from receipt.transactionHash
  { type: "function", name: "executeIntent", stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }],
    outputs: [] },
  { type: "function", name: "cancelIntent", stateMutability: "nonpayable",
    inputs: [{ name: "intentId", type: "uint256" }, { name: "reason", type: "string" }],
    outputs: [] },
  // Events — include enough data for audit display
  { type: "event", name: "IntentCreated", inputs: [
    { name: "intentId",    type: "uint256", indexed: true  },
    { name: "policyId",    type: "uint256", indexed: true  },
    { name: "amount",      type: "uint256", indexed: false },
    { name: "destination", type: "address", indexed: true  },
    { name: "initiator",   type: "address", indexed: false },
  ], anonymous: false },
  { type: "event", name: "IntentApproved", inputs: [
    { name: "intentId", type: "uint256", indexed: true  },
    { name: "approver", type: "address", indexed: true  },
  ], anonymous: false },
  { type: "event", name: "IntentExecuted", inputs: [
    { name: "intentId", type: "uint256", indexed: true },
    { name: "executor", type: "address", indexed: true },
  ], anonymous: false },
  { type: "event", name: "IntentRejected", inputs: [
    { name: "intentId",    type: "uint256", indexed: true  },
    { name: "cancelledBy", type: "address", indexed: true  },
    { name: "reason",      type: "string",  indexed: false },
  ], anonymous: false },
  { type: "event", name: "LedgerEntryPosted", inputs: [
    { name: "intentId",    type: "uint256", indexed: true  },
    { name: "blockNumber", type: "uint256", indexed: false },
  ], anonymous: false },
] as const;

// TreasuryVault — no public execution entrypoint.
// executeApprovedIntent is onlyIntentRegistry — not callable from frontend.
export const TREASURY_VAULT_ABI = [
  { type: "function", name: "token",           stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "policyEngine",    stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "intentRegistry",  stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "balance",         stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "deposited",       stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "withdraw",        stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  // PolicyExecuted: policyId is now uint256 (was string in old ABI)
  { type: "event", name: "PolicyExecuted", inputs: [
    { name: "policyId",    type: "uint256", indexed: true  },
    { name: "initiator",   type: "address", indexed: true  },
    { name: "destination", type: "address", indexed: true  },
    { name: "amount",      type: "uint256", indexed: false },
    { name: "timestamp",   type: "uint256", indexed: false },
  ], anonymous: false },
  { type: "event", name: "Withdraw", inputs: [
    { name: "to",     type: "address", indexed: true  },
    { name: "amount", type: "uint256", indexed: false },
  ], anonymous: false },
] as const;

// LedgerContract — called internally by IntentRegistry (not called from frontend).
// The intentRef field is bytes32(uint256(intentId)) — NOT a tx hash.
// The real txHash comes from receipt.transactionHash.
export const LEDGER_CONTRACT_ABI = [
  { type: "function", name: "authorized",    stateMutability: "view", inputs: [{ name: "caller", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "setAuthorized", stateMutability: "nonpayable", inputs: [{ name: "caller", type: "address" }, { name: "enabled", type: "bool" }], outputs: [] },
  { type: "function", name: "recordEntry",   stateMutability: "nonpayable",
    inputs: [
      { name: "from",       type: "address" },
      { name: "to",         type: "address" },
      { name: "amount",     type: "uint256" },
      { name: "asset",      type: "string"  },
      { name: "intentRef",  type: "bytes32" },   // bytes32(uint256(intentId)) — NOT a tx hash
      { name: "blockNumber",type: "uint256" },
    ],
    outputs: [] },
  { type: "event", name: "LedgerEntryRecorded", inputs: [
    { name: "from",       type: "address", indexed: true  },
    { name: "to",         type: "address", indexed: true  },
    { name: "amount",     type: "uint256", indexed: false },
    { name: "asset",      type: "string",  indexed: false },
    { name: "intentRef",  type: "bytes32", indexed: true  },  // bytes32(uint256(intentId))
    { name: "blockNumber",type: "uint256", indexed: false },
    { name: "timestamp",  type: "uint256", indexed: false },
  ], anonymous: false },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

export const USDC_DECIMALS = 6;

/** Format a uint256 USDC amount (6 decimals) as a human-readable number. */
export function formatUsdc(raw: bigint | undefined): number {
  if (!raw) return 0;
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/** Convert a human USDC number into the uint256 base-unit amount (6 decimals). */
export function toUsdcUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export const BASESCAN_TX   = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;
export const BASESCAN_ADDR = (addr: string) => `https://sepolia.basescan.org/address/${addr}`;
