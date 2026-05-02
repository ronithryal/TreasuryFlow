/**
 * TF-006 unit tests for Base Sepolia helpers.
 *
 * All tests use injectable mock clients — no real network calls.
 * The mock public client returns fixed bigint values that match
 * what the deployed contracts would return in the demo scenario.
 */
import { describe, it, expect, vi } from "vitest";
import { parseUnits } from "viem";
import {
  chainGetBalances,
  contractCallRead,
  contractSwap,
  transferStablecoin,
  MOCK_USDC_ADDRESS,
  MOCK_USDC_DECIMALS,
  DEMO_TRANSFER_CAP_USD,
  DEMO_SWAP_CAP_USD,
  SWAP_MOCKED,
} from "@/adapters/base-sepolia/helpers";
import type { ViemPublicClient, WalletClientBundle } from "@/adapters/base-sepolia/client";

// ── Mock builders ──────────────────────────────────────────────────────────────

function makeMockPublicClient(overrides?: {
  getBalance?: () => bigint;
  readContract?: (args: { functionName: string }) => unknown;
  waitForTransactionReceipt?: () => { status: "success" | "reverted"; blockNumber: bigint };
}): ViemPublicClient {
  return {
    getBalance: vi.fn().mockResolvedValue(overrides?.getBalance?.() ?? parseUnits("0.05", 18)),
    readContract: vi.fn().mockImplementation((args: { functionName: string }) => {
      if (overrides?.readContract) return Promise.resolve(overrides.readContract(args));
      if (args.functionName === "balanceOf") return Promise.resolve(parseUnits("1000", MOCK_USDC_DECIMALS));
      if (args.functionName === "nextIntentId") return Promise.resolve(1n);
      return Promise.resolve(0n);
    }),
    waitForTransactionReceipt: vi.fn().mockResolvedValue(
      overrides?.waitForTransactionReceipt?.() ?? { status: "success", blockNumber: 42_000_000n },
    ),
  } as unknown as ViemPublicClient;
}

const MOCK_SIGNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

function makeMockWalletBundle(txHash = "0xdeadbeef"): WalletClientBundle {
  return {
    client: {
      writeContract: vi.fn().mockResolvedValue(txHash),
    } as unknown as WalletClientBundle["client"],
    account: {
      address: MOCK_SIGNER_ADDRESS,
    } as unknown as WalletClientBundle["account"],
  };
}

// ── chainGetBalances ───────────────────────────────────────────────────────────

describe("chainGetBalances", () => {
  it("returns ETH and mUSDC balances for one address", async () => {
    const mockClient = makeMockPublicClient({
      getBalance: () => parseUnits("0.05", 18),         // 0.05 ETH
      readContract: () => parseUnits("1500", 6),         // 1500 mUSDC
    });

    const results = await chainGetBalances(
      ["0xabc0000000000000000000000000000000000001"],
      "base-sepolia",
      { publicClient: mockClient },
    );

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.address).toBe("0xabc0000000000000000000000000000000000001");
    expect(r.ethBalance).toBeCloseTo(0.05);
    expect(r.tokens).toHaveLength(1);
    expect(r.tokens[0].symbol).toBe("mUSDC");
    expect(r.tokens[0].balance).toBeCloseTo(1500);
  });

  it("includes one BalanceSnapshot per asset (ETH + mUSDC)", async () => {
    const mockClient = makeMockPublicClient();
    const results = await chainGetBalances(
      ["0xabc0000000000000000000000000000000000002"],
      "base-sepolia",
      { publicClient: mockClient },
    );

    const snaps = results[0].snapshots;
    expect(snaps).toHaveLength(2);  // mUSDC + ETH
    const assets = snaps.map((s) => s.asset);
    expect(assets).toContain("mUSDC");
    expect(assets).toContain("ETH");
  });

  it("snapshot source is 'onchain'", async () => {
    const mockClient = makeMockPublicClient();
    const results = await chainGetBalances(
      ["0xabc0000000000000000000000000000000000003"],
      "base-sepolia",
      { publicClient: mockClient },
    );
    results[0].snapshots.forEach((s) => expect(s.source).toBe("onchain"));
  });

  it("uses walletIdMap when provided", async () => {
    const mockClient = makeMockPublicClient();
    const addr = "0xabc0000000000000000000000000000000000004";
    const results = await chainGetBalances([addr], "base-sepolia", {
      publicClient: mockClient,
      walletIdMap: { [addr]: "wallet_treasury_main" },
    });
    results[0].snapshots.forEach((s) => expect(s.walletId).toBe("wallet_treasury_main"));
  });

  it("queries extra tokens when provided", async () => {
    const mockClient = makeMockPublicClient();
    const results = await chainGetBalances(
      ["0xabc0000000000000000000000000000000000005"],
      "base-sepolia",
      {
        publicClient: mockClient,
        extraTokens: [{ symbol: "WETH", address: "0xweth...", decimals: 18 }],
      },
    );
    expect(results[0].tokens.some((t) => t.symbol === "WETH")).toBe(true);
  });

  it("handles multiple addresses", async () => {
    const mockClient = makeMockPublicClient();
    const addrs = [
      "0xaaa0000000000000000000000000000000000001",
      "0xbbb0000000000000000000000000000000000002",
    ];
    const results = await chainGetBalances(addrs, "base-sepolia", { publicClient: mockClient });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.address)).toEqual(addrs);
  });
});

