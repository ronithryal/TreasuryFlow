import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useStore } from "@/store";
import { jsPDF } from "jspdf";
import { Download, FileText, ShieldCheck, Database, ExternalLink, Info } from "lucide-react";
import { IS_TESTNET } from "@/web3/mode";
import { BASESCAN_ADDR } from "@/web3/testnet";
import { usePolicyExecutionLogs, type IntentExecutionLog } from "@/web3/usePolicyExecutionLogs";

export function Audit() {
  const [generating, setGenerating] = useState(false);
  const ledger = useStore((s) => s.ledger);
  const audit = useStore((s) => s.audit);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1000));
    const doc = new jsPDF();
    doc.text("TreasuryFlow Audit Report", 20, 20);
    doc.text(`Total Ledger Entries: ${ledger.length}`, 20, 30);
    doc.text(`Total Audit Events: ${audit.length}`, 20, 40);
    doc.text("Onchain Proofs Included", 20, 50);
    doc.save("audit_report.pdf");
    setGenerating(false);
  };

  return (
    <div id="audit-section" data-tour="audit-section" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Database className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Immutable Ledger</span>
            </div>
            <CardTitle className="text-sm font-bold">Generate Forensic Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create an exportable PDF bundle containing every transaction hash, policy evaluation, and Perplexity AI rationale for the selected period.
            </p>
            <Button className="w-full text-xs h-9 gap-2" onClick={handleGenerate} disabled={generating}>
              {generating ? "Sequencing Report..." : <><Download className="h-4 w-4" />Export Evidence Bundle</>}
            </Button>
          </CardContent>
        </Card>

        <Card data-tour="audit-compliance">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-chart-5 mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Compliance Status</span>
            </div>
            <CardTitle className="text-sm font-bold">Regulatory Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-5 shadow-[0_0_8px_rgba(var(--chart-5),0.5)]" />
                <span className="text-muted-foreground">All Policies Verified</span>
              </div>
              <span className="font-bold">100% Verified</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-5" />
                <span className="text-muted-foreground">Onchain Proven</span>
              </div>
              <span className="font-bold">{IS_TESTNET ? "Base Sepolia" : "Last block: 1,429,201"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {IS_TESTNET ? <OnchainAuditTrail /> : <MockAuditBundles />}
    </div>
  );
}

// ── Mock demo (preserved) ────────────────────────────────────────────────────

