import { useState } from "react";
import { useStore } from "@/store";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { ChainBadge } from "@/components/shared/ChainBadge";
import { LifecycleTimeline } from "@/components/shared/LifecycleTimeline";
import { FilterBar } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtRelative, fmtDateAbs, fmtTitle } from "@/lib/format";
import type { Intent } from "@/types/domain";

export function Activity() {
  const intents = useStore((s) => [...s.intents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const accounts = useStore((s) => s.accounts);
  const executions = useStore((s) => s.executions);
  const users = useStore((s) => s.users);
  const policies = useStore((s) => s.policies);
  const ledger = useStore((s) => s.ledger);
  const counterparties = useStore((s) => s.counterparties);

  const [selected, setSelected] = useState<Intent | null>(null);
  const [search, setSearch] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});

  const filtered = intents.filter((i) => {
    if (search && ![i.title, i.rationale].some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterVals.status && filterVals.status !== "all" && i.status !== filterVals.status) return false;
    if (filterVals.type && filterVals.type !== "all" && i.type !== filterVals.type) return false;
    return true;
  });

  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const cpName = (id?: string) => id ? counterparties.find((c) => c.id === id)?.name ?? id : null;
  const selectedExec = selected ? executions.filter((e) => e.intentId === selected.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] : undefined;
  const selectedPolicy = selected?.policyId ? policies.find((p) => p.id === selected.policyId) : undefined;
  const selectedLedger = selected ? ledger.filter((l) => l.intentId === selected.id) : [];

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearch={setSearch}
        filters={[
          { id: "status", label: "Status", options: ["proposed","pending_approval","approved","executing","executed","failed","skipped","canceled","rejected"].map((v) => ({ value: v, label: fmtTitle(v) })) },
          { id: "type", label: "Type", options: ["sweep","rebalance","payout","cash_out","deposit_route","manual_transfer"].map((v) => ({ value: v, label: fmtTitle(v) })) },
        ]}
        values={filterVals}
        onChange={(id, v) => setFilterVals((prev) => ({ ...prev, [id]: v }))}
        onClear={() => { setSearch(""); setFilterVals({}); }}
      />

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No activity found" description="Try clearing the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source → Destination</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody id="activity-feed">
              {filtered.map((intent) => (
                <TableRow key={intent.id} className="cursor-pointer" onClick={() => setSelected(intent)}>
                  <TableCell>
                    <p className="text-sm font-medium">{intent.title}</p>
                    {cpName(intent.counterpartyId) && (
                      <p className="text-xs text-muted-foreground">{cpName(intent.counterpartyId)}</p>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={intent.status} /></TableCell>
                  <TableCell><Money amount={intent.amount} asset={intent.asset} /></TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {accName(intent.sourceAccountId)} → {accName(intent.destinationAccountId)}
                    </span>
                  </TableCell>
                  <TableCell><ChainBadge chain={intent.chain} /></TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" title={fmtDateAbs(intent.createdAt)}>
                      {fmtRelative(intent.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {selected && (
        <DetailDrawer
          open={true}
          onOpenChange={(v) => !v && setSelected(null)}
          title={selected.title}
          description={fmtTitle(selected.type) + " · " + fmtTitle(selected.status)}
        >
          <div className="space-y-5">
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Amount</span><p className="mt-0.5"><Money amount={selected.amount} asset={selected.asset} /></p></div>
              <div><span className="text-muted-foreground">Chain</span><p className="mt-0.5"><ChainBadge chain={selected.chain} /></p></div>
              <div><span className="text-muted-foreground">Source</span><p className="mt-0.5 font-medium">{accName(selected.sourceAccountId)}</p></div>
              <div><span className="text-muted-foreground">Destination</span><p className="mt-0.5 font-medium">{accName(selected.destinationAccountId)}</p></div>
              <div><span className="text-muted-foreground">Policy</span><p className="mt-0.5 font-medium">{selectedPolicy?.name ?? "Manual"}</p></div>
              <div><span className="text-muted-foreground">Initiator</span><p className="mt-0.5 font-medium">{users.find((u) => u.id === selected.requestedBy)?.name}</p></div>
              {selectedExec?.txReference && (
                <div className="col-span-2"><span className="text-muted-foreground">Tx reference</span><p className="mt-0.5 font-mono text-[11px]">{selectedExec.txReference}</p></div>
              )}
            </div>

            {/* Ledger entries */}
            {selectedLedger.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Ledger entries</h3>
                {selectedLedger.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                    <div>
                      <p className="font-medium">{accounts.find((a) => a.id === entry.accountId)?.name ?? entry.accountId}</p>
                      <p className="text-muted-foreground">{entry.direction} · {entry.accountingCategory ?? "untagged"}</p>
                    </div>
                    <div className="text-right">
                      <Money amount={entry.amount} asset={entry.asset} signed={entry.direction === "outflow"} />
                      <p className="text-muted-foreground">{fmtTitle(entry.reconciliationStatus)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Lifecycle</h3>
              <LifecycleTimeline intent={selected} execution={selectedExec} users={users} />
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
