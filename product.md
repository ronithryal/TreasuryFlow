# Product Log — TreasuryFlow

## Vision & Thesis

The $500B corporate treasury industry is built on a broken promise: *trust us with your money and we'll tell you what happened, quarterly.*

**TreasuryFlow replaces that promise with proof.**

We're building the first non-custodial treasury protocol where policies execute autonomously, every decision is cited and verifiable, and audits happen 24/7 — not once a year. Your USDC stays in your wallet. Your keys stay with you. TreasuryFlow just makes sure your money does exactly what you told it to do, and proves it onchain.

The billion-dollar insight isn't treasury management — it's **eliminating the cost of trust.** Traditional treasury ops cost $200k–500k/year in audits, 1–2 FTEs in reconciliation, and days of latency on every decision. TreasuryFlow collapses all of that: policies fire in seconds, Perplexity AI cites every transaction automatically, regulators can verify independently via Etherscan, and idle USDC earns yield through Morpho — all without a custodian in the loop.

We're not crypto for crypto's sake. USDC on Base is just better settlement infrastructure — faster, cheaper, and fully auditable compared to ACH. Any company moving money should be using it.

The future of treasury operations isn't a better bank. It's a **verifiable, composable, AI-audited policy engine** that never asks you to hand over your keys.

## Core Problem: The Latency of Trust
Current treasury operations (SAP, Oracle, NetSuite) are passive. They record what happened in the past. To ensure correctness, companies hire auditors (Big Four) to manually verify those records against bank statements. This creates:
1. **High Cost:** $500k+/year for mid-market audits.
2. **High Latency:** Market shocks (e.g., SVB collapse) require manual response that takes days/weeks.
3. **Operational Drag:** Reconciliation is a full-time job of tagging and matching.

## "Billion Dollar Path" — Core Features to Add

**Vision alignment: 24/7 verifiable audits + market shock response**

### 1. Real-Time Audit Report Generation
- **What:** On-demand PDF audit reports (daily/weekly)
- **Why:** Customers need continuously-available audit evidence for regulators and stakeholders
- **How:** 
  - Backend service generates PDF with: full ledger, policy decisions, approval chain, balance reconciliation
  - Perplexity API summarizes policy rationale (1-3 sentences per policy decision with citations)
  - Append Perplexity citations as footnotes/appendix
  - Available via API endpoint: `GET /api/audit-report?from=...&to=...` → PDF
- **Impact:** Automates 60% of audit prep work ($300k/year savings)
- **v1.0 target:** Basic PDF with Perplexity summaries

### 2. Anomaly Detection Engine (via Perplexity)
- **What:** Flag unusual transaction patterns and ask Perplexity to explain them
- **Why:** Detect fraud, counterparty risk, or operational errors in real-time
- **Anomalies to detect:**
  - High-value transfer (>2x normal for counterparty)
  - Unusual time-of-day (3am transfer when all others are 9-5)
  - New counterparty (first transaction ever)
  - Rapid sequential transfers to same recipient
  - Balance drop >20% in single day
- **How:** 
  - On-ledger: compute anomaly score for each entry
  - If score > threshold: call Perplexity with transaction + nearby history
  - Perplexity response: "This looks like a normal end-of-month payroll sweep" or "⚠️ Unusual: new counterparty with high amount"
  - Show as inline warning in Activity page
- **Impact:** Catch fraud + operational errors before settlement
- **v1.0 target:** 3-4 critical anomalies detected, Perplexity explains

### 3. Market Shock Detector & Auto-Rebalancing
- **What:** Monitor price feeds, detect >X% move, auto-trigger rebalancing
- **Why:** Respond to market shocks in seconds, not days
- **How:**
  - Poll CoinGecko free API every 5 min for USDC/ETH/BTC rates
  - If move >5%, trigger rebalancing policy (if enabled)
  - Send alert to dashboard: "🚨 USDC rate moved 7.5% — triggered rebalance to maintain ratios"
  - User clicks "View rebalance" → see intent, approve, execute
- **Impact:** Prevent capital loss from rate swings; catch arbitrage opportunities
- **v1.0 target:** Rate monitoring + alert; auto-rebalance is v1.1

### 4. Counterparty Risk Scoring (via Perplexity)
- **What:** AI-powered risk assessment based on transaction history + external signals
- **Why:** Replace static limits with dynamic risk scores
- **How:**
  - On first transaction with new counterparty:
    - Gather: amount, timing, frequency in peer group, name
    - Send to Perplexity: "Rate this counterparty's risk (low/medium/high). Consider: amount, timing, historical patterns. Explain your reasoning."
    - Perplexity response: "MEDIUM RISK: amount is 3x normal for this vendor, but timing is business hours and name matches legal entity. Recommend approval."
    - Flag on approval UI with score + rationale
  - Update score on each transaction
  - Show risk dashboard: table of counterparties with trends
- **Impact:** 40% fewer false positives in approval queue; better risk transparency
- **v1.0 target:** Basic risk score + Perplexity explanation