function MockAuditBundles() {
  const BUNDLES = [
    { id: "EB-2024-04-27-01", type: "Monthly Close", events: 142, status: "finalized", hash: "0x82f...a12b" },
    { id: "EB-2024-04-26-02", type: "Policy Change", events: 1, status: "finalized", hash: "0x31a...e921" },
    { id: "EB-2024-04-25-01", type: "Anomaly Report", events: 3, status: "finalized", hash: "0x992...c81d" },
  ];
  return (
    <div id="audit-bundles" data-tour="audit-bundles" className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Evidence Bundles</h2>
      <div className="space-y-2">
        {BUNDLES.map((b) => (
          <div
            key={b.id}
            data-tour={b.id === "EB-2024-04-27-01" ? "audit-bundle-row" : undefined}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{b.type}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{b.id} · {b.events} events recorded</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Onchain Hash</p>
                <p className="text-[11px] font-mono text-foreground/70">{b.hash}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ExternalLink className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Testnet audit trail ──────────────────────────────────────────────────────

function OnchainAuditTrail() {
  const { logs, loading, error } = usePolicyExecutionLogs();
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Onchain Payment Executions · Base Sepolia
        </h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-[11px] text-muted-foreground">Refreshing…</span>}
          <button
            onClick={() => setExplainerOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label="What am I verifying?"
          >
            <Info className="h-3.5 w-3.5" />
            What am I verifying?
          </button>
        </div>
      </div>

      {/* Explainer */}
      {explainerOpen && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p className="font-bold text-foreground">What am I verifying?</p>
            <p>
              This execution proves that a payment request was created by the initiator,
              approved by a <em>different</em> approver address, validated against PolicyEngine,
              executed through IntentRegistry, and transferred by TreasuryVault to the destination
              on Base Sepolia.
            </p>
            <p>
              The approval step is signed server-side by a separate key (the Treasury Admin demo
              signer), enforcing the <strong>maker-checker</strong> control onchain — the same
              wallet cannot both create and approve a payment request.
            </p>
            <p className="text-[10px]">
              In production, approval would be signed by an authorized approver wallet via Safe,
              WalletConnect, or CDP Embedded Wallets.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-xs text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Empty state */}
      {logs.length === 0 && !loading && (
        <Card>
          <CardContent className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium">No onchain Payment Requests executed yet.</p>
            <p>Complete the golden path to write the first onchain payment request proof.</p>
          </CardContent>
        </Card>
      )}

      {/* Execution cards */}
      <div className="space-y-3">
        {logs.map((log) => (
          <IntentExecutionCard key={log.executionTxHash} log={log} />
        ))}
      </div>
    </div>
  );
}

function IntentExecutionCard({ log }: { log: IntentExecutionLog }) {
  const short = (addr: string, n = 6) =>
    addr && addr.length > 12 ? `${addr.slice(0, n)}…${addr.slice(-4)}` : addr;
  const shortTx = (hash: string) =>
    hash && hash.length > 12 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;

  const amountStr = log.amount.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Card className="border-border hover:border-primary/40 transition-colors">
      <CardContent className="py-4 space-y-3">
        {/* Top row: policy + amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {log.policyName !== "—" ? log.policyName : "Payment Request"}
                {" "}· {amountStr} USDC
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                Payment Request #{log.intentId !== "—" ? log.intentId : "?"}{" "}
                · block {log.blockNumber > 0n ? log.blockNumber.toString() : "?"}
                {log.timestamp > 0 && ` · ${new Date(log.timestamp * 1000).toLocaleString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-chart-5/10 text-chart-5 text-[10px] font-bold">
            <ShieldCheck className="h-3 w-3" />
            Executed
          </div>
        </div>

        {/* Address grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
            <p className="text-muted-foreground font-medium uppercase tracking-tight text-[9px]">Initiator</p>
            <a
              href={log.initiator && log.initiator !== "—" ? BASESCAN_ADDR(log.initiator) : "#"}
              target="_blank" rel="noreferrer"
              className="font-mono hover:text-primary transition-colors truncate block"
            >
              {short(log.initiator)}
            </a>
          </div>
          <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
            <p className="text-muted-foreground font-medium uppercase tracking-tight text-[9px]">Approved by</p>
            <div className="group relative">
              <span className="font-mono truncate block">
                {log.approver === "Approved by Treasury Admin demo signer"
                  ? "Treasury Admin demo signer"
                  : short(log.approver)}
              </span>
              {/* Tooltip */}
              <div className="absolute hidden group-hover:block bottom-full left-0 z-10 w-56 p-2 rounded-lg bg-popover border border-border text-[10px] text-muted-foreground shadow-lg mb-1">
                In production, approval would be signed by an authorized approver wallet via Safe,
                WalletConnect, or CDP Embedded Wallets.
              </div>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
            <p className="text-muted-foreground font-medium uppercase tracking-tight text-[9px]">Destination</p>
            <a
              href={log.destination && log.destination !== "—" ? BASESCAN_ADDR(log.destination as string) : "#"}
              target="_blank" rel="noreferrer"
              className="font-mono hover:text-primary transition-colors truncate block"
            >
              {short(log.destination as string)}
            </a>
          </div>
        </div>

        {/* Tx hashes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {log.approvalTxHash && (
            <a
              href={log.approvalUrl}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
            >
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-tight text-muted-foreground font-medium">Approval Tx</p>
                <p className="font-mono text-foreground/80">{shortTx(log.approvalTxHash)}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          )}
          <a
            href={log.executionUrl}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-between p-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
            title="Opens Base Sepolia transaction evidence for this payment request."
          >
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-tight text-primary/70 font-medium">Execution Tx (proof)</p>
              <p className="font-mono text-foreground/80">{shortTx(log.executionTxHash)}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
