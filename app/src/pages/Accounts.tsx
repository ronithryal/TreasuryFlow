import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { AccountDetailView } from "@/components/shared/AccountDetailView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChainBadge } from "@/components/shared/ChainBadge";
import { AccountTypeBadge } from "@/components/shared/AccountTypeBadge";
import { Money } from "@/components/shared/Money";
import { LiquidityHealthCard } from "@/components/shared/LiquidityHealthCard";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtRelative } from "@/lib/format";
import type { Account } from "@/types/domain";

export function Accounts() {
  const accounts = useStore((s) => s.accounts);
  const entities = useStore((s) => s.entities);
  const policies = useStore((s) => s.policies);
  const ledger = useStore((s) => s.ledger);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const [selected, setSelected] = useState<Account | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      const acc = accounts.find((a) => a.id === id);
      if (acc) setSelected(acc);
    }
  }, [accounts]);

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;

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
                data-tour={acc.name.toLowerCase().includes("morpho") ? "accounts-morpho" : undefined}
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
          description={`${selected.accountType.replace(/_/g, " ")} · ${selected.chain} · ${entities.find(e => e.id === selected.entityId)?.name || selected.entityId}`}
        >
          <AccountDetailView 
            account={selected}
            entities={entities}
            policies={policies}
            ledger={ledger}
            onDelete={(id) => {
              deleteAccount(id as any);
              setSelected(null);
            }}
          />
        </DetailDrawer>
      )}
    </div>
  );
}