### 5. Settlement Verification (Onchain & Bank)
- **What:** Confirm ledger entries match actual onchain/bank settlement
- **Why:** Close the loop — prove settlements actually happened
- **How:**
  - For onchain: query Coinbase API → match ledger entry.txReference to actual tx
  - For bank: wait for webhook from Coinbase Offramp confirming ACH posted
  - On mismatch: flag "Settlement pending" → "Settlement confirmed" or "Settlement failed"
  - Show confirmation timestamp on ledger entry
- **Impact:** Eliminate ledger-to-reality gaps; 100% audit trail integrity
- **v1.0 target:** Query chain for sweep intents; bank verification is v1.1

### 6. Predictive Rebalancing
- **What:** Forecast balance changes 1-7 days out, suggest proactive rebalancing
- **Why:** Avoid surprises; move capital before need, not after
- **How:**
  - Historical analysis: payroll on Fridays, sweep on Mondays, weekly vendor payments
  - Perplexity: given upcoming scheduled intents, what balances will look like in 3 days?
  - Recommendation: "Rebalance Polygon to reserve by Wed to cover Fri payroll"
  - User accepts → policy fires on schedule
- **Impact:** Eliminate reactive rebalancing; more predictable cash position
- **v1.0 target:** Rule-based forecast (payroll patterns); Perplexity assist is v1.1

### 7. 24/7 Audit API
- **What:** Public/authenticated endpoint to generate audit report on-demand
- **Why:** Enable regulators, auditors, and stakeholders to pull evidence anytime
- **How:**
  - Endpoint: `GET /api/v1/audit-report?from=2024-01-01&to=2024-01-31&format=pdf|json`
  - Returns: full transaction ledger, policy decisions, approval chain, Perplexity summaries
  - Auth: API key (with audit-read permission) or OAuth
  - Audit trail: log every request to audit-access log
- **Impact:** Regulators get real-time visibility; reduces audit friction
- **v1.0 target:** Internal API; external audit endpoint is v1.1

### 8. Compliance Hooks (SAR, AML, KYC)
- **What:** Automated triggers for regulatory reporting
- **Why:** Catch reportable events before they become incidents
- **Triggers:**
  - SAR: High-value transfer (>$10k) or unusual pattern
  - AML: Rapid transfers or new high-risk counterparty
  - KYC: First transaction with counterparty above $50k
- **How:**
  - Event: intent created → check triggers → emit compliance_event
  - Compliance service: logs to immutable audit_compliance table, alerts compliance officer
  - Perplexity: explain why trigger fired ("Pattern matches money laundering: 5 small transfers consolidating to 1 large transfer")
  - UI: compliance dashboard showing pending SAR/AML flags
- **Impact:** Reduce compliance burden; document all decisions
- **v1.0 target:** SAR logging; AML/KYC hooks are v1.1

---

## Current State (MVP)

**Shipped (v0.1):**
- Treasury policy engine (sweep, rebalance, payout runs, deposit routing, cash-out)
- Maker-checker approval workflow with risk flagging
- Execution simulator and ledger reconciliation
- AI-powered tag suggestions (via Perplexity) for account categorization
- Intent rationale explainer (why did this policy fire?)
- Policy drafting assistant (natural language → policy JSON)
- Month-end completeness scoring and CSV export (ERP-ready)
- Dark mode + persistent state + demo reset
- Base Sepolia smart contracts for onchain verification
- WalletConnect integration for true non-custodial UX
- Morpho Yield integration flow
- 5 advanced AI features (Anomaly detection, Risk scoring, Market shock insights, Predictive forecasting, Audit rationales)
- 7 comprehensive demo scenarios
- **Intelligent Onboarding**: Sovereign wallet detection with automated deep-linking and multi-entity registration flow.
- **Purpose-driven UX**: Descriptive account labeling to track operational roles (e.g. "Main Reserve", "Payroll").
- **Unified Account Management**: Single source of truth for wallet details, synchronized across Entity and Account views.
- **KPI Synchronization**: Real-time mirroring of onchain balances into top-level dashboard metrics (Total Managed, Operating Liquidity).
- **Safe Wallet Lifecycle**: Protected deletion workflow that prevents orphan state while allowing cleanup of zero-balance test wallets.

