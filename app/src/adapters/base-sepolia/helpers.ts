/**
 * Base Sepolia onchain helpers — TF-006
 *
 * Four server-side helpers that abstract viem interactions with the deployed
 * TreasuryFlow contracts and standard ERC-20 tokens on Base Sepolia.
 *
 * All helpers accept an optional injectable `publicClient` / `walletBundle` for
 * unit testing without network access.
 *
 * After each write operation the helper returns a typed `ExecutionRecord` and
 * (where applicable) a fresh `BalanceSnapshot`. Callers (API routes /
 * ExecutionRunner) are responsible for persisting these to their store.
 *
 * contractSwap — SWAP_MOCKED = true in v1.
 * TreasuryFlow deploys PolicyEngine / IntentRegistry / TreasuryVault /
 * LedgerContract but not a DEX. Swap logic will be wired to Uniswap V3 on
 * Base Sepolia in TF-020. Until then, contractSwap validates the demo cap
 * and returns a realistic ExecutionRecord without executing a real onchain swap.
 */

import { parseAbi, parseUnits, formatUnits, type Address } from "viem";
import type { ViemPublicClient, WalletClientBundle } from "./client";
import { makePublicClient, makeDemoWalletClient } from "./client";
import type {
  BalanceSnapshot,
  BalanceSnapshotId,
  ExecutionRecord,
  ExecutionRecordId,
  ExecutionPlanId,
  ExecutionStepId,
  TreasuryWalletId,
} from "@/types/domain";

// ── Constants ──────────────────────────────────────────────────────────────────

/** MockUSDC address on Base Sepolia (P0 refactor_demo deployment). */
export const MOCK_USDC_ADDRESS: Address =
  (process.env.VITE_MOCK_USDC_ADDRESS as Address | undefined) ??
  "0x240fb77d1c6bbe72bb59a08b379c7d94e905839b";

export const MOCK_USDC_DECIMALS = 6;

/**
 * Demo mode caps enforced by write helpers.
 * These match the VENDOR_PAYMENT policy max on the deployed PolicyEngine.
 */
export const DEMO_TRANSFER_CAP_USD = 10_000;
export const DEMO_SWAP_CAP_USD = 10_000;

/**
 * contractSwap is a stub in v1 — no real DEX is part of TF's Base Sepolia
 * deployment. TF-020 will wire up Uniswap V3 or Aerodrome and flip this to false.
 */
export const SWAP_MOCKED = true;

// ── Minimal ABIs ───────────────────────────────────────────────────────────────

const ERC20_READ_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

const ERC20_WRITE_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TokenInfo {
  symbol: string;
  contractAddress: string;
  balance: number;   // human-readable (e.g., 1234.56)
  decimals: number;
}

export interface WalletBalance {
  address: string;
  ethBalance: number;        // ETH in whole units
  tokens: TokenInfo[];
  snapshots: BalanceSnapshot[];
}

export interface ContractSwapParams {
  /** ERC-20 token address to swap from. */
  fromToken: string;
  /** ERC-20 token address to swap to. */
  toToken: string;
  /** Amount to swap in human-readable units (e.g., 500 for $500 USDC). */
  amountIn: number;
  /** Minimum acceptable output; unused in mock mode. */
  minAmountOut?: number;
  /** Slippage tolerance in basis points (default 50 = 0.5%). */
  slippageBps?: number;
  /** Optional DEX router address — ignored in mock mode. */
  routerAddress?: string;
  /** Signs the transaction; defaults to DEMO_APPROVER_KEY. */
  signerPrivateKey?: string;
  /** Max USD notional enforced in demo mode (default DEMO_SWAP_CAP_USD). */
  maxNotionalUsd?: number;
  planId: string;
  stepId: string;
  walletId: string;
  /** When true (default) enforce the demo cap and use mock execution. */
  demoMode?: boolean;
}

export interface ContractSwapResult {
  txHash?: string;   // undefined in mock mode
  amountOut?: number;
  mocked: boolean;
  executionRecord: ExecutionRecord;
}

