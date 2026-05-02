/**
 * GET /api/portfolio_state — Vercel Serverless Function (Node.js runtime)
 *
 * Returns a compressed JSON snapshot of the demo treasury portfolio,
 * suitable for consumption by Hermes (TF-003) and the TF-009 Dashboard.
 *
 * In v1 this runs against static DEMO seed data (no database).
 * v1.1 will replace with a live Postgres aggregation.
 *
 * Response shape: PortfolioState (documented in eng.md TF-005 section)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ---------- types (inlined to keep this function self-contained) ----------
interface TreasuryWalletShape {
  id: string;
  type: "EMBEDDED" | "EXTERNAL" | "DEMO";
  mode: "DEMO" | "PRODUCTION";
  chain: string;
  network: string;
  addresses: string[];
  label: string;
  custodian?: string;
  maxDailyOutflowUsd?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface BalanceSnapshotShape {
  id: string;
  walletId: string;
  chain: string;
  asset: string;
  balance: number;
  balanceUsd: number;
  snapshotAt: string;
  source: "onchain" | "cdp" | "custody" | "manual";
}

interface ExposureShape {
  id: string;
  portfolioId: string;
  asset: string;
  chain?: string;
  counterparty?: string;
  issuer?: string;
  amountUsd: number;
  pct: number;
  concentrationRisk: "LOW" | "MEDIUM" | "HIGH";
  computedAt: string;
}

interface CustodyAccountShape {
  id: string;
  name: string;
  balance: number;
  currency: string;
  custodian: string;
}

export interface PortfolioState {
  portfolioId: string;
  computedAt: string;
  mode: "DEMO" | "PRODUCTION";
  totalUsd: number;
  wallets: TreasuryWalletShape[];
  balanceSnapshots: BalanceSnapshotShape[];
  exposures: ExposureShape[];
  custodyAccounts: CustodyAccountShape[];
}

// ---------- DEMO seed data ----------
const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

const DEMO_WALLETS: TreasuryWalletShape[] = [
  {
    id: "tw_demo_base_ops",
    type: "DEMO",
    mode: "DEMO",
    chain: "base",
    network: "base-sepolia",
    addresses: ["0x5f88f257cd264d0cfb2844debc8ea04406be8a1d"],
    label: "Base Ops Wallet (Demo)",
    custodian: "cdp",
    maxDailyOutflowUsd: 50_000,
    metadata: { deployedBlock: 40834374, contract: "TreasuryVault" },
    createdAt: `${TODAY}T00:00:00.000Z`,
    updatedAt: NOW,
  },
  {
    id: "tw_embedded_demo",
    type: "EMBEDDED",
    mode: "DEMO",
    chain: "base",
    network: "base-sepolia",
    addresses: [],
    label: "CDP Embedded Wallet (Demo)",
    custodian: "cdp",
    maxDailyOutflowUsd: 10_000,
    metadata: { sdkVersion: "coinbase-wallet-sdk", preference: "eoaOnly" },
    createdAt: `${TODAY}T00:00:00.000Z`,
    updatedAt: NOW,
  },
  {
    id: "tw_reserve",
    type: "DEMO",
    mode: "DEMO",
    chain: "base",
    network: "base-sepolia",
    addresses: ["0x240fb77d1c6bbe72bb59a08b379c7d94e905839b"],
    label: "Reserve Wallet (Demo)",
    custodian: "cdp",
    maxDailyOutflowUsd: 500_000,
    metadata: { contract: "MockUSDC" },
    createdAt: `${TODAY}T00:00:00.000Z`,
    updatedAt: NOW,
  },
];

const DEMO_BALANCE_SNAPSHOTS: BalanceSnapshotShape[] = [
  {
    id: "bs_001",
    walletId: "tw_demo_base_ops",
    chain: "base",
    asset: "USDC",
    balance: 1_250_000,
    balanceUsd: 1_250_000,
    snapshotAt: NOW,
    source: "cdp",
  },
  {
    id: "bs_002",
    walletId: "tw_embedded_demo",
    chain: "base",
    asset: "USDC",
    balance: 0,
    balanceUsd: 0,
    snapshotAt: NOW,
    source: "cdp",
  },
  {
    id: "bs_003",
    walletId: "tw_reserve",
    chain: "base",
    asset: "USDC",
    balance: 800_000,
    balanceUsd: 800_000,
    snapshotAt: NOW,
    source: "onchain",
  },
];

const TOTAL_USD = DEMO_BALANCE_SNAPSHOTS.reduce((s, b) => s + b.balanceUsd, 0);

const DEMO_EXPOSURES: ExposureShape[] = [
  {
    id: "exp_usdc_base",
    portfolioId: "demo_portfolio_1",
    asset: "USDC",
    chain: "base",
    issuer: "circle",
    amountUsd: TOTAL_USD,
    pct: 1.0,
    concentrationRisk: "MEDIUM",
    computedAt: NOW,
  },
];

const DEMO_CUSTODY_ACCOUNTS: CustodyAccountShape[] = [
  { id: "custody_fireblocks_hot",   name: "Fireblocks Hot Wallet",    balance: 250_000,   currency: "USDC", custodian: "Fireblocks"      },
  { id: "custody_bitgo_cold",       name: "BitGo Cold Vault",         balance: 1_500_000, currency: "USDC", custodian: "BitGo"           },
  { id: "custody_coinbase_prime",   name: "Coinbase Prime Reserve",   balance: 500_000,   currency: "USDC", custodian: "Coinbase Prime"  },
];

// ---------- handler ----------
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("content-type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const state: PortfolioState = {
    portfolioId: "demo_portfolio_1",
    computedAt: new Date().toISOString(),
    mode: "DEMO",
    totalUsd: TOTAL_USD,
    wallets: DEMO_WALLETS,
    balanceSnapshots: DEMO_BALANCE_SNAPSHOTS,
    exposures: DEMO_EXPOSURES,
    custodyAccounts: DEMO_CUSTODY_ACCOUNTS,
  };

  return res.status(200).json(state);
}