**Shipped (v0.2 — dual-demo testnet architecture):**
- `VITE_APP_MODE` feature flag: single `main` branch powers two Vercel deploys (mock demo + testnet demo) with zero code divergence
- `MockUSDC` contract: ERC20 faucet (6 decimals, public `mint()`) for testnet onboarding
- `TreasuryVault` contract: custodies testnet USDC, emits `PolicyExecuted(policyId, source, dest, amount, action)` on every approval — the cryptographic audit trail
- Wallet hydration: `useAccount` connect → Zustand `hydrateTestnet()` wipes seed data and binds connected address as the operating account; live `balanceOf` polling updates UI every 8s
- `TestnetSetupBanner`: connect-wallet → mint 100k mUSDC onboarding flow with block-confirmation feedback and Basescan tx link
- `ApprovalDecisionBar`: testnet path runs `approve(USDC, vault, amount)` then `vault.executePolicy(...)` two-step before resolving intent in Zustand; mock path is pure Zustand
- Audit page (`/audit`): testnet mode queries `PolicyExecuted` logs via `getLogs` filtered by wallet address, renders live feed with Basescan deeplinks — proving to investors that real tokens moved; mock mode unchanged
- **Sovereign Wallet Interceptor**: Global watcher that intelligently routes connected wallets—deep-linking known accounts and triggering specialized onboarding for unrecognized addresses.
- **Graceful Onboarding Escape**: Implemented a "non-intrusive" linking prompt via the TestnetSetupBanner, allowing users to explore the dashboard while connected with an unlinked wallet without being trapped in redirect loops.
- `Web3Provider` conditionally mounted only when `IS_TESTNET=true` — zero wagmi overhead in mock build; all wagmi hooks live in sub-components (`TestnetHydrator`, `TestnetBannerContent`, `TestnetDecisionBar`) that never render outside `WagmiProvider`

**Shipped (v0.3 — Revamped Demo: Provable Stablecoin Treasury Controls):**
- **Onchain Payment Request Lifecycle**: Full request -> approve -> execute -> evidence flow on Base Sepolia.
- **Contract-Enforced Maker-Checker**: IntentRegistry ensures makers cannot approve their own requests.
- **PolicyEngine Validation**: Onchain enforcement of treasury guardrails for all executions.
- **Registry-Only Vault Execution**: TreasuryVault only moves funds for registered and approved intents.
- **Real mUSDC Recipient Transfer**: Actual token settlement to destination addresses.
- **Audit Evidence Page**: Verifiable transaction proof with direct Basescan links for all state changes.
- **Server-Side Demo Approver**: Automated second-signature simulation for a smooth demo experience.
- **Honest Coming-Soon States**: Clear placeholders for CDP wallets, login, WalletConnect, and yield features.
- **Finance-Language Cleanup**: Standardized terminology (“Payment Request,” “Activate Policy”) and USDC formatting.
- **Mock Demo Preservation**: Separate mock environment preserved for consistent offline/seeded demos.

**Shipped (v0.4 — Agent Architecture + Provider Scaffolding):**
- **Three-Layer Agent Model**: Hermes (reasoning/proposal) → Policy Validator (deterministic guardrails) → OpenClaw (execution runtime). AI is the orchestration layer, not a feature.
- **`ActionProposal` schema**: Structured JSON type capturing proposal type, source/target allocations, constraints, expected impact, policy check results, and AI rationale. All agent output conforms to this schema.
- **`ExecutionPlan` schema**: Step-level execution graph linked to a proposal — each step names a tool (OpenClaw skill or internal API), carries params, and records result/txHash/error on completion.
- **MarketContext service**: Exa (retrieval) + Perplexity (synthesis) + Fireworks (structured JSON shaping) pipeline that Hermes calls before generating proposals. All AI features are live with real API keys; mock fallback preserved.
- **Custody Adapter Scaffolding**: Interface-complete adapters for Coinbase Custody, Fireblocks, Anchorage Digital, and BitGo. All adapters return typed responses; users see “Coming soon — connect your custodian” in Settings. No live keys wired yet.
- **Fiat-to-Crypto Rail Scaffolding**: Coinbase Onramp, Offramp, and ACH/wire flows are scaffolded with full UI (funding page, off-ramp flow, bank account management). Users see the complete flow with “Coming soon” gates. No live fiat execution — good sandboxes are unavailable and verification bottlenecks preclude production wiring at this stage.
- **Demo Wallet Type**: `TreasuryWallet.type: DEMO` with `maxDailyOutflowUsd` guard is a first-class concept — same pipelines run in demo mode (testnet, capped amounts) and production mode (real rails, extra approvals).

**Verified:**
- 28 unit tests (policy engine, approvals, execution, ledger, reconciliation)
- 4 end-to-end demo scenarios (sweep, rebalance, payout batch, deposit routing)
- 3 Foundry tests (TreasuryVault: executePolicy pulls funds and emits, withdraw returns funds, reverts on zero amount)
- Perplexity Agent API integration with mock fallback (no API key required for demo)
- Base Sepolia contract compilation and tests passing (PolicyEngine, IntentRegistry, LedgerContract, MockUSDC, TreasuryVault)
- Production build: zero TS errors, clean Vite build

## User Personas & Value

### 1. **Treasury Manager** (primary user)
**Goal:** Reduce operational overhead and latency

- **Before TreasuryFlow:** 6 hours/week on manual balance monitoring, approval bottlenecks, exception handling
- **After TreasuryFlow:** Policies run autonomously; manager reviews exceptions in 15 min, approves in seconds
- **Value:** 50% time reduction, zero policy-execution latency, 100% audit trail

### 2. **Finance Controller** (stakeholder)
**Goal:** Provide auditors with continuous, verifiable compliance

