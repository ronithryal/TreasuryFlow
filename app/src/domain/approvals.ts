/**
 * Approval rule resolver. Given a policy's approval rule and the current intent,
 * decide whether the intent auto-approves or needs review (and why).
 *
 * The rule is a small DSL on the Policy type. Resolver returns a
 * { status: 'auto' | 'requires' } discriminated union with human-readable
 * reasons that the UI surfaces in the drawer.
 */
import type {
  ApprovalRule,
  Counterparty,
  Intent,
  Policy,
  WorldSnapshot,
} from "@/types/domain";

export interface ApprovalRequirement {
  status: "auto" | "requires";
  minApprovers: number;
  reasons: string[];
}

export function resolveApprovalRule(
  intent: Intent,
  policy: Policy | undefined,
  snap: WorldSnapshot,
): ApprovalRequirement {
  const rule: ApprovalRule = policy?.approvalRule ?? { kind: "always-require", minApprovers: 1 };
  const counterparty = intent.counterpartyId
    ? snap.counterparties.find((c) => c.id === intent.counterpartyId)
    : undefined;
  return resolve(rule, intent, counterparty);
}

function resolve(rule: ApprovalRule, intent: Intent, counterparty: Counterparty | undefined): ApprovalRequirement {
  switch (rule.kind) {
    case "auto-if-below":
      if (intent.amount < rule.amountUsd) {
        return { status: "auto", minApprovers: 0, reasons: [`amount under auto-approve threshold $${rule.amountUsd.toLocaleString()}`] };
      }
      return {
        status: "requires",
        minApprovers: 1,
        reasons: [`amount $${intent.amount.toLocaleString()} ≥ auto-approve threshold $${rule.amountUsd.toLocaleString()}`],
      };
    case "always-require":
      return { status: "requires", minApprovers: rule.minApprovers, reasons: ["policy always requires approval"] };
    case "first-time-counterparty":
      if (counterparty && !counterparty.firstSeenAt) {
        return {
          status: "requires",
          minApprovers: rule.minApprovers,
          reasons: [`first-time counterparty: ${counterparty.name}`],
        };
      }
      return { status: "auto", minApprovers: 0, reasons: ["counterparty has prior approved activity"] };
    case "cash-out-above":
      if (intent.type === "cash_out" && intent.amount >= rule.amountUsd) {
        return {
          status: "requires",
          minApprovers: rule.minApprovers,
          reasons: [`bank cash-out above $${rule.amountUsd.toLocaleString()} threshold`],
        };
      }
      return { status: "auto", minApprovers: 0, reasons: ["under cash-out threshold"] };
    case "composite": {
      const sub = rule.allOf.map((r) => resolve(r, intent, counterparty));
      const requires = sub.filter((s) => s.status === "requires");
      if (requires.length === 0) {
        return { status: "auto", minApprovers: 0, reasons: sub.flatMap((s) => s.reasons) };
      }
      const minApprovers = Math.max(...requires.map((s) => s.minApprovers));
      return {
        status: "requires",
        minApprovers,
        reasons: requires.flatMap((s) => s.reasons),
      };
    }
  }
}

export interface DecisionResult {
  intent: Intent;
  /** When true, the caller should immediately schedule for execution. */
  readyToExecute: boolean;
  error?: string;
}

/** Pure: applies a maker-checker decision to an intent and returns the new intent. */
export function applyDecision(
  intent: Intent,
  decision: { approver: string; decision: "approve" | "reject" | "request_changes"; comment?: string; at: string; id: string },
  required: ApprovalRequirement,
): DecisionResult {
  if (decision.approver === intent.requestedBy) {
    return { intent, readyToExecute: false, error: "Initiator cannot decide on their own intent." };
  }
  const next: Intent = {
    ...intent,
    approvals: [
      ...intent.approvals,
      {
        id: decision.id as Intent["approvals"][number]["id"],
        approver: decision.approver as Intent["approvals"][number]["approver"],
        decision: decision.decision,
        comment: decision.comment,
        at: decision.at,
      },
    ],
  };

  if (decision.decision === "reject") {
    return { intent: { ...next, status: "rejected" }, readyToExecute: false };
  }
  if (decision.decision === "request_changes") {
    return { intent: { ...next, status: "proposed" }, readyToExecute: false };
  }
  // approve
  const approvalsCount = next.approvals.filter((a) => a.decision === "approve").length;
  if (approvalsCount >= required.minApprovers) {
    return {
      intent: { ...next, status: "approved", approvedAt: decision.at },
      readyToExecute: true,
    };
  }
  return { intent: next, readyToExecute: false };
}
