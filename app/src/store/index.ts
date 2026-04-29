/**
 * Root Zustand store. Single store, slice-per-domain pattern. All side-effectful
 * actions go through here. Pure domain logic lives in src/domain.
 *
 * Persistence:
 *   - localStorage key: 'treasuryflow:v1'
 *   - Versioned schema; bump bumps clear stale state.
 *   - Reset button in Settings calls resetToSeed().
 */
import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import dayjs from "dayjs";
import type {
  Account,
  AccountId,
  ApprovalDecision,
  ApprovalRule,
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
  PolicyDraft,
  ReconciliationStatus,
  SettlementDestination,
  User,
  UserId,
} from "@/types/domain";
import { SEED, type SeedBundle } from "@/seed";
import { evaluatePolicy } from "@/domain/policy-engine";
import { applyDecision, resolveApprovalRule } from "@/domain/approvals";
import { executeIntent } from "@/domain/execution";
import { runtimeId } from "@/domain/ids";

const SCHEMA_VERSION = 2;
const STORAGE_KEY = "treasuryflow:v2";

interface UiState {
  forceMockAi: boolean;
  darkMode: boolean;
  demoEntered: boolean;
}

/**
 * Testnet-only state. Lives next to the mock world so the UI can render the
 * same components either way: when VITE_APP_MODE=testnet, hooks read the
 * connected wallet/balance/executions from here instead of the seed data.
 */
export interface TestnetExecution {
  /** App-layer intent ID (from Zustand seed). */
  intentId: string;
  policyId?: string;
  /** Human-readable policy name, if resolved. */
  policyName?: string;
  amount: number;
  destination: string;
  action: string;
  /** Deprecated: use executionTxHash. Kept for backward compat. */
  txHash: string;
  blockNumber?: number;
  at: string;
  // ── P0 golden path fields ─────────────────────────────────────────────────
  /** The onchain intentId returned from IntentRegistry.createIntent (BigInt serialized as decimal string). */
  onchainIntentId?: string;
  /** The address that created the intent. */
  initiator?: string;
  /** The address that approved the intent (demo signer). */
  approver?: string;
  /** Tx hash of IntentRegistry.approveIntent. */
  approvalTxHash?: string;
  /** Tx hash of IntentRegistry.executeIntent (canonical audit hash). */
  executionTxHash?: string;
  /** Tx hash of MockUSDC.approve. */
  approveTxHash?: string;
}

export interface TestnetState {
  connectedAddress: string | null;
  /** Native ETH balance in human units. */
  ethBalance: number;
  /** Mock USDC balance in human units (6-decimal token). */
  usdcBalance: number;
  hydrated: boolean;
  executions: TestnetExecution[];
}

export interface CanonicalDemoState {
  completed: boolean;
  intentId?: IntentId;
  executionId?: ExecutionId;
  completedAt?: string;
}

export interface RootState {
  schemaVersion: number;
  // ----- Data -----
  now: string;
  users: User[];
  currentUserId: UserId;
  // Walkthrough state
  walkthroughActive: boolean;
  activeScenario: string | null;
  currentStep: number;
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
  ui: UiState;
  testnet: TestnetState;
  canonicalDemoState: CanonicalDemoState;