- **Before TreasuryFlow:** Quarterly manual reconciliation (2 weeks), 4 audits/year, $500k audit cost
- **After TreasuryFlow:** Real-time tagged ledger, policy audit trail, Perplexity-cited decisions, drop-in audit reports
- **Value:** Audits reduce to spot-checks (1–2 per year, <$100k), 40% cost reduction

### 3. **CFO** (executive)
**Goal:** Reduce counterparty risk and capital allocation latency

- **Before TreasuryFlow:** Manual counterparty limits, approval chains (3–5 days), no real-time rebalancing
- **After TreasuryFlow:** Policies enforce limits automatically, market shocks trigger rebalancing in seconds, real-time dashboard
- **Value:** Avoid $10M+ frozen capital events, respond to FX or rate swings in seconds instead of days

### 4. **Compliance Officer** (stakeholder)
**Goal:** Reduce compliance risk and audit burden

- **Before TreasuryFlow:** Manual approval logs, no policy versioning, audit-trail gaps
- **After TreasuryFlow:** Every decision logged with rationale, policy changes timestamped, Perplexity citations for explainability
- **Value:** Reduce audit scope by 60%, strengthen regulatory defense, eliminate manual audit prep

## Roadmap (v0.1 → v1.0 → v2.0)

### Phase 1: v0.1 (Shipped) — MVP Demo
- Core policy engine + approval workflow
- Perplexity AI for tag suggestions + explainers + policy drafting
- Mock Coinbase for Business integration (coming soon scaffolds)
- Seed data + scenario buttons for 60-second demo
- Dark mode + localStorage persistence

### Phase 2: v1.0 (Next 4 weeks) — Production-Ready Agent Layer

**Agent Orchestration (Live)**
- Hermes agent loop: polls onchain state, calls MarketContext service, emits `ActionProposal[]` on schedule and on triggers
- `ActionProposal` → policy validator → `ExecutionPlan` pipeline wired end-to-end
- Treasury Inbox UI: proposals ranked by priority, policy check results (PASS/WARN/FAIL), approve/reject/edit
- OpenClaw skill registry: `chain_get_balances`, `contract_swap`, `transfer_stablecoin`, `walletconnect_send_tx`, `create_demo_wallet` — all callable from agent and from UI

**Compliance & Audit**
- PDF audit reports with Perplexity citations and policy rationale
- Policy change log (version history, timestamp, who changed what)
- Approval chain reconstruction (initiator → approvers → executor → settlement)
- Counterparty limit audit trail

**Real Backend**
- Postgres database (replace localStorage)
- Node.js API (authentication, authorization, write-through cache)
- Session management (JWT + refresh tokens)
- Audit log API (immutable ledger of all changes)

**Monitoring & Alerts**
- Real-time balance dashboard (WebSocket updates)
- Policy breach alerts (Slack, email, in-app)
- Settlement failure notifications + retry UI
- Market shock detector (e.g., >5% rate move → Hermes proposes rebalance)

**Multi-Entity Support**
- Subsidiary/entity selector in UI
- Entity-scoped policies and approvals
- Consolidation reporting (group-level balance view)

**Custody Adapter Wiring (Live — prioritized by customer demand)**
- Connect first custodian (Coinbase Custody or Fireblocks) with live API keys
- Balance sync, transfer initiation, and approval routing through custody layer
- Remaining adapters (Anchorage, BitGo) stay scaffolded until contracted

**Fiat-to-Crypto Rails (Scaffolding — Coming Soon)**
- Coinbase Onramp and Offramp UI is complete; live execution gated pending sandbox availability and KYC verification flow clearance
- ACH/wire integration scaffolded; production wiring deferred
- Users see full flow with "Coming soon" gates — no live fiat execution in this phase

### Phase 3: v1.1 (Weeks 5–8) — Market Expansion

**Fiat-to-Crypto Rails (Live — when sandbox + verification ready)**
- Fiat-to-digital-dollar funding (via Coinbase Onramp) — remove "Coming soon" gate
- Digital-to-fiat settlement (via Coinbase Offramp) — remove "Coming soon" gate
- Real bank ACH/wire integration
- KYC/KYB automation (regulated providers)

**Expanded AI Audit**
- Month-end close summary (fully automated, 24/7 available)
- Anomaly detection (Perplexity flags unusual patterns)
- Counterparty risk scoring (based on transaction history + external data)
- Predictive rebalancing (forecast needed moves 1–7 days out)

**ERP/Accounting Integrations**
- NetSuite, QuickBooks Online, Stripe syncing
- Real-time GL posting (sweep posts as transfer, tax treatment preserved)
- Automated tax reporting (US + international)

**Regulatory Reporting**
- FinCEN SAR triggers and filing
- AML/CFT monitoring and reporting
- SOX audit trail generation
- OFAC screening integration

### Phase 4: v2.0 (Months 3+) — Network Effect
**Liquidity Pools & Market Making**
- Integrate Uniswap, Curve, Aave for optimization
- Rebalance across pools to maximize yield
- Perplexity-cited strategy recommendations

