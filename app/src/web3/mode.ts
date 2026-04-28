/**
 * Build-time feature flag that selects which "engine" runs the demo:
 *  - "mock"    → Zustand-only, deterministic seed data (default)
 *  - "testnet" → Wagmi/viem + Base Sepolia onchain execution
 *
 * Vercel project ENV controls this; the GitHub branch is the same.
 */
export type AppMode = "mock" | "testnet";

const raw = (import.meta.env.VITE_APP_MODE as string | undefined)?.toLowerCase();

export const APP_MODE: AppMode = raw === "testnet" ? "testnet" : "mock";

export const IS_TESTNET = APP_MODE === "testnet";
export const IS_MOCK = APP_MODE === "mock";
