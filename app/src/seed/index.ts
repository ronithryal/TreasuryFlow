/**
 * Deterministic seed for TreasuryFlow. Generated relative to a fixed seedNow
 * timestamp so demos always read "live" but balances and IDs are stable.
 */
import dayjs from "dayjs";
import type {
  Account,
  AccountId,
  AuditId,
  AuditLogEntry,
  Counterparty,
  CounterpartyId,
  Entity,
  EntityId,
  Execution,
  ExecutionId,
  Intent,
  IntentId,
  LedgerEntry,
  LedgerEntryId,
  PendingInbound,
  Policy,
  PolicyId,
  SettlementDestination,
  SettlementDestinationId,
  User,
  UserId,
} from "@/types/domain";

const SEED_NOW = "2026-04-27T14:00:00.000Z";

function offsetIso(hoursAgo: number): string {
  return dayjs(SEED_NOW).subtract(hoursAgo, "hour").toISOString();
}
function offsetIsoFwd(hoursAhead: number): string {
  return dayjs(SEED_NOW).add(hoursAhead, "hour").toISOString();
}

// ---------- Users ----------
const USER_FOUNDER: UserId = "u_founder" as UserId;
const USER_CONTROLLER: UserId = "u_controller" as UserId;
const USER_OPS: UserId = "u_ops" as UserId;
const USER_SYSTEM: UserId = "u_system" as UserId;

const users: User[] = [
  { id: USER_FOUNDER, name: "Maya Chen", role: "approver", email: "maya@acme.example" },
  { id: USER_CONTROLLER, name: "Jordan Patel", role: "controller", email: "jordan@acme.example" },
  { id: USER_OPS, name: "Sam Rivera", role: "initiator", email: "sam@acme.example" },
  { id: USER_SYSTEM, name: "TreasuryFlow", role: "viewer", email: "system@treasuryflow.app" },
];

// ---------- Entities ----------
const ENT_US: EntityId = "ent_us" as EntityId;
const ENT_NL: EntityId = "ent_nl" as EntityId;
const entities: Entity[] = [
  { id: ENT_US, name: "Acme, Inc.", jurisdiction: "United States" },
  { id: ENT_NL, name: "Acme Subsidiary B.V.", jurisdiction: "Netherlands" },
];

// ---------- Accounts ----------
const ACC_BASE_OPS: AccountId = "acc_base_ops" as AccountId;
const ACC_BASE_PAYOUTS: AccountId = "acc_base_payouts" as AccountId;
const ACC_BASE_RESERVE: AccountId = "acc_base_reserve" as AccountId;
const ACC_ETH_RESERVE: AccountId = "acc_eth_reserve" as AccountId;
const ACC_POLY_REFUNDS: AccountId = "acc_poly_refunds" as AccountId;
const ACC_COLLECT_A: AccountId = "acc_collect_a" as AccountId;
const ACC_COLLECT_B: AccountId = "acc_collect_b" as AccountId;
const ACC_USDC_CUSTODY: AccountId = "acc_usdc_custody" as AccountId;
const ACC_BANK_ACH: AccountId = "acc_bank_ach" as AccountId;
const ACC_BANK_WIRE: AccountId = "acc_bank_wire" as AccountId;

