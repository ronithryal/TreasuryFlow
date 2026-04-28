import { IS_TESTNET } from "@/web3/mode";

/**
 * Renders nothing in mock mode. In testnet mode, mounts the inner component
 * which is allowed to call wagmi hooks (WagmiProvider is guaranteed to be
 * present in the React tree when IS_TESTNET=true).
 */
export function TestnetSetupBanner() {
  if (!IS_TESTNET) return null;
  return <TestnetBannerContent />;
}

// ---- inner component (wagmi hooks safe here) --------------------------------

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ExternalLink, Wallet, CheckCircle2 } from "lucide-react";
import { useStore } from "@/store";
import {
  BASESCAN_TX,
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  TESTNET_CONFIGURED,
  toUsdcUnits,
} from "@/web3/testnet";
const MINT_AMOUNT = 100_000;

function TestnetBannerContent() {
  const { address, isConnected } = useAccount();
  const usdcBalance = useStore((s) => s.testnet.usdcBalance);
  const hydrated = useStore((s) => s.testnet.hydrated);

  const { writeContractAsync, isPending: isMinting } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess: isMinted } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: !!pendingHash },
  });

  if (!TESTNET_CONFIGURED) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-destructive">Testnet not configured</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Set <code className="rounded bg-muted px-1 py-0.5 font-mono">VITE_MOCK_USDC_ADDRESS</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">VITE_TREASURY_VAULT_ADDRESS</code> in your environment, then redeploy.
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader className="flex-row items-center gap-3 pb-3">
          <div className="rounded-lg bg-primary/15 p-2 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Connect a wallet to begin</CardTitle>
            <p className="text-xs text-muted-foreground">
              Use the Connect button in the top-right. The demo runs on Base Sepolia.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!hydrated) {
    return (
      <Card className="border-border bg-muted/20">
        <CardContent className="py-3 text-xs text-muted-foreground">Hydrating onchain state…</CardContent>
      </Card>
    );
  }

  if (usdcBalance > 0) {
    return (
      <Card className="border-chart-5/30 bg-chart-5/5">
        <CardContent className="flex items-center justify-between py-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-chart-5" />
            <span className="font-medium">Wallet funded —</span>
            <span className="text-muted-foreground">
              {usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} mUSDC available on Base Sepolia.
            </span>
          </div>
          {pendingHash ? (
            <a
              href={BASESCAN_TX(pendingHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
            >
              {pendingHash.slice(0, 8)}…{pendingHash.slice(-6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const handleMint = async () => {
    if (!address) return;
    try {
      const hash = await writeContractAsync({
        abi: MOCK_USDC_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: "mint",
        args: [address, toUsdcUnits(MINT_AMOUNT)],
      });
      setPendingHash(hash);
    } catch (err) {
      console.error("Mint failed", err);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-primary">
          <Coins className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Testnet Setup</span>
        </div>
        <CardTitle className="text-sm font-bold">Fund your treasury with Mock USDC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Mint {MINT_AMOUNT.toLocaleString()} mUSDC directly to{" "}
          <span className="font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>. Once confirmed, every policy
          execution in this demo will move real testnet tokens through the TreasuryVault contract.
        </p>
        <div className="flex items-center gap-3">
          <Button size="sm" className="text-xs" onClick={handleMint} disabled={isMinting || isConfirming}>
            {isMinting
              ? "Confirm in wallet…"
              : isConfirming
                ? "Waiting for block…"
                : isMinted
                  ? "Minted ✓"
                  : `Mint ${MINT_AMOUNT.toLocaleString()} mUSDC`}
          </Button>
          {pendingHash ? (
            <a
              href={BASESCAN_TX(pendingHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
            >
              View tx
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