// ── contractCallRead ───────────────────────────────────────────────────────────

describe("contractCallRead", () => {
  it("reads nextIntentId from IntentRegistry", async () => {
    const mockClient = makeMockPublicClient({
      readContract: () => 7n,
    });

    const result = await contractCallRead(
      "0x53eb4406785aa86b64c662102745fc85cf93d459",
      "function nextIntentId() view returns (uint256)",
      [],
      "base-sepolia",
      mockClient,
    );

    expect(result).toBe(7n);
  });

  it("reads balanceOf with an address argument", async () => {
    const mockClient = makeMockPublicClient({
      readContract: () => parseUnits("2500", 6),
    });

    const result = await contractCallRead(
      MOCK_USDC_ADDRESS,
      "function balanceOf(address owner) view returns (uint256)",
      ["0xsomewallet"],
      "base-sepolia",
      mockClient,
    );

    expect(result).toBe(parseUnits("2500", 6));
  });

  it("reads a validateIntent bool from PolicyEngine", async () => {
    const mockClient = makeMockPublicClient({
      readContract: () => true,
    });

    const result = await contractCallRead(
      "0x0f01f0632a35493b63c87a4a422a783213abad0e",
      "function validateIntent(uint256 policyId, address source, address destination, uint256 amount) view returns (bool)",
      [1n, "0xsource", "0xdest", parseUnits("500", 6)],
      "base-sepolia",
      mockClient,
    );

    expect(result).toBe(true);
  });

  it("throws on malformed function signature", async () => {
    const mockClient = makeMockPublicClient();
    await expect(
      contractCallRead("0x1234", "not a function signature", [], "base-sepolia", mockClient),
    ).rejects.toThrow();
  });
});

// ── contractSwap ───────────────────────────────────────────────────────────────

describe("contractSwap", () => {
  const BASE_PARAMS = {
    fromToken: MOCK_USDC_ADDRESS,
    toToken: "0xweth000000000000000000000000000000000001",
    amountIn: 500,
    planId: "plan_001",
    stepId: "step_001",
    walletId: "wallet_treasury",
  };

  it("SWAP_MOCKED is true", () => {
    expect(SWAP_MOCKED).toBe(true);
  });

  it("returns mocked: true and a COMPLETED ExecutionRecord", async () => {
    const result = await contractSwap(BASE_PARAMS);
    expect(result.mocked).toBe(true);
    expect(result.txHash).toBeUndefined();
    expect(result.executionRecord.status).toBe("COMPLETED");
    expect(result.executionRecord.mode).toBe("DEMO");
  });

  it("estimates amountOut with pool fee + slippage", async () => {
    const result = await contractSwap({ ...BASE_PARAMS, amountIn: 1000, slippageBps: 50 });
    // 0.5% slippage + 0.3% fee → output ≈ 998
    expect(result.amountOut).toBeDefined();
    expect(result.amountOut!).toBeLessThan(1000);
    expect(result.amountOut!).toBeGreaterThan(990);
  });

  it("uses provided minAmountOut when set", async () => {
    const result = await contractSwap({ ...BASE_PARAMS, amountIn: 1000, minAmountOut: 995 });
    expect(result.amountOut).toBe(995);
  });

  it("enforces demo cap — throws when amountIn > DEMO_SWAP_CAP_USD", async () => {
    await expect(
      contractSwap({ ...BASE_PARAMS, amountIn: DEMO_SWAP_CAP_USD + 1, demoMode: true }),
    ).rejects.toThrow("demo mode cap exceeded");
  });

  it("allows over-cap amount when demoMode: false", async () => {
    // SWAP_MOCKED is still true so it won't try a real swap — but cap is not enforced
    const result = await contractSwap({
      ...BASE_PARAMS,
      amountIn: DEMO_SWAP_CAP_USD + 1,
      demoMode: false,
    });
    expect(result.mocked).toBe(true);
  });

  it("ExecutionRecord.raw contains mocked note", async () => {
    const result = await contractSwap(BASE_PARAMS);
    expect(result.executionRecord.raw?.mocked).toBe(true);
    expect((result.executionRecord.raw?.note as string)).toContain("SWAP_MOCKED=true");
  });

  it("sets chain to base-sepolia in ExecutionRecord", async () => {
    const result = await contractSwap(BASE_PARAMS);
    expect(result.executionRecord.chain).toBe("base-sepolia");
  });
});

