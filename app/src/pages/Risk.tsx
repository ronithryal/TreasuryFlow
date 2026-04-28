import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useStore } from "@/store";
import { ShieldCheck, AlertTriangle, Search, Fingerprint, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Risk() {
  const counterparties = useStore(s => s.counterparties);

  return (
    <div id="risk-section" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Fingerprint className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Global Trust Index</span>
            </div>
            <p className="text-2xl font-bold">98.4</p>
            <p className="text-xs text-muted-foreground mt-1">Institutional confidence score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-chart-5 mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Verified Entities</span>
            </div>
            <p className="text-2xl font-bold">{counterparties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active trust relationships</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-chart-3 mb-2">
              <Search className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Signals Scanned</span>
            </div>
            <p className="text-2xl font-bold">12,402</p>
            <p className="text-xs text-muted-foreground mt-1">24h forensic data points</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Counterparty Forensics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {counterparties.map(c => (
            <Card key={c.id} className="group hover:border-primary/50 transition-all overflow-hidden">
              <CardHeader className="pb-2 border-b border-white/5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">{c.name}</CardTitle>
                  <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/20 text-[10px]">Low Risk</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Onchain Identity</p>
                    <p className="text-[11px] font-mono truncate text-foreground/80">0x71C...4e21</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Volume (30d)</p>
                    <p className="text-[11px] font-bold">$124.5k</p>
                  </div>
                </div>
                
                <div className="rounded-lg bg-black/20 p-3 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 rounded bg-primary/20 text-primary flex items-center justify-center">
                      <Globe className="h-2.5 w-2.5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-primary/80">AI Rationale</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                    "Entity verified via social consensus and historical treasury patterns. No sanctions exposure or flash-loan association detected in last 5,000 blocks."
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
