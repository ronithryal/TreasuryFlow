import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "@/domain/policy-engine";
import type { Account, AccountId, EntityId, Policy, PolicyId, UserId, WorldSnapshot } from "@/types/domain";

const NOW = "2026-04-27T14:00:00.000Z";
const INITIATOR = "u_test" as UserId;
const ENTITY = "ent_test" as EntityId;

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc_test" as AccountId,
    name: "Test Account",
    accountType: "operating_wallet",
    chain: "base",
    asset: "USDC",
    entityId: ENTITY,
    balance: 100_000,
    availableBalance: 100_000,
    status: "healthy",
    settlementRail: "onchain",
    tags: [],
    lastUpdated: NOW,
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

const OPTS = { now: NOW, initiatorId: INITIATOR };

// ---- Sweep ----
describe("evaluatePolicy — sweep", () => {
  const sourceId = "acc_ops" as AccountId;
  const destId = "acc_reserve" as AccountId;

  function sweepPolicy(threshold: number, keepMin: number): Policy {
    return {
      id: "pol_sweep" as PolicyId,
      name: "Sweep",
      type: "sweep",
      status: "active",
      description: "",
      sourceAccountIds: [sourceId],
      destinationAccountIds: [destId],
      conditions: { kind: "balance_above", thresholdUsd: threshold, keepMinUsd: keepMin },
      approvalRule: { kind: "auto-if-below", amountUsd: 50_000 },
      createdBy: INITIATOR,
    };
  }

  it("produces an intent when balance exceeds threshold", () => {
    const source = makeAccount({ id: sourceId, balance: 160_000, availableBalance: 160_000 });
    const dest = makeAccount({ id: destId, balance: 500_000, availableBalance: 500_000, accountType: "reserve_wallet" });
    const policy = sweepPolicy(125_000, 25_000);
    const snap = makeSnap([source, dest]);
    const result = evaluatePolicy(policy, snap, OPTS);
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].amount).toBe(135_000); // 160k - 25k keepMin
    expect(result.intents[0].type).toBe("sweep");
    expect(result.intents[0].sourceAccountId).toBe(sourceId);
    expect(result.intents[0].destinationAccountId).toBe(destId);
  });

  it("returns empty when balance is at or below threshold", () => {
    const source = makeAccount({ id: sourceId, balance: 100_000 });
    const dest = makeAccount({ id: destId, accountType: "reserve_wallet" });
    const policy = sweepPolicy(125_000, 25_000);
    const snap = makeSnap([source, dest]);
    const result = evaluatePolicy(policy, snap, OPTS);
    expect(result.intents).toHaveLength(0);
    expect(result.noopReasons.length).toBeGreaterThan(0);
  });

  it("respects keepMin — does not sweep below it", () => {
    const source = makeAccount({ id: sourceId, balance: 130_000 });
    const dest = makeAccount({ id: destId, accountType: "reserve_wallet" });
    const policy = sweepPolicy(125_000, 25_000);
    const snap = makeSnap([source, dest]);
    const result = evaluatePolicy(policy, snap, OPTS);
    expect(result.intents[0].amount).toBe(105_000); // 130k - 25k
  });

  it("ignores paused policy", () => {
    const source = makeAccount({ id: sourceId, balance: 200_000 });
    const dest = makeAccount({ id: destId, accountType: "reserve_wallet" });
    const policy = { ...sweepPolicy(125_000, 25_000), status: "paused" as const };
    const snap = makeSnap([source, dest]);
    const result = evaluatePolicy(policy, snap, OPTS);
    expect(result.intents).toHaveLength(0);
  });

  it("force-fires even when below threshold", () => {
    const source = makeAccount({ id: sourceId, balance: 50_000 });
    const dest = makeAccount({ id: destId, accountType: "reserve_wallet" });
    const policy = sweepPolicy(125_000, 25_000);
    const snap = makeSnap([source, dest]);
    const result = evaluatePolicy(policy, snap, { ...OPTS, force: true });
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].amount).toBe(25_000); // 50k - 25k
  });
});

