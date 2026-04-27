import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Money } from "./Money";
import type { Account, Intent } from "@/types/domain";

export function BalanceImpact({ intent, accounts }: { intent: Intent; accounts: Account[] }) {
  const source = accounts.find((a) => a.id === intent.sourceAccountId);
  const dest = accounts.find((a) => a.id === intent.destinationAccountId);
  if (!source || !dest) return null;
  const sourceAfter = source.balance - intent.amount;
  const destAfter = dest.balance + intent.amount;
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance impact</div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{source.name}</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Money amount={source.balance} asset={source.asset} muted />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Money amount={sourceAfter} asset={source.asset} className="font-semibold" />
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{dest.name}</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Money amount={dest.balance} asset={dest.asset} muted />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Money amount={destAfter} asset={dest.asset} className="font-semibold" />
          </div>
        </div>
      </div>
    </Card>
  );
}
