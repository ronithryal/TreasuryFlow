/**
 * Pure execution simulator. Given an approved intent and the current world,
 * returns the new Execution and the LedgerEntries that should be posted.
 *
 *   executeIntent(intent, snap)
 *     ├── stale snapshot? → 'skipped' (no ledger)
 *     ├── insufficient source balance? → 'failed' (no ledger)
 *     ├── normal flow → 'completed' + 1 outflow + 1 inflow ledger entry pair
 *     └── partner cash-out → 'partner_pending' marker; second tick completes
 */
import type {
  Execution,
  ExecutionId,
  ExecutionMode,
  Intent,
  LedgerEntry,
  LedgerEntryId,
  WorldSnapshot,
} from "@/types/domain";
import { runtimeId } from "./ids";

export interface ExecuteResult {
  intent: Intent;
  execution: Execution;
  ledger: LedgerEntry[];
  /** True when the execution finished a previously partner_pending exec. */
  resumedFromPending?: boolean;
}

export function executeIntent(intent: Intent, snap: WorldSnapshot, opts: { now: string; partnerSettle?: boolean; mode?: ExecutionMode; skipTwoStep?: boolean }): ExecuteResult {
  const source = snap.accounts.find((a) => a.id === intent.sourceAccountId);
  const dest = snap.accounts.find((a) => a.id === intent.destinationAccountId);
  if (!source || !dest) {
    return failExecution(intent, "Source or destination account missing", opts.now);
  }

  // Stale-snapshot guard.
  if (Math.abs(source.balance - intent.sourceBalanceAtSnapshot) > 0.5) {
    return skipExecution(intent, "Source balance changed since intent created.", opts.now);
  }
  // Insufficient balance.
  if (source.balance < intent.amount) {
    return failExecution(intent, "Insufficient source balance at execution time.", opts.now);
  }

  const isCashOut = intent.type === "cash_out";
  const useTwoStep = isCashOut && !opts.partnerSettle && !opts.skipTwoStep;
  const execMode: ExecutionMode = opts.mode ?? "simulated_demo";

  const executionId = runtimeId("exe") as ExecutionId;

  if (useTwoStep) {
    const exec: Execution = {
      id: executionId,
      intentId: intent.id,
      executionType: "partner_pending",
      executionMode: execMode,
      resultSummary: "Partner bank rail acknowledged. Waiting for settlement.",
      txReference: `prtnr_${runtimeId("ref")}`,
      startedAt: opts.now,
    };
    return {
      intent: { ...intent, status: "executing" },
      execution: exec,
      ledger: [],
    };
  }

  const txRef = isCashOut
    ? (execMode === "server_signed_demo" ? `demo_wire_${runtimeId("ref")}` : `bank_${runtimeId("ref")}`)
    : `0x${runtimeId("tx")}`;
  const exec: Execution = {
    id: executionId,
    intentId: intent.id,
    executionType: "completed",
    executionMode: execMode,
    resultSummary: isCashOut
      ? (execMode === "server_signed_demo"
          ? "Bank wire settled — server-signed demo execution. [DEMO MODE]"
          : "Bank cash-out settled via partner rail.")
      : "Onchain transfer settled.",
    txReference: txRef,
    startedAt: opts.now,
    completedAt: opts.now,
  };

  // Ledger pair: outflow on source, inflow on destination, internal-pair link.
  const outflowId = runtimeId("led") as LedgerEntryId;
  const inflowId = runtimeId("led") as LedgerEntryId;
  const baseTags = intent.batchId ? ["batch:" + intent.batchId] : [];
  const isInternal =
    source.entityId === dest.entityId &&
    source.accountType !== "bank_destination" &&
    dest.accountType !== "bank_destination";

  const outflow: LedgerEntry = {
    id: outflowId,
    intentId: intent.id,
    executionId: exec.id,
    entityId: source.entityId,
    accountId: source.id,
    chain: source.chain,
    asset: source.asset,
    amount: intent.amount,
    direction: isInternal ? "internal" : "outflow",
    purpose: intent.title,
    tags: baseTags,
    approvalTrace: intent.approvals,
    effectiveAt: opts.now,
    reconciliationStatus: "tagged",
    txReference: txRef,
    linkedEntryId: inflowId,
    counterpartyId: intent.counterpartyId,
  };
  const inflow: LedgerEntry = {
    id: inflowId,
    intentId: intent.id,
    executionId: exec.id,
    entityId: dest.entityId,
    accountId: dest.id,
    chain: dest.chain,
    asset: dest.asset,
    amount: intent.amount,
    direction: isInternal ? "internal" : "inflow",
    purpose: intent.title,
    tags: baseTags,
    approvalTrace: intent.approvals,
    effectiveAt: opts.now,
    reconciliationStatus: "tagged",
    txReference: txRef,
    linkedEntryId: outflowId,
    counterpartyId: intent.counterpartyId,
  };

  return {
    intent: { ...intent, status: "executed", executedAt: opts.now },
    execution: exec,
    ledger: [outflow, inflow],
  };
}

function skipExecution(intent: Intent, reason: string, now: string): ExecuteResult {
  const exec: Execution = {
    id: runtimeId("exe") as ExecutionId,
    intentId: intent.id,
    executionType: "skipped",
    resultSummary: reason,
    startedAt: now,
    completedAt: now,
  };
  return {
    intent: { ...intent, status: "skipped", resolutionNote: reason },
    execution: exec,
    ledger: [],
  };
}

function failExecution(intent: Intent, reason: string, now: string): ExecuteResult {
  const exec: Execution = {
    id: runtimeId("exe") as ExecutionId,
    intentId: intent.id,
    executionType: "failed",
    resultSummary: reason,
    failureReason: reason,
    startedAt: now,
    completedAt: now,
  };
  return {
    intent: { ...intent, status: "failed", failureReason: reason },
    execution: exec,
    ledger: [],
  };
}
