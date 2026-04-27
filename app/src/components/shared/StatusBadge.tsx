import { cn } from "@/lib/cn";
import {
  AlertTriangle,
  Check,
  Clock,
  Hourglass,
  Loader2,
  Pause,
  Play,
  Send,
  Slash,
  X,
  CheckCircle2,
  CircleDot,
  ExternalLink,
} from "lucide-react";
import type {
  AccountStatus,
  IntentStatus,
  PolicyStatus,
  ExecutionType,
  ReconciliationStatus,
} from "@/types/domain";

type AnyStatus = IntentStatus | PolicyStatus | AccountStatus | ExecutionType | ReconciliationStatus;

interface StatusMeta {
  label: string;
  className: string;
  icon: React.ElementType;
}

const map: Record<string, StatusMeta> = {
  // Intent / execution lifecycle
  proposed: { label: "Proposed", className: "bg-muted text-muted-foreground", icon: CircleDot },
  pending_approval: { label: "Pending approval", className: "bg-chart-3/15 text-chart-3", icon: Hourglass },
  approved: { label: "Approved", className: "bg-chart-5/15 text-chart-5", icon: Check },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive", icon: X },
  scheduled: { label: "Scheduled", className: "bg-chart-2/15 text-chart-2", icon: Clock },
  executing: { label: "Executing", className: "bg-primary/15 text-primary", icon: Loader2 },
  executed: { label: "Executed", className: "bg-chart-5/15 text-chart-5", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground", icon: Slash },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground", icon: Slash },
  partner_pending: { label: "Partner pending", className: "bg-chart-3/15 text-chart-3", icon: Send },
  completed: { label: "Completed", className: "bg-chart-5/15 text-chart-5", icon: CheckCircle2 },
  simulated: { label: "Simulated", className: "bg-chart-4/15 text-chart-4", icon: CircleDot },

  // Policy
  active: { label: "Active", className: "bg-chart-5/15 text-chart-5", icon: Play },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground", icon: Pause },
  breached: { label: "Breached", className: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: CircleDot },

  // Account
  healthy: { label: "Healthy", className: "bg-chart-5/15 text-chart-5", icon: Check },
  low: { label: "Low balance", className: "bg-chart-3/15 text-chart-3", icon: AlertTriangle },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground", icon: Slash },

  // Reconciliation
  tagged: { label: "Tagged", className: "bg-chart-5/15 text-chart-5", icon: Check },
  missing_tags: { label: "Missing tags", className: "bg-chart-3/15 text-chart-3", icon: AlertTriangle },
  reviewed: { label: "Reviewed", className: "bg-chart-2/15 text-chart-2", icon: Check },
  exported: { label: "Exported", className: "bg-primary/15 text-primary", icon: ExternalLink },
};

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  const m = map[status as string] ?? { label: status, className: "bg-muted text-muted-foreground", icon: CircleDot };
  const Icon = m.icon;
  const spinning = status === "executing";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-foreground/5",
        m.className,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", spinning && "animate-spin")} />
      {m.label}
    </span>
  );
}
