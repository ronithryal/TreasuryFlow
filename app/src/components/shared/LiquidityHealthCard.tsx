import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Money } from "./Money";
import { ChainBadge } from "./ChainBadge";
import { StatusBadge } from "./StatusBadge";
import type { Account } from "@/types/domain";

export function LiquidityHealthCard({ account, className }: { account: Account; className?: string }) {
  const band = account.targetBand;
  const pct = band ? Math.max(0, Math.min(1, (account.balance - band.min) / (band.max - band.min))) : 0.5;
  const status = account.status;
  const barColor =
    status === "healthy" ? "bg-chart-5" : status === "low" ? "bg-chart-3" : status === "breached" ? "bg-destructive" : "bg-muted-foreground";
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <ChainBadge chain={account.chain} />
            <StatusBadge status={status} />
          </div>
          <div className="mt-2 truncate text-sm font-medium">{account.name}</div>
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <Money amount={account.balance} asset={account.asset} className="text-xl" />
        {band ? (
          <span className="text-[11px] text-muted-foreground">
            min ${(band.min / 1000).toFixed(0)}k · max ${(band.max / 1000).toFixed(0)}k
          </span>
        ) : null}
      </div>
      {band ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full transition-all", barColor)} style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
      ) : null}
    </Card>
  );
}
