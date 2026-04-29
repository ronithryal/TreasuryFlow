/**
 * Domain types for TreasuryFlow. Mirrors the spec one-to-one. Branded IDs
 * prevent passing a PolicyId where an AccountId is expected. Discriminated
 * unions on `type`/`status` keep the policy engine and lifecycle exhaustive.
 *
 * Intent lifecycle:
 *
 *   proposed → pending_approval → approved → scheduled → executing → executed
 *      └────────→ rejected     └─→ canceled    └─→ canceled    └─→ failed
 *      └────────→ canceled                                     └─→ skipped
 */
import { z } from "zod";

// ---------- Branded ID types ----------
type Brand<K, T extends string> = K & { __brand: T };
export type EntityId = Brand<string, "EntityId">;
export type AccountId = Brand<string, "AccountId">;
export type PolicyId = Brand<string, "PolicyId">;
export type IntentId = Brand<string, "IntentId">;
export type ExecutionId = Brand<string, "ExecutionId">;
export type CounterpartyId = Brand<string, "CounterpartyId">;
export type SettlementDestinationId = Brand<string, "SettlementDestinationId">;
export type LedgerEntryId = Brand<string, "LedgerEntryId">;
export type UserId = Brand<string, "UserId">;
export type AuditId = Brand<string, "AuditId">;

// ---------- Enums ----------
export const Chains = ["base", "ethereum", "polygon", "bank", "none"] as const;
export type Chain = (typeof Chains)[number];

export const Assets = ["USDC", "USD"] as const;
export type Asset = (typeof Assets)[number];

export const AccountTypes = [
  "reserve_wallet",
  "operating_wallet",
  "custody_account",
  "exchange_balance",
  "bank_destination",
  "collection_address",
] as const;
export type AccountType = (typeof AccountTypes)[number];

export const SettlementRails = ["onchain", "bank"] as const;
export type SettlementRail = (typeof SettlementRails)[number];

export const AccountStatuses = ["healthy", "low", "breached", "inactive"] as const;
export type AccountStatus = (typeof AccountStatuses)[number];

export const PolicyTypes = [
  "sweep",
  "rebalance",
  "payout_run",
  "deposit_routing",
  "cash_out",
] as const;
export type PolicyType = (typeof PolicyTypes)[number];

export const PolicyStatuses = ["active", "paused", "breached", "draft"] as const;
export type PolicyStatus = (typeof PolicyStatuses)[number];

export const IntentTypes = [
  "sweep",
  "rebalance",
  "payout",
  "deposit_route",
  "cash_out",
  "manual_transfer",
] as const;
export type IntentType = (typeof IntentTypes)[number];

export const IntentStatuses = [
  "proposed",
  "pending_approval",
  "approved",
  "rejected",
  "scheduled",
  "executing",
  "executed",
  "failed",
  "skipped",
  "canceled",
] as const;
export type IntentStatus = (typeof IntentStatuses)[number];

export const ExecutionTypes = ["simulated", "partner_pending", "completed", "failed", "skipped"] as const;
export type ExecutionType = (typeof ExecutionTypes)[number];

export const ExecutionModes = ["wallet_live", "server_signed_demo", "simulated_demo"] as const;
export type ExecutionMode = (typeof ExecutionModes)[number];

export const CounterpartyTypes = [
  "vendor",
  "contractor",
  "customer",
  "subsidiary",
  "banking_partner",
] as const;
export type CounterpartyType = (typeof CounterpartyTypes)[number];

export const PreferredSettlements = ["digital_dollar", "bank_cashout"] as const;
export type PreferredSettlement = (typeof PreferredSettlements)[number];

export const LedgerDirections = ["inflow", "outflow", "internal"] as const;
export type LedgerDirection = (typeof LedgerDirections)[number];

export const ReconciliationStatuses = ["tagged", "missing_tags", "reviewed", "exported"] as const;
export type ReconciliationStatus = (typeof ReconciliationStatuses)[number];

export const SettlementTypes = ["wallet", "bank_account"] as const;
export type SettlementType = (typeof SettlementTypes)[number];

export const SettlementRailKinds = ["base_usdc", "ethereum_usdc", "polygon_usdc", "ach", "wire"] as const;
export type SettlementRailKind = (typeof SettlementRailKinds)[number];

// ---------- Approval rule DSL ----------
export type ApprovalRule =
  | { kind: "auto-if-below"; amountUsd: number }
  | { kind: "always-require"; minApprovers: number }
  | { kind: "first-time-counterparty"; minApprovers: number }
  | { kind: "cash-out-above"; amountUsd: number; minApprovers: number }
  | { kind: "composite"; allOf: ApprovalRule[] };

