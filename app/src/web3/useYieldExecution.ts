import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  INTENT_REGISTRY_ABI,
  INTENT_REGISTRY_ADDRESS,
  TREASURY_VAULT_ABI,
  TREASURY_VAULT_ADDRESS,
  POLICY_ENGINE_ABI,
  POLICY_ENGINE_ADDRESS,
  DEMO_POLICIES,
  toUsdcUnits,
} from "./testnet";
import { DEMO_RECIPIENT_ADDRESS } from "./useTestnetExecution";

const DEMO_DEPOSIT_USDC = 10;  // 10 USDC for "Add Funds" demo
const DEMO_WITHDRAW_USDC = 1;  // 1 USDC for "Withdraw" demo

export function useYieldExecution() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  /**
   * Withdraw from TreasuryVault: TreasuryVault.withdraw(amount)
   */
  async function executeWithdraw(): Promise<`0x${string}`> {
    if (!address) throw new Error("Connect MetaMask or Coinbase Wallet on Base Sepolia.");
    if (!publicClient) throw new Error("RPC client unavailable");
    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        abi: TREASURY_VAULT_ABI,
        address: TREASURY_VAULT_ADDRESS,
        functionName: "withdraw",
        args: [toUsdcUnits(DEMO_WITHDRAW_USDC)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } finally {
      setIsPending(false);
    }
  }

  /**
   * Deposit via IntentRegistry golden path (Yield Deposit policy, policyId=3):
   *   1. createIntent(YIELD_DEPOSIT_POLICY_ID, amount, DEMO_RECIPIENT_ADDRESS)
   *   2. USDC.approve(vault, amount)
   *   3. POST /api/demo-approve
   *   4. executeIntent(intentId)
   *
   * TreasuryVault.executePolicy no longer exists — all transfers go through IntentRegistry.
   */
  async function executeAddFunds(): Promise<`0x${string}`> {
    if (!address) throw new Error("Connect MetaMask or Coinbase Wallet on Base Sepolia.");
    if (!publicClient) throw new Error("RPC client unavailable");
    setIsPending(true);
    try {
      const amt = toUsdcUnits(DEMO_DEPOSIT_USDC);
      const policyId = DEMO_POLICIES.YIELD_DEPOSIT.id;

      // Step 1: createIntent
      const createHash = await writeContractAsync({
        abi: INTENT_REGISTRY_ABI,
        address: INTENT_REGISTRY_ADDRESS,
        functionName: "createIntent",
        args: [policyId, amt, DEMO_RECIPIENT_ADDRESS],
      });
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

      // Parse intentId from receipt
      let onchainIntentId: bigint | undefined;
      for (const log of createReceipt.logs) {
        try {
          if (log.topics.length >= 2 && log.topics[1] !== undefined) {
            onchainIntentId = BigInt(log.topics[1]);
            break;
          }
        } catch { /* skip */ }
      }
      if (onchainIntentId === undefined) {
        const nextId = await publicClient.readContract({
          abi: INTENT_REGISTRY_ABI,
          address: INTENT_REGISTRY_ADDRESS,
          functionName: "nextIntentId",
        }) as bigint;
        onchainIntentId = nextId - 1n;
      }

      // Step 2: approve mUSDC
      const approveHash = await writeContractAsync({
        abi: MOCK_USDC_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: "approve",
        args: [TREASURY_VAULT_ADDRESS, amt],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Step 3: demo approver
      const approveRes = await fetch("/api/demo-approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intentId: onchainIntentId.toString(), chainId: 84532 }),
      });
      if (!approveRes.ok) {
        const data = await approveRes.json() as { error?: string };
        throw new Error(data.error ?? "Demo approver failed");
      }

      // Step 4: executeIntent
      const execHash = await writeContractAsync({
        abi: INTENT_REGISTRY_ABI,
        address: INTENT_REGISTRY_ADDRESS,
        functionName: "executeIntent",
        args: [onchainIntentId],
      });
      await publicClient.waitForTransactionReceipt({ hash: execHash });
      return execHash;
    } finally {
      setIsPending(false);
    }
  }

  /**
   * Register a new yield policy in PolicyEngine (owner-only on mainnet;
   * on demo anyone can call this against the demo PolicyEngine).
   */
  async function executeDeployPolicy(opportunityName: string): Promise<`0x${string}`> {
    if (!address) throw new Error("Connect MetaMask or Coinbase Wallet on Base Sepolia.");
    if (!publicClient) throw new Error("RPC client unavailable");
    setIsPending(true);
    try {
      // maxAmount: 100,000 USDC (6 decimals); address(0) = wildcard source/destination
      const hash = await writeContractAsync({
        abi: POLICY_ENGINE_ABI,
        address: POLICY_ENGINE_ADDRESS,
        functionName: "createPolicy",
        args: [
          opportunityName,
          "deposit_routing",
          "0x0000000000000000000000000000000000000000",
          TREASURY_VAULT_ADDRESS,
          100_000n * 1_000_000n,
          "balance > 0",
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } finally {
      setIsPending(false);
    }
  }

  return { executeWithdraw, executeAddFunds, executeDeployPolicy, isPending };
}
