import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Zap, Bot, ArrowRight, ShieldCheck, CheckCircle2, ExternalLink } from "lucide-react";
import { useStore } from "@/store";
import { IS_TESTNET } from "@/web3/mode";

export function AIPolicyBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (IS_TESTNET) return <TestnetPolicyBuilder open={open} onOpenChange={onOpenChange} />;
  return <MockPolicyBuilder open={open} onOpenChange={onOpenChange} />;
}

// ---- mock variant (no wagmi) ------------------------------------------------

function MockPolicyBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "review" | "deploying" | "deployed">("idle");
  const upsertPolicy = useStore((s) => s.upsertPolicy);

  const handleGenerate = async () => {
    if (!prompt) return;
    setStatus("generating");
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("review");
  };

  const handleDeploy = () => {
    upsertPolicy({
      name: "AI Generated Sweep Policy",
      type: "sweep",
      description: prompt,
      sourceAccountIds: ["acc_base_ops"],
      destinationAccountIds: ["morpho_contract"],
      conditions: { kind: "balance_above", thresholdUsd: 100000, keepMinUsd: 50000 },
      thresholds: { upperUsd: 100000, lowerUsd: 50000 },
      cadence: "hourly",
      approvalRule: { kind: "auto-if-below", amountUsd: 50000 },
    });
    setStatus("deployed");
    setTimeout(() => { onOpenChange(false); setTimeout(() => setStatus("idle"), 500); }, 2000);
  };

  return (
    <PolicyBuilderDialog
      open={open}
      onOpenChange={onOpenChange}
      prompt={prompt}
      setPrompt={setPrompt}
      status={status}
      setStatus={setStatus}
      txHash={undefined}
      isPending={false}
      onGenerate={handleGenerate}
      onDeploy={handleDeploy}
      deployLabel="Activate Policy"
    />
  );
}

// ---- testnet variant (wagmi hooks safe here) --------------------------------

import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import {
  POLICY_ENGINE_ADDRESS,
  POLICY_ENGINE_ABI,
  POLICY_ENGINE_CONFIGURED,
  BASESCAN_TX,
} from "@/web3/testnet";

// address(0) = wildcard in PolicyEngine (any source/destination allowed)
const DEMO_SOURCE = "0x0000000000000000000000000000000000000000" as const;
const DEMO_DEST = "0x0000000000000000000000000000000000000000" as const;
// 100,000 USDC max (6 decimals)
const DEMO_MAX_AMOUNT = 100_000n * 1_000_000n;

function TestnetPolicyBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "review" | "deploying" | "deployed">("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const upsertPolicy = useStore((s) => s.upsertPolicy);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const handleGenerate = async () => {
    if (!prompt) return;
    setStatus("generating");
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("review");
  };

  const handleDeploy = async () => {
    setError(undefined);
    setStatus("deploying");

    if (POLICY_ENGINE_CONFIGURED && address && publicClient) {
      try {
        const hash = await writeContractAsync({
          abi: POLICY_ENGINE_ABI,
          address: POLICY_ENGINE_ADDRESS,
          functionName: "createPolicy",
          // name, policyType, source (address(0)=wildcard), destination (address(0)=wildcard),
          // maxAmount (uint256), conditions (string)
          args: ["AI Generated Sweep Policy", "sweep", DEMO_SOURCE, DEMO_DEST, DEMO_MAX_AMOUNT, prompt],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        setTxHash(hash);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("review");
        return;
      }
    }

    upsertPolicy({
      name: "AI Generated Sweep Policy",
      type: "sweep",
      description: prompt,
      sourceAccountIds: ["acc_base_ops"],
      destinationAccountIds: ["morpho_contract"],
      conditions: { kind: "balance_above", thresholdUsd: 100000, keepMinUsd: 50000 },
      thresholds: { upperUsd: 100000, lowerUsd: 50000 },
      cadence: "hourly",
      approvalRule: { kind: "auto-if-below", amountUsd: 50000 },
    });

    setStatus("deployed");
    setTimeout(() => { onOpenChange(false); setTimeout(() => { setStatus("idle"); setTxHash(undefined); }, 500); }, 3000);
  };

  return (
    <PolicyBuilderDialog
      open={open}
      onOpenChange={onOpenChange}
      prompt={prompt}
      setPrompt={setPrompt}
      status={status}
      setStatus={setStatus}
      txHash={txHash}
      error={error}
      isPending={status === "deploying"}
      onGenerate={handleGenerate}
      onDeploy={handleDeploy}
      deployLabel={status === "deploying" ? "Confirm in wallet…" : "Deploy Onchain"}
    />
  );
}

// ---- shared dialog layout ---------------------------------------------------

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  status: "idle" | "generating" | "review" | "deploying" | "deployed";
  setStatus: (s: "idle" | "generating" | "review" | "deploying" | "deployed") => void;
  txHash?: string;
  error?: string;
  isPending: boolean;
  deployLabel: string;
  onGenerate: () => void;
  onDeploy: () => void;
}

