import { cn } from "@/lib/cn";
import { fmtAmountOnly } from "@/lib/format";
import type { Asset } from "@/types/domain";

export function Money({
  amount,
  asset = "USDC",
  className,
  signed,
  compact,
  muted,
}: {
  amount: number;
  asset?: Asset;
  className?: string;
  signed?: boolean;
  compact?: boolean;
  muted?: boolean;
}) {
  const sign = signed && amount > 0 ? "+" : amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  return (
    <span className={cn("font-mono tabular-nums", muted && "text-muted-foreground", className)}>
      {sign}${fmtAmountOnly(abs, { compact })}
      {asset === "USDC" && <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">USDC</span>}
    </span>
  );
}