// ---- Rebalance ----
describe("evaluatePolicy — rebalance", () => {
  const reserveId = "acc_eth" as AccountId;
  const targetId = "acc_poly" as AccountId;

  function rebalPolicy(min: number): Policy {
    return {
      id: "pol_rebal" as PolicyId,
      name: "Rebalance",
      type: "rebalance",
      status: "active",
      description: "",
      sourceAccountIds: [reserveId],
      destinationAccountIds: [targetId],
      conditions: { kind: "balance_below", minimumUsd: min },
      approvalRule: { kind: "always-require", minApprovers: 1 },
      createdBy: INITIATOR,
    };
  }

  it("fires when target is below minimum", () => {
    const reserve = makeAccount({ id: reserveId, balance: 640_000, accountType: "reserve_wallet" });
    const target = makeAccount({ id: targetId, balance: 14_800, accountType: "operating_wallet" });
    const result = evaluatePolicy(rebalPolicy(25_000), makeSnap([reserve, target]), OPTS);
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].amount).toBe(10_200); // 25k - 14.8k
    expect(result.intents[0].type).toBe("rebalance");
  });

  it("does not fire when target is above minimum", () => {
    const reserve = makeAccount({ id: reserveId, balance: 640_000, accountType: "reserve_wallet" });
    const target = makeAccount({ id: targetId, balance: 30_000, accountType: "operating_wallet" });
    const result = evaluatePolicy(rebalPolicy(25_000), makeSnap([reserve, target]), OPTS);
    expect(result.intents).toHaveLength(0);
  });

  it("flags low_source_balance when reserve is insufficient", () => {
    const reserve = makeAccount({ id: reserveId, balance: 1_000, accountType: "reserve_wallet" });
    const target = makeAccount({ id: targetId, balance: 5_000, accountType: "operating_wallet" });
    const result = evaluatePolicy(rebalPolicy(25_000), makeSnap([reserve, target]), OPTS);
    expect(result.intents[0].riskFlags).toContainEqual({ kind: "low_source_balance" });
  });
});

// ---- Deposit routing ----
describe("evaluatePolicy — deposit_routing", () => {
  it("creates split intents when pending inbound exists", () => {
    const collectionId = "acc_collect" as AccountId;
    const reserveId = "acc_reserve" as AccountId;
    const opsId = "acc_ops" as AccountId;
    const collection = makeAccount({ id: collectionId, accountType: "collection_address" });
    const reserve = makeAccount({ id: reserveId, accountType: "reserve_wallet" });
    const ops = makeAccount({ id: opsId, accountType: "operating_wallet" });
    const policy: Policy = {
      id: "pol_route" as PolicyId,
      name: "Route",
      type: "deposit_routing",
      status: "active",
      description: "",
      sourceAccountIds: [collectionId],
      destinationAccountIds: [reserveId, opsId],
      conditions: { kind: "inbound_event" },
      splits: [
        { destinationAccountId: reserveId, ratio: 0.9 },
        { destinationAccountId: opsId, ratio: 0.1 },
      ],
      approvalRule: { kind: "auto-if-below", amountUsd: 100_000 },
      createdBy: INITIATOR,
    };
    const snap: WorldSnapshot = {
      ...makeSnap([collection, reserve, ops]),
      pendingInbounds: [{
        id: "pi_test",
        collectionAccountId: collectionId,
        amount: 42_000,
        asset: "USDC",
        chain: "base",
        receivedAt: NOW,
        resolved: false,
      }],
    };
    const result = evaluatePolicy(policy, snap, OPTS);
    expect(result.intents).toHaveLength(2);
    expect(result.intents[0].amount).toBe(37_800); // 90%
    expect(result.intents[1].amount).toBe(4_200);  // 10%
  });

  it("returns empty when no pending inbound", () => {
    const collectionId = "acc_collect" as AccountId;
    const collection = makeAccount({ id: collectionId, accountType: "collection_address" });
    const policy: Policy = {
      id: "pol_route" as PolicyId,
      name: "Route",
      type: "deposit_routing",
      status: "active",
      description: "",
      sourceAccountIds: [collectionId],
      destinationAccountIds: [],
      conditions: { kind: "inbound_event" },
      splits: [],
      approvalRule: { kind: "auto-if-below", amountUsd: 100_000 },
      createdBy: INITIATOR,
    };
    const result = evaluatePolicy(policy, makeSnap([collection]), OPTS);
    expect(result.intents).toHaveLength(0);
  });
});
