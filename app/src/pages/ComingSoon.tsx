import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Network, 
  FileCheck2, 
  Zap, 
  RefreshCcw, 
  Building2, 
  ArrowUpRight,
  ShieldAlert,
  LineChart,
  Code2
} from "lucide-react";

export function ComingSoon() {
  const features = [
    {
      title: "Coinbase for Business Integration",
      description: "Real-time onchain execution via Coinbase API, live balance polling across multiple chains, and automated USDC settlement.",
      icon: Network,
      tag: "v1.0",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Institutional Audit Suite",
      description: "Regulatory-grade PDF audit reports with Perplexity-cited rationale, automated policy change logs, and cryptographically verifiable approval chains.",
      icon: FileCheck2,
      tag: "v1.0",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Advanced AI Risk Engine",
      description: "Real-time anomaly detection, deep counterparty risk scoring, and automated compliance hooks for SAR/AML reporting.",
      icon: ShieldAlert,
      tag: "v1.1",
      color: "text-red-500",
      bg: "bg-red-500/10"
    },
    {
      title: "Predictive Capital Allocation",
      description: "AI-powered forecasting of cash requirements with proactive rebalancing suggestions to optimize yield and liquidity.",
      icon: LineChart,
      tag: "v1.1",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: "ERP & Accounting Connect",
      description: "Native sync for NetSuite, QuickBooks, and Sage. Automated general ledger posting with transaction-level categorization.",
      icon: RefreshCcw,
      tag: "v1.1",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Multi-Entity Orchestration",
      description: "Consolidated reporting and policy management for complex organizational structures and global subsidiaries.",
      icon: Building2,
      tag: "v1.0",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10"
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Roadmap</h1>
        <p className="text-muted-foreground">
          The following institutional-grade features are currently under development and scheduled for rollout in our upcoming production releases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <Card key={i} className="group hover:border-primary/50 transition-all duration-300 border-dashed">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${feature.bg} ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {feature.tag}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-4 group-hover:text-primary transition-colors">
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap className="h-32 w-32 text-primary fill-primary" />
        </div>
        <CardContent className="py-10 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-5">
              <h2 className="text-3xl font-bold italic tracking-tight">"From trust to proof."</h2>
              <p className="text-muted-foreground text-lg max-w-xl">
                TreasuryFlow is expanding its non-custodial engine to support liquidity pools, market making, and cross-chain routing, further reducing the latency of trust in corporate finance.
              </p>
              <div className="flex gap-6 pt-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-foreground/80">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  99.99% Uptime SLA
                </div>
                <div className="flex items-center gap-2.5 text-sm font-medium text-foreground/80">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Audited Smart Contracts
                </div>
                <div className="flex items-center gap-2.5 text-sm font-medium text-foreground/80">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Non-Custodial Architecture
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="h-40 w-40 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center group relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500 animate-pulse" />
                <ArrowUpRight className="h-16 w-16 text-primary relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