// ---------- Risk flags ----------
export type RiskFlag =
  | { kind: "amount_above_normal_range"; observed: number; max: number }
  | { kind: "first_time_counterparty" }
  | { kind: "low_source_balance" }
  | { kind: "stale_snapshot" }
  | { kind: "cash_out_high_value"; threshold: number };

// ---------- Entities ----------
export interface Entity {
  id: EntityId;
  name: string;
  jurisdiction: string;
}

export interface Account {
  id: AccountId;
  name: string;
  accountType: AccountType;
  chain: Chain;
  asset: Asset;
  entityId: EntityId;
  balance: number;
  availableBalance: number;
  status: AccountStatus;
  settlementRail: SettlementRail;
  tags: string[];
  lastUpdated: string;
  /** The onchain address for this wallet (if applicable) */
  address?: `0x${string}`;
  /** Purpose/Description of the wallet */
  description?: string;
  /** Optional per-account band used by liquidity health visuals. */
  targetBand?: { min: number; max: number };
}

export type PolicyConditions =
  | { kind: "balance_above"; thresholdUsd: number; keepMinUsd: number }
  | { kind: "balance_below"; minimumUsd: number }
  | { kind: "schedule"; cron: string; nextRun: string }
  | { kind: "inbound_event"; pendingEventId?: string }
  | { kind: "preferred_settlement_bank" };

export interface Policy {
  id: PolicyId;
  name: string;
  type: PolicyType;
  status: PolicyStatus;
  description: string;
  sourceAccountIds: AccountId[];
  destinationAccountIds: AccountId[];
  conditions: PolicyConditions;
  thresholds?: { upperUsd?: number; lowerUsd?: number; keepMinUsd?: number };
  /** For deposit_routing — splits sum to 1.0. */
  splits?: { destinationAccountId: AccountId; ratio: number }[];
  cadence?: string;
  approvalRule: ApprovalRule;
  createdBy: UserId;
  lastTriggeredAt?: string;
  nextEvaluationAt?: string;
}

export interface Intent {
  id: IntentId;
  policyId?: PolicyId;
  type: IntentType;
  title: string;
  description: string;
  sourceAccountId: AccountId;
  destinationAccountId: AccountId;
  amount: number;
  asset: Asset;
  chain: Chain;
  entityId: EntityId;
  status: IntentStatus;
  rationale: string;
  riskFlags: RiskFlag[];
  requestedBy: UserId;
  counterpartyId?: CounterpartyId;
  /** Append-only decision history. */
  approvals: ApprovalDecision[];
  /** When the source/destination snapshot was taken. */
  snapshotAt: string;
  sourceBalanceAtSnapshot: number;
  destinationBalanceAtSnapshot: number;
  /** Used for batch grouping (Friday payout). Optional. */
  batchId?: string;
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
  failureReason?: string;
  /** Set when status === 'skipped'/'canceled' with explanation. */
  resolutionNote?: string;
}

export interface ApprovalDecision {
  id: AuditId;
  approver: UserId;
  decision: "approve" | "reject" | "request_changes";
  comment?: string;
  at: string;
}

export interface Execution {
  id: ExecutionId;
  intentId: IntentId;
  executionType: ExecutionType;
  executionMode?: ExecutionMode;
  resultSummary: string;
  txReference?: string;
  failureReason?: string;
  startedAt: string;
  completedAt?: string;
}

/** Bank account details for ACH/wire counterparties. Displayed in approval UI and audit trail. */
export interface BankDetails {
  bankName: string;
  routingDisplay: string;
  accountNumberDisplay: string;
  accountType: "checking" | "savings";
  settlementEta: string;
  estimatedFeeUsd: number;
  returnsNote?: string;
  accountingTreatment?: string;
}

export interface Counterparty {
  id: CounterpartyId;
  name: string;
  type: CounterpartyType;
  preferredSettlement: PreferredSettlement;
  destinationDetails: { primary: string; rail: SettlementRailKind };
  tags: string[];
  /** Used by payout_run to flag amounts that look abnormal. */
  normalRange?: { minUsd: number; maxUsd: number };
  status: "active" | "inactive";
  /** First-seen timestamp. If the system has never paid this counterparty,
      first-time-counterparty rule applies on the next intent. */
  firstSeenAt?: string;
  /** Bank settlement details for ACH/wire counterparties. */
  bankDetails?: BankDetails;
}

export interface LedgerEntry {
  id: LedgerEntryId;
  intentId: IntentId;
  executionId: ExecutionId;
  entityId: EntityId;
  accountId: AccountId;
  chain: Chain;
  asset: Asset;
  amount: number;
  direction: LedgerDirection;
  accountingCategory?: string;
  purpose?: string;
  costCenter?: string;
  counterpartyId?: CounterpartyId;
  tags: string[];
  approvalTrace: ApprovalDecision[];
  effectiveAt: string;
  reconciliationStatus: ReconciliationStatus;
  reconciliationNote?: string;
  /** Mock onchain or bank reference. */
  txReference?: string;
  /** Internal-pair link: outflow.linkedEntryId === inflow.id */
  linkedEntryId?: LedgerEntryId;
  exportedAt?: string;
}