**Cross-Chain Routing**
- Optimize sweep across Base, Polygon, Arbitrum, Optimism for lowest gas
- Atomic multi-chain settlement
- Bridge monitoring (TVL, rate, health)

**Partner Ecosystem**
- Coinbase Commerce integration (auto-settle customer payouts)
- Paypal/Stripe settlement routing
- B2B payment network APIs

**Institutional Grade**
- Custody partnerships (Coinbase, Fidelity, Kraken)
- White-glove compliance support
- SLA guarantees (99.99% uptime, <1s settlement)

## Strategic Product Roadmap

- **Agent Orchestration Core**: Hermes + OpenClaw three-layer model (propose → validate → execute) as the operating system for all treasury actions. Live.
- **Custody Adapters** *(scaffolded → live by customer demand)*: Coinbase Custody, Fireblocks, Anchorage Digital, BitGo. Interface-complete stubs shipped; live keys wired per customer contract. Users see "Connect your custodian" in Settings.
- **Coinbase Business Integration**: Unified payouts, balances, recipients, and accounting sync. Live onchain execution; fiat rails deferred (see below).
- **Fiat-to-Crypto Rails** *(scaffolded → live when verification unblocked)*: Coinbase Onramp/Offramp, ACH/wire, KYC/KYB. Full UI scaffolded with "Coming soon" gates. Good sandboxes unavailable; verification timelags preclude live wiring now. Ungate in v1.1 when ready.
- **Ramp Integration**: Stablecoin-funded corporate spend, bill pay, physical/virtual cards, and direct ERP workflows.
- **Circle Mint Integration**: Direct mint/redeem capabilities, role-based approval flows, granular reporting, and treasury APIs.
- **OpenFX Module**: Cross-border FX routing for stablecoin-to-local-currency payouts (OpenFX-style). Scaffolded adapter exists; live execution in Phase 3.
- **Verifiable AI/Audit Layer**: EigenCloud-style proving of offchain risk scoring and audit rationales.

## Metrics & Success

| Metric | Current | v1.0 Target | v2.0 Target |
|--------|---------|-------------|-------------|
| **Time to approve & execute** | 2–5 days (manual) | <30 seconds (policy + 1 approval) | <5 seconds (auto-approved) |
| **Audit cost savings** | 0% | 40% ($200k/year for $50M AUM) | 60% ($300k/year) |
| **Operational overhead** | 8 hours/week | 2 hours/week | <1 hour/week |
| **Policy coverage** | 60% of flows | 95% of flows | 99% of flows |
| **Settlement latency** | N/A (simulated) | <60s actual execution | <5s actual execution |
| **Counterparty risk incidents** | N/A | 0 policy breaches | 0 incidents |
| **Audit trail completeness** | 100% (logged in app) | 100% (logged in DB + chain) | 100% (immutable ledger) |

## Customer Archetypes

**Ideal First Customers (v1.0):**
- **High-volume operators** ($10M–500M AUM): fintech platforms, payment networks, payroll processors doing 100+ transactions/month
  - Example: Guidepoint (data platform) paying 50k contractors/month with USDC; today uses Coinbase API + manual reconciliation
  - Example: Airbnb-style marketplace settling host payouts 2x/week with USDC
  - Benefit: Automated policies (sweep when balance > $X, rebalance when rate moves >Y%) + immutable audit trail
  
- **Regulated entities** needing immutable audit trails + non-custodial settlement: stablecoins, RWA platforms, fintech
  - Example: Company issuing USDC on Base (holding reserves, not end-user deposits)
  - Benefit: Non-custodial = no insurance/custody risk. Immutable ledger = 24/7 regulatory visibility. Users verify on Etherscan.
  
- **Treasuries managing multi-chain reserves**: platforms holding USDC across Base, Polygon, Ethereum
  - Example: Early-stage fintech with $50M in stablecoins across 3 chains
  - Benefit: Atomic sweeps + rebalancing, no manual bridging, transparent costs, users hold their own keys
  
- **Any company using USDC as treasury rails** (not "crypto" — just better settlement than traditional banking)

**Deal Structure:**
- **Primary**: Settlement fees (0.5–1 bps per transaction) — transparent, usage-driven, no custody
  - $10M/month in sweeps = $50–100/month (vs. $1k+/month with Coinbase SaaS + API calls + audit costs)
  - Zero custody risk = lower insurance, lower regulatory burden = customer saves 2-5bps vs. traditional banking
  
- **Secondary**: Optional SaaS tier ($5k–20k/month) for premium compliance, anomaly detection, DeFi integrations
  
- **Success model**: Customer saves $200k/year on audits (non-custodial = regulatory advantage) → we earn 10–20% of savings

## Competitive Differentiation

