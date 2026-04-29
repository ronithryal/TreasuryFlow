import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  INTENT_REGISTRY_ABI,
  INTENT_REGISTRY_ADDRESS,
  TREASURY_VAULT_ABI,
  TREASURY_VAULT_ADDRESS,
  BASESCAN_TX,
  DEMO_POLICIES,
  formatUsdc,
} from "./testnet";
import { IS_TESTNET } from "./mode";
import { useStore } from "@/store";

export interface IntentExecutionLog {
  /** Onchain intentId from IntentRegistry (decimal string). */
  intentId: string;
  /** policyId (uint256 as decimal string). */
  policyId: string;
  /** Human-readable policy name if resolvable. */
  policyName: string;
  /** Initiator wallet address. */
  initiator: `0x${string}` | string;
  /** Approver wallet address ("unknown" if not in local state). */
  approver: string;
  /** Destination address. */
  destination: `0x${string}` | string;
  /** Payment amount in human units (USDC). */
  amount: number;
  /** Tx hash of IntentRegistry.approveIntent (if available). */
  approvalTxHash: string;
  /** Tx hash of IntentRegistry.executeIntent — canonical audit proof. */
  executionTxHash: `0x${string}`;
  /** Block number of executeIntent. */
  blockNumber: bigint;
  /** Unix timestamp (seconds) — from block if available, else 0. */
  timestamp: number;
  /** Basescan URLs. */
  approvalUrl: string;
  executionUrl: string;
}

/** Deprecated shape kept for backward compat with old code paths. */
export interface PolicyExecutedLog {
  policyId: string;
  source: `0x${string}`;
  destination: `0x${string}`;
  amount: number;
  action: string;
  timestamp: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

function policyName(id: bigint | string): string {
  const n = BigInt(id);
  for (const p of Object.values(DEMO_POLICIES)) {
    if (p.id === n) return p.name;
  }
  return `Policy #${id}`;
}

/**
 * Fetches onchain IntentExecuted events from IntentRegistry and merges them
 * with the locally stored execution metadata from the golden path.
 *
 * Priority:
 *  1. Locally stored TestnetExecution (has approver, approval tx hash, etc.)
 *  2. Onchain IntentExecuted events (have intentId, executor, block)
 *  3. PolicyExecuted events from TreasuryVault (have amount, destination)
 *
 * Falls back gracefully if any fetch fails.
 * Refreshes every 20s.
 */
export function usePolicyExecutionLogs() {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const storedExecutions = useStore((s) => s.testnet.executions);

  const [logs, setLogs] = useState<IntentExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!IS_TESTNET) return;

    // If no wallet connected, show stored executions only
    if (!publicClient || !isConnected || !address) {
      const fromStore = storedExecutions
        .filter((e) => e.executionTxHash)
        .map<IntentExecutionLog>((e) => ({
          intentId: e.onchainIntentId ?? "—",
          policyId: e.policyId ?? "—",
          policyName: e.policyName ?? (e.policyId ? policyName(e.policyId) : "—"),
          initiator: (e.initiator as `0x${string}`) ?? "—",
          approver: e.approver ?? "Approved by Treasury Admin demo signer",
          destination: e.destination as `0x${string}`,
          amount: e.amount,
          approvalTxHash: e.approvalTxHash ?? "",
          executionTxHash: (e.executionTxHash ?? e.txHash) as `0x${string}`,
          blockNumber: BigInt(e.blockNumber ?? 0),
          timestamp: Math.floor(new Date(e.at).getTime() / 1000),
          approvalUrl: e.approvalTxHash ? BASESCAN_TX(e.approvalTxHash) : "",
          executionUrl: BASESCAN_TX(e.executionTxHash ?? e.txHash),
        }));
      setLogs(fromStore);
      return;
    }

