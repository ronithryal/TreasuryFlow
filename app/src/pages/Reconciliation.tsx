import { useState } from "react";
import { useStore } from "@/store";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { AgentPanel } from "@/components/shared/AgentPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar } from "@/components/shared/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeCompleteness, buildCsv } from "@/domain/reconciliation";
import { fmtRelative, fmtDateAbs, fmtTitle } from "@/lib/format";
import { suggestTags } from "@/services/ai-features";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Info } from "lucide-react";
import type { LedgerEntry, LedgerEntryId, ReconciliationStatus } from "@/types/domain";

interface ExportGuardrailState {
  open: boolean;
  preset: string;
  missingCount: number;
  totalCount: number;
}

export function Reconciliation() {
  const ledger = useStore((s) => s.ledger);
  const accounts = useStore((s) => s.accounts);
  const counterparties = useStore((s) => s.counterparties);
  const entities = useStore((s) => s.entities);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const markEntriesReviewed = useStore((s) => s.markEntriesReviewed);
  const markEntriesExported = useStore((s) => s.markEntriesExported);
  const applyTagsToEntries = useStore((s) => s.applyTagsToEntries);

  const [tab, setTab] = useState<ReconciliationStatus | "all">("all");
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<LedgerEntryId>>(new Set());
  const [search, setSearch] = useState("");

  // Export guardrail state
  const [guardrail, setGuardrail] = useState<ExportGuardrailState>({ open: false, preset: "", missingCount: 0, totalCount: 0 });
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideReviewerId, setOverrideReviewerId] = useState("");

  const stats = computeCompleteness(ledger);

  const filtered = ledger
    .filter((l) => {
      if (tab !== "all" && l.reconciliationStatus !== tab) return false;
      if (search) {
        const hay = [l.purpose, l.accountingCategory, l.costCenter, accounts.find((a) => a.id === l.accountId)?.name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));

  function toggleSelect(id: LedgerEntryId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function doExport(toExport: LedgerEntry[], preset: string, overrideNote?: string) {
    const rows = toExport.map((l) => ({
      date: fmtDateAbs(l.effectiveAt),
      entity: entities.find((e) => e.id === l.entityId)?.name ?? l.entityId,
      account: accounts.find((a) => a.id === l.accountId)?.name ?? l.accountId,
      chain: l.chain,
      direction: l.direction,
      amount: l.amount.toString(),
      asset: l.asset,
      counterparty: l.counterpartyId ? counterparties.find((c) => c.id === l.counterpartyId)?.name ?? "" : "",
      category: l.accountingCategory ?? "",
      purpose: l.purpose ?? "",
      costCenter: l.costCenter ?? "",
      txReference: l.txReference ?? "",
      ...(overrideNote ? { overrideNote } : {}),
    }));
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treasuryflow-${preset}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    markEntriesExported(toExport.map((l) => l.id), preset);
  }

  function exportCsv(preset: string) {
    const toExport = filtered.filter((l) => selectedIds.size === 0 || selectedIds.has(l.id));

    // Guardrail: block export if required fields missing, unless override is provided.
    const missingTagEntries = toExport.filter((l) => !l.accountingCategory || !l.purpose);
    if (missingTagEntries.length > 0) {
      setGuardrail({ open: true, preset, missingCount: missingTagEntries.length, totalCount: toExport.length });
      setOverrideReason("");
      setOverrideReviewerId(currentUserId);
      return;
    }

    doExport(toExport, preset);
  }

  function submitOverrideExport() {
    if (!overrideReason.trim() || !overrideReviewerId) return;
    const toExport = filtered.filter((l) => selectedIds.size === 0 || selectedIds.has(l.id));
    const reviewer = users.find((u) => u.id === overrideReviewerId);
    const overrideNote = `Exported with override by ${reviewer?.name ?? overrideReviewerId}: ${overrideReason.trim()}`;
    doExport(toExport, guardrail.preset, overrideNote);
    setGuardrail({ open: false, preset: "", missingCount: 0, totalCount: 0 });
  }

  const completePct = Math.round(stats.fullyTaggedRatio * 100);

  return (
    <div id="reconciliation-section" data-tour="reconciliation-section" className="space-y-4">
      {/* Month-end completeness */}
      <Card>
        <CardContent className="flex items-center gap-6 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {completePct}%
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Month-end readiness</p>
            <p className="text-xs text-muted-foreground">{stats.total} total entries · {stats.byStatus.missing_tags} missing tags · {stats.byStatus.reviewed} reviewed · {stats.byStatus.exported} exported</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${completePct}%` }} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCsv("csv")}>
              <Download className="h-3.5 w-3.5 mr-1" />CSV
            </Button>
            <Button size="sm" onClick={() => exportCsv("erp_ready")}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />ERP export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export guardrail dialog */}
      {guardrail.open && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Export requires override — missing required fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>{guardrail.missingCount} of {guardrail.totalCount} entries</strong> are missing accounting category or purpose.
              Exporting incomplete entries may cause ERP import failures or reconciliation gaps.
              To proceed, provide an override reason and confirm the reviewing controller below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Override reason <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Entries will be tagged post-export in ERP"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reviewing controller <span className="text-destructive">*</span></Label>
                <Select value={overrideReviewerId} onValueChange={setOverrideReviewerId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter((u) => u.role === "controller" || u.role === "approver").map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} · {u.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGuardrail({ open: false, preset: "", missingCount: 0, totalCount: 0 })}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={submitOverrideExport}
                disabled={!overrideReason.trim() || !overrideReviewerId}
              >
                Export with override
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + bulk actions */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        onClear={() => { setSearch(""); }}
        rightSlot={
          selectedIds.size > 0 ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { markEntriesReviewed([...selectedIds]); setSelectedIds(new Set()); }}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark {selectedIds.size} reviewed
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
            </div>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReconciliationStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="missing_tags" title="Missing Tags: Recorded but not assigned to a GL/accounting category." className="gap-1">
            Missing tags ({stats.byStatus.missing_tags})
            <Info className="h-3 w-3 text-muted-foreground opacity-60" />
          </TabsTrigger>
          <TabsTrigger value="tagged" title="Tagged: Assigned to a GL/accounting category." className="gap-1">
            Tagged ({stats.byStatus.tagged})
            <Info className="h-3 w-3 text-muted-foreground opacity-60" />
          </TabsTrigger>
          <TabsTrigger value="reviewed" title="Reviewed: Controller has reviewed the entry." className="gap-1">
            Reviewed ({stats.byStatus.reviewed})
            <Info className="h-3 w-3 text-muted-foreground opacity-60" />
          </TabsTrigger>
          <TabsTrigger value="exported" title="Exported: Included in the latest ERP/export packet." className="gap-1">
            Exported ({stats.byStatus.exported})
            <Info className="h-3 w-3 text-muted-foreground opacity-60" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            {filtered.length === 0 ? (
              <EmptyState title="No entries" description="All entries in this category have been processed." icon={<CheckCircle2 className="h-5 w-5" />} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(filtered.map((l) => l.id))); else setSelectedIds(new Set()); }} />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleSelect(entry.id)} />
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{fmtRelative(entry.effectiveAt)}</span></TableCell>
                      <TableCell><span className="text-xs font-medium">{accounts.find((a) => a.id === entry.accountId)?.name ?? entry.accountId}</span></TableCell>
                      <TableCell><span className="text-xs capitalize">{entry.direction}</span></TableCell>
                      <TableCell><Money amount={entry.amount} asset={entry.asset} /></TableCell>
                      <TableCell>
                        {entry.accountingCategory ? (
                          <span className="text-xs">{entry.accountingCategory}</span>
                        ) : (
                          <span className="text-xs text-chart-3 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />Missing
                          </span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={entry.reconciliationStatus} /></TableCell>
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
          title={selected.purpose ?? "Ledger entry"}
          description={fmtTitle(selected.direction) + " · " + fmtDateAbs(selected.effectiveAt)}
          footer={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { markEntriesReviewed([selected.id]); setSelected(null); }}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark reviewed
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Amount</span><p className="mt-0.5 text-lg font-semibold"><Money amount={selected.amount} asset={selected.asset} /></p></div>
              <div><span className="text-muted-foreground">Direction</span><p className="mt-0.5 font-medium capitalize">{selected.direction}</p></div>
              <div><span className="text-muted-foreground">Account</span><p className="mt-0.5 font-medium">{accounts.find((a) => a.id === selected.accountId)?.name}</p></div>
              <div><span className="text-muted-foreground">Counterparty</span><p className="mt-0.5 font-medium">{selected.counterpartyId ? counterparties.find((c) => c.id === selected.counterpartyId)?.name ?? "—" : "—"}</p></div>
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className={`mt-0.5 font-medium ${!selected.accountingCategory ? "text-chart-3" : ""}`}>
                  {selected.accountingCategory ?? "Missing — required for export"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cost center</span>
                <p className="mt-0.5 font-medium">{selected.costCenter ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Purpose</span>
                <p className={`mt-0.5 font-medium ${!selected.purpose ? "text-chart-3" : ""}`}>
                  {selected.purpose ?? "Missing — required for export"}
                </p>
              </div>
              <div><span className="text-muted-foreground">Tx reference</span><p className="mt-0.5 font-mono text-[10px]">{selected.txReference ?? "—"}</p></div>
            </div>

            {selected.approvalTrace.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Approval trace</h3>
                {selected.approvalTrace.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                    <span className="font-medium">{fmtTitle(t.decision)}</span>
                    <span className="text-muted-foreground">{fmtRelative(t.at)}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {selected.reconciliationStatus === "missing_tags" && (
              <AgentPanel
                title="AI tag suggestion"
                description="Suggest accounting category, purpose, and cost center based on similar entries."
                cta="Suggest tags"
                request={async () => {
                  const nearby = ledger.filter((l) => l.accountId === selected.accountId && l.reconciliationStatus !== "missing_tags").slice(0, 5);
                  const result = await suggestTags(selected, nearby, counterparties);
                  if (result.success) {
                    const d = result.data;
                    applyTagsToEntries([selected.id], {
                      purpose: d.purpose,
                      accountingCategory: d.accountingCategory,
                      costCenter: d.costCenter,
                    });
                    return `${d.reasoning}\n\nApplied: "${d.purpose}" · ${d.accountingCategory}${d.costCenter ? " · " + d.costCenter : ""}`;
                  }
                  return "Could not parse a tag suggestion. Please tag manually.";
                }}
              />
            )}
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
