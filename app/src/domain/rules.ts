/** Helper utilities the policy engine and UI both reach for. */
import type { Intent, RiskFlag } from "@/types/domain";
import { fmtAmountOnly } from "@/lib/format";

export function describeRiskFlag(flag: RiskFlag): string {
  switch (flag.kind) {
    case "amount_above_normal_range":
      return `Amount $${fmtAmountOnly(flag.observed)} above normal max $${fmtAmountOnly(flag.max)}`;
    case "first_time_counterparty":
      return "First-time counterparty";
    case "low_source_balance":
      return "Source reserve may be insufficient";
    case "stale_snapshot":
      return "Source balance changed since intent created";
    case "cash_out_high_value":
      return `Cash-out above $${fmtAmountOnly(flag.threshold)} threshold`;
  }
}

export function approvalsCount(intent: Intent): number {
  return intent.approvals.filter((a) => a.decision === "approve").length;
}

export function isTerminal(status: Intent["status"]): boolean {
  return status === "executed" || status === "failed" || status === "skipped" || status === "rejected" || status === "canceled";
}

export function isPendingDecision(status: Intent["status"]): boolean {
  return status === "pending_approval";
}