export interface TransferStablecoinParams {
  /** Token sender — must match the signer's address. */
  from: string;
  /** Token recipient. */
  to: string;
  /** Amount in human-readable USDC (e.g., 1000 for $1,000). */
  amount: number;
  /** ERC-20 token address; defaults to MOCK_USDC_ADDRESS. */
  tokenAddress?: string;
  /** Token decimals; defaults to MOCK_USDC_DECIMALS (6). */
  tokenDecimals?: number;
  /** Signs the transaction; defaults to DEMO_APPROVER_KEY. */
  signerPrivateKey?: string;
  /** Max USD amount allowed in demo mode (default DEMO_TRANSFER_CAP_USD). */
  maxAmountUsd?: number;
  planId: string;
  stepId: string;
  walletId: string;
  /** When true (default) enforce demo cap. */
  demoMode?: boolean;
}

export interface TransferStablecoinResult {
  txHash: string;
  amount: number;
  executionRecord: ExecutionRecord;
  /** Post-transfer USDC balance of the `from` address. */
  balanceSnapshot: BalanceSnapshot;
}

// ── ID generators ──────────────────────────────────────────────────────────────

function snapshotId(addr: string, asset: string): BalanceSnapshotId {
  return `snap_${asset}_${addr.slice(2, 10)}_${Date.now()}` as BalanceSnapshotId;
}

function recordId(stepId: string): ExecutionRecordId {
  return `rec_${stepId}_${Date.now()}` as ExecutionRecordId;
}

// ── Helper 1: chainGetBalances ────────────────────────────────────────────────

/**
 * Read ETH and ERC-20 balances for one or more wallet addresses on Base Sepolia.
 *
 * By default queries MockUSDC. Pass `extraTokens` to query additional ERC-20s.
 * Returns one `BalanceSnapshot` per (address × asset) pair.
 *
 * @param walletAddresses  Array of `0x…` addresses to query.
 * @param _chain           Reserved for future multi-chain support; currently
 *                         always queries Base Sepolia.
 * @param opts.extraTokens Additional ERC-20 tokens to query.
 * @param opts.walletIdMap Map from address → TreasuryWalletId; falls back to
 *                         address when not provided.
 * @param opts.publicClient Injectable client for unit tests.
 */
export async function chainGetBalances(
  walletAddresses: string[],
  _chain?: string,
  opts?: {
    extraTokens?: Array<{ symbol: string; address: string; decimals: number }>;
    walletIdMap?: Record<string, string>;
    publicClient?: ViemPublicClient;
  },
): Promise<WalletBalance[]> {
  const client = opts?.publicClient ?? makePublicClient();
  const now = new Date().toISOString();

  const defaultTokens: Array<{ symbol: string; address: string; decimals: number }> = [
    { symbol: "mUSDC", address: MOCK_USDC_ADDRESS, decimals: MOCK_USDC_DECIMALS },
  ];
  const tokens = [...defaultTokens, ...(opts?.extraTokens ?? [])];

  const results: WalletBalance[] = [];

  for (const addr of walletAddresses) {
    const walletId = (opts?.walletIdMap?.[addr] ?? addr) as TreasuryWalletId;

    // ETH balance
    const ethWei = await client.getBalance({ address: addr as Address });
    const ethBalance = Number(formatUnits(ethWei, 18));

    // ERC-20 balances
    const tokenInfos: TokenInfo[] = [];
    const snapshots: BalanceSnapshot[] = [];

    for (const tok of tokens) {
      const rawBalance = await client.readContract({
        address: tok.address as Address,
        abi: ERC20_READ_ABI,
        functionName: "balanceOf",
        args: [addr as Address],
      }) as bigint;

      const humanBalance = Number(formatUnits(rawBalance, tok.decimals));

      tokenInfos.push({
        symbol: tok.symbol,
        contractAddress: tok.address,
        balance: humanBalance,
        decimals: tok.decimals,
      });

      snapshots.push({
        id: snapshotId(addr, tok.symbol),
        walletId,
        chain: "base-sepolia",
        asset: tok.symbol,
        balance: humanBalance,
        balanceUsd: humanBalance,   // 1:1 for stablecoins; extend for price feeds
        snapshotAt: now,
        source: "onchain",
      });
    }

    // ETH snapshot
    snapshots.push({
      id: snapshotId(addr, "ETH"),
      walletId,
      chain: "base-sepolia",
      asset: "ETH",
      balance: ethBalance,
      balanceUsd: ethBalance * 0,  // price feed out of scope for v1
      snapshotAt: now,
      source: "onchain",
    });

    results.push({ address: addr, ethBalance, tokens: tokenInfos, snapshots });
  }

  return results;
}

