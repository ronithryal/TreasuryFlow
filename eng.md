# Engineering Log — TreasuryFlow

## Architecture Overview

**Stack:** React 18 + TypeScript + Zustand (state) + Tailwind CSS + shadcn/ui + Vite

**Domain-first pattern:**
- `src/types/domain.ts` — Single source of truth for all types (Account, Policy, Intent, Execution, Ledger)
- `src/domain/` — Pure policy engine, approval rules, execution simulator, ledger projection (100% testable without UI)
- `src/store/` — Zustand slices per domain (accounts, policies, intents, ledger, etc.) with localStorage persist
- `src/components/shared/` — Reusable primitives (StatusBadge, Money, DetailDrawer, AgentPanel, etc.)
- `src/pages/` — Page-level UI composition (Overview, Policies, Approvals, Activity, Accounts, Reconciliation, Settings, Onboarding)

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
- **Purpose-driven UX**: Accounts now support a `description` field for operational context (e.g. "Main reserve", "Payroll").

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
- **Multi-Wallet Auth & Onboarding**: 
  - **Global Wallet Watcher**: Moved redirection logic from `Topbar` to `App.tsx` (above the `Switch`) to ensure consistency across page transitions and prevent accidental "orphaned" redirects.
  - **Known Wallets**: Intelligent redirection to specific account detail view (`/accounts?id=...`) upon connection.
  - **Unknown Wallets**: Automated deep-link to `/onboarding/unlinked` for sovereign wallet registration, with a logic-bypass for the Overview page to support graceful "Cancel" flows.
  - **Linking Logic**: `linkAccount` action in store dynamically associates wallet addresses with legal entities, persisting via `localStorage`.
- **Mirror-Sync State Management**:
  - `setTestnetBalances` now performs a "mirror-sync" operation, updating both the `testnet` slice and the primary `accounts` array (specifically `acc_base_ops`). This ensures that KPI cards, charts, and account lists stay in sync with onchain reality without requiring a full page refresh.
- **Resilient RPC Auditing**:
  - `usePolicyExecutionLogs.ts` implements a "graceful fallback" for Alchemy free-tier block range errors. It suppresses `eth_getLogs` limit errors and prioritizes locally stored execution metadata, ensuring the Audit UI remains demo-ready even under heavy RPC load.
- **Automatic State Restoration**:
  - `clearTestnet` action now re-seeds the store with the full $2.3M mock treasury upon wallet disconnection, ensuring the demo environment never feels "empty" after a live testnet session.

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

---

## TreasuryFlow v1 Engineering Plan

> **All coding agents must read this section before making changes.**
> **Each task must update this document when complete.**
>
> Base branch: **`plan1-integration`** — all v1 work branches from here.
> `p1/openfx-scaffold` is **not merged**; OpenFX is scaffolded under
> `integrations/openfx/` and `docs/openfx-integration.md`, gated by
> `OPENFX_ENABLED=false`. Do not wire it into any live code path.

**Goal:** Ship a full v1 demo on **Base Sepolia** where a user can connect a wallet, see balances/exposure, receive AI-generated proposals, approve an execution plan, and run it end-to-end — **without requiring NemoClaw or OpenFX**.

NemoClaw and OpenFX are explicitly **out of scope for v1**; they come later behind feature flags.

---

### Rails in v1 — Real vs Mocked

| Rail | Status in v1 | Notes |
|------|-------------|-------|
| **AI (Hermes / Perplexity / Exa / Fireworks)** | ✅ Real | Live API keys; mock fallback preserved |
| **Base Sepolia contracts** (`PolicyEngine`, `IntentRegistry`, `TreasuryVault`, `LedgerContract`) | ✅ Real | Deployed, wired, and tested |
| **WalletConnect (wagmi + Web3Modal/AppKit)** | ✅ Real | User-controlled onchain wallets on Base Sepolia |
| **CDP Embedded Wallets** | ✅ Real | Backend `/api/cdp/wallet-token` + frontend CDP SDK; see TF-005 |
| **CDP Onramp / Offramp** | 🟡 Mocked | Realistic fake quotes and sessions; UI labeled "Coming soon / mocked rail" |
| **OpenFX (FX corridors)** | 🟡 Mocked | Scaffold under `integrations/openfx`, gated by `OPENFX_ENABLED=false` |
| **Bank adapters (ACH/wire)** | 🟡 Mocked | Scaffold only; no live fiat execution |
| **ERP webhooks (NetSuite / QuickBooks)** | 🟡 Mocked | Scaffold only; not wired to runtime |
| **Custody APIs (BitGo / Prime / Fireblocks / Coinbase Custody)** | 🟡 Mocked | `MockCustodyAdapter` (see TF-014); UI labeled "Coming soon – custody integration mocked" |