function PolicyBuilderDialog({
  open, onOpenChange, prompt, setPrompt, status, setStatus,
  txHash, error, isPending, deployLabel, onGenerate, onDeploy,
}: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) { onOpenChange(false); setTimeout(() => setStatus("idle"), 500); }
    }}>
      <DialogContent className="sm:max-w-[600px] border-primary/20 bg-background/95 backdrop-blur-xl" data-tour="ai-policy-builder-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Agentic Policy Builder
          </DialogTitle>
          <DialogDescription>
            Describe your operational intent in plain English. The agent will compile it into an autonomous, onchain policy.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {status === "idle" && (
            <div className="space-y-4">
              <Textarea
                data-tour="ai-policy-prompt"
                placeholder="e.g. Sweep any USDC above $100k in the Base Operating wallet to Morpho Yield at the end of each day."
                className="min-h-[120px] resize-none bg-muted/30 border-primary/10 focus-visible:ring-primary/50"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="flex justify-end">
                <Button data-tour="ai-policy-generate" onClick={onGenerate} disabled={!prompt} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Compile Policy
                </Button>
              </div>
            </div>
          )}

          {status === "generating" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <Bot className="h-12 w-12 text-primary animate-bounce relative z-10" />
              </div>
              <p className="text-sm font-medium animate-pulse text-muted-foreground">Parsing intent & generating bytecode...</p>
            </div>
          )}

          {(status === "review" || status === "deploying") && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">Compiled Logic</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-primary/60 font-mono">100% Deterministic</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div><span className="text-muted-foreground">Type</span><p className="font-mono mt-1 text-primary">Sweep & Yield</p></div>
                  <div><span className="text-muted-foreground">Cadence</span><p className="font-mono mt-1 text-primary">Hourly Check</p></div>
                  <div><span className="text-muted-foreground">Condition</span><p className="font-mono mt-1 text-primary">Balance &gt; $100,000</p></div>
                  <div><span className="text-muted-foreground">Action</span><p className="font-mono mt-1 text-primary">Deposit to Morpho</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Source</span><p className="font-mono mt-1 text-primary">Base Operating Wallet (0x71C...4e21)</p></div>
                </div>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStatus("idle")} disabled={isPending}>Cancel</Button>
                <Button data-tour="ai-policy-deploy" onClick={onDeploy} disabled={isPending} className="gap-2 bg-primary text-primary-foreground">
                  {deployLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {status === "deployed" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="h-16 w-16 rounded-full bg-chart-5/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-chart-5" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-foreground">Policy Deployed</p>
                <p className="text-sm text-muted-foreground">Autonomous execution is now active.</p>
                {txHash ? (
                  <a
                    href={BASESCAN_TX(txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 font-mono text-[11px] text-primary hover:underline mt-1"
                  >
                    {txHash.slice(0, 10)}…{txHash.slice(-8)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