// ── Helper 2: contractCallRead ────────────────────────────────────────────────

/**
 * Generic read-only contract call on Base Sepolia.
 *
 * @param contractAddress   Target contract as `0x…` string.
 * @param functionSignature Human ABI fragment, e.g.
 *   `"function balanceOf(address owner) view returns (uint256)"`.
 * @param args              Positional arguments matching the signature.
 * @param _chain            Reserved; always targets Base Sepolia.
 * @param publicClient      Injectable for unit tests.
 *
 * @returns The raw value returned by the contract (bigint, string, etc.).
 *          Callers are responsible for casting to the expected type.
 */
export async function contractCallRead(
  contractAddress: string,
  functionSignature: string,
  args: unknown[],
  _chain?: string,
  publicClient?: ViemPublicClient,
): Promise<unknown> {
  const client = publicClient ?? makePublicClient();
  // parseAbi requires compile-time-known strings; contractCallRead is intentionally
  // runtime-dynamic. The 'as any' cast is localised here and safe because viem
  // still parses and validates the string at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abi = parseAbi([functionSignature] as any) as any[];
  const functionName = abi[0].name as string;

  return client.readContract({
    address: contractAddress as Address,
    abi,
    functionName,
    args: args as never[],
  });
}

// ── Helper 3: contractSwap ────────────────────────────────────────────────────

/**
 * Swap tokens via a DEX router on Base Sepolia.
 *
 * **SWAP_MOCKED = true in v1.** TreasuryFlow's deployed contracts do not
 * include a DEX; this helper validates the demo cap and returns a realistic
 * `ExecutionRecord` without executing a real onchain swap.
 *
 * TF-020 will wire `routerAddress` to Uniswap V3 / Aerodrome on Base Sepolia
 * and set SWAP_MOCKED = false once the router integration is tested.
 *
 * @throws If `demoMode` is true and `amountIn` exceeds `maxNotionalUsd`.
 */
export async function contractSwap(
  params: ContractSwapParams,
  _walletBundle?: WalletClientBundle,
): Promise<ContractSwapResult> {
  const {
    fromToken,
    toToken,
    amountIn,
    minAmountOut,
    slippageBps = 50,
    maxNotionalUsd = DEMO_SWAP_CAP_USD,
    planId,
    stepId,
    walletId,
    demoMode = true,
  } = params;

  if (demoMode && amountIn > maxNotionalUsd) {
    throw new Error(
      `contractSwap: demo mode cap exceeded — requested $${amountIn.toLocaleString()} > cap $${maxNotionalUsd.toLocaleString()}. ` +
        `Set demoMode: false or increase maxNotionalUsd to override.`,
    );
  }

  const now = new Date().toISOString();

  if (SWAP_MOCKED) {
    // Estimate output: assume 1:1 minus 0.3% pool fee + slippage
    const effectiveSlippage = (slippageBps / 10_000) + 0.003;
    const amountOut = minAmountOut ?? amountIn * (1 - effectiveSlippage);

    const executionRecord: ExecutionRecord = {
      id: recordId(stepId),
      planId: planId as ExecutionPlanId,
      stepId: stepId as ExecutionStepId,
      walletId: walletId as TreasuryWalletId,
      chain: "base-sepolia",
      asset: fromToken,
      amount: amountIn,
      amountUsd: amountIn,
      status: "COMPLETED",
      mode: "DEMO",
      raw: {
        mocked: true,
        fromToken,
        toToken,
        amountIn,
        amountOut,
        slippageBps,
        note: "SWAP_MOCKED=true — real DEX wiring pending TF-020",
      },
      executedAt: now,
    };

    return { txHash: undefined, amountOut, mocked: true, executionRecord };
  }

  // Real swap path (reached only when SWAP_MOCKED = false, post TF-020)
  // Placeholder: wire Uniswap V3 SwapRouter here.
  throw new Error("Real swap not yet implemented — SWAP_MOCKED must be true for v1");
}

