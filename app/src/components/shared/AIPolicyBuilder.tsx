import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Zap, Bot, ArrowRight, ShieldCheck, CheckCircle2, ExternalLink, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/store";
import { IS_TESTNET } from "@/web3/mode";
import type { PolicyType } from "@/types/domain";

// ── Intent classification ────────────────────────────────────────────────────
//
// TODO: replace keyword map with real LLM intent classification in productionalization sprint
//
// Keyword order matters: more specific phrases are checked before shorter ones.
// "bank cash out" must come before "cash out" to avoid the prefix matching "bank".

interface CompiledPolicyMeta {
  domainType: PolicyType;
  label: string;
  cadence: string;
  condition: string;
  action: string;
}

const POLICY_TYPE_KEYWORD_MAP: Array<CompiledPolicyMeta & { keywords: string[] }> = [
  {
    keywords: ["rebalance", "rebalancing", "rebalance portfolio", "move funds between wallets"],
    domainType: "rebalance",
    label: "Rebalance",
    cadence: "On-demand",
    condition: "Target band deviation detected",
    action: "Move funds between wallets",
  },
  {
    keywords: ["sweep and yield", "sweep", "deposit to morpho", "yield"],
    domainType: "sweep",
    label: "Sweep & Yield",
    cadence: "Hourly Check",
    condition: "Balance > $100,000",
    action: "Deposit to Morpho",
  },
  {
    keywords: ["bank cash out", "cash out", "wire", "ach"],
    domainType: "cash_out",
    label: "Bank Cash-Out",
    cadence: "On-demand",
    condition: "Approval required",
    action: "Wire or ACH to bank",
  },
  {
    keywords: ["cross border", "foreign exchange", "fx"],
    domainType: "cash_out",
    label: "FX / Cross-Border",
    cadence: "On-demand",
    condition: "FX exposure detected",
    action: "Cross-border settlement",
  },
  {
    keywords: ["vendor payment", "pay vendor", "payout"],
    domainType: "payout_run",
    label: "Vendor Payout",
    cadence: "On-demand",
    condition: "Approval required",
    action: "Pay approved vendor",
  },
];

// Default when prompt is long enough but no keyword matches.
const DEFAULT_COMPILED_POLICY = POLICY_TYPE_KEYWORD_MAP[1]; // Sweep & Yield

function classifyIntent(prompt: string): CompiledPolicyMeta | null {
  const lower = prompt.toLowerCase();
  for (const entry of POLICY_TYPE_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry;
    }
  }
  return null;
}

const CLARIFYING_QUESTION =
  "What type of movement: sweep to yield, rebalance between wallets, or bank cash-out?";

export function AIPolicyBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (IS_TESTNET) return <TestnetPolicyBuilder open={open} onOpenChange={onOpenChange} />;
  return <MockPolicyBuilder open={open} onOpenChange={onOpenChange} />;
}

// ---- mock variant (no wagmi) ------------------------------------------------

function MockPolicyBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "clarifying" | "generating" | "review" | "deploying" | "deployed">("idle");
  const [compiledPolicy, setCompiledPolicy] = useState<CompiledPolicyMeta>(DEFAULT_COMPILED_POLICY);
  const upsertPolicy = useStore((s) => s.upsertPolicy);

  const handleGenerate = async () => {
    if (!prompt) return;
    const words = prompt.trim().split(/\s+/);
    const classified = classifyIntent(prompt);
    // Trigger one clarifying question if input is under 10 words and no policy type matched.
    if (words.length < 10 && !classified) {
      setStatus("clarifying");
      return;
    }
    const resolved = classified ?? DEFAULT_COMPILED_POLICY;
    setCompiledPolicy(resolved);
    setStatus("generating");
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("review");
  };

  const handleClarifyConfirm = async () => {
    // User acknowledged the clarifying question — proceed with default classification.
    setCompiledPolicy(DEFAULT_COMPILED_POLICY);
    setStatus("generating");
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("review");
  };

  const handleDeploy = () => {
    upsertPolicy({
      name: `AI Generated ${compiledPolicy.label} Policy`,
      type: compiledPolicy.domainType,
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
      compiledPolicy={compiledPolicy}
      txHash={undefined}
      isPending={false}
      onGenerate={handleGenerate}
      onClarifyConfirm={handleClarifyConfirm}
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
  const [status, setStatus] = useState<"idle" | "clarifying" | "generating" | "review" | "deploying" | "deployed">("idle");
  const [compiledPolicy, setCompiledPolicy] = useState<CompiledPolicyMeta>(DEFAULT_COMPILED_POLICY);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const upsertPolicy = useStore((s) => s.upsertPolicy);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const handleGenerate = async () => {
    if (!prompt) return;
    const words = prompt.trim().split(/\s+/);
    const classified = classifyIntent(prompt);
    // Trigger one clarifying question if input is under 10 words and no policy type matched.
    if (words.length < 10 && !classified) {
      setStatus("clarifying");
      return;
    }
    const resolved = classified ?? DEFAULT_COMPILED_POLICY;
    setCompiledPolicy(resolved);
    setStatus("generating");
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("review");
  };

  const handleClarifyConfirm = async () => {
    setCompiledPolicy(DEFAULT_COMPILED_POLICY);
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
          args: [`AI Generated ${compiledPolicy.label} Policy`, compiledPolicy.domainType, DEMO_SOURCE, DEMO_DEST, DEMO_MAX_AMOUNT, prompt],
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
      name: `AI Generated ${compiledPolicy.label} Policy`,
      type: compiledPolicy.domainType,
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
      compiledPolicy={compiledPolicy}
      txHash={txHash}
      error={error}
      isPending={status === "deploying"}
      onGenerate={handleGenerate}
      onClarifyConfirm={handleClarifyConfirm}
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
  status: "idle" | "clarifying" | "generating" | "review" | "deploying" | "deployed";
  setStatus: (s: "idle" | "clarifying" | "generating" | "review" | "deploying" | "deployed") => void;
  compiledPolicy: CompiledPolicyMeta;
  txHash?: string;
  error?: string;
  isPending: boolean;
  deployLabel: string;
  onGenerate: () => void;
  onClarifyConfirm: () => void;
  onDeploy: () => void;
}

function PolicyBuilderDialog({
  open, onOpenChange, prompt, setPrompt, status, setStatus,
  compiledPolicy, txHash, error, isPending, deployLabel,
  onGenerate, onClarifyConfirm, onDeploy,
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
            <Badge variant="secondary" className="text-[10px] font-mono">Demo</Badge>
          </DialogTitle>
          <DialogDescription>
            Describe your intent in plain English. Policy type is classified by keyword rules in v1 — AI-driven compilation via Hermes coming soon.
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

          {status === "clarifying" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-semibold">One quick question</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{CLARIFYING_QUESTION}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Your prompt: <span className="italic">"{prompt}"</span>
              </p>
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStatus("idle")}>Edit prompt</Button>
                <Button onClick={onClarifyConfirm} className="gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
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
                  <div><span className="text-muted-foreground">Type</span><p className="font-mono mt-1 text-primary">{compiledPolicy.label}</p></div>
                  <div><span className="text-muted-foreground">Cadence</span><p className="font-mono mt-1 text-primary">{compiledPolicy.cadence}</p></div>
                  <div><span className="text-muted-foreground">Condition</span><p className="font-mono mt-1 text-primary">{compiledPolicy.condition}</p></div>
                  <div><span className="text-muted-foreground">Action</span><p className="font-mono mt-1 text-primary">{compiledPolicy.action}</p></div>
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