| Feature | TreasuryFlow | Traditional | Competitors (Notional, Ondo, etc.) |
|---------|--------------|-------------|-------------------------------------|
| **Custody Model** | ✅ Non-custodial (user controls keys) | Custodian (we hold your funds) | Mostly custodian |
| **Wallet Control** | ✅ WalletConnect (any wallet they want) | Proprietary or embedded | Proprietary |
| **Settlement Model** | ✅ Onchain (immutable, verifiable) | Bank or custodian | Custodian or wrapped |
| **Yield on Idle Cash** | ✅ Morpho, Aave, others (user owns position) | Manual DeFi (risky) | Partial yields |
| **Audit Trail** | ✅ Contract logs (queryable, tamper-proof) | Ledger (manual, audit-dependent) | Partial indexing |
| **24/7 Audits** | ✅ Perplexity-cited + onchain proof | Manual, quarterly | No |
| **Natural Language Policies** | ✅ Draft with AI → execute onchain | No | No |
| **Real-time Execution** | ✅ <5s (direct contract call) | 2–5 days | Minutes to hours |
| **Composability** | ✅ Other protocols call your treasury | No (closed custody) | Limited (gated) |
| **Multi-chain** | ✅ Base + Ethereum + Polygon (future) | Single chain or custodian | Limited |
| **Compliance Reporting** | ✅ PDF + SAR/AML hooks + onchain proof | Manual prep | Partial |
| **Regulatory Advantage** | ✅ Non-custodial = no banking license needed | Custodian (regulated) | Varies |
| **Fee Model** | ✅ Usage-driven (0.5–1 bps settlement) | Fixed SaaS + audit costs | Fixed SaaS |
| **Regulatory Transparency** | ✅ Regulators query Etherscan directly | Auditor-dependent | Partial |
| **Cost to Customer** | Settlement fees (0.5–1 bps) + optional SaaS | $500k/year audit + 1 FTE + $1k+/month | $100k–250k/month |

## Technical Decisions & Architecture (Musings)

### The Non-Custodial Mission

**Our principle:** "Keep your USDC in YOUR wallet. We'll automate policies & prove execution onchain."

Every technical decision flows from this. We don't hold funds, we don't hold keys, we don't take custody risk. Everything is non-custodial or it's not TreasuryFlow.

---

### Wallet Integration: Why WalletConnect

**Decision: WalletConnect (primary) + Coinbase Onramp/Offramp (secondary fiat bridge — scaffolded)**

**The choice:**
- ❌ NOT embedded wallets (CDP) — those would mean "Coinbase holds your keys" (even if encrypted client-side)
- ✅ YES WalletConnect — user picks ANY wallet they want (MetaMask, Ledger, Gnosis Safe, Trezor, hardware, etc.)

**Why this matters:**
- **"YOUR wallet"** is literally true — they control the keys, not us, not Coinbase
- **Institutional-grade** — multi-sig treasuries, Gnosis Safe, hardware signers all work
- **Future-proof** — ERC-4337 account abstraction wallets all support WalletConnect
- **Flexible** — users upgrade wallets without re-onboarding

**Trade-off:** Extra click (user approves in their wallet) vs. embedded wallet UX. For institutional treasuries managing millions, that's a feature.

**Fiat flows (v1.1, deferred):** Coinbase Onramp (USD → USDC to their wallet) and Offramp (USDC → USD to bank) are pass-through bridges and will remain non-custodial by design. The UI is scaffolded and visible to users as "Coming soon." Live execution is deferred to v1.1 — no adequate sandbox exists for safe testing, and production verification has timelags that make early wiring risky. User's USDC will always live in their WalletConnect wallet, never ours, once live.

---

### Agent Architecture: Three-Layer Model

**Decision: Hermes (reasoning) → Policy Validator (guardrails) → OpenClaw (execution)**

The AI is not a feature layer on top of the product. It is the operating system. Every treasury action originates as an AI proposal, passes a deterministic policy check, and is then executed step-by-step through discrete, auditable skills.

**Layer 1 — Hermes (propose)**
- Reads compressed portfolio state via `tool_get_portfolio_state`
- Pulls market context via a MarketContext service: Exa (retrieval) + Perplexity (synthesis) + Fireworks (JSON shaping)
- Emits `ActionProposal[]` — structured JSON with proposal type, source/target, constraints, expected impact (before/after exposure, fee estimate, risk score), and a cited rationale
- Hermes never touches contracts or wallets directly; it only produces proposals

**Layer 2 — Policy Validator (check)**
- Deterministic backend service: for each `ActionProposal`, evaluates every active `Policy` rule
- Emits `PolicyCheckResult[]` with `PASS / WARN / FAIL` per rule and human-readable messages
- A single `FAIL` blocks the proposal from becoming an `ExecutionPlan` without override
- This is the cryptographic guarantee: every executed action was explicitly validated

**Layer 3 — OpenClaw (execute)**
- Skills are discrete, logged, deterministic functions: `chain_get_balances`, `contract_swap`, `transfer_stablecoin`, `walletconnect_send_tx`, `create_demo_wallet`, `fund_demo_wallet`
- Fiat rail skills (`cdp_get_buy_quote`, `cdp_initiate_onramp`, `offramp_initiate`) exist as scaffolded stubs — they return mock responses and render "Coming soon" in the UI until live rails are unblocked
- Custody adapter skills (`coinbase_custody_transfer`, `fireblocks_transfer`, etc.) are scaffolded stubs — same pattern
- Each skill updates `ExecutionPlan.steps[i].status/result/error` on completion; every step is auditable