// ── Helper 4: transferStablecoin ──────────────────────────────────────────────

/**
 * Execute an ERC-20 stablecoin transfer on Base Sepolia.
 *
 * Calls ERC-20 `transfer(to, amount)` where `msg.sender` is the signer
 * (DEMO_APPROVER_KEY by default). The `from` parameter must equal the
 * signer's address — pass it for bookkeeping / validation only.
 *
 * After the transfer confirms, reads the post-transfer balance of `from` and
 * returns a `BalanceSnapshot` alongside the `ExecutionRecord`.
 *
 * @throws If `demoMode` is true and `amount` > `maxAmountUsd`.
 * @throws If `from` does not match the signer's address.
 * @throws On reverted transaction (insufficient balance, etc.).
 */
export async function transferStablecoin(
  params: TransferStablecoinParams,
  injected?: { publicClient?: ViemPublicClient; walletBundle?: WalletClientBundle },
): Promise<TransferStablecoinResult> {
  const {
    from,
    to,
    amount,
    tokenAddress = MOCK_USDC_ADDRESS,
    tokenDecimals = MOCK_USDC_DECIMALS,
    signerPrivateKey,
    maxAmountUsd = DEMO_TRANSFER_CAP_USD,
    planId,
    stepId,
    walletId,
    demoMode = true,
  } = params;

  if (demoMode && amount > maxAmountUsd) {
    throw new Error(
      `transferStablecoin: demo mode cap exceeded — requested $${amount.toLocaleString()} > cap $${maxAmountUsd.toLocaleString()}. ` +
        `Set demoMode: false or increase maxAmountUsd to override.`,
    );
  }

  const bundle =
    injected?.walletBundle ??
    (signerPrivateKey ? (await import("./client")).makeWalletClient(signerPrivateKey) : makeDemoWalletClient());

  const signerAddress = bundle.account.address.toLowerCase();
  if (from.toLowerCase() !== signerAddress) {
    throw new Error(
      `transferStablecoin: 'from' address (${from}) does not match signer (${signerAddress}). ` +
        `ERC-20 transfer sends from msg.sender — the from param must equal the signer.`,
    );
  }

  const publicClient = injected?.publicClient ?? makePublicClient();
  const rawAmount = parseUnits(amount.toString(), tokenDecimals);
  const now = new Date().toISOString();

  const txHash = await bundle.client.writeContract({
    address: tokenAddress as Address,
    abi: ERC20_WRITE_ABI,
    functionName: "transfer",
    args: [to as Address, rawAmount],
    chain: undefined,   // client already scoped to baseSepolia
    account: bundle.account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== "success") {
    throw new Error(
      `transferStablecoin: transaction reverted (${txHash}). Check mUSDC balance on Base Sepolia.`,
    );
  }

  // Post-transfer balance snapshot
  const postRawBalance = await publicClient.readContract({
    address: tokenAddress as Address,
    abi: ERC20_READ_ABI,
    functionName: "balanceOf",
    args: [from as Address],
  }) as bigint;

  const postBalance = Number(formatUnits(postRawBalance, tokenDecimals));

  const balanceSnapshot: BalanceSnapshot = {
    id: snapshotId(from, "mUSDC"),
    walletId: walletId as TreasuryWalletId,
    chain: "base-sepolia",
    asset: "mUSDC",
    balance: postBalance,
    balanceUsd: postBalance,
    snapshotAt: new Date().toISOString(),
    source: "onchain",
  };

  const executionRecord: ExecutionRecord = {
    id: recordId(stepId),
    planId: planId as ExecutionPlanId,
    stepId: stepId as ExecutionStepId,
    walletId: walletId as TreasuryWalletId,
    chain: "base-sepolia",
    asset: "mUSDC",
    amount,
    amountUsd: amount,
    txHash,
    status: "COMPLETED",
    mode: "DEMO",
    raw: {
      from,
      to,
      tokenAddress,
      rawAmount: rawAmount.toString(),
      blockNumber: receipt.blockNumber.toString(),
    },
    executedAt: now,
  };

  return { txHash, amount, executionRecord, balanceSnapshot };
}
