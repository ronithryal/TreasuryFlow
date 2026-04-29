import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  TREASURY_VAULT_ABI,
  TREASURY_VAULT_ADDRESS,
  POLICY_ENGINE_ABI,
  POLICY_ENGINE_ADDRESS,
  toUsdcUnits,
} from "./testnet";

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
    if (!address) throw new Error("Wallet not connected");
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
   * Deposit into TreasuryVault:
   *   1. USDC.approve(vault, amount)
   *   2. TreasuryVault.executePolicy("yield-deposit", vault, amount, "deposit")
   */
  async function executeAddFunds(): Promise<`0x${string}`> {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("RPC client unavailable");
    setIsPending(true);
    try {
      const amt = toUsdcUnits(DEMO_DEPOSIT_USDC);

      const approveHash = await writeContractAsync({
        abi: MOCK_USDC_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: "approve",
        args: [TREASURY_VAULT_ADDRESS, amt],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const execHash = await writeContractAsync({
        abi: TREASURY_VAULT_ABI,
        address: TREASURY_VAULT_ADDRESS,
        functionName: "executePolicy",
        args: ["yield-deposit", TREASURY_VAULT_ADDRESS, amt, "deposit"],
      });
      await publicClient.waitForTransactionReceipt({ hash: execHash });
      return execHash;
    } finally {
      setIsPending(false);
    }
  }

  /**
   * Register a new yield policy in PolicyEngine:
   *   PolicyEngine.createPolicy(name, "deposit_routing", walletAddr, vault, conditions)
   */
  async function executeDeployPolicy(opportunityName: string): Promise<`0x${string}`> {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("RPC client unavailable");
    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        abi: POLICY_ENGINE_ABI,
        address: POLICY_ENGINE_ADDRESS,
        functionName: "createPolicy",
        args: [
          opportunityName,
          "deposit_routing",
          address,
          TREASURY_VAULT_ADDRESS,
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
