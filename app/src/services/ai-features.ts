/**
 * High-level AI feature functions. Each one builds the prompt, calls the
 * adapter, validates output through Zod where the response is structured,
 * and rate-limits to 1 in-flight call per surface to guard against demo bills.
 */
import type { AgentClient } from "./perplexity";
import { createAgentClient } from "./perplexity";
import type { Intent, LedgerEntry, Policy, Account, Counterparty } from "@/types/domain";
import { TagSuggestionSchema, PolicyDraftSchema } from "@/types/domain";
import { useStore } from "@/store";

let _client: AgentClient | null = null;

export function getClient(): AgentClient {
  const forceMock = useStore.getState().ui.forceMockAi;
  if (!_client || forceMock !== (_client instanceof Object && "isMock" in _client)) {
    _client = createAgentClient(forceMock);
  }
  return _client;
}

// Simple per-surface in-flight guard: stores the active AbortController key.
const _inflight = new Map<string, AbortController>();

function startCall(surface: string): AbortSignal {
  const prev = _inflight.get(surface);
  if (prev) prev.abort();
  const ctrl = new AbortController();
  _inflight.set(surface, ctrl);
  return ctrl.signal;
}

// ---------- 1. Intent rationale explainer ----------

export async function explainIntent(intent: Intent, accounts: Account[], policy?: Policy): Promise<string> {
  const source = accounts.find((a) => a.id === intent.sourceAccountId);
  const dest = accounts.find((a) => a.id === intent.destinationAccountId);
  const instructions = "You are a treasury operations assistant. Explain in 2-3 plain-English sentences why this treasury intent was created, what it does, and whether anything looks unusual. Use finance-first language, not crypto jargon.";
  const input = `Intent: ${intent.title}
Type: ${intent.type}
Amount: $${intent.amount.toLocaleString()} ${intent.asset}
Source: ${source?.name ?? intent.sourceAccountId}
Destination: ${dest?.name ?? intent.destinationAccountId}
Policy: ${policy?.name ?? "Manual"}
Rationale: ${intent.rationale}
Risk flags: ${intent.riskFlags.length === 0 ? "None" : intent.riskFlags.map((r) => r.kind).join(", ")}`;
  return getClient().ask({ instructions, input, signal: startCall("explain-intent-" + intent.id) });
}

// ---------- 2. Reconciliation tag suggester ----------

export async function suggestTags(
  entry: LedgerEntry,
  nearby: LedgerEntry[],
  counterparties: Counterparty[],
): Promise<ReturnType<typeof TagSuggestionSchema.safeParse>> {
  const cp = entry.counterpartyId ? counterparties.find((c) => c.id === entry.counterpartyId) : undefined;
  const instructions =
    "You are a treasury accounting assistant. Based on the ledger entry below and similar historical entries, suggest the appropriate purpose, accounting category, and cost center. Respond with a JSON object matching exactly: { purpose, accountingCategory, costCenter, counterpartyName, reasoning }. No prose outside the JSON object.";
  const input = `Entry:
  Amount: $${entry.amount.toLocaleString()} ${entry.asset}
  Direction: ${entry.direction}
  Counterparty: ${cp?.name ?? "Unknown"}
  Date: ${entry.effectiveAt}

Similar tagged entries:
${nearby.slice(0, 5).map((e) => `  - $${e.amount} | ${e.accountingCategory ?? "?"} | ${e.purpose ?? "?"}`).join("\n")}`;
  const text = await getClient().ask({ instructions, input, signal: startCall("tag-suggest-" + entry.id) });
  // Try to parse JSON from the response.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return TagSuggestionSchema.safeParse({});
  try {
    return TagSuggestionSchema.safeParse(JSON.parse(jsonMatch[0]));
  } catch {
    return TagSuggestionSchema.safeParse({});
  }
}

// ---------- 3. Policy authoring assistant ----------