**Demo vs. Production parity:** `mode: DEMO` routes the same pipelines through `type: DEMO` wallets on testnet with capped `maxDailyOutflowUsd`. No separate code paths. Swapping to production just changes the mode flag and unblocks custody/fiat skills.

**What's live today:** All AI reasoning (Hermes/Perplexity/MarketContext), all smart contract execution (Base Sepolia + mainnet), all policy validation. What's scaffolded: fiat rails, custody adapters, cross-chain bridges.

---

### Morpho Yield Integration: Earn Interest While Non-Custodial

**Decision: Add Morpho yield to MVP (Base Sepolia testnet)**

**The insight:** "Idle USDC earns nothing" is a real problem for treasuries. But we can solve it while staying 100% non-custodial.

**How it works (non-custodial):**
1. User creates policy: "If idle balance > $100k for >7 days, auto-deposit 80% to Morpho"
2. When triggered:
   - User's WalletConnect wallet signs: `USDC.approve(morphoRouter, amount)`
   - User's wallet signs: `Morpho.supply(usdc, amount, user.address)` (not TreasuryFlow)
   - Morpho mints mUSDC → sent to user's wallet
   - User owns mUSDC position, earns interest automatically
3. Result: **TreasuryFlow never touched USDC; user owns yield**

**Why Morpho?**
- Simplest non-custodial yield (vs. complex multi-step Aave or Curve strategies)
- Good rates on Sepolia testnet for MVP demo (~5–10% APY)
- User can withdraw anytime or migrate to other protocols later (composable)
- Adds product value: "Automate policies AND earn yield"

**Trade-off:** Adds ~3 hours of integration work. Value is high (solves real problem while proving non-custodial principle).

**Future:** Aave, Curve, other protocols follow same pattern (user approves, owns position, TreasuryFlow just logs policy).

---

## How It All Fits: The Non-Custodial Promise

**Mission:** "Keep your USDC in your wallet. We'll automate policies & prove execution onchain."

**Architecture alignment:**
- **WalletConnect** (not embedded wallets) = user picks their own wallet, keeps their own keys
- **Morpho yield** (not proprietary strategies) = user owns mUSDC position, can move it anytime
- **Onchain settlement** (not off-chain ledger) = immutable, verifiable, regulators can audit independently
- **Non-custodial** (not regulated custody) = no banking license needed, lower regulatory burden, user trust is earned not demanded

**Why this matters:**
- Traditional treasuries: "Send us your millions, we promise not to lose them" (trust model)
- TreasuryFlow: "Keep your millions, we'll prove execution onchain" (verification model)
- The verification model reduces the "cost of trust" by 60–80% (audit costs drop, no custody insurance, regulatory advantage)

---

## Anti-Goals

- ❌ We are **not** a custodian (users hold USDC in their WalletConnect wallet, not ours)
- ❌ We are **not** a consumer wallet (institutional treasuries managing company USDC, not retail traders)
- ❌ We are **not** a yield farming bot (we optimize capital allocation + compliance, not speculation/returns)
- ❌ We are **not** replacing risk committees (policies are guardrails; humans decide strategy)
- ❌ We are **not** "crypto for crypto's sake" (Base + USDC is settlement infrastructure, like companies use ACH)
- ❌ We are **not** shipping live fiat-to-crypto rails yet — sandbox limitations and verification timelags make this premature. UI is scaffolded; live execution is gated until v1.1 when those constraints clear.

## Go-to-Market (v1.0)

1. **Founder sell** to 3–5 target customers with Coinbase for Business
2. **Case studies** (time saved, audit cost reduction, settlement latency improvement)
3. **Content** (treasury best practices, AI audit explainability, Perplexity use case study)
4. **Product launch** (ProductHunt, Hacker News, fintech newsletters)
5. **Sales + partnerships** (Coinbase partner program, fintech integrators)

## Funding Strategy

**Seed (current):** $500k–$2M to ship v1.0 + close first 3 customers
- Engineering: 3 hires (backend, infra, QA)
- Product: polish + customer research
- Sales: founder + 1 AE

**Series A (v1.1):** $10M to scale to 20–30 customers + build platform
- Engineering: +4 (full platform team)
- Sales: +2 AEs, customer success
- Product: ecosystem integrations

**Series B (v2.0):** $40M+ for network effects + institutional scale

---

## 2026-05-02 – P0 solidified, P1 scaffolding in place

**Summary**

Locked in the direction to **build on the existing TreasuryFlow repo rather than start from scratch**. The current codebase has a strong foundation: live Base Sepolia contracts, a clean React/Zustand frontend, and an AI layer that already handles explainability and policy drafting. The focus now is to complete the **P0 golden-path demo** and stand up a realistic **P1 adapter + agent orchestration** layer.

