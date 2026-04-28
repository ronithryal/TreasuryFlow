import { useState } from "react";
import { useStore } from "@/store";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { ChainBadge } from "@/components/shared/ChainBadge";
import { BalanceImpact } from "@/components/shared/BalanceImpact";
import { LifecycleTimeline } from "@/components/shared/LifecycleTimeline";
import { ApprovalDecisionBar } from "@/components/shared/ApprovalDecisionBar";
import { AgentPanel } from "@/components/shared/AgentPanel";
import { FilterBar } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock } from "lucide-react";
import { fmtRelative, fmtDateAbs, fmtTitle } from "@/lib/format";
import { describeRiskFlag } from "@/domain/rules";
import { explainIntent } from "@/services/ai-features";
import type { Intent, IntentId } from "@/types/domain";

export function Approvals() {
  const intents = useStore((s) => s.intents.filter((i) => i.status === "pending_approval"));
  const accounts = useStore((s) => s.accounts);
  const users = useStore((s) => s.users);
  const policies = useStore((s) => s.policies);
  const executions = useStore((s) => s.executions);
  const currentUserId = useStore((s) => s.currentUserId);
  const decideOnIntent = useStore((s) => s.decideOnIntent);
  const bulkApprove = useStore((s) => s.bulkApprove);

  const [selected, setSelected] = useState<Intent | null>(null);
  const [search, setSearch] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});

  const filtered = intents.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterVals.type && filterVals.type !== "all" && i.type !== filterVals.type) return false;
    if (filterVals.risk && filterVals.risk !== "all") {
      const hasRisk = i.riskFlags.length > 0;
      if (filterVals.risk === "flagged" && !hasRisk) return false;
      if (filterVals.risk === "clean" && hasRisk) return false;
    }
    return true;
  });

  const bulkCandidates = filtered.filter((i) => i.riskFlags.length === 0 && i.requestedBy !== currentUserId).map((i) => i.id);

  const selectedExec = selected ? executions.filter((e) => e.intentId === selected.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] : undefined;
  const selectedPolicy = selected?.policyId ? policies.find((p) => p.id === selected.policyId) : undefined;

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearch={setSearch}
        filters={[
          { id: "type", label: "Type", options: ["sweep", "rebalance", "payout", "cash_out", "deposit_route", "manual_transfer"].map((v) => ({ value: v, label: fmtTitle(v) })) },
          { id: "risk", label: "Risk", options: [{ value: "flagged", label: "Flagged" }, { value: "clean", label: "Clean" }] },
        ]}
        values={filterVals}
        onChange={(id, v) => setFilterVals((prev) => ({ ...prev, [id]: v }))}
        onClear={() => { setSearch(""); setFilterVals({}); }}
        rightSlot={
          bulkCandidates.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => bulkApprove(bulkCandidates)}>
              Bulk approve {bulkCandidates.length} clean
            </Button>
          ) : null
        }
      />

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No pending approvals" description="All intents have been resolved." icon={<Clock className="h-5 w-5" />} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Initiated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody id="approvals-queue" data-tour="approvals-queue">
              {filtered.map((intent) => {
                let rowTour = undefined;
                if (intent.title.includes("Sweep")) rowTour = "approvals-sweep-row";
                if (intent.title.includes("Morpho")) rowTour = "approvals-morpho-row";
                if (intent.title.includes("High Value Transfer")) rowTour = "approvals-anomaly-row";
                return (
                <TableRow key={intent.id} data-tour={rowTour} className="cursor-pointer" onClick={() => setSelected(intent)}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{intent.title}</p>
                      <p className="text-xs text-muted-foreground">{intent.rationale.slice(0, 80)}{intent.rationale.length > 80 ? "…" : ""}</p>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={intent.status} /></TableCell>
                  <TableCell><Money amount={intent.amount} asset={intent.asset} /></TableCell>
                  <TableCell><ChainBadge chain={intent.chain} /></TableCell>
                  <TableCell>
                    {intent.riskFlags.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-chart-3">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {intent.riskFlags.length} flag{intent.riskFlags.length > 1 ? "s" : ""}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{fmtRelative(intent.createdAt)}</span></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(intent); }}>Review</Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {selected && (
        <DetailDrawer
          open={true}
          onOpenChange={(v) => !v && setSelected(null)}
          title={selected.title}
          description={selected.rationale.slice(0, 120)}
          footer={
            <ApprovalDecisionBar
              canDecide={selected.requestedBy !== currentUserId}
              reasonDisabled="You initiated this intent — a different approver must decide."
              intent={selected}
              onDecision={({ decision, comment }) => {
                decideOnIntent(selected.id as IntentId, decision, comment);
                setSelected(null);
              }}
            />
          }
        >
          <div className="space-y-5">
            {/* Risk flags */}
            {selected.riskFlags.length > 0 && (
              <div className="rounded-lg border border-chart-3/20 bg-chart-3/5 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-chart-3">
                  <AlertTriangle className="h-4 w-4" />
                  {selected.riskFlags.length} risk flag{selected.riskFlags.length > 1 ? "s" : ""}
                </div>
                <ul className="mt-2 space-y-1">
                  {selected.riskFlags.map((f, i) => (
                    <li key={i} className="text-xs text-foreground">{describeRiskFlag(f)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Balance impact */}
            <BalanceImpact intent={selected} accounts={accounts} />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Policy</span><p className="mt-0.5 font-medium">{selectedPolicy?.name ?? "Manual"}</p></div>
              <div><span className="text-muted-foreground">Initiated by</span><p className="mt-0.5 font-medium">{users.find((u) => u.id === selected.requestedBy)?.name ?? selected.requestedBy}</p></div>
              <div><span className="text-muted-foreground">Created</span><p className="mt-0.5 font-medium">{fmtDateAbs(selected.createdAt)}</p></div>
              <div><span className="text-muted-foreground">Snapshot at</span><p className="mt-0.5 font-medium">{fmtDateAbs(selected.snapshotAt)}</p></div>
            </div>

            {/* AI rationale explainer */}
            <AgentPanel
              title="Agent explanation"
              description="Why did this intent fire, and does anything look unusual?"
              cta="Explain this intent"
              request={() => explainIntent(selected, accounts, selectedPolicy)}
            />

            {/* Lifecycle */}
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