**Crypto-first principle:** v1 executes real value flows only on Base Sepolia via smart contracts and CDP Embedded Wallets. Every fiat, FX, bank, ERP, and custody rail is either a realistic mock adapter or an explicit "Coming soon" scaffold. No live fiat or custody execution occurs in v1.

---

### Tracks and Ownership

| Track | Focus |
|-------|-------|
| **Track A – Platform & cleanup** | Align app with roadmap, confirm WalletConnect, fence off future OpenFX |
| **Track B – Data & backend rails** | DB/domain model, CDP sandbox helpers, Base Sepolia helpers, execution step API |
| **Track C – AI (Hermes)** | Hermes tools, proposal and plan generation using backend endpoints |
| **Track D – Frontend** | Dashboard, Treasury Inbox, plan review UI, live execution monitor, audit/history |

---

### Issues

#### Track A – Platform & cleanup

**TF-000 · Cleanup: Align current app with new roadmap** ✅ Complete (2026-05-02)
- **Base Sepolia only**: `wagmi.ts` chains `[baseSepolia]` only; all contract addresses in `testnet.ts` (env-var overridable).
- **OpenFX**: `integrations/openfx/` gated by `OPENFX_ENABLED=false`; not imported by any live code path. No OpenFX network calls anywhere.
- **AI labels**: `AIPolicyBuilder` dialog now shows `[Demo]` badge and description clarifies keyword classification in v1. `AskAI` chat uses Perplexity proxy (real backend). Dev-only "Force mock AI" toggle gated by `SHOW_DEV_SETTINGS`.
- **ACH / Wire cash-out** in Settlement Rails now labeled `Demo` (was "Active"); description clarifies live fiat execution is coming soon.
- **No direct third-party API calls from browser**: Exa → `/api/exa-search`, Perplexity → `/api/agent-proxy` (Vite dev proxy / `VITE_AGENT_PROXY_URL`). CDP, Fireworks not called from frontend.

**TF-004 · WalletConnect: Confirm & document existing live integration** ✅ Complete (2026-05-02)
- **wagmi config** (`app/src/web3/wagmi.ts`): `chains: [baseSepolia]`, connectors `[coinbaseWallet({ appName, preference: all }), walletConnect({ projectId })]`. `projectId` from `VITE_WC_PROJECT_ID` env var (falls back to `'fake_project_id_for_demo'` for local dev).
- **Web3Provider** (`app/src/web3/Web3Provider.tsx`): `createWeb3Modal({ wagmiConfig, projectId, metadata, enableAnalytics, themeMode: 'dark' })`. Wrapped in `WagmiProvider` + `QueryClientProvider` (TanStack Query). Mounted only when `IS_TESTNET=true` (tree-shaken in mock build).
- **Agents do not manage WalletConnect sessions**: WalletConnect is user-initiated only. v1 backend execution uses CDP Embedded Wallets and the demo approver key.
- **Scope of WalletConnect in v1**: EVM-compatible self-custody wallets on Base Sepolia only (MetaMask, Ledger, Gnosis Safe, hardware signers, BitGo hot wallets as plain EVM wallets).
- **Custodian distinction documented in Settings**: "Connect wallet (WalletConnect)" shows Live; "Connect custodian" shows Coming soon with explanation that full custodial APIs (BitGo Prime, Fireblocks, Coinbase Custody) bypass WalletConnect's scope and require the custody adapter layer (TF-014).

---

#### Track B – Data & backend rails