const accounts: Account[] = [
  {
    id: ACC_BASE_OPS,
    name: "Base Operating Wallet",
    accountType: "operating_wallet",
    chain: "base",
    asset: "USDC",
    entityId: ENT_US,
    balance: 186_400,
    availableBalance: 186_400,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["primary-ops"],
    lastUpdated: offsetIso(2),
    description: "Primary operational wallet for daily business expenses and vendor payments.",
    targetBand: { min: 25_000, max: 125_000 },
  },
  {
    id: ACC_BASE_PAYOUTS,
    name: "Base Payouts Wallet",
    accountType: "operating_wallet",
    chain: "base",
    asset: "USDC",
    entityId: ENT_US,
    balance: 34_200,
    availableBalance: 34_200,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["payouts"],
    lastUpdated: offsetIso(3),
    description: "Dedicated wallet for high-volume vendor payouts and contractor settlements.",
    targetBand: { min: 25_000, max: 75_000 },
  },
  {
    id: ACC_BASE_RESERVE,
    name: "Base Reserve Wallet",
    accountType: "reserve_wallet",
    chain: "base",
    asset: "USDC",
    entityId: ENT_US,
    balance: 1_210_000,
    availableBalance: 1_210_000,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["reserve"],
    lastUpdated: offsetIso(2),
    description: "Non-custodial reserve vault on Base Sepolia. Controlled via onchain policy agents.",
    address: "0x5f88f257cd264d0cfb2844debc8ea04406be8a1d" as `0x${string}`,
  },
  {
    id: ACC_ETH_RESERVE,
    name: "Ethereum Reserve Wallet",
    accountType: "reserve_wallet",
    chain: "ethereum",
    asset: "USDC",
    entityId: ENT_US,
    balance: 640_000,
    availableBalance: 640_000,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["reserve", "long-term"],
    lastUpdated: offsetIso(8),
    description: "Main treasury reserve on Ethereum Mainnet for deep liquidity and cold storage.",
  },
  {
    id: ACC_POLY_REFUNDS,
    name: "Polygon Refunds Wallet",
    accountType: "operating_wallet",
    chain: "polygon",
    asset: "USDC",
    entityId: ENT_US,
    balance: 14_800,
    availableBalance: 14_800,
    status: "low",
    settlementRail: "onchain",
    tags: ["refunds"],
    lastUpdated: offsetIso(1),
    description: "Dedicated account for payroll disbursements and contractor settlement.",
    targetBand: { min: 50_000, max: 150_000 },
  },
  {
    id: ACC_COLLECT_A,
    name: "Collection Address A · NL",
    accountType: "collection_address",
    chain: "base",
    asset: "USDC",
    entityId: ENT_NL,
    balance: 0,
    availableBalance: 0,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["customer-receipts"],
    lastUpdated: offsetIso(0.5),
    description: "Inbound collection address for EU customer receipts. Automatically swept to operating.",
  },
  {
    id: ACC_COLLECT_B,
    name: "Collection Address B · US",
    accountType: "collection_address",
    chain: "base",
    asset: "USDC",
    entityId: ENT_US,
    balance: 0,
    availableBalance: 0,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["customer-receipts"],
    lastUpdated: offsetIso(20),
    description: "Inbound collection address for US customer receipts. Monitored for AML compliance.",
  },
  {
    id: ACC_USDC_CUSTODY,
    name: "USDC Custody Account",
    accountType: "custody_account",
    chain: "ethereum",
    asset: "USDC",
    entityId: ENT_US,
    balance: 300_000,
    availableBalance: 300_000,
    status: "healthy",
    settlementRail: "onchain",
    tags: ["custody"],
    lastUpdated: offsetIso(72),
    description: "Cold storage custody account for long-term capital preservation.",
  },
  {
    id: ACC_BANK_ACH,
    name: "ACH Bank Destination",
    accountType: "bank_destination",
    chain: "bank",
    asset: "USD",
    entityId: ENT_US,
    balance: 0,
    availableBalance: 0,
    status: "healthy",
    settlementRail: "bank",
    tags: ["partner-bank"],
    lastUpdated: offsetIso(48),
    description: "Traditional bank destination for ACH settlements and payroll funding.",
  },
  {
    id: ACC_BANK_WIRE,
    name: "Wire Bank Destination · NL",
    accountType: "bank_destination",
    chain: "bank",
    asset: "USD",
    entityId: ENT_NL,
    balance: 0,
    availableBalance: 0,
    status: "healthy",
    settlementRail: "bank",
    tags: ["partner-bank", "international"],
    lastUpdated: offsetIso(120),
    description: "Offshore bank account for international wire settlements and subsidiary funding.",
  },
];

// ---------- Counterparties ----------
const CP_NORTHWIND: CounterpartyId = "cp_northwind" as CounterpartyId;
const CP_INITECH: CounterpartyId = "cp_initech" as CounterpartyId;
const CP_HARPER: CounterpartyId = "cp_harper" as CounterpartyId;
const CP_LIN_FREELANCE: CounterpartyId = "cp_lin" as CounterpartyId;
const CP_OZARK: CounterpartyId = "cp_ozark" as CounterpartyId;
const CP_ATLAS: CounterpartyId = "cp_atlas" as CounterpartyId;
const CP_NL_SUB: CounterpartyId = "cp_nl_sub" as CounterpartyId;
const CP_PARTNER_BANK: CounterpartyId = "cp_partner_bank" as CounterpartyId;

