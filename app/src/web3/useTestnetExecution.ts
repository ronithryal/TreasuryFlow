import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  TREASURY_VAULT_ABI,
  TREASURY_VAULT_ADDRESS,
  toUsdcUnits,
} from "./testnet";
import { useStore } from "@/store";
import type { Intent } from "@/types/domain";

/**
 * Two-step onchain execution: approve(USDC, vault, amount) then
 * vault.executePolicy(...). We call them sequentially and wait for the second
 * receipt before reporting success.
 *
 * The `intent.amount` is in "human" USDC units; this hook handles 6-decimal
 * conversion. Destination is informational on the vault — the vault actually
 * custodies the funds, the destination is logged so investors can see where
 * the policy intended to send the money.
 */
export function useTestnetExecution() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const recordExec = useStore((s) => s.recordTestnetExecution);
  const [isPending, setIsPending] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();

  /** Returns the executePolicy tx hash on success, or throws. */
  async function executeIntentOnchain(intent: Intent, action: string): Promise<`0x${string}`> {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("RPC client unavailable");

    const amount = toUsdcUnits(intent.amount);
    // Use a placeholder destination for now — the vault just records it.
    // In a real build, intent.destinationAccountId would resolve to an
    // onchain address on the receiving side.
    const destination = "0x000000000000000000000000000000000000dEaD" as const;

    setIsPending(true);
    try {
      // 1) Approve the vault to pull USDC.
      const approveHash = await writeContractAsync({
        abi: MOCK_USDC_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: "approve",
        args: [TREASURY_VAULT_ADDRESS, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2) Execute the policy.
      const execHash = await writeContractAsync({
        abi: TREASURY_VAULT_ABI,
        address: TREASURY_VAULT_ADDRESS,
        functionName: "executePolicy",
        args: [intent.policyId ?? intent.id, destination, amount, action],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: execHash });
      setLastTxHash(execHash);

      recordExec({
        intentId: intent.id,
        policyId: intent.policyId,
        amount: intent.amount,
        destination,
        action,
        txHash: execHash,
        blockNumber: Number(receipt.blockNumber),
        at: new Date().toISOString(),
      });

      return execHash;
    } finally {
      setIsPending(false);
    }
  }

  return { executeIntentOnchain, isPending, lastTxHash };
}
