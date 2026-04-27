/**
 * Reconciliation completeness + export presets.
 */
import type { LedgerEntry, ReconciliationStatus } from "@/types/domain";

export interface CompletenessSummary {
  total: number;
  byStatus: Record<ReconciliationStatus, number>;
  /** Composite score: (tagged + reviewed + exported) / total. */
  fullyTaggedRatio: number;
  /** Reviewed-and-better ratio. */
  reviewedRatio: number;
  /** Subset that still needs attention. */
  missing: LedgerEntry[];
}

export function computeCompleteness(entries: LedgerEntry[]): CompletenessSummary {
  const byStatus: Record<ReconciliationStatus, number> = {
    tagged: 0,
    missing_tags: 0,
    reviewed: 0,
    exported: 0,
  };
  for (const e of entries) byStatus[e.reconciliationStatus] += 1;
  const total = entries.length;
  const fullyTagged = byStatus.tagged + byStatus.reviewed + byStatus.exported;
  return {
    total,
    byStatus,
    fullyTaggedRatio: total === 0 ? 0 : fullyTagged / total,
    reviewedRatio: total === 0 ? 0 : (byStatus.reviewed + byStatus.exported) / total,
    missing: entries.filter((e) => e.reconciliationStatus === "missing_tags"),
  };
}

export interface ExportRow {
  date: string;
  entity: string;
  account: string;
  chain: string;
  direction: string;
  amount: string;
  asset: string;
  counterparty: string;
  category: string;
  purpose: string;
  costCenter: string;
  txReference: string;
}

export type ExportPreset = "csv" | "erp_ready";

export function buildCsv(rows: ExportRow[]): string {
  const headers: (keyof ExportRow)[] = [
    "date",
    "entity",
    "account",
    "chain",
    "direction",
    "amount",
    "asset",
    "counterparty",
    "category",
    "purpose",
    "costCenter",
    "txReference",
  ];
  const escape = (s: string) => (s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}
