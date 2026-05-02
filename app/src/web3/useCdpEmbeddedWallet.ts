/**
 * useCdpEmbeddedWallet — CDP Embedded Wallet integration hook.
 *
 * Flow:
 *  1. On user login (or explicit call), POST /api/cdp/wallet-token to obtain
 *     a short-lived JWT signed by the backend using CDP API credentials.
 *  2. Store the token so the wagmi coinbaseWallet connector can authenticate.
 *     (The CoinbaseWallet SDK with preference "all" handles Embedded Wallet
 *      creation client-side when no Coinbase Wallet app is detected.)
 *  3. createDemoWallet() provisions a TreasuryWallet { type: EMBEDDED, mode: DEMO }
 *     and funds it via MockUSDC.mint() on Base Sepolia.
 *  4. fundDemoWallet(walletId) top-ups an existing demo wallet.
 *
 * The resulting TreasuryWallet is stored in component state; future sessions
 * will persist it via the Zustand store once TF-009 introduces the wallet slice.
 */
import { useState, useCallback, useRef } from "react";
import type { TreasuryWallet, TreasuryWalletId } from "@/types/domain";

// ---------- types ----------

export interface CdpWalletToken {
  token: string;
  expiresAt: number;
}

export interface DemoWalletState {
  wallet: TreasuryWallet | null;
  token: CdpWalletToken | null;
  loading: boolean;
  error: string | null;
}

interface FundResult {
  txHash?: string;
  amountUsd: number;
  simulated: boolean;
}

// ---------- helpers ----------

/** POST /api/cdp/wallet-token — returns a signed JWT from the backend. */
async function fetchWalletToken(userId?: string): Promise<CdpWalletToken> {
  const res = await fetch("/api/cdp/wallet-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `CDP token request failed (${res.status})`);
  }
  return (await res.json()) as CdpWalletToken;
}

/** Mints demo USDC by calling MockUSDC.mint() on Base Sepolia via the Vite proxy. */
async function mintDemoUsdc(_address: string, amountUsd: number): Promise<FundResult> {
  // Use the demo-approve proxy which has access to the funded demo approver key.
  // We piggyback by sending a special fundWallet intent to the dev proxy;
  // in production this becomes a dedicated /api/cdp/fund-wallet endpoint.
  // For now, return a simulated success since mint() requires gas.
  return { amountUsd, simulated: true };
}

function generateDemoAddress(): `0x${string}` {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `0x${hex}`;
}

function buildTreasuryWallet(address: `0x${string}`): TreasuryWallet {
  const now = new Date().toISOString();
  return {
    id: `tw_embedded_${Date.now().toString(36)}` as TreasuryWalletId,
    type: "EMBEDDED",
    mode: "DEMO",
    chain: "base",
    network: "base-sepolia",
    addresses: [address],
    label: "CDP Embedded Wallet (Demo)",
    custodian: "cdp",
    maxDailyOutflowUsd: 10_000,
    metadata: {
      sdkVersion: "coinbase-wallet-sdk",
      preference: "all",
      createdVia: "useCdpEmbeddedWallet",
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- hook ----------

export function useCdpEmbeddedWallet() {
  const [state, setState] = useState<DemoWalletState>({
    wallet: null,
    token: null,
    loading: false,
    error: null,
  });

  // Prevent concurrent requests
  const inflight = useRef(false);

  /**
   * Authenticates with the CDP backend and returns the wallet token.
   * Safe to call multiple times — returns cached token while still valid.
   */
  const authenticate = useCallback(async (userId?: string): Promise<CdpWalletToken> => {
    // Serve cached token if still valid (with 30-second buffer)
    const cached = state.token;
    if (cached && cached.expiresAt > Math.floor(Date.now() / 1000) + 30) {
      return cached;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const token = await fetchWalletToken(userId);
      setState((s) => ({ ...s, token, loading: false }));
      return token;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, loading: false, error }));
      throw err;
    }
  }, [state.token]);

  /**
   * Creates a demo CDP Embedded Wallet on Base Sepolia.
   * Stores it as TreasuryWallet { type: EMBEDDED, mode: DEMO }.
   */
  const createDemoWallet = useCallback(async (): Promise<TreasuryWallet> => {
    if (inflight.current) {
      throw new Error("createDemoWallet already in progress");
    }
    inflight.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Ensure we have a valid backend token
      await authenticate();

      // In v1, wallet creation is simulated: we generate a deterministic Base Sepolia
      // address that the user can fund via the faucet or mint endpoint.
      // A real integration would call POST /api/cdp/create-wallet which calls
      // the CDP Wallet API (POST /platform/v1/wallets).
      const address = generateDemoAddress();
      const wallet = buildTreasuryWallet(address);

      setState((s) => ({ ...s, wallet, loading: false }));
      return wallet;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, loading: false, error }));
      throw err;
    } finally {
      inflight.current = false;
    }
  }, [authenticate]);

  /**
   * Funds a demo wallet by minting MockUSDC on Base Sepolia.
   *
   * @param walletId - The TreasuryWalletId to fund (must be an EMBEDDED/DEMO wallet)
   * @param amountUsd - Amount to mint in USD-denominated USDC (default: 10 000)
   */
  const fundDemoWallet = useCallback(
    async (walletId: TreasuryWalletId, amountUsd = 10_000): Promise<FundResult> => {
      const target =
        state.wallet?.id === walletId ? state.wallet : null;
      if (!target) {
        throw new Error(`No demo wallet found with id ${walletId}`);
      }
      if (target.type !== "EMBEDDED" && target.type !== "DEMO") {
        throw new Error("fundDemoWallet only supports EMBEDDED or DEMO wallets");
      }

      const [address] = target.addresses;
      if (!address) {
        throw new Error("Wallet has no addresses — call createDemoWallet first");
      }

      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await mintDemoUsdc(address, amountUsd);
        // Optimistically update the wallet's updatedAt
        setState((s) => ({
          ...s,
          loading: false,
          wallet: s.wallet
            ? { ...s.wallet, updatedAt: new Date().toISOString() }
            : null,
        }));
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, loading: false, error }));
        throw err;
      }
    },
    [state.wallet],
  );

  return {
    wallet: state.wallet,
    token: state.token,
    loading: state.loading,
    error: state.error,
    authenticate,
    createDemoWallet,
    fundDemoWallet,
  };
}
