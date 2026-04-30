import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  INTENT_REGISTRY_ABI,
  INTENT_REGISTRY_ADDRESS,
  TREASURY_VAULT_ADDRESS,
  DEFAULT_DEMO_POLICY_ID,
  DEMO_POLICIES,
  toUsdcUnits,
} from "./testnet";
import { useStore } from "@/store";
import type { Intent } from "@/types/domain";

// A real demo recipient address on Base Sepolia — not a burn address.
// This is the deployer/owner wallet (the same account that deployed the contracts).
export const DEMO_RECIPIENT_ADDRESS =
  "0x240fb77d1c6bbe72bb59a08b379c7d94e905839b" as const;

/**
 * P0 Golden Path — 4-step onchain flow for VITE_APP_MODE=testnet:
 *
 *  Step 1:  IntentRegistry.createIntent(policyId, amount, destination)
 *             → emits IntentCreated → read intentId from receipt
 *  Step 2:  MockUSDC.approve(TreasuryVault, amount)
 *             → authorises vault to pull tokens on executeIntent
 *  Step 3:  POST /api/demo-approve { intentId, chainId: 84532 }
 *             → server signs approveIntent(intentId) with DEMO_APPROVER_KEY
 *             → returns { approvalTxHash, approverAddress }
 *  Step 4:  IntentRegistry.executeIntent(intentId)
 *             → vault re-validates policy, transfers tokens, emits PolicyExecuted
 *             → receipt.transactionHash is the canonical audit proof
 *
 * No txHash is ever passed to a contract.
 * No direct frontend call to approveIntent (server-only).
 * No direct frontend call to LedgerContract (called by vault internally).
 */
export function useTestnetExecution() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const recordExec = useStore((s) => s.recordTestnetExecution);

  const [isPending, setIsPending] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [step, setStep] = useState<
    "idle" | "creating" | "approving-usdc" | "demo-approver" | "executing" | "done" | "error"
  >("idle");
  const [stepError, setStepError] = useState<string | undefined>();

  /**
   * Execute the full P0 golden path for a given intent.
   * Returns the execution tx hash (Step 4) on success.
   */
  async function executeIntentOnchain(
    intent: Intent,
    action: string,
    opts?: {
      /** Override destination (default: DEMO_RECIPIENT_ADDRESS). */
      destination?: `0x${string}`;
      /** Override policyId (default: DEFAULT_DEMO_POLICY_ID). */
      policyId?: bigint;
    },
  ): Promise<`0x${string}`> {
    if (!address) throw new Error("Connect MetaMask or Coinbase Wallet on Base Sepolia.");
    if (!publicClient) throw new Error("RPC client unavailable");

    const amount = toUsdcUnits(intent.amount);
    const destination = opts?.destination ?? DEMO_RECIPIENT_ADDRESS;
    const policyId = opts?.policyId ?? DEFAULT_DEMO_POLICY_ID;

    // Resolve policy name for display
    const policyName =
      Object.values(DEMO_POLICIES).find((p) => p.id === policyId)?.name ?? `Policy #${policyId}`;

    setIsPending(true);
    setStep("creating");
    setStepError(undefined);

    try {
      // ── Step 1: createIntent ─────────────────────────────────────────────
      // Read nextIntentId BEFORE the transaction. The contract assigns IDs
      // sequentially, so nextIntentId at this moment == the new intent's ID.
      // This is unconditionally correct and avoids all event-log parsing issues
      // (ABI mismatches, wrong log ordering, indexed field differences).
      const onchainIntentId = await publicClient.readContract({
        abi: INTENT_REGISTRY_ABI,
        address: INTENT_REGISTRY_ADDRESS,
        functionName: "nextIntentId",
      }) as bigint;

      const createHash = await writeContractAsync({
        abi: INTENT_REGISTRY_ABI,
        address: INTENT_REGISTRY_ADDRESS,
        functionName: "createIntent",
        args: [policyId, amount, destination],
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      // ── Step 2: approve mUSDC allowance ─────────────────────────────────
      setStep("approving-usdc");
      const approveHash = await writeContractAsync({
        abi: MOCK_USDC_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: "approve",
        args: [TREASURY_VAULT_ADDRESS, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // ── Step 3: demo approver (server-side) ──────────────────────────────
      setStep("demo-approver");
      const approveRes = await fetch("/api/demo-approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intentId: onchainIntentId.toString(), chainId: 84532 }),
      });
      const approveData = await approveRes.json() as {
        approvalTxHash?: string;
        approverAddress?: string;
        error?: string;
      };

      if (!approveRes.ok || !approveData.approvalTxHash) {
        const msg = approveData.error ?? "Demo approver returned an unexpected error.";
        throw new Error(`Demo approver failed: ${msg}`);
      }

      const approvalTxHash = approveData.approvalTxHash as `0x${string}`;
      const approverAddress = approveData.approverAddress ?? "unknown";

      // ── Step 4: executeIntent ────────────────────────────────────────────
      setStep("executing");
      const execHash = await writeContractAsync({
        abi: INTENT_REGISTRY_ABI,
        address: INTENT_REGISTRY_ADDRESS,
        functionName: "executeIntent",
        args: [onchainIntentId],
      });
      const execReceipt = await publicClient.waitForTransactionReceipt({ hash: execHash });

      setLastTxHash(execHash);
      setStep("done");

      // Record in app state for Audit page
      recordExec({
        intentId: intent.id,
        policyId: intent.policyId,
        policyName,
        amount: intent.amount,
        destination,
        action,
        txHash: execHash,                         // backward compat
        blockNumber: Number(execReceipt.blockNumber),
        at: new Date().toISOString(),
        // P0 golden path audit fields
        onchainIntentId: onchainIntentId.toString(),
        initiator: address,
        approver: approverAddress,
        approvalTxHash,
        executionTxHash: execHash,
        approveTxHash: approveHash,
      });

      return execHash;
    } catch (err) {
      setStep("error");
      const msg = err instanceof Error ? err.message : String(err);
      setStepError(msg);
      throw err;
    } finally {
      setIsPending(false);
    }
  }

  return {
    executeIntentOnchain,
    isPending,
    lastTxHash,
    /** Current step label for progress UI. */
    step,
    /** Error message if step === "error". */
    stepError,
  };
}

/** Human-readable label for each execution step (for progress UIs). */
export const STEP_LABELS: Record<string, string> = {
  idle: "Idle",
  creating: "Step 1/4 — Creating Payment Request onchain…",
  "approving-usdc": "Step 2/4 — Approving mUSDC allowance…",
  "demo-approver": "Step 3/4 — Treasury Admin approving…",
  executing: "Step 4/4 — Executing payment…",
  done: "Executed",
  error: "Error",
};