export interface SettlementDestination {
  id: SettlementDestinationId;
  type: SettlementType;
  label: string;
  counterpartyId?: CounterpartyId;
  rail: SettlementRailKind;
  status: "active" | "inactive";
  /** Mocked instrument identifier (e.g. last-4 for ACH, address for wallet). */
  reference: string;
}

export interface User {
  id: UserId;
  name: string;
  role: "initiator" | "approver" | "controller" | "viewer";
  email: string;
}

export type AuditEvent =
  | { kind: "policy_evaluated"; policyId: PolicyId; intentsCreated: IntentId[] }
  | { kind: "intent_created"; intentId: IntentId; sourcePolicyId?: PolicyId; manual?: boolean }
  | { kind: "intent_decision"; intentId: IntentId; decision: ApprovalDecision }
  | { kind: "intent_executed"; intentId: IntentId; executionId: ExecutionId }
  | { kind: "intent_failed"; intentId: IntentId; reason: string }
  | { kind: "intent_skipped"; intentId: IntentId; reason: string }
  | { kind: "ledger_posted"; entryIds: LedgerEntryId[]; intentId: IntentId }
  | { kind: "reconciliation_reviewed"; entryIds: LedgerEntryId[] }
  | { kind: "reconciliation_exported"; entryIds: LedgerEntryId[]; preset: string }
  | { kind: "demo_reset" }
  | { kind: "scenario_triggered"; scenario: string }
  | { kind: "canonical_demo_run"; intentId: IntentId; executionId: ExecutionId; mode: ExecutionMode };

export interface AuditLogEntry {
  id: AuditId;
  at: string;
  actor: UserId;
  event: AuditEvent;
}

export interface PendingInbound {
  id: string;
  collectionAccountId: AccountId;
  amount: number;
  asset: Asset;
  chain: Chain;
  fromCounterpartyId?: CounterpartyId;
  receivedAt: string;
  resolved: boolean;
}

// ---------- Aggregate world snapshot used by domain functions ----------
export interface WorldSnapshot {
  now: string;
  entities: Entity[];
  accounts: Account[];
  counterparties: Counterparty[];
  intents: Intent[];
  executions: Execution[];
  ledger: LedgerEntry[];
  policies: Policy[];
  settlement: SettlementDestination[];
  pendingInbounds: PendingInbound[];
  users: User[];
}

// ---------- Zod schemas for runtime validation (used by AI surfaces) ----------

export const ExplanationSchema = z.object({
  rationale: z.string().min(1).describe("The generated explanation or rationale for the request in plain English."),
  confidence: z.enum(["high", "medium", "low"]).optional().describe("Confidence level of the explanation."),
  flagged: z.boolean().optional().describe("Whether the request seems unusually risky or anomalous based on context."),
});
export type ExplanationPayload = z.infer<typeof ExplanationSchema>;

export const PolicyDraftSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(PolicyTypes),
  description: z.string(),
  sourceAccountIds: z.array(z.string()).min(1),
  destinationAccountIds: z.array(z.string()).min(1),
  conditions: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("balance_above"), thresholdUsd: z.number().positive(), keepMinUsd: z.number().nonnegative() }),
    z.object({ kind: z.literal("balance_below"), minimumUsd: z.number().positive() }),
    z.object({ kind: z.literal("schedule"), cron: z.string(), nextRun: z.string() }),
    z.object({ kind: z.literal("inbound_event"), pendingEventId: z.string().optional() }),
    z.object({ kind: z.literal("preferred_settlement_bank") }),
  ]),
  thresholds: z
    .object({ upperUsd: z.number().optional(), lowerUsd: z.number().optional(), keepMinUsd: z.number().optional() })
    .optional(),
  cadence: z.string().optional(),
  approvalRule: z
    .object({ kind: z.literal("auto-if-below"), amountUsd: z.number().positive() })
    .or(z.object({ kind: z.literal("always-require"), minApprovers: z.number().int().positive() }))
    .or(z.object({ kind: z.literal("first-time-counterparty"), minApprovers: z.number().int().positive() }))
    .or(z.object({ kind: z.literal("cash-out-above"), amountUsd: z.number().positive(), minApprovers: z.number().int().positive() })),
});
export type PolicyDraft = z.infer<typeof PolicyDraftSchema>;

export const TagSuggestionSchema = z.object({
  purpose: z.string().min(1),
  accountingCategory: z.string().min(1),
  costCenter: z.string().optional(),
  counterpartyName: z.string().optional(),
  reasoning: z.string().min(1),
});
export type TagSuggestion = z.infer<typeof TagSuggestionSchema>;
