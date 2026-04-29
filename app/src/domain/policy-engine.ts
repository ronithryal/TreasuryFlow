/**
 * Pure policy engine. Given a world snapshot, decides which intents a policy
 * should currently produce. Side effects (intent persistence, audit) live in
 * the store. This module is fully unit-testable.
 *
 *   evaluatePolicy
 *     ├── 'sweep'           → if balance > threshold, propose move (balance - keepMin)
 *     ├── 'rebalance'       → if balance < min, propose refill from reserve
 *     ├── 'payout_run'      → if cadence due, expand seeded batch
 *     ├── 'deposit_routing' → if pending inbound, emit per-leg intents
 *     └── 'cash_out'        → if destination prefers bank, route through partner rail
 */
import type {
  AccountId,
  Counterparty,
  Intent,
  IntentId,
  Policy,
  PolicyId,
  RiskFlag,
  WorldSnapshot,
  UserId,
  EntityId,
} from "@/types/domain";
import { runtimeId } from "./ids";

export interface EvaluateOpts {
  /** When the policy is evaluated. Used as createdAt/snapshotAt. */
  now: string;
  /** Whose name shows on requestedBy. Defaults to a system user. */
  initiatorId: UserId;
  /** Force-fire even if normal preconditions don't trigger. Used by Overview's
      "trigger sweep" demo button. */
  force?: boolean;
}

export interface EvaluateResult {
  intents: Intent[];
  /** Reasons the policy did not produce intents (for tooltip surfaces). */
  noopReasons: string[];
}

export function evaluatePolicy(policy: Policy, snap: WorldSnapshot, opts: EvaluateOpts): EvaluateResult {
  if (policy.status !== "active" && !opts.force) {
    return { intents: [], noopReasons: [`policy is ${policy.status}`] };
  }
  switch (policy.type) {
    case "sweep":
      return evalSweep(policy, snap, opts);
    case "rebalance":
      return evalRebalance(policy, snap, opts);
    case "payout_run":
      return evalPayoutRun(policy, snap, opts);
    case "deposit_routing":
      return evalDepositRouting(policy, snap, opts);
    case "cash_out":
      return evalCashOut(policy, snap, opts);
    case "cross_border_sweep":
      return evalCrossBorderSweep(policy, snap, opts);
    default:
      return { intents: [], noopReasons: ["unsupported policy type"] };
  }
}

// -----------------
// Stub for the new cross_border_sweep type
function evalCrossBorderSweep(_policy: Policy, _snap: WorldSnapshot, _opts: EvaluateOpts): EvaluateResult {
  return { intents: [], noopReasons: ["cross_border_sweep not fully implemented yet"] };
}

function buildIntent(
  partial: Partial<Intent> & {
    type: Intent["type"];
    sourceAccountId: AccountId;
    destinationAccountId: AccountId;
    amount: number;
    title: string;
    description: string;
    rationale: string;
    entityId: EntityId;
  },
  snap: WorldSnapshot,
  opts: EvaluateOpts,
  policy: Policy | undefined,
  riskFlags: RiskFlag[] = [],
  counterpartyId?: Intent["counterpartyId"],
  batchId?: string,
): Intent {
  const source = snap.accounts.find((a) => a.id === partial.sourceAccountId)!;
  const dest = snap.accounts.find((a) => a.id === partial.destinationAccountId)!;
  return {
    id: runtimeId("int") as IntentId,
    policyId: policy?.id,
    type: partial.type,
    title: partial.title,
    description: partial.description,
    sourceAccountId: partial.sourceAccountId,
    destinationAccountId: partial.destinationAccountId,
    amount: partial.amount,
    asset: source.asset,
    chain: source.chain,
    entityId: partial.entityId,
    status: "proposed",
    rationale: partial.rationale,
    riskFlags,
    requestedBy: opts.initiatorId,
    counterpartyId,
    approvals: [],
    snapshotAt: opts.now,
    sourceBalanceAtSnapshot: source.balance,
    destinationBalanceAtSnapshot: dest.balance,
    batchId,
    createdAt: opts.now,
  };
}