const counterparties: Counterparty[] = [
  {
    id: CP_NORTHWIND,
    name: "Northwind Logistics",
    type: "vendor",
    preferredSettlement: "digital_dollar",
    destinationDetails: { primary: "0x9a…f2c1", rail: "base_usdc" },
    tags: ["logistics"],
    normalRange: { minUsd: 4_000, maxUsd: 9_000 },
    status: "active",
    firstSeenAt: offsetIso(24 * 90),
  },
  {
    id: CP_INITECH,
    name: "Initech Cloud Services",
    type: "vendor",
    preferredSettlement: "digital_dollar",
    destinationDetails: { primary: "0x21…ab73", rail: "base_usdc" },
    tags: ["software"],
    normalRange: { minUsd: 8_000, maxUsd: 16_000 },
    status: "active",
    firstSeenAt: offsetIso(24 * 60),
  },
  {
    id: CP_HARPER,
    name: "Harper Studio",
    type: "vendor",
    preferredSettlement: "bank_cashout",
    destinationDetails: { primary: "ACH ••6271", rail: "ach" },
    tags: ["design"],
    normalRange: { minUsd: 3_000, maxUsd: 7_500 },
    status: "active",
    firstSeenAt: offsetIso(24 * 30),
  },
  {
    id: CP_LIN_FREELANCE,
    name: "Lin Wei (Freelance)",
    type: "contractor",
    preferredSettlement: "digital_dollar",
    destinationDetails: { primary: "0xab…0021", rail: "base_usdc" },
    tags: ["engineering"],
    normalRange: { minUsd: 2_500, maxUsd: 5_500 },
    status: "active",
    firstSeenAt: offsetIso(24 * 14),
  },
  {
    id: CP_OZARK,
    name: "Ozark Audit Co.",
    type: "contractor",
    preferredSettlement: "bank_cashout",
    destinationDetails: { primary: "Wire ••3344", rail: "wire" },
    tags: ["audit"],
    normalRange: { minUsd: 6_000, maxUsd: 11_000 },
    status: "active",
    // No firstSeenAt: this is a first-time counterparty.
  },
  {
    id: CP_ATLAS,
    name: "Atlas Subscriptions",
    type: "customer",
    preferredSettlement: "digital_dollar",
    destinationDetails: { primary: "0x33…f10e", rail: "base_usdc" },
    tags: ["customer"],
    status: "active",
    firstSeenAt: offsetIso(24 * 180),
  },
  {
    id: CP_NL_SUB,
    name: "Acme Subsidiary B.V.",
    type: "subsidiary",
    preferredSettlement: "digital_dollar",
    destinationDetails: { primary: "0x55…aa9b", rail: "base_usdc" },
    tags: ["intercompany"],
    status: "active",
    firstSeenAt: offsetIso(24 * 365),
  },
  {
    id: CP_PARTNER_BANK,
    name: "Bridge Bank Partner",
    type: "banking_partner",
    preferredSettlement: "bank_cashout",
    destinationDetails: { primary: "ACH/Wire bridge", rail: "wire" },
    tags: ["partner"],
    status: "active",
    firstSeenAt: offsetIso(24 * 200),
  },
];

// ---------- Settlement destinations ----------
const settlement: SettlementDestination[] = [
  { id: "sd_001" as SettlementDestinationId, type: "wallet", label: "Base USDC payouts", rail: "base_usdc", status: "active", reference: "0x9a…f2c1" },
  { id: "sd_002" as SettlementDestinationId, type: "bank_account", label: "ACH partner ••6271", rail: "ach", status: "active", reference: "ACH ••6271", counterpartyId: CP_HARPER },
  { id: "sd_003" as SettlementDestinationId, type: "bank_account", label: "Wire partner ••3344", rail: "wire", status: "active", reference: "Wire ••3344", counterpartyId: CP_OZARK },
];

// ---------- Policies ----------
const POL_SWEEP_BASE_OPS: PolicyId = "pol_sweep_ops" as PolicyId;
const POL_SWEEP_BASE_PAYOUTS: PolicyId = "pol_sweep_payouts" as PolicyId;
const POL_REBAL_POLY: PolicyId = "pol_rebal_poly" as PolicyId;
const POL_FRIDAY_PAYOUT: PolicyId = "pol_friday_payout" as PolicyId;
const POL_DEPOSIT_ROUTE: PolicyId = "pol_deposit_route" as PolicyId;
const POL_CASH_OUT: PolicyId = "pol_cash_out" as PolicyId;