  // ----- Actions -----
  resetToSeed: () => void;
  /** Bind the connected wallet to the demo's "Base Operating" account. */
  hydrateTestnet: (address: string) => void;
  setTestnetBalances: (balances: { eth?: number; usdc?: number }) => void;
  recordTestnetExecution: (e: TestnetExecution) => void;
  clearTestnet: () => void;
  setCurrentUser: (id: UserId) => void;
  setForceMockAi: (v: boolean) => void;
  setDarkMode: (v: boolean) => void;
  setDemoEntered: (v: boolean) => void;
  startWalkthrough: (scenario: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endWalkthrough: () => void;

  /** Run a policy against the current world. Adds intents + audit entries. */
  runPolicy: (policyId: PolicyId, opts?: { force?: boolean }) => Intent[];
  togglePolicyStatus: (policyId: PolicyId) => void;
  upsertPolicy: (draft: PolicyDraft) => Policy;

  /** Apply an approve/reject/changes decision. Auto-executes if ready. */
  decideOnIntent: (intentId: IntentId, decision: "approve" | "reject" | "request_changes", comment?: string) => void;
  bulkApprove: (intentIds: IntentId[]) => void;

  /** Execute an approved intent. Posts ledger entries on success. */
  executeApprovedIntent: (intentId: IntentId, opts?: { mode?: import("@/types/domain").ExecutionMode; skipTwoStep?: boolean }) => Execution | null;

  /** Run the canonical payout demo: reset → approve Ozark intent → execute → audit evidence. */
  runCanonicalPayoutDemo: () => void;

  /** Update a policy's approval rule (used by editable approval matrix in Settings). */
  updatePolicyApprovalRule: (policyId: PolicyId, rule: ApprovalRule) => void;
  /** Resolve a partner_pending execution to completed (cash-out 2nd step). */
  settlePartnerPending: (executionId: ExecutionId) => void;

  /** Cancel an intent that hasn't executed yet. */
  cancelIntent: (intentId: IntentId, reason: string) => void;

  /** Reconciliation actions. */
  applyTagsToEntries: (
    entryIds: LedgerEntryId[],
    tags: { purpose?: string; accountingCategory?: string; costCenter?: string; counterpartyId?: CounterpartyId; reconciliationNote?: string },
  ) => void;
  markEntriesReviewed: (entryIds: LedgerEntryId[]) => void;
  markEntriesExported: (entryIds: LedgerEntryId[], preset: string, overrideNote?: string) => void;

  /** Inject a pending inbound (for the deposit-routing scenario). */
  injectInbound: (inbound: { collectionAccountId: AccountId; amount: number }) => string;

  triggerScenario: (kind: "sweep" | "rebalance" | "friday_payout" | "deposit_routing" | "month_end" | "wallet_connect_sweep" | "morpho_yield" | "anomaly_warning" | "counterparty_risk" | "market_shock" | "predictive_forecast" | "audit_pdf" | "create_policy") => void;
  linkAccount: (address: string, entityId: EntityId, name: string) => AccountId;
  deleteAccount: (id: AccountId) => void;
}

// Internal helpers ---------------------------------------------------------

function snapOf(state: RootState) {
  return {
    now: state.now,
    entities: state.entities,
    accounts: state.accounts,
    counterparties: state.counterparties,
    intents: state.intents,
    executions: state.executions,
    ledger: state.ledger,
    policies: state.policies,
    settlement: state.settlement,
    pendingInbounds: state.pendingInbounds,
    users: state.users,
  };
}

function applyLedgerToBalances(accounts: Account[], entries: LedgerEntry[]): Account[] {
  const next = accounts.map((a) => ({ ...a }));
  for (const entry of entries) {
    const acct = next.find((a) => a.id === entry.accountId);
    if (!acct) continue;
    if (entry.direction === "outflow" || (entry.direction === "internal" && entry.linkedEntryId && entry.linkedEntryId > entry.id)) {
      acct.balance = Math.max(0, acct.balance - entry.amount);
      acct.availableBalance = Math.max(0, acct.availableBalance - entry.amount);
    } else {
      acct.balance += entry.amount;
      acct.availableBalance += entry.amount;
    }
    acct.lastUpdated = entry.effectiveAt;
    if (acct.targetBand) {
      acct.status = acct.balance < acct.targetBand.min ? "low" : "healthy";
    }
  }
  return next;
}

function nowIso(state: RootState): string {
  return state.now;
}

function fromSeed(seed: SeedBundle): Pick<
  RootState,
  | "now"
  | "users"
  | "currentUserId"
  | "entities"
  | "accounts"
  | "counterparties"
  | "policies"
  | "settlement"
  | "pendingInbounds"
  | "intents"
  | "executions"
  | "ledger"
  | "audit"
> {
  return {
    now: seed.now,
    users: seed.users,
    currentUserId: seed.currentUserId,
    entities: seed.entities,
    accounts: seed.accounts,
    counterparties: seed.counterparties,
    policies: seed.policies,
    settlement: seed.settlement,
    pendingInbounds: seed.pendingInbounds,
    intents: seed.intents,
    executions: seed.executions,
    ledger: seed.ledger,
    audit: seed.audit,
  };
}

const localStorageWrapped: PersistStorage<RootState> = {
  getItem: (name) => {
    const value = typeof window !== "undefined" ? window.localStorage.getItem(name) : null;
    return value ? JSON.parse(value) : null;
  },
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

// --------------------------------------------------------------------------

export const useStore = create<RootState>()(
  persist(
    (set, get) => ({
      schemaVersion: SCHEMA_VERSION,
      ...fromSeed(SEED),
      walkthroughActive: false,
      activeScenario: null,
      currentStep: 0,
      ui: { forceMockAi: false, darkMode: false, demoEntered: false },
      testnet: { connectedAddress: null, ethBalance: 0, usdcBalance: 0, hydrated: false, executions: [] },
      canonicalDemoState: { completed: false },

      resetToSeed: () => {
        const fresh = fromSeed(SEED);
        const auditEntry: AuditLogEntry = {
          id: runtimeId("aud") as AuditId,
          at: fresh.now,
          actor: fresh.currentUserId,
          event: { kind: "demo_reset" },
        };
        set({
          ...fresh,
          audit: [auditEntry, ...fresh.audit],
          canonicalDemoState: { completed: false },
        });
      },

      setCurrentUser: (id) => set({ currentUserId: id }),
      setForceMockAi: (v) => set((s) => ({ ui: { ...s.ui, forceMockAi: v } })),
      setDarkMode: (v) => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", v);
        }
        set((s) => ({ ui: { ...s.ui, darkMode: v } }));
      },
      setDemoEntered: (v) => set((s) => ({ ui: { ...s.ui, demoEntered: v } })),

      hydrateTestnet: (address) => {
        // Wipe the seed data so the testnet demo starts from a real-onchain
        // empty state. The connected wallet *becomes* Base Operating.
        const empty = fromSeed(SEED);
        set({
          ...empty,
          // Zero out balances so the UI shows "$0 — fund your wallet" until
          // the balance hooks resolve real numbers.
          accounts: empty.accounts.map((a, idx) =>
            idx === 0 ? { ...a, balance: 0, availableBalance: 0 } : { ...a, balance: 0, availableBalance: 0 },
          ),
          intents: [],
          executions: [],
          ledger: [],
          audit: [
            {
              id: runtimeId("aud") as AuditId,
              at: empty.now,
              actor: empty.currentUserId,
              event: { kind: "demo_reset" },
            },
          ],
          testnet: {
            connectedAddress: address,
            ethBalance: 0,
            usdcBalance: 0,
            hydrated: true,
            executions: [],
          },
        });
      },

      setTestnetBalances: ({ eth, usdc }) =>
        set((s) => {
          const nextTestnet = {
            ...s.testnet,
            ethBalance: eth ?? s.testnet.ethBalance,
            usdcBalance: usdc ?? s.testnet.usdcBalance,
          };
          // Also update the "Base Operating" account balance in the main array
          // so KPI cards and other UI components reflect the real testnet funds.
          const nextAccounts = s.accounts.map((a) =>
            a.id === "acc_base_ops"
              ? { ...a, balance: nextTestnet.usdcBalance, availableBalance: nextTestnet.usdcBalance }
              : a
          );
          return { testnet: nextTestnet, accounts: nextAccounts };
        }),

      recordTestnetExecution: (e) =>
        set((s) => ({ testnet: { ...s.testnet, executions: [e, ...s.testnet.executions] } })),

      clearTestnet: () => {
        const fresh = fromSeed(SEED);
        set({
          ...fresh,
          testnet: { connectedAddress: null, ethBalance: 0, usdcBalance: 0, hydrated: false, executions: [] },
        });
      },

      startWalkthrough: (scenario) => set({ walkthroughActive: true, activeScenario: scenario, currentStep: 0 }),
      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
      prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
      endWalkthrough: () => set({ walkthroughActive: false, activeScenario: null, currentStep: 0 }),

      runPolicy: (policyId, opts) => {
        const state = get();
        const policy = state.policies.find((p) => p.id === policyId);
        if (!policy) return [];
        const { intents } = evaluatePolicy(policy, snapOf(state), {
          now: nowIso(state),
          initiatorId: state.currentUserId,
          force: opts?.force,
        });
        if (intents.length === 0) return [];

        // Move directly to pending_approval if approval is required, else to approved.
        const stamped = intents.map((intent) => {
          const req = resolveApprovalRule(intent, policy, snapOf(state));
          if (req.status === "auto") {
            return { ...intent, status: "approved" as const, approvedAt: state.now };
          }
          return { ...intent, status: "pending_approval" as const };
        });

        const auditEvents: AuditLogEntry[] = [
          {
            id: runtimeId("aud") as AuditId,
            at: state.now,
            actor: state.currentUserId,
            event: { kind: "policy_evaluated", policyId, intentsCreated: stamped.map((i) => i.id) },
          },
          ...stamped.map<AuditLogEntry>((i) => ({
            id: runtimeId("aud") as AuditId,
            at: state.now,
            actor: state.currentUserId,
            event: { kind: "intent_created", intentId: i.id, sourcePolicyId: policyId },
          })),
        ];
        set({
          intents: [...stamped, ...state.intents],
          policies: state.policies.map((p) => (p.id === policyId ? { ...p, lastTriggeredAt: state.now } : p)),
          audit: [...auditEvents, ...state.audit],
        });
        return stamped;
      },

      togglePolicyStatus: (policyId) =>
        set((state) => ({
          policies: state.policies.map((p) =>
            p.id === policyId ? { ...p, status: p.status === "active" ? "paused" : "active" } : p,
          ),
        })),

      upsertPolicy: (draft) => {
        const id = ("pol_" + runtimeId("p")) as PolicyId;
        const policy: Policy = {
          id,
          name: draft.name,
          type: draft.type,
          status: "active",
          description: draft.description,
          sourceAccountIds: draft.sourceAccountIds as AccountId[],
          destinationAccountIds: draft.destinationAccountIds as AccountId[],
          conditions: draft.conditions,
          thresholds: draft.thresholds,
          cadence: draft.cadence,
          approvalRule: draft.approvalRule,
          createdBy: get().currentUserId,
        };
        set((state) => ({ policies: [policy, ...state.policies] }));
        return policy;
      },

      decideOnIntent: (intentId, decision, comment) => {
        const state = get();
        const intent = state.intents.find((i) => i.id === intentId);
        if (!intent) return;
        const policy = intent.policyId ? state.policies.find((p) => p.id === intent.policyId) : undefined;
        const required = resolveApprovalRule(intent, policy, snapOf(state));

        const decisionRecord: ApprovalDecision & { id: AuditId } = {
          id: runtimeId("dec") as AuditId,
          approver: state.currentUserId,
          decision,
          comment,
          at: state.now,
        };
        const result = applyDecision(intent, decisionRecord, required);
        if (result.error) {
          // No-op: the UI prevents this case but the domain rule guards.
          return;
        }
        const updatedIntents = state.intents.map((i) => (i.id === intent.id ? result.intent : i));
        const auditEntry: AuditLogEntry = {
          id: runtimeId("aud") as AuditId,
          at: state.now,
          actor: state.currentUserId,
          event: { kind: "intent_decision", intentId, decision: decisionRecord },
        };
        set({ intents: updatedIntents, audit: [auditEntry, ...state.audit] });
        if (result.readyToExecute) {
          // Synchronously execute the approved intent.
          get().executeApprovedIntent(intentId);
        }
      },

      bulkApprove: (intentIds) => {
        for (const id of intentIds) {
          const intent = get().intents.find((i) => i.id === id);
          if (!intent) continue;
          // Skip if any risk flags require manual review.
          if (intent.riskFlags.length > 0) continue;
          get().decideOnIntent(id, "approve", "Bulk-approved");
        }
      },

      executeApprovedIntent: (intentId, opts) => {
        const state = get();
        const intent = state.intents.find((i) => i.id === intentId);
        if (!intent) return null;
        if (intent.status !== "approved" && intent.status !== "scheduled") return null;
        const result = executeIntent({ ...intent, status: "executing" }, snapOf(state), { now: state.now, mode: opts?.mode, skipTwoStep: opts?.skipTwoStep });
        const updatedIntents = state.intents.map((i) => (i.id === intent.id ? result.intent : i));
        const updatedExecutions = [...state.executions, result.execution];
        const updatedLedger = [...state.ledger, ...result.ledger];
        const updatedAccounts = applyLedgerToBalances(state.accounts, result.ledger);
        const audit: AuditLogEntry[] = [
          {
            id: runtimeId("aud") as AuditId,
            at: state.now,
            actor: state.currentUserId,
            event:
              result.intent.status === "executed"
                ? { kind: "intent_executed", intentId, executionId: result.execution.id }
                : result.intent.status === "failed"
                  ? { kind: "intent_failed", intentId, reason: result.intent.failureReason ?? "unknown" }
                  : result.intent.status === "skipped"
                    ? { kind: "intent_skipped", intentId, reason: result.intent.resolutionNote ?? "unknown" }
                    : { kind: "intent_executed", intentId, executionId: result.execution.id },
          },
          ...(result.ledger.length > 0
            ? [
                {
                  id: runtimeId("aud") as AuditId,
                  at: state.now,
                  actor: state.currentUserId,
                  event: { kind: "ledger_posted" as const, entryIds: result.ledger.map((l) => l.id), intentId },
                },
              ]
            : []),
        ];
        set({
          intents: updatedIntents,
          executions: updatedExecutions,
          ledger: updatedLedger,
          accounts: updatedAccounts,
          audit: [...audit, ...state.audit],
        });
        return result.execution;
      },

      settlePartnerPending: (executionId) => {
        const state = get();
        const exec = state.executions.find((e) => e.id === executionId);
        if (!exec || exec.executionType !== "partner_pending") return;
        const intent = state.intents.find((i) => i.id === exec.intentId);
        if (!intent) return;
        const result = executeIntent(intent, snapOf(state), { now: state.now, partnerSettle: true });
        const updatedAccounts = applyLedgerToBalances(state.accounts, result.ledger);
        set({
          intents: state.intents.map((i) => (i.id === intent.id ? result.intent : i)),
          executions: state.executions.map((e) => (e.id === executionId ? result.execution : e)),
          ledger: [...state.ledger, ...result.ledger],
          accounts: updatedAccounts,
        });
      },

      runCanonicalPayoutDemo: () => {
        // 1. Reset to seed state so demo starts clean
        get().resetToSeed();
        const state = get();
        const newNow = dayjs(state.now).add(2, "minute").toISOString();
        set({ now: newNow });

        // 2. The canonical scenario: Ozark Audit Co. wire cash-out ($9,500)
        //    Initiator: Sam Rivera (u_ops) — from seed, already set on int_pend_001
        //    Approver: Maya Chen (u_founder) — current user, distinct from initiator → maker-checker
        const CANONICAL_INTENT_ID = "int_pend_001" as IntentId;
        const APPROVER_ID = "u_founder" as UserId; // Maya Chen
        const SYSTEM_ID = "u_system" as UserId;

        const intent = get().intents.find((i) => i.id === CANONICAL_INTENT_ID);
        if (!intent) return;

        const policy = get().policies.find((p) => p.id === intent.policyId);
        const snap = snapOf(get());
        const required = resolveApprovalRule(intent, policy, snap);

        // 3. Apply approval decision (Maya Chen approves Sam's intent → valid maker-checker)
        const decisionRecord: ApprovalDecision & { id: AuditId } = {
          id: runtimeId("dec") as AuditId,
          approver: APPROVER_ID,
          decision: "approve",
          comment: "First-time counterparty verified — wire details confirmed, bank on record. Approved for settlement.",
          at: newNow,
        };
        const approvalResult = applyDecision(intent, decisionRecord, required);
        if (approvalResult.error || !approvalResult.readyToExecute) return;

        const intentsAfterApproval = get().intents.map((i) => (i.id === CANONICAL_INTENT_ID ? approvalResult.intent : i));
        const approvalAudit: AuditLogEntry = {
          id: runtimeId("aud") as AuditId,
          at: newNow,
          actor: APPROVER_ID,
          event: { kind: "intent_decision", intentId: CANONICAL_INTENT_ID, decision: decisionRecord },
        };
        set({ intents: intentsAfterApproval, audit: [approvalAudit, ...get().audit] });

        // 4. Execute with server_signed_demo mode (skip two-step for clean demo flow)
        const execState = get();
        const approvedIntent = execState.intents.find((i) => i.id === CANONICAL_INTENT_ID)!;
        const result = executeIntent(
          { ...approvedIntent, status: "executing" },
          snapOf(execState),
          { now: newNow, mode: "server_signed_demo", skipTwoStep: true },
        );

        const updatedAccounts = applyLedgerToBalances(execState.accounts, result.ledger);

        // 5. Tag ledger entries with full accounting metadata for reconciliation readiness
        const taggedLedger = result.ledger.map((entry) => ({
          ...entry,
          purpose: "Audit services — annual compliance review",
          accountingCategory: "Professional Services",
          costCenter: "FIN-1",
          reconciliationStatus: "tagged" as const,
        }));

        const execAudit: AuditLogEntry[] = [
          {
            id: runtimeId("aud") as AuditId,
            at: newNow,
            actor: SYSTEM_ID,
            event: { kind: "intent_executed", intentId: CANONICAL_INTENT_ID, executionId: result.execution.id },
          },
          ...(taggedLedger.length > 0
            ? [
                {
                  id: runtimeId("aud") as AuditId,
                  at: newNow,
                  actor: SYSTEM_ID,
                  event: {
                    kind: "ledger_posted" as const,
                    entryIds: taggedLedger.map((l) => l.id),
                    intentId: CANONICAL_INTENT_ID,
                  },
                },
              ]
            : []),
          {
            id: runtimeId("aud") as AuditId,
            at: newNow,
            actor: APPROVER_ID,
            event: {
              kind: "canonical_demo_run",
              intentId: CANONICAL_INTENT_ID,
              executionId: result.execution.id,
              mode: "server_signed_demo",
            },
          },
        ];

        set({
          intents: execState.intents.map((i) => (i.id === CANONICAL_INTENT_ID ? result.intent : i)),
          executions: [...execState.executions, result.execution],
          ledger: [...execState.ledger, ...taggedLedger],
          accounts: updatedAccounts,
          audit: [...execAudit, ...execState.audit],
          canonicalDemoState: {
            completed: true,
            intentId: CANONICAL_INTENT_ID,
            executionId: result.execution.id,
            completedAt: newNow,
          },
        });
      },

      updatePolicyApprovalRule: (policyId, rule) => {
        set((state) => ({
          policies: state.policies.map((p) => (p.id === policyId ? { ...p, approvalRule: rule } : p)),
        }));
      },

      cancelIntent: (intentId, reason) => {
        set((state) => ({
          intents: state.intents.map((i) =>
            i.id === intentId ? { ...i, status: "canceled", resolutionNote: reason } : i,
          ),
          audit: [
            {
              id: runtimeId("aud") as AuditId,
              at: state.now,
              actor: state.currentUserId,
              event: { kind: "intent_skipped", intentId, reason },
            },
            ...state.audit,
          ],
        }));
      },

      applyTagsToEntries: (entryIds, tags) => {
        set((state) => ({
          ledger: state.ledger.map((l) =>
            entryIds.includes(l.id)
              ? {
                  ...l,
                  purpose: tags.purpose ?? l.purpose,
                  accountingCategory: tags.accountingCategory ?? l.accountingCategory,
                  costCenter: tags.costCenter ?? l.costCenter,
                  counterpartyId: tags.counterpartyId ?? l.counterpartyId,
                  reconciliationNote: tags.reconciliationNote ?? l.reconciliationNote,
                  reconciliationStatus: l.reconciliationStatus === "missing_tags" ? "tagged" : l.reconciliationStatus,
                }
              : l,
          ),
        }));
      },

      markEntriesReviewed: (entryIds) => {
        set((state) => ({
          ledger: state.ledger.map((l) =>
            entryIds.includes(l.id) ? { ...l, reconciliationStatus: "reviewed" as ReconciliationStatus } : l,
          ),
          audit: [
            { id: runtimeId("aud") as AuditId, at: state.now, actor: state.currentUserId, event: { kind: "reconciliation_reviewed", entryIds } },
            ...state.audit,
          ],
        }));
      },

      markEntriesExported: (entryIds, preset, overrideNote) => {
        set((state) => ({
          ledger: state.ledger.map((l) =>
            entryIds.includes(l.id)
              ? { 
                  ...l, 
                  reconciliationStatus: "exported" as ReconciliationStatus, 
                  exportedAt: state.now,
                  ...(overrideNote ? { reconciliationNote: overrideNote } : {})
                }
              : l,
          ),
          audit: [
            ...state.audit,
            { 
              id: runtimeId("aud") as AuditId, 
              at: state.now, 
              actor: state.currentUserId, 
              event: { 
                kind: "reconciliation_exported", 
                entryIds, 
                preset,
                ...(overrideNote ? { overrideNote } : {})
              } 
            },
          ],
        }));
      },

      injectInbound: (inbound) => {
        const id = "pi_" + runtimeId("pi");
        const newInbound: PendingInbound = {
          id,
          collectionAccountId: inbound.collectionAccountId,
          amount: inbound.amount,
          asset: "USDC",
          chain: "base",
          receivedAt: get().now,
          resolved: false,
        };
        set((s) => ({ pendingInbounds: [newInbound, ...s.pendingInbounds] }));
        return id;
      },

      triggerScenario: (kind) => {
        // Reset to seed first to guarantee deterministic walkthrough state
        get().resetToSeed();
        const state = get();
        // Advance the demo clock by ~1 minute to make the new activity timestamp distinct.
        const newNow = dayjs(state.now).add(1, "minute").toISOString();
        set({
          now: newNow,
          audit: [
            { id: runtimeId("aud") as AuditId, at: newNow, actor: state.currentUserId, event: { kind: "scenario_triggered", scenario: kind } },
            ...state.audit,
          ],
        });

        switch (kind) {
          case "sweep": {
            const policy = get().policies.find((p) => p.type === "sweep" && p.sourceAccountIds.includes("acc_base_ops" as AccountId));
            if (policy) get().runPolicy(policy.id, { force: true });
            break;
          }
          case "rebalance": {
            const policy = get().policies.find((p) => p.type === "rebalance");
            if (policy) get().runPolicy(policy.id, { force: true });
            break;
          }
          case "friday_payout": {
            const policy = get().policies.find((p) => p.type === "payout_run");
            if (policy) get().runPolicy(policy.id, { force: true });
            break;
          }
          case "deposit_routing": {
            // Inject a fresh inbound, then fire the routing policy.
            get().injectInbound({ collectionAccountId: "acc_collect_a" as AccountId, amount: 42_000 });
            const policy = get().policies.find((p) => p.type === "deposit_routing");
            if (policy) {
              const created = get().runPolicy(policy.id, { force: true });
              // Auto-execute split intents (small amounts → auto-approve).
              for (const intent of created) {
                if (intent.status === "approved") get().executeApprovedIntent(intent.id);
              }
            }
            break;
          }
          case "month_end":
            break;
          case "wallet_connect_sweep": {
            const policy = get().policies.find((p) => p.type === "sweep" && p.sourceAccountIds.includes("acc_base_ops" as AccountId));
            if (policy) get().runPolicy(policy.id, { force: true });
            break;
          }
          case "morpho_yield": {
            const id = "i_morpho" + Date.now();
            set({ intents: [{
              id: id as IntentId, policyId: undefined, title: "Morpho Yield Deposit", description: "Deposit idle USDC to Morpho", chain: "base", entityId: "ent_us_llc" as EntityId, requestedBy: state.currentUserId, approvals: [], snapshotAt: state.now, sourceBalanceAtSnapshot: 180000, destinationBalanceAtSnapshot: 0, amount: 80000, asset: "USDC", sourceAccountId: "acc_base_ops" as AccountId, destinationAccountId: "morpho_contract" as AccountId, type: "sweep", status: "pending_approval", riskFlags: [], rationale: "Yield deposit to Morpho", createdAt: state.now
            }, ...state.intents] });
            break;
          }
          case "anomaly_warning": {
            const id = "i_anomaly" + Date.now();
            set({ intents: [{
              id: id as IntentId, policyId: undefined, title: "High Value Transfer", description: "Payment to new vendor", chain: "base", entityId: "ent_us_llc" as EntityId, requestedBy: state.currentUserId, approvals: [], snapshotAt: state.now, sourceBalanceAtSnapshot: 150000, destinationBalanceAtSnapshot: 0, amount: 110000, asset: "USDC", sourceAccountId: "acc_base_ops" as AccountId, destinationAccountId: "new_vendor" as AccountId, type: "sweep", status: "pending_approval", riskFlags: [{ kind: "amount_above_normal_range", observed: 110000, max: 50000 }], rationale: "Unusual transfer", createdAt: state.now
            }, ...state.intents] });
            break;
          }
          case "counterparty_risk": {
            // pure UI hint, handled in overview route
            break;
          }
          case "market_shock": {
            // pure UI hint
            break;
          }
          case "predictive_forecast": {
            // pure UI hint
            break;
          }
          case "audit_pdf": {
            // pure UI hint
            break;
          }
          case "create_policy": {
            // pure UI hint
            break;
          }
        }
      },

      linkAccount: (address, entityId, name) => {
        const state = get();
        const id = "acc_link_" + Date.now();
        const newAccount: Account = {
          id: id as AccountId,
          name,
          accountType: "operating_wallet",
          chain: "base",
          asset: "USDC",
          entityId,
          balance: 0,
          availableBalance: 0,
          status: "healthy",
          settlementRail: "onchain",
          tags: ["user-linked"],
          lastUpdated: state.now,
          address: address as `0x${string}`,
          description: `Non-custodial operating wallet for ${state.entities.find(e => e.id === entityId)?.name || 'Entity'}. Linked via TreasuryFlow Onboarding.`,
        };
        set({ accounts: [newAccount, ...state.accounts] });
        return id as AccountId;
      },

      deleteAccount: (id) => {
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: localStorageWrapped,
      // Persist everything; demo state lives entirely in localStorage.
      partialize: (s) => s,
      migrate: (persisted: any, version) => {
        if (version !== SCHEMA_VERSION) return undefined;
        return persisted;
      },
    },
  ),
);

// Selectors -----------------------------------------------------------------

export const selectors = {
  pendingApprovals: (s: RootState) => s.intents.filter((i) => i.status === "pending_approval"),
  recentIntents: (s: RootState, n = 10) => [...s.intents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n),
  accountsByEntity: (s: RootState, entityId: EntityId) => s.accounts.filter((a) => a.entityId === entityId),
  policiesByType: (s: RootState, type: Policy["type"]) => s.policies.filter((p) => p.type === type),
  ledgerForAccount: (s: RootState, accountId: AccountId) =>
    s.ledger.filter((l) => l.accountId === accountId).sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt)),
  intentsByPolicy: (s: RootState, policyId: PolicyId) =>
    s.intents.filter((i) => i.policyId === policyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  account: (s: RootState, id: AccountId) => s.accounts.find((a) => a.id === id),
  policy: (s: RootState, id: PolicyId) => s.policies.find((p) => p.id === id),
  intent: (s: RootState, id: IntentId) => s.intents.find((i) => i.id === id),
  executionForIntent: (s: RootState, intentId: IntentId) =>
    [...s.executions].filter((e) => e.intentId === intentId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0],
  counterparty: (s: RootState, id: CounterpartyId) => s.counterparties.find((c) => c.id === id),
  user: (s: RootState, id: UserId) => s.users.find((u) => u.id === id),
};
