import { cn } from "@/lib/cn";
import type { AccountType } from "@/types/domain";

const META: Record<AccountType, { label: string; className: string }> = {
  reserve_wallet: { label: "Reserve", className: "bg-chart-4/10 text-chart-4" },
  operating_wallet: { label: "Operating", className: "bg-chart-2/10 text-chart-2" },
  custody_account: { label: "Custody", className: "bg-chart-5/10 text-chart-5" },
  exchange_balance: { label: "Exchange", className: "bg-chart-3/10 text-chart-3" },
  bank_destination: { label: "Bank", className: "bg-primary/10 text-primary" },
  collection_address: { label: "Collection", className: "bg-muted text-muted-foreground" },
};

export function AccountTypeBadge({ type, className }: { type: AccountType; className?: string }) {
  const m = META[type];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium", m.className, className)}>
      {m.label}
    </span>
  );
}
