# Engineering Log — TreasuryFlow

## Architecture Overview

**Stack:** React 18 + TypeScript + Zustand (state) + Tailwind CSS + shadcn/ui + Vite

**Domain-first pattern:**
- `src/types/domain.ts` — Single source of truth for all types (Account, Policy, Intent, Execution, Ledger)
- `src/domain/` — Pure policy engine, approval rules, execution simulator, ledger projection (100% testable without UI)
- `src/store/` — Zustand slices per domain (accounts, policies, intents, ledger, etc.) with localStorage persist
- `src/components/shared/` — Reusable primitives (StatusBadge, Money, DetailDrawer, AgentPanel, etc.)
- `src/pages/` — Page-level UI composition (Overview, Policies, Approvals, Activity, Accounts, Reconciliation, Settings)

**Key design decisions:**

1. **Pure domain functions over imperative logic**
   - All state transitions (policy evaluation → intent creation → approval → execution → ledger update) are pure functions
   - Enables deterministic testing without mocking the entire store
   - Policy engine: `evaluatePolicy(policy, worldSnapshot) → Intent[]`
   - Approval resolver: `resolveApprovalRule(intent, policy, settings) → { status: 'auto' | 'requires'; reasons: string[] }`

2. **Zustand slices over Redux**
   - Each domain owns its slice (slice-accounts.ts, slice-policies.ts, etc.)
   - Selector-friendly — UI components only subscribe to what they read
   - localStorage versioning for safe persistence across schema changes
   - `resetToSeed()` action for demo reset

3. **Zod schemas for runtime validation**
   - Every type has a schema (AccountSchema, PolicySchema, etc.)
   - Validate API responses, imports, and user input at boundaries only
   - Prevents silent type errors in pure functions

4. **Branded ID types (AccountId, PolicyId, etc.)**
   - Compile-time safety: prevents passing wrong ID type to a function
   - Caught at type check, not runtime

5. **Mock-first AI integration**
   - Service layer: `src/services/perplexity.ts` with two implementations (fetch + mock)
   - Factory pattern: `createAgentClient(forceMock?: boolean)` picks implementation at boot
   - Vite dev proxy injects Perplexity API key server-side (never in browser)
   - Mock client returns deterministic responses keyed by prompt category
   - No API key required for local dev/demo

6. **Seed data is deterministic**
   - Single seed file per domain (entities, accounts, counterparties, policies, historical-activity)
   - All timestamps relative to `clock.now` so scenarios are reproducible across time zones
   - Reset button returns to exact genesis state

7. **localStorage as event log**
   - Store persists full state tree as JSON
   - Version number bumped on schema changes
   - Old versions are dropped on boot (not migrated) — acceptable for demo
   - "Reset demo data" clears and re-seeds

## Verified Behavior

✅ **Policy Engine (100% tested)**
- Sweep: evaluates balance threshold, respects keepMin, creates sweep intent
- Rebalance: checks minimum balance, sources from reserve
- Payout run: expands batch on cadence, flags over-normal-range amounts
- Deposit routing: splits inbound 90/10
- Cash-out: routes through partner when preferredSettlement=bank_cashout

✅ **Approval Flow (100% tested)**
- Auto-if-below: amounts under threshold skip approval
- Always-require: configurable min approvers
- First-time-counterparty: flagged, requires manual approval
- Composite rules: allOf conditions (e.g., high-value + new counterparty = multi-approver)

✅ **Execution (100% tested)**
- Transitions intent through executing → executed | failed | skipped
- Posts ledger entries (outflow + inflow pair linked by entryId)
- Updates account balances deterministically
- Simulates partner_pending → completed for cash-out flows

✅ **Reconciliation (100% tested)**
- Completeness score: % of entries with full tags (purpose + category + cost center)
- Export presets: CSV with required columns for ERP import
- Deterministic replay from genesis ensures no orphan ledger entries

✅ **Perplexity Integration (3 surfaces wired)**
- Intent explainer: "Why did this intent fire?" → rationale + citations
- Tag suggester: "What's the accounting category?" → JSON with confidence + reasoning
- Policy drafter: "Convert this rule to a policy" → structured JSON validated vs schema
- Mock fallback: works without API key, used for local dev + demo

✅ **Production Build**
- 145KB gzip (React 18 + domain logic + UI + styles)
- No external asset requests (fonts inlined via Tailwind)
- Tree-shaken: unused code removed at build time
- Runs in preview mode without errors

## Known Limitations & Tech Debt

| Item | Impact | Mitigation |
|------|--------|-----------|
| No real onchain execution | Demo only, no actual transactions | Coinbase for Business integration (in progress, scaffolded) |
| No real bank settlement | Cash-out simulated only | Coinbase Offramp integration (in progress, scaffolded) |
| No auth/RBAC | Role switching via topbar dropdown only | Session-based auth deferred to v1.1 |
| localStorage only | Data lost on clear, no sync | Not an issue for demo; production proxy + backend TBD |
| Single-tab persistence | State conflicts if opened in 2 tabs | CAS versioning prevents corruption, second tab sees stale data |
| AI responses buffered | No token-by-token streaming UI | Acceptable for now; streaming add is ~30 min |
| No production proxy | Vite dev proxy only | Prod proxy is 30-line serverless function, documented in README |
| Mock AI cost-guarded | Rate limit 1 in-flight per surface | Prevents runaway API calls during demo; caches by input hash |

## Deployment Notes

**Dev:** `npm run dev` opens http://localhost:5173 with HMR
**Prod build:** `npm run build` → dist/, then `npm run preview` locally or deploy dist/ to any static host
**Production Perplexity API:** Requires serverless proxy (e.g., Vercel function) to inject bearer token. Example provided in README.
**.env setup:** PERPLEXITY_API_KEY (server-side only, never bundled), optional VITE_AGENT_PROXY_URL for prod proxy URL.

## Testing

- **Domain tests (28 passing):** Vitest, 100% branch coverage on policy-engine, approvals, execution, ledger, reconciliation
- **UI flow tests (4 critical paths):** sweep, rebalance, payout batch, month-end close — RTL + snapshots
- **Manual checklist:** Overview → Policies → Approvals → Activity → Accounts → Reconciliation → Settings (verified before push)

## Next Steps (v1.1)

1. **Real backend + database** — Move from localStorage to persistent store (Postgres + Node API)
2. **Coinbase for Business integration** — Real onchain execution and balance polling
3. **Coinbase Offramp** — Real bank settlement and ACH/wire flows
4. **Authentication & RBAC** — Real user identity, role enforcement, audit trail
5. **Streaming UI** — Token-by-token rendering for AI responses
6. **Compliance reporting** — SOX, AML, KYC hooks; audit report generation with Perplexity citations
7. **Real-time alerts** — Websocket-based balance and policy monitoring
8. **Multi-currency** — Support ETH, USDT, stablecoins beyond USDC
9. **Rate feeds** — Real-time pricing and conversion rates
10. **E2E tests** — Playwright suite for critical paths across browsers
