import { StatusBadge } from "./StatusBadge";
import { ChainBadge } from "./ChainBadge";
import { AccountTypeBadge } from "./AccountTypeBadge";
import { Money } from "./Money";
import { fmtRelative, fmtDateAbs } from "@/lib/format";
import type { Account, Entity, Policy, LedgerEntry } from "@/types/domain";
import { Shield, Activity, Target, Info, Building2, Calendar, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccountDetailViewProps {
  account: Account;
  entities: Entity[];
  policies: Policy[];
  ledger: LedgerEntry[];
  onPolicySelect?: (policyId: string) => void;
  onDelete?: (accountId: string) => void;
}

export function AccountDetailView({ 
  account, 
  entities, 
  policies, 
  ledger,
  onPolicySelect,
  onDelete
}: AccountDetailViewProps) {
  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;
  
  const relatedPolicies = policies.filter(
    (p) => p.sourceAccountIds.includes(account.id) || p.destinationAccountIds.includes(account.id)
  );
  
  const recentActivity = [...ledger.filter((l) => l.accountId === account.id)]
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
    .slice(0, 5);

  const canDelete = account.balance === 0;

  return (
    <div className="space-y-6">
      {/* Purpose block - prominent */}
      {account.description && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Info className="h-12 w-12" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-1">Purpose & Usage</span>
          <p className="text-sm italic text-foreground/90 leading-relaxed relative z-10">
            "{account.description}"
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="h-3 w-3" /> Current Balance</span>
          <p className="text-xl font-bold tracking-tight">
            <Money amount={account.balance} asset={account.asset} />
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5"><Shield className="h-3 w-3" /> Available liquidity</span>
          <p className="text-xl font-bold tracking-tight text-primary">
            <Money amount={account.availableBalance} asset={account.asset} />
          </p>
        </div>

        <div className="pt-2">
          <span className="text-muted-foreground block mb-1 uppercase text-[10px] font-bold tracking-tighter">Classification</span>
          <AccountTypeBadge type={account.accountType} />
        </div>
        <div className="pt-2">
          <span className="text-muted-foreground block mb-1 uppercase text-[10px] font-bold tracking-tighter">Network</span>
          <ChainBadge chain={account.chain} />
        </div>

        <div className="pt-2">
          <span className="text-muted-foreground block mb-1 uppercase text-[10px] font-bold tracking-tighter">Legal Entity</span>
          <p className="font-medium flex items-center gap-1.5 text-sm">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {entityName(account.entityId)}
          </p>
        </div>
        <div className="pt-2">
          <span className="text-muted-foreground block mb-1 uppercase text-[10px] font-bold tracking-tighter">Last Synchronization</span>
          <p className="font-medium flex items-center gap-1.5 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {fmtDateAbs(account.lastUpdated)}
          </p>
        </div>

        {account.targetBand && (
          <div className="col-span-2 bg-muted/30 border border-border/50 rounded-lg p-3 mt-1">
            <span className="text-muted-foreground flex items-center gap-1.5 mb-1 uppercase text-[10px] font-bold tracking-widest">
              <Target className="h-3 w-3" /> Target Liquidity Band
            </span>
            <p className="font-bold text-sm">
              ${account.targetBand.min.toLocaleString()} <span className="text-muted-foreground font-normal mx-1">—</span> ${account.targetBand.max.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {relatedPolicies.length > 0 && (
        <div className="pt-2">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Enforced Policies</h3>
          <div className="space-y-1">
            {relatedPolicies.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 hover:border-primary/20 transition-all cursor-pointer group"
                onClick={() => onPolicySelect?.(p.id)}
              >
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{p.name}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="pt-2">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Recent Ledger Entries</h3>
          <div className="divide-y divide-border/30">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{entry.purpose ?? entry.direction}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{fmtRelative(entry.effectiveAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    <Money amount={entry.amount} asset={entry.asset} signed={entry.direction === "outflow"} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {canDelete && (
        <div className="pt-6 border-t border-destructive/20 mt-8">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Danger Zone</span>
              </div>
              <p className="text-xs text-muted-foreground">This wallet has zero balance and can be removed.</p>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2"
              onClick={() => onDelete?.(account.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Wallet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
