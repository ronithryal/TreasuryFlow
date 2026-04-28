import { useStore } from "@/store";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Zap, ShieldCheck, ArrowUpRight, TrendingUp, Landmark } from "lucide-react";

export function Yield() {
  const accounts = useStore((s) => s.accounts.filter(a => a.name.toLowerCase().includes("morpho")));
  
  const OPPORTUNITIES = [
    {
      id: "morpho-usdc",
      name: "Morpho Blue USDC Optimizer",
      protocol: "Morpho",
      apy: "8.42%",
      risk: "Low",
      tvl: "$420M",
      description: "Non-custodial algorithmic optimization across Morpho Blue markets.",
      status: "active"
    },
    {
      id: "aave-usdc",
      name: "Aave v3 USDC Pool",
      protocol: "Aave",
      apy: "5.12%",
      risk: "Lowest",
      tvl: "$2.1B",
      description: "Direct supply to Aave v3 Ethereum markets. Instant liquidity.",
      status: "available"
    },
    {
      id: "sky-usds",
      name: "Sky (Maker) USDS Savings",
      protocol: "Sky",
      apy: "6.00%",
      risk: "Medium-Low",
      tvl: "$1.2B",
      description: "Onchain USDS savings rate with automated rebalancing.",
      status: "available"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Active Positions */}
      <div id="yield-active-positions" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Yield Positions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <Card key={acc.id} className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <StatusBadge status="active" />
                </div>
                <CardTitle className="text-sm mt-3">{acc.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold"><Money amount={acc.balance} asset={acc.asset} /></p>
                  <p className="text-xs text-chart-5 font-medium flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> +$1,240.50 accrued (30d)
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex gap-2">
                <Button variant="outline" size="sm" className="w-full text-xs h-8">Withdraw</Button>
                <Button variant="default" size="sm" className="w-full text-xs h-8">Add Funds</Button>
              </CardFooter>
            </Card>
          ))}
          {accounts.length === 0 && (
            <Card className="border-dashed border-muted-foreground/30 bg-muted/10 flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <Landmark className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground">No active yield positions. Deploy capital to start earning.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Opportunities */}
      <div id="yield-opportunities" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Non-Custodial Opportunities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OPPORTUNITIES.map(op => (
            <Card key={op.id} className="hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{op.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">{op.protocol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-chart-5">{op.apy}</p>
                    <p className="text-[10px] text-muted-foreground">APY</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {op.description}
                </p>
                <div className="flex items-center justify-between text-[11px] bg-muted/30 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-chart-5" />
                    <span className="text-muted-foreground">Risk Score:</span>
                    <span className="font-bold">{op.risk}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">TVL:</span>
                    <span className="font-bold">{op.tvl}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full text-xs h-9 border-card-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                  Configure Deployment Policy
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
