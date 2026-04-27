import { describe, it, expect } from "vitest";
import { resolveApprovalRule, applyDecision } from "@/domain/approvals";
import type {
  AuditId, CounterpartyId, Intent, IntentId, Policy, PolicyId, UserId, WorldSnapshot, AccountId, EntityId,
} from "@/types/domain";

const NOW = "2026-04-27T14:00:00.000Z";
const INITIATOR = "u_initiator" as UserId;
const APPROVER = "u_approver" as UserId;
const ENTITY = "ent_test" as EntityId;

function makeIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    id: "int_test" as IntentId,
    type: "sweep",
    title: "Test sweep",
    description: "Test",
    sourceAccountId: "acc_src" as AccountId,
    destinationAccountId: "acc_dst" as AccountId,
    amount: 50_000,
    asset: "USDC",
    chain: "base",
    entityId: ENTITY,
    status: "proposed",
    rationale: "Test",
    riskFlags: [],
    requestedBy: INITIATOR,
    approvals: [],
    snapshotAt: NOW,
    sourceBalanceAtSnapshot: 100_000,
    destinationBalanceAtSnapshot: 500_000,
    createdAt: NOW,
    ...overrides,
  };
}

function emptySnap(): WorldSnapshot {
  return {
    now: NOW,
    entities: [],
    accounts: [],
    counterparties: [],
    intents: [],
    executions: [],
    ledger: [],
    policies: [],
    settlement: [],
    pendingInbounds: [],
    users: [],
  };
}

// ---- resolveApprovalRule ----
describe("resolveApprovalRule", () => {
  it("auto-if-below: auto when under threshold", () => {
    const intent = makeIntent({ amount: 10_000 });
    const policy: Policy = {
      id: "pol" as PolicyId, name: "", type: "sweep", status: "active", description: "",
      sourceAccountIds: [], destinationAccountIds: [],
      conditions: { kind: "balance_above", thresholdUsd: 100_000, keepMinUsd: 25_000 },
      approvalRule: { kind: "auto-if-below", amountUsd: 25_000 },
      createdBy: INITIATOR,
    };
    const result = resolveApprovalRule(intent, policy, emptySnap());
    expect(result.status).toBe("auto");
  });

  it("auto-if-below: requires when over threshold", () => {
    const intent = makeIntent({ amount: 80_000 });
    const policy: Policy = {
      id: "pol" as PolicyId, name: "", type: "sweep", status: "active", description: "",
      sourceAccountIds: [], destinationAccountIds: [],
      conditions: { kind: "balance_above", thresholdUsd: 100_000, keepMinUsd: 25_000 },
      approvalRule: { kind: "auto-if-below", amountUsd: 25_000 },
      createdBy: INITIATOR,
    };
    const result = resolveApprovalRule(intent, policy, emptySnap());
    expect(result.status).toBe("requires");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("always-require: always requires", () => {
    const intent = makeIntent({ amount: 1 });
    const policy: Policy = {
      id: "pol" as PolicyId, name: "", type: "rebalance", status: "active", description: "",
      sourceAccountIds: [], destinationAccountIds: [],
      conditions: { kind: "balance_below", minimumUsd: 25_000 },
      approvalRule: { kind: "always-require", minApprovers: 1 },
      createdBy: INITIATOR,
    };
    const result = resolveApprovalRule(intent, policy, emptySnap());
    expect(result.status).toBe("requires");
    expect(result.minApprovers).toBe(1);
  });

  it("first-time-counterparty: requires when no firstSeenAt", () => {
    const cpId = "cp_test" as CounterpartyId;
    const intent = makeIntent({ counterpartyId: cpId });
    const policy: Policy = {
      id: "pol" as PolicyId, name: "", type: "payout_run", status: "active", description: "",
      sourceAccountIds: [], destinationAccountIds: [],
      conditions: { kind: "schedule", cron: "0 10 * * 5", nextRun: NOW },
      approvalRule: { kind: "first-time-counterparty", minApprovers: 1 },
      createdBy: INITIATOR,
    };
    const snap: WorldSnapshot = {
      ...emptySnap(),
      counterparties: [{
        id: cpId, name: "NewCp", type: "vendor", preferredSettlement: "digital_dollar",
        destinationDetails: { primary: "0x1", rail: "base_usdc" }, tags: [], status: "active",
      }],
    };
    const result = resolveApprovalRule(intent, policy, snap);
    expect(result.status).toBe("requires");
  });

  it("cash-out-above: requires when cash-out intent over threshold", () => {
    const intent = makeIntent({ type: "cash_out", amount: 8_000 });
    const policy: Policy = {
      id: "pol" as PolicyId, name: "", type: "cash_out", status: "active", description: "",
      sourceAccountIds: [], destinationAccountIds: [],
      conditions: { kind: "preferred_settlement_bank" },
      approvalRule: { kind: "cash-out-above", amountUsd: 5_000, minApprovers: 1 },
      createdBy: INITIATOR,
    };
    const result = resolveApprovalRule(intent, policy, emptySnap());
    expect(result.status).toBe("requires");
  });
});

// ---- applyDecision ----
describe("applyDecision", () => {
  function decisionArg(d: "approve" | "reject" | "request_changes", comment?: string) {
    return { id: "dec_1" as AuditId, approver: APPROVER, decision: d, comment, at: NOW };
  }

  it("approve transitions to approved when min approvers met", () => {
    const intent = makeIntent({ status: "pending_approval" });
    const result = applyDecision(intent, decisionArg("approve"), { status: "requires", minApprovers: 1, reasons: [] });
    expect(result.intent.status).toBe("approved");
    expect(result.readyToExecute).toBe(true);
    expect(result.intent.approvedAt).toBe(NOW);
  });

  it("reject transitions to rejected", () => {
    const intent = makeIntent({ status: "pending_approval" });
    const result = applyDecision(intent, decisionArg("reject", "too high"), { status: "requires", minApprovers: 1, reasons: [] });
    expect(result.intent.status).toBe("rejected");
    expect(result.readyToExecute).toBe(false);
  });

  it("request_changes sends back to proposed", () => {
    const intent = makeIntent({ status: "pending_approval" });
    const result = applyDecision(intent, decisionArg("request_changes"), { status: "requires", minApprovers: 1, reasons: [] });
    expect(result.intent.status).toBe("proposed");
    expect(result.readyToExecute).toBe(false);
  });

  it("initiator cannot approve their own intent", () => {
    const intent = makeIntent({ status: "pending_approval" });
    const initiatorDecision = { id: "dec_1" as AuditId, approver: INITIATOR, decision: "approve" as const, at: NOW };
    const result = applyDecision(intent, initiatorDecision, { status: "requires", minApprovers: 1, reasons: [] });
    expect(result.error).toBeDefined();
    expect(result.readyToExecute).toBe(false);
  });

  it("needs multiple approvers — only ready when count met", () => {
    const intent = makeIntent({ status: "pending_approval" });
    const first = applyDecision(intent, { id: "dec_1" as AuditId, approver: APPROVER, decision: "approve", at: NOW }, { status: "requires", minApprovers: 2, reasons: [] });
    expect(first.intent.status).toBe("pending_approval"); // still needs 1 more
    expect(first.readyToExecute).toBe(false);
    const secondApprover = "u_second" as UserId;
    const second = applyDecision(first.intent, { id: "dec_2" as AuditId, approver: secondApprover, decision: "approve", at: NOW }, { status: "requires", minApprovers: 2, reasons: [] });
    expect(second.intent.status).toBe("approved");
    expect(second.readyToExecute).toBe(true);
  });
});
