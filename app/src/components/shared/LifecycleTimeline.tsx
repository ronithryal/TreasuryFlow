import { cn } from "@/lib/cn";
import { fmtDateAbs, fmtRelative } from "@/lib/format";
import type { Intent, Execution, User } from "@/types/domain";
import { Check, Clock, Loader2, Slash, X, AlertTriangle, Send } from "lucide-react";

interface Step {
  label: string;
  state: "done" | "current" | "pending" | "failed" | "skipped";
  at?: string;
  by?: string;
  note?: string;
  icon?: React.ElementType;
}

export function LifecycleTimeline({
  intent,
  execution,
  users,
}: {
  intent: Intent;
  execution?: Execution;
  users: User[];
}) {
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const status = intent.status;

  const steps: Step[] = [];
  steps.push({
    label: intent.policyId ? "Policy fired" : "Manual intent created",
    state: "done",
    at: intent.createdAt,
    by: userName(intent.requestedBy),
    note: intent.rationale,
    icon: Send,
  });

  // approval step
  if (intent.approvals.length === 0 && status === "proposed") {
    steps.push({ label: "Awaiting evaluation", state: "current", icon: Clock });
  } else if (status === "pending_approval") {
    steps.push({ label: "Pending approval", state: "current", icon: Clock });
  } else if (status === "rejected") {
    const last = intent.approvals[intent.approvals.length - 1];
    steps.push({ label: "Rejected", state: "failed", at: last?.at, by: last && userName(last.approver), note: last?.comment, icon: X });
  } else if (status === "canceled") {
    steps.push({ label: "Canceled", state: "skipped", note: intent.resolutionNote, icon: Slash });
  } else if (intent.approvals.some((a) => a.decision === "approve")) {
    const last = [...intent.approvals].reverse().find((a) => a.decision === "approve");
    steps.push({ label: "Approved", state: "done", at: last?.at, by: last && userName(last.approver), note: last?.comment, icon: Check });
  } else if (status === "approved") {
    steps.push({ label: "Approved", state: "done", at: intent.approvedAt, icon: Check });
  }

  // execution step
  if (status === "scheduled") {
    steps.push({ label: "Scheduled", state: "current", at: intent.approvedAt, icon: Clock });
  } else if (status === "executing") {
    steps.push({ label: "Executing", state: "current", at: execution?.startedAt, icon: Loader2 });
  } else if (status === "executed") {
    steps.push({ label: "Executed", state: "done", at: intent.executedAt ?? execution?.completedAt, note: execution?.resultSummary, icon: Check });
  } else if (status === "failed") {
    steps.push({ label: "Failed", state: "failed", at: execution?.completedAt, note: intent.failureReason ?? execution?.failureReason, icon: AlertTriangle });
  } else if (status === "skipped") {
    steps.push({ label: "Skipped", state: "skipped", note: intent.resolutionNote, icon: Slash });
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {steps.map((step, i) => {
        const Icon = step.icon ?? Check;
        const dotClass =
          step.state === "done"
            ? "bg-chart-5 text-primary-foreground"
            : step.state === "current"
              ? "bg-primary text-primary-foreground"
              : step.state === "failed"
                ? "bg-destructive text-destructive-foreground"
                : step.state === "skipped"
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted text-muted-foreground";
        return (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[26px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card",
                dotClass,
              )}
            >
              <Icon className={cn("h-2.5 w-2.5", step.state === "current" && step.label === "Executing" && "animate-spin")} />
            </span>
            <div className="text-sm font-medium">{step.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {step.at ? <span title={fmtDateAbs(step.at)}>{fmtRelative(step.at)}</span> : null}
              {step.by ? <span> · {step.by}</span> : null}
            </div>
            {step.note ? <div className="mt-1 text-xs text-foreground/80">{step.note}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