function evalSweep(policy: Policy, snap: WorldSnapshot, opts: EvaluateOpts): EvaluateResult {
  const c = policy.conditions;
  if (c.kind !== "balance_above") return { intents: [], noopReasons: ["condition is not balance_above"] };
  const intents: Intent[] = [];
  const noop: string[] = [];
  for (const sourceId of policy.sourceAccountIds) {
    const source = snap.accounts.find((a) => a.id === sourceId);
    if (!source) continue;
    if (!opts.force && source.balance <= c.thresholdUsd) {
      noop.push(`${source.name} at $${source.balance.toLocaleString()} (≤ threshold)`);
      continue;
    }
    const amount = source.balance - c.keepMinUsd;
    if (amount <= 0) {
      noop.push(`${source.name} would sweep negative — keepMin too high`);
      continue;
    }
    const destId = policy.destinationAccountIds[0];
    if (!destId) continue;
    intents.push(
      buildIntent(
        {
          type: "sweep",
          title: `Sweep excess from ${source.name}`,
          description: `Move excess balance to reserve while retaining $${c.keepMinUsd.toLocaleString()}.`,
          rationale: `Balance $${source.balance.toLocaleString()} exceeds threshold $${c.thresholdUsd.toLocaleString()}. Sweep ${amount.toLocaleString()} ${source.asset} to reserve, retaining $${c.keepMinUsd.toLocaleString()}.`,
          sourceAccountId: source.id,
          destinationAccountId: destId,
          amount,
          entityId: source.entityId,
        },
        snap,
        opts,
        policy,
      ),
    );
  }
  return { intents, noopReasons: noop };
}

function evalRebalance(policy: Policy, snap: WorldSnapshot, opts: EvaluateOpts): EvaluateResult {
  const c = policy.conditions;
  if (c.kind !== "balance_below") return { intents: [], noopReasons: ["condition is not balance_below"] };
  const intents: Intent[] = [];
  const noop: string[] = [];
  for (const targetId of policy.destinationAccountIds) {
    const target = snap.accounts.find((a) => a.id === targetId);
    if (!target) continue;
    if (!opts.force && target.balance >= c.minimumUsd) {
      noop.push(`${target.name} at $${target.balance.toLocaleString()} (≥ minimum)`);
      continue;
    }
    const reserveId = policy.sourceAccountIds[0];
    if (!reserveId) continue;
    const reserve = snap.accounts.find((a) => a.id === reserveId);
    if (!reserve) continue;
    const need = c.minimumUsd - target.balance;
    const flags: RiskFlag[] = [];
    if (reserve.balance < need) flags.push({ kind: "low_source_balance" });
    intents.push(
      buildIntent(
        {
          type: "rebalance",
          title: `Rebalance ${target.name}`,
          description: `Refill ${target.name} from ${reserve.name} to maintain $${c.minimumUsd.toLocaleString()} minimum.`,
          rationale: `Balance $${target.balance.toLocaleString()} is below minimum $${c.minimumUsd.toLocaleString()}. Refill $${need.toLocaleString()} from ${reserve.name}.`,
          sourceAccountId: reserve.id,
          destinationAccountId: target.id,
          amount: need,
          entityId: target.entityId,
        },
        snap,
        opts,
        policy,
        flags,
      ),
    );
  }
  return { intents, noopReasons: noop };
}

