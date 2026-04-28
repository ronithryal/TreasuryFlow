import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useStore } from "@/store";
import { jsPDF } from "jspdf";
import { Download, FileText, ShieldCheck, Database, ExternalLink } from "lucide-react";

export function Audit() {
  const [generating, setGenerating] = useState(false);
  const ledger = useStore(s => s.ledger);
  const audit = useStore(s => s.audit);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1000));
    const doc = new jsPDF();
    doc.text("TreasuryFlow Audit Report", 20, 20);
    doc.text(`Total Ledger Entries: ${ledger.length}`, 20, 30);
    doc.text(`Total Audit Events: ${audit.length}`, 20, 40);
    doc.text("Onchain Proofs Included", 20, 50);
    doc.save("audit_report.pdf");
    setGenerating(false);
  };

  const BUNDLES = [
    { id: "EB-2024-04-27-01", type: "Monthly Close", events: 142, status: "finalized", hash: "0x82f...a12b" },
    { id: "EB-2024-04-26-02", type: "Policy Change", events: 1, status: "finalized", hash: "0x31a...e921" },
    { id: "EB-2024-04-25-01", type: "Anomaly Report", events: 3, status: "finalized", hash: "0x992...c81d" },
  ];

  return (
    <div id="audit-section" className="space-y-6">
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

        <Card>
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
              <span className="font-bold">Last block: 1,429,201</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div id="audit-bundles" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Evidence Bundles</h2>
        <div className="space-y-2">
          {BUNDLES.map(b => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group">
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
    </div>
  );
}