**TF-001 · Domain Model: Core DB entities & JSON schemas** ✅ Complete (2026-05-02)
- Added backend models to `app/src/types/domain.ts`: `TreasuryWallet`, `BalanceSnapshot`, `Exposure`, `ActionProposal`, `ExecutionPlan`, `ExecutionStep`, `ExecutionRecord` (all with branded ID types)
- Existing `Intent` / `Policy` / `LedgerEntry` / all P0 flows untouched
- Zod-based JSON Schema validators in `app/src/domain/schemas.ts`: `validateActionProposal()` and `validateExecutionPlan()` — server-safe, usable in Vercel functions and browser
- 47 unit tests added in `app/src/test/domain/schemas.test.ts` (valid + invalid examples for each schema); all 75 tests pass, zero TS errors

**Final model shapes (reference for Sessions 3–12):**

```typescript
// app/src/types/domain.ts — new branded IDs
TreasuryWalletId, BalanceSnapshotId, ExposureId
ActionProposalId, ExecutionPlanId, ExecutionStepId, ExecutionRecordId

// TreasuryWallet
{ id, type: "EMBEDDED"|"EXTERNAL"|"DEMO", mode: "DEMO"|"PRODUCTION",
  chain, network, addresses: string[], label, custodian?, maxDailyOutflowUsd?,
  metadata, createdAt, updatedAt }

// BalanceSnapshot
{ id, walletId, chain, asset, balance, balanceUsd, snapshotAt,
  source: "onchain"|"cdp"|"custody"|"manual" }

// Exposure
{ id, portfolioId, asset, chain?, counterparty?, issuer?,
  amountUsd, pct, concentrationRisk: "LOW"|"MEDIUM"|"HIGH", computedAt }

// ActionProposal
{ id, version, createdAt, createdBy, portfolioId, mode, priority,
  type: "REBALANCE"|"FX_HEDGE"|"FUNDING"|"PAYMENT"|"YIELD_SHIFT",
  status: "DRAFT"|"UNDER_REVIEW"|"APPROVED"|"REJECTED"|"CANCELLED"|"EXECUTED_PARTIAL"|"EXECUTED_FULL",
  inputs: { source: {...}, target: {...}, constraints?: {...} },
  expectedImpact: { beforeExposure?, afterExposure?, estimatedPnlUsd?, feeEstimateUsd?, riskScore? },
  policyChecks?: [{ policyId, result: "PASS"|"WARN"|"FAIL", messages? }],
  rationale: { summary, details?, marketContextId? },
  linkedExecutionPlanId?, metadata? }

// ExecutionStep
{ id, index, dependsOn?, type: "QUOTE"|"SWAP"|"TRANSFER"|"ONRAMP"|"OFFRAMP"|"APPROVAL"|"LEDGER_WRITE"|"NOOP",
  status: "PENDING"|"RUNNING"|"COMPLETED"|"FAILED"|"SKIPPED",
  tool: { kind: "OPENCLAW_SKILL"|"INTERNAL_API", name },
  params, expectedOutcome?, result?, error? }

// ExecutionPlan
{ id, version, createdAt, createdBy, proposalId, mode,
  status: "DRAFT"|"PENDING_APPROVAL"|"APPROVED"|"RUNNING"|"COMPLETED"|"FAILED"|"CANCELLED",
  steps: ExecutionStep[], summary?, metadata? }

// ExecutionRecord
{ id, planId, stepId, walletId, chain, asset, amount?, amountUsd?,
  txHash?, quoteId?, status, mode, raw?, error?, executedAt }

// Validators (app/src/domain/schemas.ts)
validateActionProposal(data: unknown): ValidationResult<ActionProposalOutput>
validateExecutionPlan(data: unknown):  ValidationResult<ExecutionPlanOutput>
// ValidationResult = { success: true, data } | { success: false, errors: [{path, message}] }
```

**TF-005 · CDP: Embedded Wallets integration (real) + Onramp/Offramp scaffold (mocked)** ✅ Complete (2026-05-02)

_The main real deliverable is CDP Embedded Wallets. Onramp/Offramp are explicitly mocked adapters in v1._

