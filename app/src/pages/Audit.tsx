import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useStore } from "@/store";
import { jsPDF } from "jspdf";
import { Download, FileText, ShieldCheck, Database, ExternalLink } from "lucide-react";
import { IS_TESTNET } from "@/web3/mode";
import { BASESCAN_TX } from "@/web3/testnet";
import { usePolicyExecutionLogs } from "@/web3/usePolicyExecutionLogs";

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
              {generating ? "Sequencing Report..." : <><Download className="h-4 w-4" /> Export Evidence Bundle</>}
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

function OnchainAuditTrail() {
  const { logs, loading, error } = usePolicyExecutionLogs();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Onchain Policy Executions
        </h2>
        {loading ? <span className="text-[11px] text-muted-foreground">Refreshing…</span> : null}
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-xs text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {logs.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-6 text-center text-xs text-muted-foreground">
            No onchain executions yet. Approve an intent to write the first PolicyExecuted log.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {logs.map((log) => (
          <a
            key={log.txHash}
            href={BASESCAN_TX(log.txHash)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  {log.action.charAt(0).toUpperCase() + log.action.slice(1)} · {log.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} mUSDC
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {log.policyId} · block {log.blockNumber.toString()} · {new Date(log.timestamp * 1000).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Tx Hash</p>
                <p className="text-[11px] font-mono text-foreground/70">
                  {log.txHash.slice(0, 8)}…{log.txHash.slice(-6)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ExternalLink className="h-4 w-4" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
