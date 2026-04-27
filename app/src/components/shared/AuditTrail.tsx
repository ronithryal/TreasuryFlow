import { fmtDateAbs, fmtRelative } from "@/lib/format";
import type { AuditLogEntry, User } from "@/types/domain";

function describe(entry: AuditLogEntry): string {
  const e = entry.event;
  switch (e.kind) {
    case "policy_evaluated":
      return `Policy evaluated · ${e.intentsCreated.length} intent(s) created`;
    case "intent_created":
      return e.manual ? "Manual intent created" : "Intent created from policy";
    case "intent_decision":
      return `Intent ${e.decision.decision === "approve" ? "approved" : e.decision.decision === "reject" ? "rejected" : "changes requested"}`;
    case "intent_executed":
      return "Intent executed";
    case "intent_failed":
      return `Intent failed: ${e.reason}`;
    case "intent_skipped":
      return `Intent skipped: ${e.reason}`;
    case "ledger_posted":
      return `Ledger posted · ${e.entryIds.length} entry/entries`;
    case "reconciliation_reviewed":
      return `Reconciliation: ${e.entryIds.length} reviewed`;
    case "reconciliation_exported":
      return `Exported via "${e.preset}" · ${e.entryIds.length} rows`;
    case "demo_reset":
      return "Demo data reset";
    case "scenario_triggered":
      return `Scenario triggered: ${e.scenario}`;
  }
}

export function AuditTrail({ entries, users, max }: { entries: AuditLogEntry[]; users: User[]; max?: number }) {
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const list = max ? entries.slice(0, max) : entries;
  if (list.length === 0) {
    return <p className="text-xs text-muted-foreground">No audit entries yet.</p>;
  }
  return (
    <ol className="space-y-2 text-xs">
      {list.map((entry) => (
        <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-card-border pb-2 last:border-b-0">
          <div className="min-w-0">
            <div className="font-medium text-foreground">{describe(entry)}</div>
            <div className="text-muted-foreground">{userName(entry.actor)}</div>
          </div>
          <span className="shrink-0 text-muted-foreground" title={fmtDateAbs(entry.at)}>{fmtRelative(entry.at)}</span>
        </li>
      ))}
    </ol>
  );
}
