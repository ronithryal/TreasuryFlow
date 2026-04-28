import { useState } from "react";
import { useStore } from "@/store";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChainBadge } from "@/components/shared/ChainBadge";
import { AccountTypeBadge } from "@/components/shared/AccountTypeBadge";
import { Money } from "@/components/shared/Money";
import { LiquidityHealthCard } from "@/components/shared/LiquidityHealthCard";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtRelative, fmtDateAbs } from "@/lib/format";
import type { Account } from "@/types/domain";

export function Accounts() {
  const accounts = useStore((s) => s.accounts);
  const entities = useStore((s) => s.entities);
  const policies = useStore((s) => s.policies);
  const ledger = useStore((s) => s.ledger);
  const [selected, setSelected] = useState<Account | null>(null);

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;
  const relatedPolicies = (acc: Account) =>
    policies.filter((p) => p.sourceAccountIds.includes(acc.id) || p.destinationAccountIds.includes(acc.id));
  const recentActivity = (acc: Account) =>
    [...ledger.filter((l) => l.accountId === acc.id)].sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt)).slice(0, 5);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => (
              <div 
                key={acc.id} 
                id={acc.name.toLowerCase().includes("morpho") ? "accounts-morpho" : undefined}
                className="cursor-pointer" 
                onClick={() => setSelected(acc)}
              >
                <LiquidityHealthCard account={acc} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id} className="cursor-pointer" onClick={() => setSelected(acc)}>
                    <TableCell><span className="text-sm font-medium">{acc.name}</span></TableCell>
                    <TableCell><AccountTypeBadge type={acc.accountType} /></TableCell>
                    <TableCell><ChainBadge chain={acc.chain} /></TableCell>
                    <TableCell><Money amount={acc.balance} asset={acc.asset} /></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{entityName(acc.entityId)}</span></TableCell>
                    <TableCell><StatusBadge status={acc.status} /></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{fmtRelative(acc.lastUpdated)}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {selected && (
        <DetailDrawer
          open={true}
          onOpenChange={(v) => !v && setSelected(null)}
          title={selected.name}
          description={`${selected.accountType.replace(/_/g, " ")} · ${selected.chain} · ${entityName(selected.entityId)}`}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Balance</span><p className="mt-0.5 text-lg font-semibold"><Money amount={selected.balance} asset={selected.asset} /></p></div>
              <div><span className="text-muted-foreground">Available</span><p className="mt-0.5 text-lg font-semibold"><Money amount={selected.availableBalance} asset={selected.asset} /></p></div>
              <div><span className="text-muted-foreground">Type</span><p className="mt-0.5"><AccountTypeBadge type={selected.accountType} /></p></div>
              <div><span className="text-muted-foreground">Chain</span><p className="mt-0.5"><ChainBadge chain={selected.chain} /></p></div>
              <div><span className="text-muted-foreground">Settlement rail</span><p className="mt-0.5 font-medium capitalize">{selected.settlementRail}</p></div>
              <div><span className="text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-muted-foreground">Entity</span><p className="mt-0.5 font-medium">{entityName(selected.entityId)}</p></div>
              <div><span className="text-muted-foreground">Last updated</span><p className="mt-0.5 font-medium">{fmtDateAbs(selected.lastUpdated)}</p></div>
              {selected.targetBand && (
                <div className="col-span-2"><span className="text-muted-foreground">Target band</span><p className="mt-0.5 font-medium">${selected.targetBand.min.toLocaleString()} – ${selected.targetBand.max.toLocaleString()}</p></div>
              )}
            </div>

            {relatedPolicies(selected).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Related policies</h3>
                {relatedPolicies(selected).map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                    <span className="font-medium">{p.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}

            {recentActivity(selected).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</h3>
                {recentActivity(selected).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                    <div>
                      <p className="font-medium">{entry.purpose ?? entry.direction}</p>
                      <p className="text-muted-foreground">{fmtRelative(entry.effectiveAt)}</p>
                    </div>
                    <Money amount={entry.amount} asset={entry.asset} signed={entry.direction === "outflow"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
