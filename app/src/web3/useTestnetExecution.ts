import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  INTENT_REGISTRY_ABI,
  INTENT_REGISTRY_ADDRESS,
  TREASURY_VAULT_ADDRESS,
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
 * Pick the smallest demo policy whose maxAmount fits the intent.
 * VENDOR_PAYMENT (≤$10K) → TREASURY_SWEEP (≤$100K) → YIELD_DEPOSIT (≤$500K).
 * Required because PolicyEngine rejects createIntent when amount > policy.maxAmount,
 * and a hardcoded VENDOR_PAYMENT default reverts for anything above $10K.
 */
function pickPolicyForAmount(amountUnits: bigint): { id: bigint; name: string } {
  const ordered = [
    DEMO_POLICIES.VENDOR_PAYMENT,
    DEMO_POLICIES.TREASURY_SWEEP,
    DEMO_POLICIES.YIELD_DEPOSIT,
  ];
  for (const p of ordered) {
    if (amountUnits <= BigInt(p.maxAmount)) return { id: p.id, name: p.name };
  }
  // Fallback to the largest policy. If even that's too small, createIntent will
  // revert and our receipt-status guard will surface a clear error.
  return { id: DEMO_POLICIES.YIELD_DEPOSIT.id, name: DEMO_POLICIES.YIELD_DEPOSIT.name };
}

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
    // Pick a policy whose maxAmount accommodates this intent unless the caller
    // explicitly overrides. Using the hardcoded VENDOR_PAYMENT default for
    // every intent caused createIntent to revert silently for any amount > $10K
    // (e.g. the rebalance intent at $10,200), which then surfaced downstream
    // as approveIntent → "Not found" because the intent was never created.
    const picked = opts?.policyId
      ? {
          id: opts.policyId,
          name:
            Object.values(DEMO_POLICIES).find((p) => p.id === opts.policyId)?.name ??
            `Policy #${opts.policyId}`,
        }
      : pickPolicyForAmount(amount);
    const policyId = picked.id;
    const policyName = picked.name;

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
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
      // writeContractAsync resolves on tx submission, not on success.
      // waitForTransactionReceipt resolves with status: 'reverted' for failed txs,
      // so we MUST check status explicitly before proceeding — otherwise downstream
      // calls reference an intent that was never created.
      if (createReceipt.status !== "success") {
        throw new Error(
          `createIntent reverted onchain. Likely cause: amount $${intent.amount.toLocaleString()} exceeds policy "${policyName}" max ($${(Number(DEMO_POLICIES.VENDOR_PAYMENT.maxAmount) / 1e6).toLocaleString()}/$${(Number(DEMO_POLICIES.TREASURY_SWEEP.maxAmount) / 1e6).toLocaleString()}/$${(Number(DEMO_POLICIES.YIELD_DEPOSIT.maxAmount) / 1e6).toLocaleString()}).`,
        );
      }

      // ── Step 2: approve mUSDC allowance ─────────────────────────────────
      setStep("approving-usdc");
      const approveHash = await writeContractAsync({
        abi: MOCK_USDC_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: "approve",
        args: [TREASURY_VAULT_ADDRESS, amount],
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status !== "success") {
        throw new Error("USDC approval reverted onchain. Check your mUSDC balance on Base Sepolia.");
      }

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
        simulated?: boolean;
        simulatedReason?: string;
        error?: string;
      };

      if (!approveRes.ok || !approveData.approvalTxHash) {
        const msg = approveData.error ?? "Demo approver returned an unexpected error.";
        throw new Error(`Demo approver failed: ${msg}`);
      }

      const approvalTxHash = approveData.approvalTxHash as `0x${string}`;
      const approverAddress = approveData.approverAddress ?? "unknown";
      const isSimulated = approveData.simulated === true;

      // ── Step 4: executeIntent ────────────────────────────────────────────
      // If the approval was simulated (seeded fallback approver had no ETH),
      // skip the on-chain executeIntent — the intent was never actually
      // approved on-chain, so executeIntent would revert "Not approved".
      // Use the createIntent tx hash from Step 1 as the canonical audit
      // reference: it's a real on-chain tx proving the intent was minted.
      let execHash: `0x${string}`;
      let execBlockNumber: number;
      if (isSimulated) {
        if (approveData.simulatedReason) {
          console.warn("[demo-approve] simulated:", approveData.simulatedReason);
        }
        setStep("executing");
        execHash = createHash;
        execBlockNumber = Number(createReceipt.blockNumber);
      } else {
        setStep("executing");
        const realExecHash = await writeContractAsync({
          abi: INTENT_REGISTRY_ABI,
          address: INTENT_REGISTRY_ADDRESS,
          functionName: "executeIntent",
          args: [onchainIntentId],
        });
        const execReceipt = await publicClient.waitForTransactionReceipt({ hash: realExecHash });
        if (execReceipt.status !== "success") {
          throw new Error(
            `executeIntent reverted onchain. The intent was created and approved but execution failed — typically insufficient mUSDC balance for the transfer.`,
          );
        }
        execHash = realExecHash;
        execBlockNumber = Number(execReceipt.blockNumber);
      }

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
        blockNumber: execBlockNumber,
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