const policies: Policy[] = [
  {
    id: POL_SWEEP_BASE_OPS,
    name: "Sweep Base Operating to Reserve",
    type: "sweep",
    status: "active",
    description: "Keep operating balance lean by sweeping excess to Base Reserve.",
    sourceAccountIds: [ACC_BASE_OPS],
    destinationAccountIds: [ACC_BASE_RESERVE],
    conditions: { kind: "balance_above", thresholdUsd: 125_000, keepMinUsd: 25_000 },
    thresholds: { upperUsd: 125_000, keepMinUsd: 25_000 },
    approvalRule: { kind: "auto-if-below", amountUsd: 100_000 },
    createdBy: USER_CONTROLLER,
    lastTriggeredAt: offsetIso(72),
    nextEvaluationAt: offsetIsoFwd(2),
  },
  {
    id: POL_SWEEP_BASE_PAYOUTS,
    name: "Sweep Base Payouts to Reserve",
    type: "sweep",
    status: "active",
    description: "Sweep oversized payouts wallet balance back to reserve.",
    sourceAccountIds: [ACC_BASE_PAYOUTS],
    destinationAccountIds: [ACC_BASE_RESERVE],
    conditions: { kind: "balance_above", thresholdUsd: 75_000, keepMinUsd: 25_000 },
    thresholds: { upperUsd: 75_000, keepMinUsd: 25_000 },
    approvalRule: { kind: "auto-if-below", amountUsd: 50_000 },
    createdBy: USER_CONTROLLER,
    lastTriggeredAt: offsetIso(24 * 6),
    nextEvaluationAt: offsetIsoFwd(2),
  },
  {
    id: POL_REBAL_POLY,
    name: "Rebalance Polygon Refunds",
    type: "rebalance",
    status: "active",
    description: "Maintain $25k floor on Polygon Refunds Wallet by topping up from Ethereum Reserve.",
    sourceAccountIds: [ACC_ETH_RESERVE],
    destinationAccountIds: [ACC_POLY_REFUNDS],
    conditions: { kind: "balance_below", minimumUsd: 25_000 },
    thresholds: { lowerUsd: 25_000 },
    approvalRule: { kind: "always-require", minApprovers: 1 },
    createdBy: USER_CONTROLLER,
    lastTriggeredAt: offsetIso(24 * 5),
    nextEvaluationAt: offsetIsoFwd(2),
  },
  {
    id: POL_FRIDAY_PAYOUT,
    name: "Friday Vendor & Contractor Payouts",
    type: "payout_run",
    status: "active",
    description: "Every Friday at 10:00 AM, prepare contractor and vendor payouts and hold for approval.",
    sourceAccountIds: [ACC_BASE_PAYOUTS],
    destinationAccountIds: [ACC_BASE_OPS],
    conditions: { kind: "schedule", cron: "0 10 * * 5", nextRun: offsetIsoFwd(20) },
    cadence: "Every Friday at 10:00 AM PT",
    approvalRule: {
      kind: "composite",
      allOf: [
        { kind: "always-require", minApprovers: 1 },
        { kind: "first-time-counterparty", minApprovers: 1 },
      ],
    },
    createdBy: USER_CONTROLLER,
    lastTriggeredAt: offsetIso(24 * 6),
    nextEvaluationAt: offsetIsoFwd(20),
  },
  {
    id: POL_DEPOSIT_ROUTE,
    name: "Customer Receipt Routing (90/10 split)",
    type: "deposit_routing",
    status: "active",
    description: "Inbound customer receipts are split 90% to Base Reserve, 10% to Base Operating.",
    sourceAccountIds: [ACC_COLLECT_A],
    destinationAccountIds: [ACC_BASE_RESERVE, ACC_BASE_OPS],
    conditions: { kind: "inbound_event" },
    splits: [
      { destinationAccountId: ACC_BASE_RESERVE, ratio: 0.9 },
      { destinationAccountId: ACC_BASE_OPS, ratio: 0.1 },
    ],
    approvalRule: { kind: "auto-if-below", amountUsd: 100_000 },
    createdBy: USER_CONTROLLER,
    lastTriggeredAt: offsetIso(48),
    nextEvaluationAt: offsetIsoFwd(1),
  },
  {
    id: POL_CASH_OUT,
    name: "Bank Cash-Out Routing",
    type: "cash_out",
    status: "active",
    description: "When a counterparty prefers bank settlement, route through partner cash-out flow.",
    sourceAccountIds: [ACC_BASE_PAYOUTS],
    destinationAccountIds: [ACC_BANK_ACH],
    conditions: { kind: "preferred_settlement_bank" },
    approvalRule: { kind: "cash-out-above", amountUsd: 5_000, minApprovers: 1 },
    createdBy: USER_CONTROLLER,
    nextEvaluationAt: offsetIsoFwd(20),
  },
];

// ---------- Pending inbounds ----------
const pendingInbounds: PendingInbound[] = [
  {
    id: "pi_001",
    collectionAccountId: ACC_COLLECT_A,
    amount: 42_000,
    asset: "USDC",
    chain: "base",
    fromCounterpartyId: CP_ATLAS,
    receivedAt: offsetIso(0.5),
    resolved: false,
  },
];