// ── transferStablecoin ─────────────────────────────────────────────────────────

describe("transferStablecoin", () => {
  const TX_HASH = "0xtransfer_hash_abcdef" as const;

  const BASE_PARAMS = {
    from: MOCK_SIGNER_ADDRESS,
    to: "0xrecipient0000000000000000000000000000001",
    amount: 500,
    tokenAddress: MOCK_USDC_ADDRESS,
    planId: "plan_002",
    stepId: "step_002",
    walletId: "wallet_ops",
    demoMode: true,
  };

  function makeSuccessInjection(postBalance = parseUnits("4500", 6)) {
    return {
      publicClient: makeMockPublicClient({
        readContract: () => postBalance,
        waitForTransactionReceipt: () => ({ status: "success" as const, blockNumber: 42_100_000n }),
      }),
      walletBundle: makeMockWalletBundle(TX_HASH),
    };
  }

  it("returns txHash, ExecutionRecord, and BalanceSnapshot on success", async () => {
    const result = await transferStablecoin(BASE_PARAMS, makeSuccessInjection());
    expect(result.txHash).toBe(TX_HASH);
    expect(result.executionRecord.txHash).toBe(TX_HASH);
    expect(result.executionRecord.status).toBe("COMPLETED");
    expect(result.executionRecord.mode).toBe("DEMO");
    expect(result.balanceSnapshot.asset).toBe("mUSDC");
    expect(result.balanceSnapshot.source).toBe("onchain");
    expect(result.balanceSnapshot.balance).toBeCloseTo(4500);
  });

  it("ExecutionRecord.raw includes from/to/tokenAddress", async () => {
    const result = await transferStablecoin(BASE_PARAMS, makeSuccessInjection());
    expect(result.executionRecord.raw?.from).toBe(MOCK_SIGNER_ADDRESS);
    expect(result.executionRecord.raw?.to).toBe(BASE_PARAMS.to);
    expect(result.executionRecord.raw?.tokenAddress).toBe(MOCK_USDC_ADDRESS);
  });

  it("enforces demo cap — throws when amount > DEMO_TRANSFER_CAP_USD", async () => {
    await expect(
      transferStablecoin(
        { ...BASE_PARAMS, amount: DEMO_TRANSFER_CAP_USD + 1 },
        makeSuccessInjection(),
      ),
    ).rejects.toThrow("demo mode cap exceeded");
  });

  it("allows over-cap amount when demoMode: false", async () => {
    const result = await transferStablecoin(
      { ...BASE_PARAMS, amount: DEMO_TRANSFER_CAP_USD + 1, demoMode: false },
      makeSuccessInjection(),
    );
    expect(result.txHash).toBe(TX_HASH);
  });

  it("throws when `from` does not match signer address", async () => {
    await expect(
      transferStablecoin(
        { ...BASE_PARAMS, from: "0xwrong_address_000000000000000000000001" },
        makeSuccessInjection(),
      ),
    ).rejects.toThrow("does not match signer");
  });

  it("throws when transaction reverts", async () => {
    const revertedClient = makeMockPublicClient({
      readContract: () => 0n,
      waitForTransactionReceipt: () => ({ status: "reverted" as const, blockNumber: 42_000_001n }),
    });
    await expect(
      transferStablecoin(BASE_PARAMS, {
        publicClient: revertedClient,
        walletBundle: makeMockWalletBundle(),
      }),
    ).rejects.toThrow("transaction reverted");
  });

  it("BalanceSnapshot walletId matches params.walletId", async () => {
    const result = await transferStablecoin(BASE_PARAMS, makeSuccessInjection());
    expect(result.balanceSnapshot.walletId).toBe("wallet_ops");
  });

  it("BalanceSnapshot chain is base-sepolia", async () => {
    const result = await transferStablecoin(BASE_PARAMS, makeSuccessInjection());
    expect(result.balanceSnapshot.chain).toBe("base-sepolia");
  });

  it("amount in ExecutionRecord matches params.amount", async () => {
    const result = await transferStablecoin(BASE_PARAMS, makeSuccessInjection());
    expect(result.executionRecord.amount).toBe(BASE_PARAMS.amount);
    expect(result.executionRecord.amountUsd).toBe(BASE_PARAMS.amount);
  });

  it("uses DEMO_TRANSFER_CAP_USD constant", () => {
    expect(DEMO_TRANSFER_CAP_USD).toBe(10_000);
  });
});
