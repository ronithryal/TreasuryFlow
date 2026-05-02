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
  | { kind: "reconciliation_exported"; entryIds: LedgerEntryId[]; preset: string; overrideNote?: string }
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

// =============================================================================
// TF-001 — New domain model types (Plan 1)
// =============================================================================

// ---------- Branded IDs (new) ----------
export type TreasuryWalletId = Brand<string, "TreasuryWalletId">;
export type BalanceSnapshotId = Brand<string, "BalanceSnapshotId">;
export type ExposureId = Brand<string, "ExposureId">;
export type ActionProposalId = Brand<string, "ActionProposalId">;
export type ExecutionPlanId = Brand<string, "ExecutionPlanId">;
export type ExecutionStepId = Brand<string, "ExecutionStepId">;
export type ExecutionRecordId = Brand<string, "ExecutionRecordId">;

// ---------- TreasuryWallet ----------
export const TreasuryWalletTypes = ["EMBEDDED", "EXTERNAL", "DEMO"] as const;
export type TreasuryWalletType = (typeof TreasuryWalletTypes)[number];

export const TreasuryModes = ["DEMO", "PRODUCTION"] as const;
export type TreasuryMode = (typeof TreasuryModes)[number];

export interface TreasuryWallet {
  id: TreasuryWalletId;
  /** EMBEDDED = CDP Embedded Wallet; EXTERNAL = WalletConnect; DEMO = seeded test wallet */
  type: TreasuryWalletType;
  /** DEMO caps outflows and targets testnet; PRODUCTION targets mainnet */
  mode: TreasuryMode;
  chain: string;
  network: string;
  /** All onchain addresses associated with this wallet */
  addresses: string[];
  label: string;
  /** e.g. "cdp", "walletconnect", "fireblocks", "bitgo" */
  custodian?: string;
  maxDailyOutflowUsd?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ---------- BalanceSnapshot ----------
export const BalanceSnapshotSources = ["onchain", "cdp", "custody", "manual"] as const;
export type BalanceSnapshotSource = (typeof BalanceSnapshotSources)[number];

export interface BalanceSnapshot {
  id: BalanceSnapshotId;
  walletId: TreasuryWalletId;
  chain: string;
  asset: string;
  balance: number;
  balanceUsd: number;
  snapshotAt: string;
  source: BalanceSnapshotSource;
}

// ---------- Exposure ----------
export const ExposureRiskLevels = ["LOW", "MEDIUM", "HIGH"] as const;
export type ExposureRiskLevel = (typeof ExposureRiskLevels)[number];

export interface Exposure {
  id: ExposureId;
  portfolioId: string;
  asset: string;
  chain?: string;
  counterparty?: string;
  /** Stablecoin issuer for concentration tracking (e.g. "circle", "tether") */
  issuer?: string;
  amountUsd: number;
  /** Fraction of total portfolio value (0–1) */
  pct: number;
  concentrationRisk: ExposureRiskLevel;
  computedAt: string;
}

// ---------- ActionProposal ----------
export const ActionProposalTypes = [
  "REBALANCE",
  "FX_HEDGE",
  "FUNDING",
  "PAYMENT",
  "YIELD_SHIFT",
] as const;
export type ActionProposalType = (typeof ActionProposalTypes)[number];

export const ActionProposalStatuses = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "EXECUTED_PARTIAL",
  "EXECUTED_FULL",
] as const;
export type ActionProposalStatus = (typeof ActionProposalStatuses)[number];

export const ProposalPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export type ProposalPriority = (typeof ProposalPriorities)[number];

export interface PolicyCheckResult {
  policyId: string;
  result: "PASS" | "WARN" | "FAIL";
  messages?: string[];
}