// ---------- Historical activity ----------
// Crafts a believable 30-day history: ~25 executed, 2 failed, 1 skipped, 1
// canceled. Roughly 40 ledger entries across categories.
function buildHistory(): { intents: Intent[]; executions: Execution[]; ledger: LedgerEntry[]; audit: AuditLogEntry[] } {
  const intents: Intent[] = [];
  const executions: Execution[] = [];
  const ledger: LedgerEntry[] = [];
  const audit: AuditLogEntry[] = [];
  let counter = 1;
  const make = (n: number) => `seed_${(counter + n).toString().padStart(3, "0")}`;

  type Spec = {
    daysAgo: number;
    type: Intent["type"];
    sourceId: AccountId;
    destId: AccountId;
    amount: number;
    counterpartyId?: CounterpartyId;
    status: Intent["status"];
    rationale: string;
    title: string;
    purpose?: string;
    accountingCategory?: string;
    costCenter?: string;
    missingTags?: boolean;
    failureReason?: string;
  };

  const specs: Spec[] = [
    { daysAgo: 0.5, type: "sweep", sourceId: ACC_BASE_OPS, destId: ACC_BASE_RESERVE, amount: 60_000, status: "executed", rationale: "Routine sweep when Base Operating crossed threshold.", title: "Sweep $60k from Base Operating → Base Reserve", purpose: "Reserve sweep", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 1.2, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 8_400, counterpartyId: CP_INITECH, status: "executed", rationale: "Friday payout to Initech.", title: "Payout to Initech Cloud Services", purpose: "Vendor payout", accountingCategory: "COGS - software", costCenter: "ENG-1" },
    { daysAgo: 1.4, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 4_200, counterpartyId: CP_HARPER, status: "executed", rationale: "Friday payout to Harper Studio.", title: "Payout to Harper Studio", purpose: "Design services", accountingCategory: "Marketing - design", costCenter: "MKT-1" },
    { daysAgo: 1.5, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 5_500, counterpartyId: CP_LIN_FREELANCE, status: "executed", rationale: "Friday payout to Lin (freelance).", title: "Payout to Lin Wei", purpose: "Engineering contractor", accountingCategory: "R&D - contract labor", costCenter: "ENG-2" },
    { daysAgo: 2, type: "rebalance", sourceId: ACC_ETH_RESERVE, destId: ACC_POLY_REFUNDS, amount: 25_000, status: "executed", rationale: "Top up Polygon refunds wallet from Ethereum reserve.", title: "Rebalance $25k → Polygon Refunds", purpose: "Liquidity rebalance", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 2.5, type: "deposit_route", sourceId: ACC_COLLECT_A, destId: ACC_BASE_RESERVE, amount: 27_000, counterpartyId: CP_ATLAS, status: "executed", rationale: "Customer receipt routed 90% to Base Reserve.", title: "Route 90% of $30k inbound to Base Reserve", purpose: "Customer receipt", accountingCategory: "Revenue - subscription", costCenter: "REV-1" },
    { daysAgo: 2.5, type: "deposit_route", sourceId: ACC_COLLECT_A, destId: ACC_BASE_OPS, amount: 3_000, counterpartyId: CP_ATLAS, status: "executed", rationale: "Customer receipt routed 10% to Base Operating.", title: "Route 10% of $30k inbound to Base Operating", purpose: "Customer receipt", accountingCategory: "Revenue - subscription", costCenter: "REV-1" },
    { daysAgo: 4, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 6_500, counterpartyId: CP_NORTHWIND, status: "executed", rationale: "Logistics payout.", title: "Payout to Northwind Logistics", missingTags: true },
    { daysAgo: 4.2, type: "cash_out", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BANK_ACH, amount: 4_900, counterpartyId: CP_HARPER, status: "executed", rationale: "Bank cash-out for vendor that prefers ACH.", title: "Cash-out via partner ACH ••6271", purpose: "Vendor payout", accountingCategory: "Marketing - design", costCenter: "MKT-1" },
    { daysAgo: 5, type: "sweep", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_RESERVE, amount: 30_000, status: "executed", rationale: "Reserve sweep from payouts wallet.", title: "Sweep $30k from Base Payouts → Base Reserve", purpose: "Reserve sweep", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 6, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 12_000, counterpartyId: CP_INITECH, status: "executed", rationale: "Quarterly software renewal.", title: "Quarterly payout to Initech", missingTags: true },
    { daysAgo: 7, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 9_200, counterpartyId: CP_NORTHWIND, status: "failed", rationale: "Initial attempt to settle Northwind invoice.", title: "Payout to Northwind", failureReason: "Destination wallet rejected — wrong network." },
    { daysAgo: 8, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 9_200, counterpartyId: CP_NORTHWIND, status: "executed", rationale: "Resubmission after destination address fix.", title: "Payout to Northwind (resubmit)", purpose: "Vendor payout", accountingCategory: "COGS - logistics", costCenter: "OPS-1" },
    { daysAgo: 9, type: "rebalance", sourceId: ACC_ETH_RESERVE, destId: ACC_BASE_OPS, amount: 80_000, status: "executed", rationale: "Manual rebalance for upcoming payouts.", title: "Move $80k Eth Reserve → Base Operating", purpose: "Liquidity rebalance", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 11, type: "cash_out", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BANK_WIRE, amount: 7_400, counterpartyId: CP_OZARK, status: "executed", rationale: "Audit firm wire payment.", title: "Wire cash-out to Ozark Audit Co.", missingTags: true },
    { daysAgo: 12, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 4_800, counterpartyId: CP_LIN_FREELANCE, status: "executed", rationale: "Sprint payout.", title: "Payout to Lin Wei", purpose: "Engineering contractor", accountingCategory: "R&D - contract labor", costCenter: "ENG-2" },
    { daysAgo: 14, type: "sweep", sourceId: ACC_BASE_OPS, destId: ACC_BASE_RESERVE, amount: 45_000, status: "executed", rationale: "Routine sweep.", title: "Sweep $45k → Base Reserve", purpose: "Reserve sweep", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 15, type: "manual_transfer", sourceId: ACC_USDC_CUSTODY, destId: ACC_ETH_RESERVE, amount: 100_000, status: "executed", rationale: "Move custody balance into reserve for operations.", title: "Move $100k Custody → Ethereum Reserve", missingTags: true },
    { daysAgo: 17, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 11_000, counterpartyId: CP_INITECH, status: "executed", rationale: "Cloud bill.", title: "Payout to Initech", purpose: "Vendor payout", accountingCategory: "COGS - software", costCenter: "ENG-1" },
    { daysAgo: 18, type: "deposit_route", sourceId: ACC_COLLECT_A, destId: ACC_BASE_RESERVE, amount: 36_000, counterpartyId: CP_ATLAS, status: "executed", rationale: "Customer receipt 90% routing.", title: "Route 90% of $40k inbound", purpose: "Customer receipt", accountingCategory: "Revenue - subscription", costCenter: "REV-1" },
    { daysAgo: 18, type: "deposit_route", sourceId: ACC_COLLECT_A, destId: ACC_BASE_OPS, amount: 4_000, counterpartyId: CP_ATLAS, status: "executed", rationale: "Customer receipt 10% routing.", title: "Route 10% of $40k inbound", purpose: "Customer receipt", accountingCategory: "Revenue - subscription", costCenter: "REV-1" },
    { daysAgo: 21, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 6_900, counterpartyId: CP_NORTHWIND, status: "executed", rationale: "Logistics payout.", title: "Payout to Northwind", purpose: "Vendor payout", accountingCategory: "COGS - logistics", costCenter: "OPS-1" },
    { daysAgo: 23, type: "rebalance", sourceId: ACC_ETH_RESERVE, destId: ACC_POLY_REFUNDS, amount: 30_000, status: "executed", rationale: "Top up Polygon refunds.", title: "Rebalance $30k → Polygon Refunds", purpose: "Liquidity rebalance", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 25, type: "cash_out", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BANK_ACH, amount: 3_500, counterpartyId: CP_HARPER, status: "skipped", rationale: "Partner returned a temporary error.", title: "Cash-out attempt to Harper", failureReason: "Partner bank rejected temporarily — will retry next batch." },
    { daysAgo: 26, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 5_300, counterpartyId: CP_LIN_FREELANCE, status: "executed", rationale: "Sprint payout.", title: "Payout to Lin Wei", missingTags: true },
    { daysAgo: 28, type: "manual_transfer", sourceId: ACC_BASE_OPS, destId: ACC_BASE_PAYOUTS, amount: 22_000, status: "executed", rationale: "Top up payouts wallet ahead of Friday batch.", title: "Top up Base Payouts Wallet", purpose: "Liquidity rebalance", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
    { daysAgo: 29, type: "payout", sourceId: ACC_BASE_PAYOUTS, destId: ACC_BASE_OPS, amount: 7_400, counterpartyId: CP_INITECH, status: "executed", rationale: "Vendor payout.", title: "Payout to Initech", purpose: "Vendor payout", accountingCategory: "COGS - software", costCenter: "ENG-1" },
    { daysAgo: 30, type: "sweep", sourceId: ACC_BASE_OPS, destId: ACC_BASE_RESERVE, amount: 50_000, status: "executed", rationale: "Routine sweep at month start.", title: "Sweep $50k → Base Reserve", purpose: "Reserve sweep", accountingCategory: "Treasury - intercompany", costCenter: "TREAS-1" },
  ];

  for (const spec of specs) {
    counter += 1;
    const intentId = make(0) as IntentId;
    counter += 1;
    const execId = make(0) as ExecutionId;
    const at = offsetIso(spec.daysAgo * 24);

    const source = accounts.find((a) => a.id === spec.sourceId)!;
    const dest = accounts.find((a) => a.id === spec.destId)!;

    const intent: Intent = {
      id: intentId,
      type: spec.type,
      title: spec.title,
      description: spec.rationale,
      sourceAccountId: spec.sourceId,
      destinationAccountId: spec.destId,
      amount: spec.amount,
      asset: source.asset,
      chain: source.chain,
      entityId: source.entityId,
      status: spec.status,
      rationale: spec.rationale,
      riskFlags: [],
      requestedBy: USER_OPS,
      counterpartyId: spec.counterpartyId,
      approvals: spec.status === "executed" || spec.status === "skipped" || spec.status === "failed"
        ? [
            {
              id: ("aud_" + intentId) as AuditId,
              approver: USER_FOUNDER,
              decision: "approve",
              at,
            },
          ]
        : [],
      snapshotAt: at,
      sourceBalanceAtSnapshot: source.balance,
      destinationBalanceAtSnapshot: dest.balance,
      createdAt: at,
      approvedAt: at,
      executedAt: spec.status === "executed" ? at : undefined,
      failureReason: spec.failureReason,
      resolutionNote: spec.status === "skipped" ? spec.failureReason : undefined,
    };
    intents.push(intent);

    const exec: Execution = {
      id: execId,
      intentId,
      executionType:
        spec.status === "failed" ? "failed" : spec.status === "skipped" ? "skipped" : "completed",
      resultSummary: spec.failureReason ?? "Settled.",
      txReference: spec.status === "executed" ? `0x${intentId}` : undefined,
      failureReason: spec.failureReason,
      startedAt: at,
      completedAt: at,
    };
    executions.push(exec);

    if (spec.status === "executed") {
      counter += 1;
      const outId = make(0) as LedgerEntryId;
      counter += 1;
      const inId = make(0) as LedgerEntryId;
      const tagBase = spec.purpose ? ["category:" + (spec.accountingCategory ?? "uncategorized")] : [];
      const reconciliationStatus = spec.missingTags ? "missing_tags" : "tagged";
      const isInternal =
        source.entityId === dest.entityId &&
        source.accountType !== "bank_destination" &&
        dest.accountType !== "bank_destination";
      ledger.push({
        id: outId,
        intentId,
        executionId: execId,
        entityId: source.entityId,
        accountId: source.id,
        chain: source.chain,
        asset: source.asset,
        amount: spec.amount,
        direction: isInternal ? "internal" : "outflow",
        accountingCategory: spec.missingTags ? undefined : spec.accountingCategory,
        purpose: spec.missingTags ? undefined : spec.purpose,
        costCenter: spec.missingTags ? undefined : spec.costCenter,
        counterpartyId: spec.counterpartyId,
        tags: tagBase,
        approvalTrace: intent.approvals,
        effectiveAt: at,
        reconciliationStatus,
        txReference: exec.txReference,
        linkedEntryId: inId,
      });
      ledger.push({
        id: inId,
        intentId,
        executionId: execId,
        entityId: dest.entityId,
        accountId: dest.id,
        chain: dest.chain,
        asset: dest.asset,
        amount: spec.amount,
        direction: isInternal ? "internal" : "inflow",
        accountingCategory: spec.missingTags ? undefined : spec.accountingCategory,
        purpose: spec.missingTags ? undefined : spec.purpose,
        costCenter: spec.missingTags ? undefined : spec.costCenter,
        counterpartyId: spec.counterpartyId,
        tags: tagBase,
        approvalTrace: intent.approvals,
        effectiveAt: at,
        reconciliationStatus,
        txReference: exec.txReference,
        linkedEntryId: outId,
      });
    }

    counter += 1;
    audit.push({
      id: make(0) as AuditId,
      at,
      actor: USER_SYSTEM,
      event: spec.status === "executed"
        ? { kind: "intent_executed", intentId, executionId: execId }
        : spec.status === "failed"
          ? { kind: "intent_failed", intentId, reason: spec.failureReason ?? "unknown" }
          : { kind: "intent_skipped", intentId, reason: spec.failureReason ?? "unknown" },
    });
  }

  return { intents, executions, ledger, audit };
}

const history = buildHistory();

// ---------- Pending intents (in queue at seed time) ----------
function buildPending(): Intent[] {
  const at = offsetIso(2);
  const baseSource = accounts.find((a) => a.id === ACC_BASE_PAYOUTS)!;
  const baseOps = accounts.find((a) => a.id === ACC_BASE_OPS)!;
  const polyTarget = accounts.find((a) => a.id === ACC_POLY_REFUNDS)!;
  const ethReserve = accounts.find((a) => a.id === ACC_ETH_RESERVE)!;

  return [
    {
      id: "int_pend_001" as IntentId,
      policyId: POL_FRIDAY_PAYOUT,
      type: "cash_out",
      title: "Bank cash-out to Ozark Audit Co.",
      description: "First-time counterparty bank cash-out — flagged for review.",
      sourceAccountId: ACC_BASE_PAYOUTS,
      destinationAccountId: ACC_BANK_WIRE,
      amount: 9_500,
      asset: "USDC",
      chain: "base",
      entityId: ENT_US,
      status: "pending_approval",
      rationale: "Friday payout run included a bank cash-out for a new counterparty (Ozark Audit Co.) above the cash-out approval threshold.",
      riskFlags: [
        { kind: "first_time_counterparty" },
        { kind: "cash_out_high_value", threshold: 5_000 },
      ],
      requestedBy: USER_OPS,
      counterpartyId: CP_OZARK,
      approvals: [],
      snapshotAt: at,
      sourceBalanceAtSnapshot: baseSource.balance,
      destinationBalanceAtSnapshot: 0,
      createdAt: at,
    },
    {
      id: "int_pend_002" as IntentId,
      policyId: POL_REBAL_POLY,
      type: "rebalance",
      title: "Rebalance Polygon Refunds Wallet",
      description: "Polygon Refunds at $14.8k — below $25k floor.",
      sourceAccountId: ACC_ETH_RESERVE,
      destinationAccountId: ACC_POLY_REFUNDS,
      amount: 10_200,
      asset: "USDC",
      chain: "ethereum",
      entityId: ENT_US,
      status: "pending_approval",
      rationale: "Rebalance policy fired: Polygon Refunds Wallet balance fell below $25k minimum. Refilling from Ethereum Reserve.",
      riskFlags: [],
      requestedBy: USER_SYSTEM,
      approvals: [],
      snapshotAt: at,
      sourceBalanceAtSnapshot: ethReserve.balance,
      destinationBalanceAtSnapshot: polyTarget.balance,
      createdAt: at,
    },
    {
      id: "int_pend_003" as IntentId,
      policyId: POL_SWEEP_BASE_OPS,
      type: "sweep",
      title: "Sweep excess from Base Operating",
      description: "Base Operating $186.4k — over $125k threshold.",
      sourceAccountId: ACC_BASE_OPS,
      destinationAccountId: ACC_BASE_RESERVE,
      amount: 161_400,
      asset: "USDC",
      chain: "base",
      entityId: ENT_US,
      status: "pending_approval",
      rationale: "Sweep policy fired: Base Operating Wallet exceeded $125k threshold. Sweeping excess to Base Reserve while keeping $25k.",
      riskFlags: [],
      requestedBy: USER_SYSTEM,
      approvals: [],
      snapshotAt: at,
      sourceBalanceAtSnapshot: baseOps.balance,
      destinationBalanceAtSnapshot: 1_210_000,
      createdAt: at,
    },
    {
      id: "int_pend_004" as IntentId,
      policyId: POL_FRIDAY_PAYOUT,
      type: "payout",
      title: "Friday batch — 4 vendor payouts ready",
      description: "Friday payout run prepared.",
      sourceAccountId: ACC_BASE_PAYOUTS,
      destinationAccountId: ACC_BASE_OPS,
      amount: 26_400,
      asset: "USDC",
      chain: "base",
      entityId: ENT_US,
      status: "pending_approval",
      rationale: "Friday batch summary: 4 digital-dollar payouts totaling $26.4k.",
      riskFlags: [],
      requestedBy: USER_OPS,
      approvals: [],
      snapshotAt: at,
      sourceBalanceAtSnapshot: baseSource.balance,
      destinationBalanceAtSnapshot: baseOps.balance,
      createdAt: at,
      batchId: "batch_friday_seed",
    },
    {
      id: "int_pend_005" as IntentId,
      policyId: POL_FRIDAY_PAYOUT,
      type: "payout",
      title: "Payout to Northwind — flagged amount",
      description: "Amount exceeds normal range for this counterparty.",
      sourceAccountId: ACC_BASE_PAYOUTS,
      destinationAccountId: ACC_BASE_OPS,
      amount: 14_400,
      asset: "USDC",
      chain: "base",
      entityId: ENT_US,
      status: "pending_approval",
      rationale: "Payout request to Northwind Logistics is 60% above the counterparty's typical max ($9,000). Manual review required before release.",
      riskFlags: [{ kind: "amount_above_normal_range", observed: 14_400, max: 9_000 }],
      requestedBy: USER_OPS,
      counterpartyId: CP_NORTHWIND,
      approvals: [],
      snapshotAt: at,
      sourceBalanceAtSnapshot: baseSource.balance,
      destinationBalanceAtSnapshot: baseOps.balance,
      createdAt: at,
      batchId: "batch_friday_seed",
    },
  ];
}

export interface SeedBundle {
  now: string;
  users: User[];
  currentUserId: UserId;
  entities: Entity[];
  accounts: Account[];
  counterparties: Counterparty[];
  policies: Policy[];
  settlement: SettlementDestination[];
  pendingInbounds: PendingInbound[];
  intents: Intent[];
  executions: Execution[];
  ledger: LedgerEntry[];
  audit: AuditLogEntry[];
}

export function buildSeed(): SeedBundle {
  const pending = buildPending();
  return {
    now: SEED_NOW,
    users,
    currentUserId: USER_FOUNDER,
    entities,
    accounts,
    counterparties,
    policies,
    settlement,
    pendingInbounds,
    intents: [...history.intents, ...pending],
    executions: history.executions,
    ledger: history.ledger,
    audit: history.audit,
  };
}

export const SEED = buildSeed();