**What's solid**

- Contracts: Five-core-contract architecture (`PolicyEngine`, `IntentRegistry`, `TreasuryVault`, `LedgerContract`, `MockUSDC`) is deployed and wired correctly on Base Sepolia.
- Frontend: React + TypeScript + Vite app with `web3/` hooks, Zustand store, and an Audit surface that can link through to Basescan.
- Coordination: `plan1-integration` carries the multi-agent build plan (`CLAUDE.md`, `AGENT_HANDOFFS.md`, `DEMO_ACCEPTANCE.md`, `P0_RISKS.md`) and scripts for repeatable testnet deployment and demo resets.
- AI layer: `AgentClient` abstraction with Perplexity Sonar integration and mock mode, plus higher-level helpers for intent explanations, tag suggestions, and policy drafting.

**New reality for Plan 0 (P0)**

P0 is now framed as: **one fully honest, cryptographically-verifiable demo on Base Sepolia** that walks a CFO through maker-checker approval and into an onchain audit trail.

Concrete P0 work:

- Finish the "no hardcoded addresses" story by having the deploy script emit an `addresses.json` artifact and having the frontend load it instead of relying on hardcoded fallbacks.
- Tighten the "honest path" flow in the UI: create intent → approve → execute → view ledger → click out to Basescan.
- Implement WalletConnect properly so the demo uses a real wallet with testnet USDC.
- Use the existing AI helpers for **explainability only** (intent rationale, tagging, month-end summary) — no orchestration yet.

**Plan 1 (P1) – Adapters + agent harness**

`p1/openfx-scaffold` is confirmed as the starting point for Plan 1: all six provider adapters exist as stubs under `app/src/adapters/`, with **OpenFX** having a realistic `MockOpenFXAdapter` that simulates FX corridors like USD→MXN and USD→GBP (rates, spreads, routes, expiry).

Updated P1 focus:

- Finalize a common async interface across all adapters (OpenFX, Coinbase, Circle, Ramp, Bank, ERP) with `quote()` and `execute()` flows.
- Introduce an **agent orchestration module** that:
  - Reads live balances / intents from the contracts.
  - Calls mocked adapters for quotes.
  - Uses the AI layer to generate structured `ActionProposal[]` (the "Treasury Inbox").
- Start a lightweight EigenCloud-style verification layer that checks every proposal against hard constraints before it becomes an onchain intent.

**Decision**

No new repo. The work going forward is **surgical**: wire up `addresses.json`, fix wallet connectivity, add an `agent-orchestrator` on top of the existing AI + adapter scaffolds, and then progressively replace mocks with live rails.

---

## 2026-05-02 – Making AI the foundation, not a feature

**Summary**

Clarified the north star: **TreasuryFlow should treat AI as the operating system of the product, not a bolt-on feature.** The long-term shape is a proactive treasury agent that continuously monitors balances, markets, and rails, then proposes and executes moves within strict policy and verification bounds. The current explainability helpers are good, but they become *subroutines* inside a larger agent loop rather than the main act.

**What AI is today**

Right now the AI layer is **reactive and surface-level**:

- `AgentClient` wraps Perplexity Sonar (with a mock mode) and powers helpers like `explainIntent`, `suggestTags`, and `draftPolicy`.
- These functions are triggered by UI events (clicks), return strings/JSON, and do not maintain their own notion of portfolio state or risk.
- They are valuable for *understanding* what's happening, but they do not *drive* what happens next.

This is AI as a feature: helpful, but not in control.

**What AI needs to become**

The new direction is to make AI the **orchestration layer for the whole treasury OS**:

- Introduce an **agent loop** that runs on a schedule or event triggers:
  - Reads onchain state (balances, open intents, policy thresholds) from the Base Sepolia contracts.
  - Pulls in offchain context via the adapter layer (FX quotes from OpenFX, bank rails, ERP signals) – initially mocked in `p1/openfx-scaffold`.
  - Calls the AI stack to generate structured `ActionProposal[]` – proposed sweeps, FX trades, payouts, and rebalances.
- Every proposal is then:
  - Checked against hard constraints (limits, allowed corridors, policy rules).
  - Written into the system as an object that can become an onchain intent after human approval.

In this model, **the AI is the decision engine**, and the contracts + adapters are execution backends.

**How this changes the roadmap**

- P0: AI remains **assistive** (rationales, tagging, policy drafting) to prove value and trust inside a fully honest onchain demo.
- P1: The adapter layer plus a new `agent-orchestrator` module turn AI into a **continuous monitoring and proposal engine**, using mocked providers to shape the UX and API surfaces.
- P2: Live rails (OpenFX, Circle, banks) + EigenCloud-style verification move AI from "propose only" toward **policy-bounded autonomy**, where some actions can be auto-executed under strict guardrails.

**Product principle going forward**

Design every new feature with the assumption that **the primary user of the system is the agent**, and humans are approving, configuring, and auditing its behavior. UIs, APIs, and adapters should be built for an AI-first client that is always running, not just for a human clicking buttons.
