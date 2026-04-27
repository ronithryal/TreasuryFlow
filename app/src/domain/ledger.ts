/**
 * Ledger projection: given a list of ledger entries and a starting account
 * snapshot, recompute current account balances. Pure and deterministic.
 */
import type { Account, LedgerEntry } from "@/types/domain";

export function projectBalances(initialAccounts: Account[], ledger: LedgerEntry[]): Account[] {
  const byId = new Map(initialAccounts.map((a) => [a.id, { ...a }]));
  const sorted = [...ledger].sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
  for (const entry of sorted) {
    const acct = byId.get(entry.accountId);
    if (!acct) continue;
    if (entry.direction === "outflow" || (entry.direction === "internal" && entry.amount > 0 && entry.linkedEntryId && entry.linkedEntryId > entry.id)) {
      // For internal pair, treat the entry whose linkedEntryId is greater as
      // the outflow side (deterministic). Both pairs share the same amount and
      // tx reference, so this resolves cleanly.
      acct.balance -= entry.amount;
      acct.availableBalance = Math.max(0, acct.availableBalance - entry.amount);
    } else if (entry.direction === "inflow" || entry.direction === "internal") {
      acct.balance += entry.amount;
      acct.availableBalance += entry.amount;
    }
  }
  return Array.from(byId.values());
}

/** Total liquidity (sum of balances across accounts of a given accountType). */
export function totalByType(accounts: Account[], type: Account["accountType"]): number {
  return accounts.filter((a) => a.accountType === type).reduce((s, a) => s + a.balance, 0);
}

export function totalManaged(accounts: Account[]): number {
  return accounts.reduce((s, a) => s + a.balance, 0);
}

export function totalByChain(accounts: Account[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of accounts) out[a.chain] = (out[a.chain] ?? 0) + a.balance;
  return out;
}
