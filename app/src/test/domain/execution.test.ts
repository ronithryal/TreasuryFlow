import { describe, it, expect } from "vitest";
import { executeIntent } from "@/domain/execution";
import type { Account, AccountId, EntityId, Intent, IntentId, UserId, WorldSnapshot } from "@/types/domain";

const NOW = "2026-04-27T14:00:00.000Z";
const INITIATOR = "u_test" as UserId;
const ENTITY = "ent_test" as EntityId;

function makeAccount(id: AccountId, balance: number, overrides: Partial<Account> = {}): Account {
  return {
    id,
    name: `Acct ${id}`,
    accountType: "operating_wallet",
    chain: "base",
    asset: "USDC",
    entityId: ENTITY,
    balance,
    availableBalance: balance,
    status: "healthy",
    settlementRail: "onchain",
    tags: [],
    lastUpdated: NOW,
    ...overrides,
  };
}

function makeIntent(sourceId: AccountId, destId: AccountId, amount: number, sourceBalance: number, overrides: Partial<Intent> = {}): Intent {
  return {
    id: "int_test" as IntentId,
    type: "sweep",
    title: "Test",
    description: "Test",
    sourceAccountId: sourceId,
    destinationAccountId: destId,
    amount,
    asset: "USDC",
    chain: "base",
    entityId: ENTITY,
    status: "executing",
    rationale: "Test",
    riskFlags: [],
    requestedBy: INITIATOR,
    approvals: [],
    snapshotAt: NOW,
    sourceBalanceAtSnapshot: sourceBalance,
    destinationBalanceAtSnapshot: 500_000,
    createdAt: NOW,
    ...overrides,
  };
}

function makeSnap(accounts: Account[]): WorldSnapshot {
  return {
    now: NOW,
    entities: [{ id: ENTITY, name: "Test Co", jurisdiction: "US" }],
    accounts,
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

describe("executeIntent", () => {
  it("successful execution → executed status + 2 ledger entries", () => {
    const srcId = "acc_src" as AccountId;
    const dstId = "acc_dst" as AccountId;
    const src = makeAccount(srcId, 100_000);
    const dst = makeAccount(dstId, 500_000, { accountType: "reserve_wallet" });
    const intent = makeIntent(srcId, dstId, 50_000, 100_000);
    const result = executeIntent(intent, makeSnap([src, dst]), { now: NOW });
    expect(result.intent.status).toBe("executed");
    expect(result.execution.executionType).toBe("completed");
    expect(result.ledger).toHaveLength(2);
    expect(result.ledger.find((l) => l.direction === "outflow" || l.direction === "internal")).toBeTruthy();
    expect(result.ledger.find((l) => l.direction === "inflow" || l.direction === "internal")).toBeTruthy();
  });

  it("stale snapshot → skipped (no ledger)", () => {
    const srcId = "acc_src" as AccountId;
    const dstId = "acc_dst" as AccountId;
    // Source balance differs from snapshot by >0.5
    const src = makeAccount(srcId, 60_000);
    const dst = makeAccount(dstId, 500_000);
    const intent = makeIntent(srcId, dstId, 50_000, 100_000); // snapshot was 100k
    const result = executeIntent(intent, makeSnap([src, dst]), { now: NOW });
    expect(result.intent.status).toBe("skipped");
    expect(result.ledger).toHaveLength(0);
  });

  it("insufficient balance → failed (no ledger)", () => {
    const srcId = "acc_src" as AccountId;
    const dstId = "acc_dst" as AccountId;
    const src = makeAccount(srcId, 10_000);
    const dst = makeAccount(dstId, 500_000);
    const intent = makeIntent(srcId, dstId, 50_000, 10_000); // snapshot matches, but can't cover
    const result = executeIntent(intent, makeSnap([src, dst]), { now: NOW });
    expect(result.intent.status).toBe("failed");
    expect(result.ledger).toHaveLength(0);
    expect(result.execution.failureReason).toBeTruthy();
  });

  it("cash-out → partner_pending (no ledger yet)", () => {
    const srcId = "acc_src" as AccountId;
    const dstId = "acc_bank" as AccountId;
    const src = makeAccount(srcId, 100_000);
    const dst = makeAccount(dstId, 0, { accountType: "bank_destination", chain: "bank", asset: "USD" });
    const intent = makeIntent(srcId, dstId, 8_000, 100_000, { type: "cash_out" });
    const result = executeIntent(intent, makeSnap([src, dst]), { now: NOW });
    expect(result.intent.status).toBe("executing");
    expect(result.execution.executionType).toBe("partner_pending");
    expect(result.ledger).toHaveLength(0);
  });
});
