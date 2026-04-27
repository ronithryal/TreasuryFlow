import { useState } from "react";
import { useStore, selectors } from "@/store";
import { useLocation } from "wouter";
import { KpiCard } from "@/components/shared/KpiCard";
import { LiquidityHealthCard } from "@/components/shared/LiquidityHealthCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalManaged, totalByType } from "@/domain/ledger";
import { fmtRelative } from "@/lib/format";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const SCENARIOS = [
  { kind: "sweep" as const, label: "Trigger reserve sweep", desc: "Base Operating → Reserve" },
  { kind: "rebalance" as const, label: "Trigger rebalance", desc: "Eth Reserve → Polygon Refunds" },
  { kind: "friday_payout" as const, label: "Run Friday payout", desc: "5 payouts incl. bank cash-out" },
  { kind: "deposit_routing" as const, label: "Inbound deposit", desc: "90/10 split routing" },
  { kind: "month_end" as const, label: "Month-end close", desc: "Review + export ledger" },
] as const;

export function Overview() {
  const [running, setRunning] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const accounts = useStore((s) => s.accounts);
  const intents = useStore((s) => s.intents);
  const ledger = useStore((s) => s.ledger);
  const triggerScenario = useStore((s) => s.triggerScenario);
  const recentIntents = useStore((s) => selectors.recentIntents(s, 8));
  const pendingApprovals = useStore((s) => selectors.pendingApprovals(s));
  const policies = useStore((s) => s.policies);

  const total = totalManaged(accounts.filter((a) => a.accountType !== "bank_destination"));
  const reserve = totalByType(accounts, "reserve_wallet");
  const operating = totalByType(accounts, "operating_wallet");
  const exceptionCount = accounts.filter((a) => a.status === "low" || a.status === "breached").length
    + intents.filter((i) => i.status === "failed").length
    + ledger.filter((l) => l.reconciliationStatus === "missing_tags").length;
  const liquidityAccounts = accounts.filter((a) =>
    ["base", "ethereum", "polygon"].includes(a.chain) &&
    ["operating_wallet", "reserve_wallet"].includes(a.accountType)
  );
  const firingToday = policies.filter((p) => p.status === "active" && p.nextEvaluationAt && new Date(p.nextEvaluationAt).toDateString() === new Date().toDateString());

  async function runScenario(kind: typeof SCENARIOS[number]["kind"]) {
    setRunning(kind);
    const countBefore = intents.length;
    triggerScenario(kind);

    // Route to relevant page based on scenario
    const routeMap: Record<typeof SCENARIOS[number]["kind"], string> = {
      sweep: "/activity",
      rebalance: "/activity",
      friday_payout: "/approvals",
      deposit_routing: "/activity",
      month_end: "/reconciliation",
    };

    await new Promise((r) => setTimeout(r, 800));
    setRunning(null);
    navigate(routeMap[kind]);
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total managed"
          value={<Money amount={total} className="text-2xl" />}
          helper="across all wallets"
          icon={<Building2 className="h-4 w-4" />}
        />
        <KpiCard
          label="Reserve balance"
          value={<Money amount={reserve} className="text-2xl" />}
          helper="Base + Ethereum + Custody"
        />
        <KpiCard
          label="Operating liquidity"
          value={<Money amount={operating} className="text-2xl" />}
          helper="all operating wallets"
        />
        <KpiCard
          label="Pending approvals"
          value={<span className="text-2xl font-semibold">{pendingApprovals.length}</span>}
          helper="require action"
          intent={pendingApprovals.length > 0 ? "warning" : "default"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Liquidity health + right panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Liquidity health by network */}
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Liquidity health</h2>
          {liquidityAccounts.slice(0, 5).map((a) => (
            <LiquidityHealthCard key={a.id} account={a} />
          ))}
        </div>

        {/* Pending approvals preview */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              Pending approvals
              <Link href="/approvals">
                <a className="text-xs text-primary hover:underline">View all <ArrowRight className="inline h-3 w-3" /></a>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-card-border">
            {pendingApprovals.slice(0, 5).map((intent) => (
              <div key={intent.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{intent.title}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtRelative(intent.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Money amount={intent.amount} asset={intent.asset} className="text-xs" />
                  {intent.riskFlags.length > 0 ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-chart-3" />
                  ) : null}
                </div>
              </div>
            ))}
            {pendingApprovals.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">No pending approvals</p>
            )}
          </CardContent>
        </Card>

        {/* Recent intents + exceptions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              Recent intents
              <Link href="/activity">
                <a className="text-xs text-primary hover:underline">View all <ArrowRight className="inline h-3 w-3" /></a>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-card-border">
            {recentIntents.slice(0, 6).map((intent) => (
              <div key={intent.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{intent.title}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtRelative(intent.createdAt)}</p>
                </div>
                <StatusBadge status={intent.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Policies firing today + exceptions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Policies active today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {policies.filter((p) => p.status === "active").slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="font-medium">{p.name}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {firingToday.length === 0 && policies.filter((p) => p.status === "active").length === 0 && (
              <p className="text-xs text-muted-foreground">No active policies</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-chart-3" />
              Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {accounts.filter((a) => a.status === "low" || a.status === "breached").map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span>{a.name}</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
            {intents.filter((i) => i.status === "failed").slice(0, 2).map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <span className="truncate">{i.title}</span>
                <StatusBadge status="failed" />
              </div>
            ))}
            {ledger.filter((l) => l.reconciliationStatus === "missing_tags").length > 0 && (
              <div className="flex items-center justify-between">
                <span>{ledger.filter((l) => l.reconciliationStatus === "missing_tags").length} ledger entries missing tags</span>
                <Link href="/reconciliation">
                  <a className="text-primary hover:underline">Review</a>
                </Link>
              </div>
            )}
            {exceptionCount === 0 && (
              <div className="flex items-center gap-2 text-chart-5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No exceptions
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bank funding coming soon banner */}
      <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">Bank funding via partner rails — coming soon</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Fiat-to-digital-dollar conversion will be offered via compliant partner-powered rails.
              Identity verification may be handled by regulated providers where required.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>Learn more</Button>
        </CardContent>
      </Card>

      {/* Demo scenarios */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo scenarios</h2>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <Button
              key={s.kind}
              variant="outline"
              size="sm"
              onClick={() => runScenario(s.kind)}
              disabled={running !== null}
              className="gap-2"
            >
              {running === s.kind ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-primary" />
              )}
              <div className="text-left">
                <div className="text-xs font-medium">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.desc}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