    let cancelled = false;
    const fetchLogs = async () => {
      setLoading(true);
      setError(undefined);
      try {
        // Fetch IntentExecuted events
        const intentExecutedEvent = INTENT_REGISTRY_ABI.find(
          (item): item is typeof item & { type: "event"; name: "IntentExecuted" } =>
            item.type === "event" && item.name === "IntentExecuted",
        );

        // Fetch PolicyExecuted events from vault for amounts/destinations
        const policyExecutedEvent = TREASURY_VAULT_ABI.find(
          (item): item is typeof item & { type: "event"; name: "PolicyExecuted" } =>
            item.type === "event" && item.name === "PolicyExecuted",
        );

        const [intentLogs, vaultLogs] = await Promise.all([
          intentExecutedEvent
            ? publicClient.getLogs({
                address: INTENT_REGISTRY_ADDRESS,
                event: intentExecutedEvent,
                fromBlock: "earliest",
                toBlock: "latest",
              })
            : Promise.resolve([]),
          policyExecutedEvent
            ? publicClient.getLogs({
                address: TREASURY_VAULT_ADDRESS,
                event: policyExecutedEvent,
                fromBlock: "earliest",
                toBlock: "latest",
              })
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        // Build a lookup: intentId → vault log (for amount/destination/policyId)
        type VaultLog = typeof vaultLogs[number];
        const vaultByBlock = new Map<bigint, VaultLog>();
        for (const vl of vaultLogs) {
          if (vl.blockNumber) vaultByBlock.set(vl.blockNumber, vl);
        }

        // Build a lookup: onchainIntentId → stored execution (for approver, approvalTxHash)
        const storedByOnchainId = new Map<string, typeof storedExecutions[number]>();
        for (const se of storedExecutions) {
          if (se.onchainIntentId) storedByOnchainId.set(se.onchainIntentId, se);
        }

        const merged: IntentExecutionLog[] = [];
        for (const il of intentLogs) {
          const intentIdBigInt = il.args.intentId as bigint | undefined;
          const executor = il.args.executor as `0x${string}` | undefined;
          const blockNum = il.blockNumber ?? 0n;
          const txHash = il.transactionHash as `0x${string}`;
          const idStr = intentIdBigInt?.toString() ?? "—";

          // Try to get vault data from same block
          const vl = vaultByBlock.get(blockNum);
          const amount = vl?.args.amount ? formatUsdc(vl.args.amount as bigint) : 0;
          const destination = (vl?.args.destination ?? executor ?? "0x0") as `0x${string}`;
          const pId = (vl?.args.policyId as bigint | undefined)?.toString() ?? "—";
          const pName = pId !== "—" ? policyName(pId) : "—";
          const timestamp = Number((vl?.args.timestamp as bigint | undefined) ?? 0n);

          // Try to get approval data from stored executions
          const stored = storedByOnchainId.get(idStr);
          const approver = stored?.approver ?? "Approved by Treasury Admin demo signer";
          const approvalTxHash = stored?.approvalTxHash ?? "";
          const initiator = stored?.initiator ?? executor ?? "—";

          merged.push({
            intentId: idStr,
            policyId: pId,
            policyName: stored?.policyName ?? pName,
            initiator: initiator as `0x${string}`,
            approver,
            destination: stored?.destination as `0x${string}` ?? destination,
            amount: stored?.amount ?? amount,
            approvalTxHash,
            executionTxHash: txHash,
            blockNumber: blockNum,
            timestamp,
            approvalUrl: approvalTxHash ? BASESCAN_TX(approvalTxHash) : "",
            executionUrl: BASESCAN_TX(txHash),
          });
        }

        // Include any stored executions not yet in onchain logs
        for (const se of storedExecutions) {
          if (!se.executionTxHash) continue;
          const already = merged.some(
            (m) => m.executionTxHash === se.executionTxHash,
          );
          if (!already) {
            merged.push({
              intentId: se.onchainIntentId ?? "—",
              policyId: se.policyId ?? "—",
              policyName: se.policyName ?? (se.policyId ? policyName(se.policyId) : "—"),
              initiator: (se.initiator ?? address) as `0x${string}`,
              approver: se.approver ?? "Approved by Treasury Admin demo signer",
              destination: se.destination as `0x${string}`,
              amount: se.amount,
              approvalTxHash: se.approvalTxHash ?? "",
              executionTxHash: (se.executionTxHash ?? se.txHash) as `0x${string}`,
              blockNumber: BigInt(se.blockNumber ?? 0),
              timestamp: Math.floor(new Date(se.at).getTime() / 1000),
              approvalUrl: se.approvalTxHash ? BASESCAN_TX(se.approvalTxHash) : "",
              executionUrl: BASESCAN_TX(se.executionTxHash ?? se.txHash),
            });
          }
        }

        // Sort newest first
        merged.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
        setLogs(merged);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLogs();
    const id = setInterval(fetchLogs, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicClient, address, isConnected, storedExecutions]);

  return { logs, loading, error };
}

// Export the old PolicyExecutedLog alias for any consumers that still reference it
export type { IntentExecutionLog as ExecutionLog };