export async function draftPolicy(
  naturalLanguage: string,
  accounts: Account[],
): Promise<ReturnType<typeof PolicyDraftSchema.safeParse>> {
  const accountList = accounts
    .map((a) => `  - id: "${a.id}", name: "${a.name}", type: "${a.accountType}", chain: "${a.chain}"`)
    .join("\n");
  const instructions =
    "You are a treasury policy configuration assistant. Convert the business rule into a TreasuryFlow policy JSON object. Output ONLY the JSON object — no prose, no markdown fences. The JSON must match the schema exactly. Available policy types: sweep, rebalance, payout_run, deposit_routing, cash_out.";
  const input = `Rule: ${naturalLanguage}

Available accounts:
${accountList}

Required JSON shape:
{
  "name": "string",
  "type": "sweep|rebalance|payout_run|deposit_routing|cash_out",
  "description": "string",
  "sourceAccountIds": ["<account_id>"],
  "destinationAccountIds": ["<account_id>"],
  "conditions": { "kind": "balance_above|balance_below|schedule|inbound_event|preferred_settlement_bank", ... },
  "thresholds": { "upperUsd": number, "lowerUsd": number, "keepMinUsd": number },
  "cadence": "string or omit",
  "approvalRule": { "kind": "auto-if-below|always-require|...", ... }
}`;
  const text = await getClient().ask({ instructions, input, signal: startCall("draft-policy") });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return PolicyDraftSchema.safeParse({});
  try {
    return PolicyDraftSchema.safeParse(JSON.parse(jsonMatch[0]));
  } catch {
    return PolicyDraftSchema.safeParse({});
  }
}

// ---------- 4. Month-end close summary (stubbed for v1) ----------

export async function generateCloseSummary(stats: {
  totalManaged: number;
  totalEntries: number;
  tagged: number;
  reviewed: number;
  exported: number;
  failedIntents: number;
}): Promise<string> {
  const instructions = "You are a treasury controller assistant. Write a concise 3-sentence month-end close summary for the finance team based on the statistics below.";
  const input = `Total managed: $${stats.totalManaged.toLocaleString()}
Ledger entries: ${stats.totalEntries} total — ${stats.tagged} tagged, ${stats.reviewed} reviewed, ${stats.exported} exported
Failed intents: ${stats.failedIntents}`;
  return getClient().ask({ instructions, input, signal: startCall("close-summary") });
}

// ---------- 5. Anomaly Explanation ----------
export async function explainAnomaly(intent: Intent, history: LedgerEntry[]): Promise<string> {
  const instructions = "Explain if this transaction is normal or concerning based on its details and history in 1-2 sentences.";
  const input = `Transaction: $${intent.amount} to ${intent.counterpartyId}. History count: ${history.length}.`;
  return getClient().ask({ instructions, input, signal: startCall("explain-anomaly-" + intent.id) });
}

// ---------- 6. Counterparty Risk Assessment ----------
export async function assessCounterpartyRisk(counterparty: Counterparty, intent: Intent): Promise<string> {
  const instructions = "Rate this counterparty's risk (low/medium/high). Consider: amount, timing, frequency, name, prior patterns. Explain briefly.";
  const input = `Counterparty: ${counterparty.name}. Intent amount: $${intent.amount}.`;
  return getClient().ask({ instructions, input, signal: startCall("assess-risk-" + counterparty.id) });
}

// ---------- 7. Market Shock Insight ----------
export async function generateMarketInsight(symbol: string, percent: number, rates: string): Promise<string> {
  const instructions = "Suggest a rebalancing strategy in 1-2 sentences given this market shock.";
  const input = `Market alert: ${symbol} moved ${percent}%. Current rates are ${rates}.`;
  return getClient().ask({ instructions, input, signal: startCall("market-shock") });
}

// ---------- 8. Audit Report Rationale ----------
export async function generateAuditRationale(policyDecision: any): Promise<string> {
  const instructions = "Explain why this policy fired in 1-2 sentences for an audit report.";
  const input = `Decision: ${JSON.stringify(policyDecision)}`;
  return getClient().ask({ instructions, input, signal: startCall("audit-rationale") });
}

// ---------- 9. Predictive Forecasting ----------
export async function forecastBalances(pattern: string, scheduledIntents: Intent[]): Promise<string> {
  const instructions = "Based on scheduled intents and historical patterns, forecast balances 3/5/7 days out and recommend rebalancing.";
  const input = `Pattern: ${pattern}. Scheduled: ${scheduledIntents.length}.`;
  return getClient().ask({ instructions, input, signal: startCall("forecast-balances") });
}