**CDP Embedded Wallets (real, v1):**
- Backend endpoint `POST /api/cdp/wallet-token` (`app/api/cdp/wallet-token.ts`): signs a HS256 JWT using `CDP_API_KEY` (kid) and `Buffer.from(CDP_SECRET_KEY, "base64")` as HMAC secret. Returns `{ token: string; expiresAt: number }`. Dev proxy wired in `vite.config.ts` (`cdpWalletTokenProxy`). Credentials stay server-side.
- Frontend hook `useCdpEmbeddedWallet` (`app/src/web3/useCdpEmbeddedWallet.ts`): calls `/api/cdp/wallet-token`, caches the token (re-fetches when <30 s from expiry), and provides:
  - `authenticate(userId?)` → `CdpWalletToken`
  - `createDemoWallet()` → `TreasuryWallet { type: EMBEDDED, mode: DEMO }` (provisioned on Base Sepolia)
  - `fundDemoWallet(walletId, amountUsd?)` → `FundResult` (targets MockUSDC.mint on Base Sepolia; simulated in v1 when faucet unavailable)
- The wagmi `coinbaseWallet({ preference: { options: "all" } })` connector in `wagmi.ts` exposes the Embedded Wallet UX in the browser — no separate frontend SDK package required.

**CDP Onramp / Offramp (mocked, v1):**
- `app/src/adapters/cdp/onramp.ts`: `getBuyQuote(asset, fiatAmount, fiatCurrency)` and `initiateOnramp(quoteId, destinationAddress)` return realistic fake objects. `ONRAMP_MOCKED = true`.
- `app/src/adapters/cdp/offramp.ts`: `initiateOfframp(asset, cryptoAmount, destination, fiatCurrency)` returns a fake session. `OFFRAMP_MOCKED = true`.
- `app/src/adapters/cdp/index.ts`: barrel re-export.
- All UI surfaces that call these adapters MUST display "Coming soon – mocked fiat rail. No real fiat execution occurs in v1."

**`GET /api/portfolio_state` — response shape (reference for TF-003/TF-009):**

```typescript
// app/api/portfolio_state.ts — PortfolioState
{
  portfolioId: string,               // "demo_portfolio_1"
  computedAt: string,                // ISO-8601
  mode: "DEMO" | "PRODUCTION",
  totalUsd: number,                  // sum of balanceSnapshots[].balanceUsd
  wallets: TreasuryWallet[],         // EMBEDDED + DEMO wallet objects
  balanceSnapshots: BalanceSnapshot[], // one per (wallet × asset)
  exposures: Exposure[],             // one per asset / concentration bucket
  custodyAccounts: CustodyAccount[], // from MockCustodyAdapter (MOCKED)
}
// Dev proxy: portfolioStateProxy() in vite.config.ts
// Production: Vercel serverless at app/api/portfolio_state.ts
// TF-007 / TF-009 will replace static seed with live Postgres aggregation.
```

**TF-006 · Onchain: Base Sepolia contract helpers** ✅ Complete (2026-05-02)

Module: `app/src/adapters/base-sepolia/` — server-side only (uses `process.env`, never `import.meta.env`).

**Shared client** (`client.ts`):
- `makePublicClient()` → viem `PublicClient` on Base Sepolia using `BASE_SEPOLIA_RPC_URL` (falls back to `VITE_ALCHEMY_KEY` URL, then public RPC)
- `makeWalletClient(privateKey)` → `{ client, account }` bundle for signing
- `makeDemoWalletClient()` → same, reads `DEMO_APPROVER_KEY` from env

**Four helpers** (`helpers.ts`) — all accept optional `publicClient`/`walletBundle` for unit testing without network access:

```typescript
// 1. Read ETH + ERC-20 balances; returns BalanceSnapshot[] per (address × asset)
chainGetBalances(
  walletAddresses: string[],
  chain?: string,
  opts?: {
    extraTokens?: Array<{ symbol, address, decimals }>;
    walletIdMap?: Record<string, string>;  // address → TreasuryWalletId
    publicClient?: ViemPublicClient;
  }
): Promise<WalletBalance[]>
// WalletBalance = { address, ethBalance, tokens: TokenInfo[], snapshots: BalanceSnapshot[] }

// 2. Generic read-only contract call (accepts any human ABI fragment at runtime)
contractCallRead(
  contractAddress: string,
  functionSignature: string,  // e.g. "function balanceOf(address) view returns (uint256)"
  args: unknown[],
  chain?: string,
  publicClient?: ViemPublicClient,
): Promise<unknown>

// 3. DEX swap — SWAP_MOCKED=true in v1; wire Uniswap V3 in TF-020
contractSwap(
  params: {
    fromToken, toToken: string;   // ERC-20 addresses
    amountIn: number;             // human-readable
    minAmountOut?, slippageBps?,  // default 50 bps
    routerAddress?,               // future: Uniswap V3 SwapRouter
    signerPrivateKey?,            // defaults to DEMO_APPROVER_KEY
    maxNotionalUsd?,              // default DEMO_SWAP_CAP_USD = 10_000
    planId, stepId, walletId: string;
    demoMode?: boolean;           // default true
  },
  walletBundle?: WalletClientBundle,
): Promise<{ txHash?: string; amountOut?: number; mocked: boolean; executionRecord: ExecutionRecord }>
// Throws if demoMode && amountIn > maxNotionalUsd.

// 4. ERC-20 stablecoin transfer (real onchain write)
transferStablecoin(
  params: {
    from: string;           // must equal signer address (transfer sends from msg.sender)
    to: string;
    amount: number;         // human-readable USDC
    tokenAddress?,          // defaults to MOCK_USDC_ADDRESS
    tokenDecimals?,         // defaults to 6
    signerPrivateKey?,      // defaults to DEMO_APPROVER_KEY
    maxAmountUsd?,          // default DEMO_TRANSFER_CAP_USD = 10_000
    planId, stepId, walletId: string;
    demoMode?: boolean;     // default true
  },
  injected?: { publicClient?, walletBundle? },
): Promise<{ txHash: string; amount: number; executionRecord: ExecutionRecord; balanceSnapshot: BalanceSnapshot }>
// Calls ERC-20 transfer(to, amount), waits for receipt, reads post-transfer balance.
// Throws if demoMode && amount > maxAmountUsd.
// Throws if `from` ≠ signer address.
// Throws if tx reverts (insufficient balance etc.).
```

**Demo caps:** `DEMO_TRANSFER_CAP_USD = 10_000`, `DEMO_SWAP_CAP_USD = 10_000` (match VENDOR_PAYMENT policy max).  
**Default token:** MockUSDC at `MOCK_USDC_ADDRESS` (env-overridable, 6 decimals).  
**Tests:** 28 unit tests in `app/src/test/adapters/base-sepolia-helpers.test.ts`; 120/120 pass, zero TS errors.  
**Consumers:** TF-020 (`execute_step` API) and TF-011 (`ExecutionRunner`) import from `@/adapters/base-sepolia`.

**TF-014 · Custody: Adapter interface + MockCustodyAdapter scaffold**

_Real custody APIs and their policy/approval flows are out of v1 scope. This ticket defines the interface so the rest of the system can treat custody accounts as first-class objects without blocking on live integrations._

- Define a `CustodyAdapter` TypeScript interface in `app/src/adapters/custody/types.ts`:
  ```ts
  interface CustodyAccount { id: string; name: string; balance: number; currency: string; custodian: string }
  interface CustodyAdapter {
    listAccounts(): Promise<CustodyAccount[]>
    getBalance(accountId: string): Promise<number>
    initiateTransfer(from: string, to: string, amount: number, currency: string): Promise<{ transferId: string }>
  }
  ```
- Implement `MockCustodyAdapter` in `app/src/adapters/custody/mock.ts`:
  - Returns 2–3 fake custody accounts with realistic-looking balances (e.g. Fireblocks hot wallet, BitGo cold vault)
  - `initiateTransfer` returns a mock `transferId` with a simulated `status: "PENDING"` after a short delay
  - Exports `CUSTODY_MOCKED = true` constant
- Portfolio UI: custody accounts rendered in the accounts list with badge **"Coming soon – custody integration mocked"**; balances shown as illustrative only
- Settings page: "Connect custodian" section shows a disabled button with tooltip "Real custody API integration coming soon — requires API keys and policy configuration"
- **Out of v1 scope:** Live API keys for BitGo, Fireblocks, Coinbase Custody, Anchorage; custody-native approval flows; multi-sig policy enforcement via custodian

**TF-007 · Backend: Market context service** ✅ Complete (2026-05-02)

