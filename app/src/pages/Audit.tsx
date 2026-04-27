import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useStore } from "@/store";
import { jsPDF } from "jspdf";
import { Download, CheckCircle2 } from "lucide-react";

export function Audit() {
  const [generating, setGenerating] = useState(false);
  const ledger = useStore(s => s.ledger);
  const audit = useStore(s => s.audit);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1000));
    
    // Stub PDF generation
    const doc = new jsPDF();
    doc.text("TreasuryFlow Audit Report", 20, 20);
    doc.text(`Total Ledger Entries: ${ledger.length}`, 20, 30);
    doc.text(`Total Audit Events: ${audit.length}`, 20, 40);
    doc.text("Onchain Proofs Included (Simulated)", 20, 50);
    doc.save("audit_report.pdf");

    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate immutable onchain records</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : <><Download className="h-4 w-4 mr-2"/> Generate PDF</>}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Click Generate PDF to create a new report with Perplexity AI rationales and Etherscan block proofs.</p>
        </CardContent>
      </Card>
    </div>
  );
}
