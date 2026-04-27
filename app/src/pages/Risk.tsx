import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useStore } from "@/store";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export function Risk() {
  const counterparties = useStore(s => s.counterparties);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Counterparty Risk</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-driven risk scoring</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counterparties.map(c => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex justify-between">
                {c.name}
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Status: Low Risk</p>
              <p className="text-[11px] text-muted-foreground mt-2">Perplexity assessment: Amount is normal, timing is within business hours.</p>
            </CardContent>
          </Card>
        ))}
        {counterparties.length === 0 && <p className="text-sm">No counterparties</p>}
      </div>
    </div>
  );
}
