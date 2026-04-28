import { useStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { Building2, Plus, Wallet, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Entities() {
  const entities = useStore((s) => s.entities);
  const accounts = useStore((s) => s.accounts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Managed Legal Entities</h2>
        <Button size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Entity
        </Button>
      </div>

      <div id="entities-list" className="grid gap-4">
        {entities.map(entity => {
          const entityAccounts = accounts.filter(a => a.entityId === entity.id);
          const entityBalance = entityAccounts.reduce((sum, a) => sum + a.balance, 0);
          
          return (
            <Card key={entity.id} className="overflow-hidden group hover:border-primary/50 transition-all">
              <div className="flex flex-col md:flex-row">
                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary mb-4">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                      {entity.id.includes("us") ? "US Domestic" : "International"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold">{entity.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Tax ID: {entity.id.toUpperCase()}-XXXXX</p>
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Entity Value</span>
                      <span className="font-bold"><Money amount={entityBalance} /></span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Active Wallets</span>
                      <span className="font-medium flex items-center gap-1">
                        <Wallet className="h-3 w-3" /> {entityAccounts.length}
                      </span>
                    </div>
                    
                    {entityBalance === 0 && (
                      <Button variant="outline" size="sm" className="w-full mt-4 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 gap-2 text-[10px] uppercase font-bold tracking-widest">
                        <Plus className="h-3 w-3" /> Provision CDP Wallet
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 p-6 space-y-4 bg-card">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Wallets</h4>
                  <div className="grid gap-2">
                    {entityAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer group/row">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{acc.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase">{acc.chain} · {acc.asset}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold"><Money amount={acc.balance} asset={acc.asset} /></p>
                            <p className="text-[10px] text-muted-foreground">Balance</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary">
                    View All Assets & Controls
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
