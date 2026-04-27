import { cn } from "@/lib/cn";
import type { Chain } from "@/types/domain";

const CHAIN_META: Record<Chain, { label: string; className: string; dot: string }> = {
  base: { label: "Base", className: "bg-chart-2/10 text-chart-2 ring-chart-2/20", dot: "bg-chart-2" },
  ethereum: { label: "Ethereum", className: "bg-chart-4/10 text-chart-4 ring-chart-4/20", dot: "bg-chart-4" },
  polygon: { label: "Polygon", className: "bg-chart-3/10 text-chart-3 ring-chart-3/20", dot: "bg-chart-3" },
  bank: { label: "Bank", className: "bg-chart-5/10 text-chart-5 ring-chart-5/20", dot: "bg-chart-5" },
  none: { label: "—", className: "bg-muted text-muted-foreground ring-muted-foreground/10", dot: "bg-muted-foreground" },
};

export function ChainBadge({ chain, className }: { chain: Chain; className?: string }) {
  const m = CHAIN_META[chain];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        m.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