function evalPayoutRun(policy: Policy, snap: WorldSnapshot, opts: EvaluateOpts): EvaluateResult {
  const c = policy.conditions;
  if (c.kind !== "schedule" && !opts.force) return { intents: [], noopReasons: ["no schedule condition"] };
  const dueAt = c.kind === "schedule" ? c.nextRun : opts.now;
  if (!opts.force && new Date(dueAt) > new Date(opts.now)) {
    return { intents: [], noopReasons: [`next run is ${dueAt}`] };
  }

  const sourceId = policy.sourceAccountIds[0];
  const source = snap.accounts.find((a) => a.id === sourceId);
  if (!source) return { intents: [], noopReasons: ["source account missing"] };

  // Hand-crafted batch: one entry per known counterparty (using normalRange max
  // as the scheduled amount, with one intentionally-flagged amount).
  const batchId = runtimeId("batch");
  const counterparties: Counterparty[] = snap.counterparties.filter((cp) => cp.type === "vendor" || cp.type === "contractor");
  const intents: Intent[] = [];
  counterparties.slice(0, 5).forEach((cp, idx) => {
    const baseAmount = cp.normalRange ? Math.round((cp.normalRange.minUsd + cp.normalRange.maxUsd) / 2) : 5000;
    // Flag the third row as abnormally large
    const amount = idx === 2 && cp.normalRange ? Math.round(cp.normalRange.maxUsd * 1.6) : baseAmount;
    const flags: RiskFlag[] = [];
    if (cp.normalRange && amount > cp.normalRange.maxUsd) {
      flags.push({ kind: "amount_above_normal_range", observed: amount, max: cp.normalRange.maxUsd });
    }
    if (!cp.firstSeenAt) flags.push({ kind: "first_time_counterparty" });

    // Determine destination based on counterparty preferred settlement.
    let destinationId: AccountId | undefined = policy.destinationAccountIds[0];
    let intentType: Intent["type"] = "payout";
    if (cp.preferredSettlement === "bank_cashout") {
      const bankAccount = snap.accounts.find((a) => a.accountType === "bank_destination");
      if (bankAccount) {
        destinationId = bankAccount.id;
        intentType = "cash_out";
      }
    }
    if (!destinationId) return;

    intents.push(
      buildIntent(
        {
          type: intentType,
          title: `${intentType === "cash_out" ? "Bank cash-out" : "Payout"} to ${cp.name}`,
          description:
            intentType === "cash_out"
              ? `Cash-out via partner bank rail to ${cp.name}.`
              : `Scheduled payout to ${cp.name}.`,
          rationale:
            cp.preferredSettlement === "bank_cashout"
              ? `Counterparty prefers bank settlement. Routing through partner cash-out flow.`
              : `Friday payout run. Sending normal-range amount to ${cp.name}.`,
          sourceAccountId: source.id,
          destinationAccountId: destinationId,
          amount,
          entityId: source.entityId,
        },
        snap,
        opts,
        policy,
        flags,
        cp.id,
        batchId,
      ),
    );
  });

  return { intents, noopReasons: [] };
}

function evalDepositRouting(policy: Policy, snap: WorldSnapshot, opts: EvaluateOpts): EvaluateResult {
  const c = policy.conditions;
  if (c.kind !== "inbound_event" && !opts.force) {
    return { intents: [], noopReasons: ["no inbound condition"] };
  }
  const sourceId = policy.sourceAccountIds[0];
  if (!sourceId) return { intents: [], noopReasons: ["no source"] };

  const inbound = snap.pendingInbounds.find(
    (pi) => !pi.resolved && pi.collectionAccountId === sourceId,
  );
  if (!inbound && !opts.force) {
    return { intents: [], noopReasons: ["no pending inbound for source"] };
  }
  const splits = policy.splits ?? [];
  if (splits.length === 0) return { intents: [], noopReasons: ["no splits configured"] };

  const totalAmount = inbound?.amount ?? 42_000;
  const source = snap.accounts.find((a) => a.id === sourceId)!;

  const intents = splits.map((split) =>
    buildIntent(
      {
        type: "deposit_route",
        title: `Route ${Math.round(split.ratio * 100)}% of inbound to ${snap.accounts.find((a) => a.id === split.destinationAccountId)?.name ?? "destination"}`,
        description: `Split inbound deposit per routing policy.`,
        rationale: `Inbound deposit of $${totalAmount.toLocaleString()} received in ${source.name}. Routing ${Math.round(split.ratio * 100)}% per policy.`,
        sourceAccountId: source.id,
        destinationAccountId: split.destinationAccountId,
        amount: Math.round(totalAmount * split.ratio),
        entityId: source.entityId,
      },
      snap,
      opts,
      policy,
    ),
  );

  return { intents, noopReasons: [] };
}

function evalCashOut(_policy: Policy, _snap: WorldSnapshot, _opts: EvaluateOpts): EvaluateResult {
  // Cash-out policies are evaluated implicitly through payout_run — no
  // standalone trigger. Returning [] keeps the engine total.
  return { intents: [], noopReasons: ["cash-out policy is applied during payout_run evaluation"] };
}

export function evaluateAll(snap: WorldSnapshot, opts: EvaluateOpts): { byPolicy: Record<PolicyId, EvaluateResult> } {
  const byPolicy: Record<string, EvaluateResult> = {};
  for (const policy of snap.policies) {
    byPolicy[policy.id] = evaluatePolicy(policy, snap, opts);
  }
  return { byPolicy: byPolicy as Record<PolicyId, EvaluateResult> };
}
