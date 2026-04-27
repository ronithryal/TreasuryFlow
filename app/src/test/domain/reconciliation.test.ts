import { describe, it, expect } from "vitest";
import { computeCompleteness, buildCsv } from "@/domain/reconciliation";
import type { LedgerEntry, LedgerEntryId, ExecutionId, IntentId, AccountId, EntityId } from "@/types/domain";

function makeEntry(status: LedgerEntry["reconciliationStatus"], overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `led_${Math.random()}` as LedgerEntryId,
    intentId: "int_1" as IntentId,
    executionId: "exe_1" as ExecutionId,
    entityId: "ent_1" as EntityId,
    accountId: "acc_1" as AccountId,
    chain: "base",
    asset: "USDC",
    amount: 1_000,
    direction: "outflow",
    tags: [],
    approvalTrace: [],
    effectiveAt: "2026-04-01T10:00:00.000Z",
    reconciliationStatus: status,
    ...overrides,
  };
}

describe("computeCompleteness", () => {
  it("returns zeros for empty ledger", () => {
    const result = computeCompleteness([]);
    expect(result.total).toBe(0);
    expect(result.fullyTaggedRatio).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it("correctly counts by status", () => {
    const entries = [
      makeEntry("tagged"),
      makeEntry("tagged"),
      makeEntry("missing_tags"),
      makeEntry("reviewed"),
      makeEntry("exported"),
    ];
    const result = computeCompleteness(entries);
    expect(result.total).toBe(5);
    expect(result.byStatus.tagged).toBe(2);
    expect(result.byStatus.missing_tags).toBe(1);
    expect(result.byStatus.reviewed).toBe(1);
    expect(result.byStatus.exported).toBe(1);
    // tagged + reviewed + exported = 4/5 = 80%
    expect(result.fullyTaggedRatio).toBeCloseTo(0.8);
    expect(result.missing).toHaveLength(1);
  });

  it("100% when all tagged or reviewed", () => {
    const entries = [makeEntry("tagged"), makeEntry("reviewed"), makeEntry("exported")];
    const result = computeCompleteness(entries);
    expect(result.fullyTaggedRatio).toBe(1);
    expect(result.missing).toHaveLength(0);
  });
});

describe("buildCsv", () => {
  it("produces correct headers and row", () => {
    const csv = buildCsv([{
      date: "2026-04-01",
      entity: "Acme, Inc.",
      account: "Base Ops",
      chain: "base",
      direction: "outflow",
      amount: "5000",
      asset: "USDC",
      counterparty: "Vendor A",
      category: "COGS",
      purpose: "Vendor payment",
      costCenter: "OPS-1",
      txReference: "0x123",
    }]);
    expect(csv).toContain("date,entity,account");
    expect(csv).toContain('"Acme, Inc."'); // entity with comma gets quoted
    expect(csv).toContain("Base Ops");
    expect(csv).toContain("5000");
  });
});
