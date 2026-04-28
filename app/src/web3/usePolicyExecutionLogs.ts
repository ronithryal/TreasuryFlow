import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { TREASURY_VAULT_ABI, TREASURY_VAULT_ADDRESS, formatUsdc } from "./testnet";
import { IS_TESTNET } from "./mode";

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

/**
 * Pulls every PolicyExecuted log emitted for the connected wallet from
 * deployment block to head. Refreshes every 15s. The Audit page renders these
 * directly with Basescan deeplinks — no Zustand replay needed.
 */
export function usePolicyExecutionLogs() {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const [logs, setLogs] = useState<PolicyExecutedLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!IS_TESTNET || !publicClient || !isConnected || !address) return;

    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const eventAbi = TREASURY_VAULT_ABI.find(
          (item): item is typeof item & { type: "event"; name: "PolicyExecuted" } =>
            item.type === "event" && item.name === "PolicyExecuted",
        );
        if (!eventAbi) throw new Error("PolicyExecuted event missing from ABI");

        const fetched = await publicClient.getLogs({
          address: TREASURY_VAULT_ADDRESS,
          event: eventAbi,
          args: { source: address },
          fromBlock: "earliest",
          toBlock: "latest",
        });
        if (cancelled) return;

        const parsed: PolicyExecutedLog[] = fetched.map((l) => ({
          policyId: (l.args.policyId as string) ?? "",
          source: l.args.source as `0x${string}`,
          destination: l.args.destination as `0x${string}`,
          amount: formatUsdc(l.args.amount as bigint),
          action: (l.args.action as string) ?? "",
          timestamp: Number((l.args.timestamp as bigint) ?? 0n),
          txHash: l.transactionHash,
          blockNumber: l.blockNumber,
        }));
        parsed.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(parsed);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    const id = setInterval(fetch, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicClient, address, isConnected]);

  return { logs, loading, error };
}