**Endpoint:** `POST /api/market_context`  
**Body:** `{ portfolioId?: string }` (defaults to `"default"`)  
**Returns:** `MarketContext` (see shape below)

**Pipeline (all three APIs run in series):**
1. **Exa** — 3 parallel queries (treasury stablecoin risk, FX hedge, DeFi liquidity) → up to 15 highlights
2. **Perplexity sonar** — synthesises a 3–4 sentence CFO-facing narrative from Exa highlights
3. **Fireworks llama-v3p1-70b-instruct** — extracts structured JSON from the narrative

**Mock fallback:** when any of `EXA_API_KEY`, `PERPLEXITY_API_KEY`, or `FIREWORKS_API_KEY` is absent, or when any upstream call fails, a deterministic mock `MarketContext` is returned — the endpoint never returns 5xx to the client.

**Cache:** in-memory `Map<portfolioId, {data, expiresAt}>`, TTL = 15 minutes. Warm hits skip all API calls.

**Storage:** every response (live or mock) is written to `MARKET_CONTEXT_STORE` (module-level `Map<marketContextId, MarketContext>`). This allows `ActionProposal.rationale.marketContextId` to reference a stored context (replaces a real DB in v1).

**MarketContext JSON shape:**
```typescript
// app/src/types/domain.ts
export type MarketContextId = Brand<string, "MarketContextId">;

export interface MarketContext {
  marketContextId: MarketContextId;  // e.g. "ctx_1714648200000_a1b2c3d4"
  portfolioId: string;
  summary: string;          // 1–2 sentence CFO-facing narrative
  riskFactors: string[];    // 3–5 items, each ≤ 90 chars
  liquidityNotes: string[]; // 2–4 items, each ≤ 90 chars
  timestamp: string;        // ISO 8601
}
```

**Files:**
- `app/api/market_context.ts` — Vercel serverless handler (exports `buildMockMarketContext`, `MARKET_CONTEXT_STORE`)
- `app/src/services/market-context.ts` — client `fetchMarketContext(portfolioId?)` wrapper
- `app/src/test/market-context.test.ts` — 17 tests (client service, mock builder, schema contract)
- `app/vite.config.ts` — `marketContextProxy` dev plugin (same pipeline logic, no proxy needed in prod)
- `FIREWORKS_API_KEY` added to `.env.example` and `.env.local`

**Usage by Hermes (TF-003):**
```typescript
// tool_market_context → calls /api/market_context
const ctx = await fetchMarketContext(portfolioId);
// ctx.marketContextId can be stored in ActionProposal.rationale.marketContextId
```

**Tests:** 17 new tests added; total test count = 120 (all pass, zero TS errors introduced)

**TF-020 · Backend: `execute_step` API (no NemoClaw)**
- Implement `POST /api/execute_step` switching on `type` (`QUOTE`, `ONRAMP`, `OFFRAMP`, `SWAP`, `TRANSFER`, `LEDGER_WRITE`, `NOOP`) calling CDP/Base Sepolia helpers
- Return `{ raw, txHash?, quoteId? }` in the same shape as `ExecutionPlan.steps[i].result`

**TF-011 · ExecutionRunner service**
- Implement runner that reads `ExecutionPlan.steps`, calls `/api/execute_step`, updates step status/result/error, writes `ExecutionRecord`, and recomputes `BalanceSnapshot`
- Expose `POST /api/plans/:id/execute` and `GET /api/plans/:id/status`

---

#### Track C – AI (Hermes)

**TF-003 · Hermes: Tools without NemoClaw**
- Deploy Hermes with tools:
  - `tool_get_portfolio_state` → `/api/portfolio_state`
  - `tool_market_context` → `/api/market_context`
  - `tool_execute_step` → `/api/execute_step` (optional for later)
- System prompt enforces use of `ActionProposal` / `ExecutionPlan` schemas and `mode: DEMO` defaults

**TF-008 · Hermes proposal loop: generate, validate, store**
- Implement `POST /api/proposals/generate` → Hermes generates `ActionProposal[]`, backend validates against schema + policy, stores with `UNDER_REVIEW` status
- Add `GET /api/proposals` / `GET /api/proposals/:id` / `PATCH /api/proposals/:id` (approve/reject/edit)

