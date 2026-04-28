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

✅ **Perplexity Integration (8 surfaces wired)**
- Intent explainer: "Why did this intent fire?" → rationale + citations
- Tag suggester: "What's the accounting category?" → JSON with confidence + reasoning
- Policy drafter: "Convert this rule to a policy" → structured JSON validated vs schema
- Anomaly scorer flags unusual patterns
- Counterparty risk assessment
- Market shock detection and rebalancing suggestion
- Predictive balance forecasting
- Audit rationale explanations
- Mock fallback: works without API key, used for local dev + demo

✅ **Web3 & Contracts (Phase 0 + testnet engine)**
- Base Sepolia contracts tested and verified (PolicyEngine, IntentRegistry, LedgerContract)
- Security fixes applied (OpenZeppelin Ownable for state mutations, TreasuryVault deposited tracking)
- MockUSDC: ERC20 faucet (6 decimals, public `mint()`), deployed via updated `Deploy.s.sol`
- TreasuryVault: pulls USDC from caller, emits `PolicyExecuted(policyId, source, dest, amount, action, timestamp)` — the onchain audit event the UI reads back
- WalletConnect via Web3Modal functional
- Morpho Yield integration scaffolded
- `VITE_APP_MODE` feature flag: `"mock"` (default) or `"testnet"`, read at build time via `src/web3/mode.ts`
- `Web3Provider` + `TestnetHydrator` mounted only when `IS_TESTNET=true`; mock demo loads with zero wagmi bundle overhead
- Wallet hydration: `TestnetHydrator` watches `useAccount`, drives `hydrateTestnet()` on connect and live balance polling (`useBalance` + `useReadContract`) every 8–12s into Zustand `testnet` slice
- `useTestnetExecution`: approve + executePolicy two-step, waits for receipts via `waitForTransactionReceipt`, records result in `testnet.executions`
- `usePolicyExecutionLogs`: `getLogs(PolicyExecuted, { source: address })` from earliest block, refreshed every 15s — feeds the Audit page in testnet mode

✅ **Production Build**
- No external asset requests (fonts inlined via Tailwind)
- Tree-shaken: wagmi/viem code dead-code-eliminated in mock build (`IS_TESTNET` is a build-time constant)
- Runs in preview mode without errors
- Zero TS errors

## Known Limitations & Tech Debt

| Item | Impact | Mitigation |
|------|--------|-----------|
| Contracts not source-verified on Basescan | Source code not readable on Basescan UI | Run `forge script script/Deploy.s.sol --rpc-url base_sepolia --verify --etherscan-api-key <KEY>` |
| Mainnet execution pending | Currently Base Sepolia testnet only | Coinbase for Business integration in Phase 3 |
| TreasuryVault destination is placeholder | `executePolicy` logs `0x000…dEaD` as destination | Replace with real account address resolver when connecting to actual onchain accounts |
| No real bank settlement | Cash-out simulated only | Coinbase Offramp integration (in progress, scaffolded) |
| No auth/RBAC | Role switching via topbar dropdown only | Session-based auth deferred to v1.1 |
| localStorage only | Data lost on clear, no sync | Not an issue for demo; production proxy + backend TBD |
| Single-tab persistence | State conflicts if opened in 2 tabs | CAS versioning prevents corruption, second tab sees stale data |
| AI responses buffered | No token-by-token streaming UI | Acceptable for now; streaming add is ~30 min |
| No production proxy | Vite dev proxy only | Prod proxy is 30-line serverless function, documented in README |
| Mock AI cost-guarded | Rate limit 1 in-flight per surface | Prevents runaway API calls during demo; caches by input hash |

## Deployed Contracts — Base Sepolia (Chain ID 84532)

| Contract | Address |
|----------|---------|
| MockUSDC | `0x576aAA911eC1caAd7F234F21b3607a98C9F669F2` |
| TreasuryVault | `0xaCB7F3Da6cF6cC7Fe35e74B35477A3065172151A` |
| PolicyEngine | `0x01E0149639EB224CCc0557d3bd33b0FB05505a64` |
| IntentRegistry | `0xf510c47823139B6819e4090d4583B518c66ee0d7` |
| LedgerContract | `0x20cF3fB0A14FEce0889f69e1243a9d9f78AC508b` |

## Deployment Notes

**Dev (mock):** `npm run dev` opens http://localhost:5173 with HMR — no wallet or contract addresses needed
**Dev (testnet):** set `VITE_APP_MODE=testnet` + contract addresses in `.env.local`, then `npm run dev`
**Prod build:** `npm run build` → dist/, then `npm run preview` locally or deploy dist/ to any static host
**Two Vercel projects, one branch:**
- `demo-treasuryflow.vercel.app` → `VITE_APP_MODE=mock` (no Web3 env vars needed)
- `testnet-treasuryflow.vercel.app` → `VITE_APP_MODE=testnet` + all Web3 env vars
**Contract deployment:** `forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast` — requires `PRIVATE_KEY` + `BASE_SEPOLIA_RPC_URL` in contracts/.env
**Contract verification:** `forge script script/Deploy.s.sol --rpc-url base_sepolia --verify --etherscan-api-key <BASESCAN_KEY>` — makes source code readable on Basescan
**Production Perplexity API:** Requires serverless proxy (e.g., Vercel function) to inject bearer token. Example provided in README.
**.env setup (app/):** `PERPLEXITY_API_KEY` (server-side only, never bundled), `VITE_APP_MODE`, `VITE_WC_PROJECT_ID`, `VITE_ALCHEMY_KEY`, `VITE_MOCK_USDC_ADDRESS`, `VITE_TREASURY_VAULT_ADDRESS`. See `.env.example`.

## Testing

- **Domain tests (28 passing):** Vitest, 100% branch coverage on policy-engine, approvals, execution, ledger, reconciliation
- **UI flow tests (4 critical paths):** sweep, rebalance, payout batch, month-end close — RTL + snapshots
- **Contract tests (89 passing):** Forge/Foundry — MockUSDC (18), TreasuryVault (18), PolicyEngine (20), LedgerContract (9), IntentRegistry (24); covers all revert paths, access control, event emissions, and security fixes
- **Manual checklist:** Overview → Policies → Approvals → Activity → Accounts → Reconciliation → Settings (verified before push)

## Next Steps

**Immediate:**
1. ✅ **Contracts deployed** — Base Sepolia, addresses documented above
2. ✅ **Two Vercel projects live** — `demo-treasuryflow.vercel.app` (mock) and `testnet-treasuryflow.vercel.app` (testnet)
3. **Verify contracts on Basescan** — `forge script script/Deploy.s.sol --rpc-url base_sepolia --verify --etherscan-api-key <KEY>` so judges can read source code
4. **Wire real destination addresses** — replace `0x000…dEaD` placeholder in `useTestnetExecution.ts` with actual onchain account addresses

**v1.1:**
4. **Real backend + database** — Move from localStorage to persistent store (Postgres + Node API)
5. **Coinbase for Business integration** — Real onchain execution and balance polling
6. **Coinbase Offramp** — Real bank settlement and ACH/wire flows
7. **Authentication & RBAC** — Real user identity, role enforcement, audit trail
8. **Streaming UI** — Token-by-token rendering for AI responses
9. **Compliance reporting** — SOX, AML, KYC hooks; audit report generation with Perplexity citations
10. **Real-time alerts** — Websocket-based balance and policy monitoring
11. **Multi-currency** — Support ETH, USDT, stablecoins beyond USDC
12. **Rate feeds** — Real-time pricing and conversion rates
13. **E2E tests** — Playwright suite for critical paths across browsers