export interface ActionProposal {
  id: ActionProposalId;
  version: number;
  createdAt: string;
  /** "hermes" or "user:<id>" */
  createdBy: string;
  type: ActionProposalType;
  status: ActionProposalStatus;
  portfolioId: string;
  priority: ProposalPriority;
  mode: TreasuryMode;
  inputs: {
    source: {
      walletIds?: string[];
      currencies?: string[];
      chains?: string[];
      [key: string]: unknown;
    };
    target: {
      targetAllocations?: Array<{
        asset: string;
        targetPct: number;
        minPct?: number;
        maxPct?: number;
      }>;
      minLiquidityBufferUsd?: number;
      hedgeHorizonDays?: number;
      [key: string]: unknown;
    };
    constraints?: {
      maxSlippageBps?: number;
      maxNotionalUsd?: number;
      allowedVenues?: string[];
      disallowedVenues?: string[];
      [key: string]: unknown;
    };
  };
  expectedImpact: {
    beforeExposure?: Record<string, unknown>;
    afterExposure?: Record<string, unknown>;
    estimatedPnlUsd?: number;
    feeEstimateUsd?: number;
    /** 0–1 */
    riskScore?: number;
  };
  policyChecks?: PolicyCheckResult[];
  rationale: {
    summary: string;
    details?: string;
    marketContextId?: string;
  };
  linkedExecutionPlanId?: string;
  metadata?: Record<string, unknown>;
}

// ---------- ExecutionPlan / ExecutionStep ----------
export const ExecutionPlanStatuses = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type ExecutionPlanStatus = (typeof ExecutionPlanStatuses)[number];

export const ExecutionStepTypes = [
  "QUOTE",
  "SWAP",
  "TRANSFER",
  "ONRAMP",
  "OFFRAMP",
  "APPROVAL",
  "LEDGER_WRITE",
  "NOOP",
] as const;
export type ExecutionStepType = (typeof ExecutionStepTypes)[number];

export const ExecutionStepStatuses = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
] as const;
export type ExecutionStepStatus = (typeof ExecutionStepStatuses)[number];

export const ToolKinds = ["OPENCLAW_SKILL", "INTERNAL_API"] as const;
export type ToolKind = (typeof ToolKinds)[number];

export interface ExecutionStep {
  id: ExecutionStepId;
  index: number;
  /** IDs of steps that must complete before this one runs */
  dependsOn?: string[];
  type: ExecutionStepType;
  status: ExecutionStepStatus;
  tool: { kind: ToolKind; name: string };
  params: Record<string, unknown>;
  expectedOutcome?: {
    maxSlippageBps?: number;
    minReceiveAmount?: string;
    maxFeeUsd?: number;
    [key: string]: unknown;
  };
  result?: {
    raw?: Record<string, unknown>;
    txHash?: string;
    quoteId?: string;
  };
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
}

export interface ExecutionPlan {
  id: ExecutionPlanId;
  version: number;
  createdAt: string;
  createdBy: string;
  proposalId: string;
  status: ExecutionPlanStatus;
  mode: TreasuryMode;
  steps: ExecutionStep[];
  summary?: {
    estimatedFeeUsd?: number;
    estimatedPnlUsd?: number;
    chainsInvolved?: string[];
    walletsInvolved?: string[];
  };
  metadata?: Record<string, unknown>;
}

// ---------- ExecutionRecord ----------
export interface ExecutionRecord {
  id: ExecutionRecordId;
  planId: ExecutionPlanId;
  stepId: ExecutionStepId;
  walletId: TreasuryWalletId;
  chain: string;
  asset: string;
  amount?: number;
  amountUsd?: number;
  txHash?: string;
  quoteId?: string;
  status: ExecutionStepStatus;
  mode: TreasuryMode;
  raw?: Record<string, unknown>;
  error?: string;
  executedAt: string;
}

// ---------- MarketContext (TF-007) ----------
export type MarketContextId = Brand<string, "MarketContextId">;

export interface MarketContext {
  marketContextId: MarketContextId;
  portfolioId: string;
  /** 1–2 sentence narrative for CFO audience */
  summary: string;
  /** Key risk factors (3–5 items) */
  riskFactors: string[];
  /** Liquidity observations (2–4 items) */
  liquidityNotes: string[];
  timestamp: string;
}
