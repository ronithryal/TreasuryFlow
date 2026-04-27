import { useState } from "react";
import { useStore } from "@/store";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PolicyRuleSummary } from "@/components/shared/PolicyRuleSummary";
import { Money } from "@/components/shared/Money";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtRelative, fmtDateAbs, fmtTitle } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Zap } from "lucide-react";
import type { Policy, PolicyType } from "@/types/domain";

const TYPES: { value: PolicyType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sweep", label: "Sweeps" },
  { value: "rebalance", label: "Rebalances" },
  { value: "payout_run", label: "Payouts" },
  { value: "deposit_routing", label: "Routing" },
  { value: "cash_out", label: "Cash-out" },
];

export function Policies() {
  const policies = useStore((s) => s.policies);
  const intents = useStore((s) => s.intents);
  const accounts = useStore((s) => s.accounts);
  const togglePolicyStatus = useStore((s) => s.togglePolicyStatus);
  const runPolicy = useStore((s) => s.runPolicy);

  const [tab, setTab] = useState<PolicyType | "all">("all");
  const [selected, setSelected] = useState<Policy | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);

  const filtered = tab === "all" ? policies : policies.filter((p) => p.type === tab);
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const recentForPolicy = (policyId: string) =>
    intents.filter((i) => i.policyId === policyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  async function simulate(policy: Policy) {
    setSimulating(policy.id);
    runPolicy(policy.id, { force: false });
    await new Promise((r) => setTimeout(r, 600));
    setSimulating(null);
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as PolicyType | "all")}>
        <TabsList>
          {TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            {filtered.length === 0 ? (
              <EmptyState title="No policies" description={`No ${tab === "all" ? "" : tab} policies yet.`} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last triggered</TableHead>
                    <TableHead>Next eval</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((policy) => (
                    <TableRow key={policy.id} className="cursor-pointer" onClick={() => setSelected(policy)}>
                      <TableCell>
                        <p className="text-sm font-medium">{policy.name}</p>
                        <p className="text-xs text-muted-foreground">{policy.description.slice(0, 80)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fmtTitle(policy.type)}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={policy.status} /></TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{policy.lastTriggeredAt ? fmtRelative(policy.lastTriggeredAt) : "Never"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{policy.nextEvaluationAt ? fmtRelative(policy.nextEvaluationAt) : "—"}</span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePolicyStatus(policy.id)}
                            title={policy.status === "active" ? "Pause" : "Resume"}
                          >
                            {policy.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => simulate(policy)}
                            disabled={simulating === policy.id}
                            title="Run now"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {selected && (
        <DetailDrawer
          open={true}
          onOpenChange={(v) => !v && setSelected(null)}
          title={selected.name}
          description={fmtTitle(selected.type) + " · " + selected.cadence}
        >
          <div className="space-y-5">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rule</p>
              <div className="mt-2"><PolicyRuleSummary policy={selected} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-muted-foreground">Type</span><p className="mt-0.5 font-medium">{fmtTitle(selected.type)}</p></div>
              <div><span className="text-muted-foreground">Source accounts</span><p className="mt-0.5 font-medium">{selected.sourceAccountIds.map(accName).join(", ")}</p></div>
              <div><span className="text-muted-foreground">Destination accounts</span><p className="mt-0.5 font-medium">{selected.destinationAccountIds.map(accName).join(", ")}</p></div>
              <div><span className="text-muted-foreground">Last triggered</span><p className="mt-0.5 font-medium">{selected.lastTriggeredAt ? fmtDateAbs(selected.lastTriggeredAt) : "Never"}</p></div>
              <div><span className="text-muted-foreground">Next evaluation</span><p className="mt-0.5 font-medium">{selected.nextEvaluationAt ? fmtDateAbs(selected.nextEvaluationAt) : "—"}</p></div>
            </div>

            {/* Recent intents */}
            {recentForPolicy(selected.id).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent intents</h3>
                {recentForPolicy(selected.id).map((intent) => (
                  <div key={intent.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                    <div>
                      <p className="font-medium">{intent.title}</p>
                      <p className="text-muted-foreground">{fmtRelative(intent.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Money amount={intent.amount} asset={intent.asset} />
                      <StatusBadge status={intent.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => togglePolicyStatus(selected.id)}>
                {selected.status === "active" ? <><Pause className="h-3.5 w-3.5 mr-1" />Pause</> : <><Play className="h-3.5 w-3.5 mr-1" />Resume</>}
              </Button>
              <Button size="sm" onClick={() => { runPolicy(selected.id, { force: true }); setSelected(null); }}>
                <Zap className="h-3.5 w-3.5 mr-1" />Run now
              </Button>
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