**TF-010 · Execution plan generation**
- Implement `POST /api/proposals/:id/plan` → Hermes converts an approved `ActionProposal` into an `ExecutionPlan`, backend validates + stores as `PENDING_APPROVAL`

---

#### Track D – Frontend

**TF-009 · Frontend: Dashboard + Treasury Inbox**
- Dashboard: show wallets (demo + external), balances, exposure view, and simple alerts from `BalanceSnapshot`/`Exposure`
- Treasury Inbox: list proposals, show rationale + policy checks, allow approve/reject/edit via backend endpoints
- Portfolio summary widget using a small backend endpoint that wraps Hermes's NL posture summary

**TF-012 · Frontend: Plan review + live execution + audit**
- Plan review page: inspect steps, approve/cancel, and trigger execute
- Live monitor: poll `/api/plans/:id/status` and show per-step status and Basescan links for tx hashes
- Execution history tab: list `ExecutionRecord[]` with filters for DEMO vs PRODUCTION

---

#### Optional – Future integrations

**TF-013 · OpenFX: Scaffold as future integration (no merge)**
- Keep OpenFX types/client code under `integrations/openfx`, gated by `OPENFX_ENABLED=false` and described in `docs/openfx-integration.md`

**TF-N1 · NemoClaw plug-in (later, behind flag)**
- Deploy NemoClaw with skills mirroring backend helpers
- Update `/api/execute_step` to forward to NemoClaw when `NEMOCLAW_ENABLED=true`, mapping results into the same response shape

---

### Parallel Execution Schedule

#### Week 1: Stabilize platform + core rails
- **Session 1 (Track A):** TF-000 (cleanup) + TF-004 (WalletConnect documentation)
- **Session 2 (Track B):** TF-001 (domain model) + migrations
- **Session 3 (Track B):** TF-005 (CDP) and TF-006 (Base Sepolia helpers) in parallel once TF-001 is in place

_Outcome: clean Base Sepolia app, new tables, backend can talk to CDP sandbox and Base Sepolia._

#### Week 2: Market context + Hermes + proposals
- **Session 4 (Track B):** TF-007 (market context) + TF-020 (`execute_step` API)
- **Session 5 (Track C):** TF-003 (Hermes tools) + quick manual tests for `ActionProposal[]`
- **Session 6 (Track C):** TF-008 (proposal loop) + TF-010 (plan generation) once helpers are stable

_Outcome: `/api/proposals/generate` and `/api/proposals/:id/plan` work end-to-end._

#### Week 3: UI & execution loop
- **Session 7 (Track D):** TF-009 (Dashboard + Inbox), wired to real backend endpoints
- **Session 8 (Track B):** TF-011 (ExecutionRunner) using `/api/execute_step`
- **Session 9 (Track D):** TF-012 (Plan review + live execution + history)

_Outcome: full demo flow — connect wallet → see balances → generate proposal → approve plan → execute on Base Sepolia → see history._

#### Anytime: Future rails
- **Session X:** TF-013 (OpenFX docs & flag) — fully decoupled
- **Session Y (later):** TF-N1 (NemoClaw plug-in) once offloading execution to an agent skill layer

---

### Current Branch State

**Branch:** `plan1-integration` | **As of:** 2026-05-02

**Sessions 1–5 complete.** All work committed to `origin/plan1-integration`.

| Session | Tickets | Status |
|---------|---------|--------|
| Session 1 (Track A) | TF-000 (cleanup), TF-004 (WalletConnect docs) | ✅ Complete |
| Session 2 (Track B) | TF-001 (domain model + schemas) | ✅ Complete |
| Session 3 (Track B) | TF-005 (CDP embedded wallets), TF-006 (Base Sepolia helpers) | ✅ Complete |
| Session 4 (Track B) | TF-007 (market context service) | ✅ Complete |
| Session 5 (Track B) | Platform wrap-up — all adapters, tests, env wiring | ✅ Complete |
| **Session 6** | **TF-020** (`POST /api/execute_step`) | 🔜 Next |

**Session 6 preconditions met:** TF-005 (CDP adapters) and TF-006 (Base Sepolia helpers) are complete and tested. TF-020 can begin immediately.

**Test suite:** 120/120 passing, zero TS errors.
