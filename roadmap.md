# Roadmap: Demo → Production

## Strategy

**Two branches, one onchain protocol:**

| Branch | Purpose | Status | Target | Use Case |
|--------|---------|--------|--------|----------|
| **`main`** (demo) | Demoable MVP for investor/customer demos | ✅ Shipped | Evergreen | Sales calls, investor pitches, proof-of-concept |
| **`production`** | Onchain contracts on Base, backend API, compliance, real settlement | 🔨 In progress | 4 weeks | v1.0 shipping to customers |

**Key principle:** Demo simulates onchain execution (seeded USDC in mock wallets, policy engine route instructions). Production deploys real contracts to Base + uses Coinbase CDP embedded wallets for users.

**Non-custodial architecture:**
- Users hold USDC in **their own WalletConnect wallet** (MetaMask, Ledger, Gnosis Safe, etc.)
- TreasuryFlow is a **policy engine + immutable ledger**, NOT a vault
- Policies route instructions to user wallets (e.g., "sweep USDC from Polygon to Base", "deposit idle USDC to Morpho for yield")
- Users sign transactions from their wallet; TreasuryFlow never holds funds

**Shared across both:**
- `src/types/domain.ts` (policy, intent, ledger types)
- `src/domain/` (policy engine, approvals, execution, ledger — pure functions)
- `src/services/perplexity.ts` (AI adapter)
- UI components and pages (logic same, wallet/contract calls differ)

**Different between branches:**
- Wallets (demo: mock WalletConnect state + localStorage, prod: WalletConnect + any wallet user chooses)
- Policy execution (demo: simulated intent → balance update, prod: intent → user signs tx from their wallet → settlement)
- Auth (demo: topbar user switcher, prod: WalletConnect signature + JWT)
- Ledger (demo: localStorage events, prod: onchain contract events + Postgres indexing)
- Audit trail (demo: JSON log, prod: immutable contract events, regulators verify via Etherscan)

---

## Current Limitations (from eng.md)

| Limitation | Demo Impact | Prod Impact | Fix in Prod |
|-----------|------------|------------|-----------|
| No onchain execution | ✅ Acceptable (simulated contract calls) | ❌ Critical blocker | Treasury.sol smart contract on Base + ethers.js integration |
| No immutable ledger | ✅ Acceptable (localStorage log) | ❌ Audit trail gaps | Contract events + Subgraph indexing |
| No settlement verification | ✅ Acceptable (mock confirmation) | ❌ Ledger-to-reality gaps | Direct query onchain state (no Coinbase API dependency) |
| localStorage only | ✅ Acceptable (reset button works) | ❌ Data loss risk | Postgres + contract state as source of truth |
| No real auth | ✅ Acceptable (topbar user switcher) | ❌ No compliance | Wallet + JWT hybrid + role-based contract access |
| No real counterparties | ✅ Acceptable (seeded list) | ❌ Missing feature | Live counterparty CRUD + onchain policy versioning |
| No compliance reporting | ✅ Acceptable (CSV export) | ❌ Customer requirement | PDF audit reports + SAR/AML triggers + onchain event proofs |
| No bank settlement | ✅ Acceptable (cash-out shows `partner_pending`) | ❌ Blocks fiat flows | Coinbase Offramp bridge (v1.1) for bank cash-out only |
| Buffered AI responses | ✅ Acceptable (instant mock) | ✅ Fine (can stream later) | Streaming UI (v1.1 nice-to-have) |
| Vite dev proxy only | ✅ Works locally | ❌ Won't work in prod | Backend API server + contract RPC calls |

---

## Phase 0: Smart Contracts + Web3 + Perplexity (Week 1)

**Goal:** Deploy immutable policies + non-custodial wallet + Perplexity audit/risk features. This is the MVP's core.

**Timeline:** 1 week (168 hours available; prioritize by cheapest LLM + highest impact)

### 0.1 Smart Contracts: PolicyEngine & Intent Registry (8 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | PolicyEngine.sol | 3 | Haiku (classification) | Solidity |
| 🔵 Pending | IntentRegistry.sol | 3 | Haiku (logging) | Solidity |
| 🔵 Pending | LedgerContract.sol | 2 | None (pure contract) | Solidity |

**What:** Solidity contracts for policy execution + immutable ledger (NOT a vault)

**Contracts:**
- `PolicyEngine.sol` — Stores policy definitions, validates intents against policies
  - `createPolicy(name, type, source, dest, conditions)` → policy registry
  - `validateIntent(intent)` → bool (can execute based on policy?)
  - Emit versioning events for policy changes (immutable history)
  - Does NOT hold funds, does NOT execute transfers

- `IntentRegistry.sol` — Immutable log of all intents + approval chain
  - `createIntent(policyId, amount, destination)` → intent event
  - `approveIntent(intentId, approver)` → approval event (role-based)
  - `executeIntent(intentId, txHash)` → execution event with onchain proof
  - Events: IntentCreated, IntentApproved, IntentExecuted, IntentRejected, LedgerEntryPosted

- `LedgerContract.sol` — Immutable ledger of all transactions
  - `recordEntry(from, to, amount, asset, txHash, blockNumber)` → entry event

**Deployment:** Base Sepolia testnet with seeded 1M USDC

---

### 0.2 Web3 Integration: WalletConnect + Morpho (8 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | WalletConnect + ethers.js | 4 | Haiku (wrapper) | JavaScript, ethers.js v6 |
| 🔵 Pending | Morpho yield integration | 2 | Haiku (SDK wrapper) | Morpho SDK, Base Sepolia |
| 🔵 Pending | Contract ABI + provider setup | 2 | None (config) | Alchemy/Infura RPC |

**What:** Integrate WalletConnect + contract calls (users keep USDC in their own wallet)

**New files:**
- `src/wallet/walletconnect.ts` — WalletConnect v2 integration
- `src/web3/contracts.ts` — PolicyEngine.sol + IntentRegistry.sol + LedgerContract.sol ABIs
- `src/web3/provider.ts` — Base RPC connection (Alchemy/Infura)
- `src/web3/intents.ts` — Wrapper functions: `createPolicy()`, `createIntent()`, `approveIntent()`, `executeIntent()`
- `src/web3/morpho.ts` — Morpho yield integration
  - `depositToMorpho(amount)` → user approves + deposits to Morpho, receives mUSDC
  - `withdrawFromMorpho(amount)` → withdraw from Morpho back to wallet
  - `getMorphoBalance(address)` → query mUSDC position

**Why WalletConnect?** True non-custodial—user picks ANY wallet (MetaMask, Ledger, Gnosis Safe, hardware).

**Why Morpho?** Solves "idle USDC earns nothing" (5–10% APY) while staying 100% non-custodial (user owns mUSDC).

---

### 0.3 Perplexity: Anomaly Detection (6 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | Anomaly scorer (high-value, timing, counterparty, rapid transfers, balance drops) | 2 | Haiku (threshold checks) | None (pure logic) |
| 🔵 Pending | Perplexity integration (call on anomaly) | 2 | **Haiku** (explanation) | Perplexity API |
| 🔵 Pending | UI: inline anomaly warnings on Activity page | 2 | None (UI) | React components |

**What:** Flag unusual transaction patterns (high-value, odd timing, new counterparty, rapid transfers, balance drops), Perplexity explains if normal or risky.

**Scorer logic:**
```
score = 0
if amount > 2x_normal_for_counterparty: score += 30
if time_of_day > 18:00 or < 6:00: score += 20
if new_counterparty: score += 25
if 3+ transfers in 1 hour: score += 25
if balance_drop > 20%: score += 30
```

**When score > 50:** Call Perplexity with transaction + history → get explanation → show inline on Activity page.

**Cheap LLM:** Haiku for scoring + explanation (it's good at pattern recognition + brief summaries).

---

### 0.4 Perplexity: Counterparty Risk Scoring (5 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | Risk assessment on first transaction with new counterparty | 2 | **Sonnet** (reasoning) | Perplexity API |
| 🔵 Pending | Risk dashboard (table + trend sparklines) | 2 | None (UI) | React components |
| 🔵 Pending | Update score on each transaction | 1 | Haiku (re-evaluation) | Event listener |

**What:** On first transaction with new counterparty, Perplexity rates risk (low/medium/high) with reasoning. Show on approval UI + risk dashboard.

**Prompt to Perplexity:** "Rate this counterparty's risk (low/medium/high). Consider: amount, timing, frequency, name, prior patterns. Explain briefly."

**Cheap LLM:** Sonnet (more reasoning = better risk assessment; worth the slight cost increase from Haiku).

---

### 0.5 Perplexity: Market Shock Detector (4 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | Price feed poller (CoinGecko API every 5 min) | 1 | None (API call) | CoinGecko free API |
| 🔵 Pending | Threshold detector (if move > 5%, alert) | 1 | Haiku (threshold) | None |
| 🔵 Pending | Perplexity market insight (suggest rebalance opportunity) | 1 | **Haiku** (suggestion) | Perplexity API |
| 🔵 Pending | UI: "🚨 Market shock" alert with Perplexity insight | 1 | None (UI) | React |

**What:** Monitor USDC/ETH/BTC rates every 5 min. If move > 5%, trigger alert + Perplexity suggests rebalancing.

**Prompt to Perplexity:** "Market alert: {{symbol}} moved {{percent}}%. Current rates are {{rates}}. Suggest rebalancing strategy in 1–2 sentences."

**Cheap LLM:** Haiku (simple suggestion generation).

---

### 0.6 Perplexity: Real-Time Audit Reports (5 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | Ledger aggregation (collect transactions + approvals from contract events) | 2 | None (pure logic) | Contract events |
| 🔵 Pending | Perplexity summaries (call for each policy decision: "Explain why this policy fired") | 2 | **Haiku** (summary) | Perplexity API |
| 🔵 Pending | PDF generation (ledger + decisions + Perplexity citations) | 1 | None (library) | pdfkit or similar |

**What:** On-demand PDF audit reports with full ledger + policy decisions + Perplexity-generated rationales + citations.

**Content:**
- Summary: total volume, policies fired, approvals, exceptions
- Ledger: all transactions with tx hash, block number, timestamp
- Approval chain: who approved what, when, why
- Rationale: Perplexity summaries for each policy (1–2 sentences + citations)

**Cheap LLM:** Haiku (summarization is a core strength).

---

### 0.7 Perplexity: Predictive Rebalancing (4 hours)

| Status | Milestone | Est. Hours | Cheap LLM | Dependencies |
|--------|-----------|-----------|-----------|--------------|
| 🔵 Pending | Pattern detection (identify recurring intents: payroll Fri, sweep Mon) | 2 | Haiku (pattern) | Contract event history |
| 🔵 Pending | Perplexity forecast (given upcoming intents + patterns, forecast balances 1–7 days) | 1 | **Sonnet** (forecasting) | Perplexity API |
| 🔵 Pending | UI: forecast card on Accounts page (predicted balances + recommendation) | 1 | None (UI) | React |

**What:** Analyze past intent patterns (payroll on Friday, sweep on Monday). Perplexity forecasts balance changes 1–7 days out. Recommend proactive rebalancing.

**Prompt to Perplexity:** "Based on these scheduled intents and historical patterns, forecast balances 3/5/7 days out: {{pattern}}. Recommend rebalancing by {{date}} if threshold is {{threshold}}."

**Cheap LLM:** Sonnet (forecasting benefits from better reasoning).

---

### Summary: Phase 0 Effort Breakdown

| Component | Hours | Cheap LLM Strategy |
|-----------|-------|-------------------|
| Smart contracts (0.1) | 8 | None (Solidity) |
| Web3 + WalletConnect (0.2) | 8 | Haiku for wrappers/config |
| Anomaly detection (0.3) | 6 | **Haiku** (threshold + brief explanation) |
| Counterparty risk (0.4) | 5 | **Sonnet** (reasoning) |
| Market shock detector (0.5) | 4 | **Haiku** (suggestion) |
| Audit reports (0.6) | 5 | **Haiku** (summary) |
| Predictive rebalancing (0.7) | 4 | **Sonnet** (forecast) |
| **TOTAL** | **40 hours** | **Mostly Haiku + 2x Sonnet** |

**LLM cost estimate:** 
- Haiku: ~$0.10 per 1K calls (negligible)
- Sonnet: ~$1 per 1K calls (still cheap; risk scoring + forecasting justify it)

---

## Phase 1.z: Demo Scenarios & Walkthrough (Embedded in Phase 0, async after each milestone)

**Goal:** Showcase MVP features to users in intuitive, narrative walkthrough format. NOT production code—just demo flows.

**Approach:** After each Phase 0 milestone is complete, wire up a corresponding demo scenario. Users walk through each story, click buttons, see results. All flows on Base Sepolia testnet.

### Demo Scenario 1: "Connect Wallet & Create Sweep Policy"
**Trigger:** Phase 0.2 complete (WalletConnect)

**Flow:**
1. Demo starts on Home page: "Let's set up your first treasury policy"
2. User clicks "Connect Wallet"
3. WalletConnect modal appears → user selects (fake for demo) MetaMask
4. Dashboard updates: "Connected: 0x1234...abcd" + balance "$500k USDC"
5. User clicks "New Policy" → fill form:
   - Name: "Weekly Sweep"
   - Type: "Sweep"
   - Condition: "if balance > $100k, move to Base"
6. User clicks "Create" → contract event logged + toast: "Policy created onchain ✓"
7. Demo advances to next scenario

**UI Components:** WalletConnect button, policy form, success toast

---

### Demo Scenario 2: "Policy Triggers & Morpho Yield"
**Trigger:** Phase 0.2 complete (Morpho)

**Flow:**
1. Demo shows: "Your balance reached $150k. Policy triggers."
2. Toast: "Sweep policy triggered → create intent"
3. System creates intent automatically: "Move $100k to Base"
4. Sidebar suggests: "💡 Idle USDC earns nothing. Deposit $80k to Morpho for ~7% APY?"
5. User clicks "Deposit to Morpho"
6. Approvals modal: User sees "approve USDC → Morpho" + "deposit to Morpho"
7. Simulation: Two txs signed
8. Result: "✓ Deposited $80k to Morpho. Earning ~5,600/year. You own mUSDC position in your wallet."
9. Dashboard updates: "Balance: $70k USDC + $80k mUSDC (earning yield)"

**UI Components:** Intent card, Morpho suggestion, approval modal, balance widget

---

### Demo Scenario 3: "Anomaly Detection: Unusual Transfer"
**Trigger:** Phase 0.3 complete (Anomaly detection)

**Flow:**
1. Demo shows: "Activity page" with recent transactions
2. User (or system) creates a new intent: "$110k transfer to new counterparty at 2:15 AM"
3. Anomaly scorer triggers: Score = 75 (high-value + new counterparty + odd time)
4. Warning card appears: "⚠️ Unusual activity detected"
5. User clicks card → Perplexity explanation shows:
   > "This transfer is unusual: amount is 1.5x your normal transfers, counterparty is new, and timing is outside business hours. Recommend manual review."
6. Approvers see flag on approval UI
7. User can: approve anyway, reject, or investigate

**UI Components:** Warning card, Perplexity explanation, inline on Activity + Approvals pages

---

### Demo Scenario 4: "Counterparty Risk Scoring"
**Trigger:** Phase 0.4 complete (Counterparty risk)

**Flow:**
1. Demo shows: New intent to transfer $50k to "VendorXYZ" (first time)
2. System flags: "First transaction with this counterparty"
3. Approval UI shows risk card with Perplexity assessment:
   > "LOW RISK: Amount is normal for vendor category, timing is business hours, name matches legal entity records. Recommend approval."
4. Risk dashboard appears (side panel):
   - Table: Counterparty | Risk Level | Trend | Last Updated
   - VendorXYZ: 🟢 LOW (0 incidents, stable)
5. User approves
6. On next transfer to VendorXYZ, score updates based on history

**UI Components:** Risk card on approval, risk dashboard, history sparklines

---

### Demo Scenario 5: "Market Shock Alert"
**Trigger:** Phase 0.5 complete (Market shock detector)

**Flow:**
1. Demo runs in background: Price poller checks USDC/USD every 5 min (simulated)
2. Alert fires: "🚨 Market Alert: USDC moved +6.5% in 1 hour"
3. Notification card shows with Perplexity insight:
   > "Current rates favor rebalancing to 50/50 USDC/USDT mix. Your current 70/30 mix is overweighted in USDC. Consider moving $20k to USDT."
4. User clicks "View rebalance" → shows proposed swap
5. User approves or dismisses

**UI Components:** Alert notification, Perplexity insight card, rebalance preview

---

### Demo Scenario 6: "Predictive Rebalancing Forecast"
**Trigger:** Phase 0.7 complete (Predictive rebalancing)

**Flow:**
1. Demo shows: "Accounts" page with current balances
2. Forecast card appears: "Balance Forecast (Next 7 Days)"
3. Shows chart: predicted balances over time
4. Perplexity recommendation appears:
   > "Based on your payroll schedule (every Friday) and sweep (every Monday), your balance will drop to $50k by Wednesday. Recommend rebalancing by Tuesday to maintain $100k minimum."
5. User can: "Accept recommendation" (sets up proactive rebalance policy) or "Dismiss"

**UI Components:** Forecast card, line chart, Perplexity recommendation

---

### Demo Scenario 7: "Audit Report PDF"
**Trigger:** Phase 0.6 complete (Audit reports)

**Flow:**
1. Demo shows: "Audit" page with date range picker
2. User selects: "Last 30 days"
3. User clicks "Generate Audit Report"
4. System collects:
   - All ledger entries (transactions)
   - All approvals + who approved
   - All policy decisions + Perplexity rationales
5. PDF generated with:
   - Summary: "30 transactions, 5 policies, 0 rejections, $500k volume"
   - Ledger table: date, counterparty, amount, policy, tx hash
   - Approval chain: "John approved Policy1 sweep at 9:30 AM"
   - Perplexity rationales: "Sweep triggered because idle balance exceeded $100k threshold"
   - QR codes linking to Etherscan
6. User downloads PDF or shares link

**UI Components:** Audit page, date picker, PDF viewer, download button

---

### Demo Walkthrough Order (Recommended)

1. **Scenario 1** — Warm-up, show wallet connection
2. **Scenario 2** — Core value: yield on idle cash (non-custodial)
3. **Scenario 3** — Anomaly detection (safety)
4. **Scenario 4** — Risk scoring (trust)
5. **Scenario 5** — Market shock (opportunity)
6. **Scenario 6** — Predictive forecast (planning)
7. **Scenario 7** — Audit report (compliance)

**Total demo time:** ~10–15 minutes end-to-end. Can be run individually or as a full walkthrough.

---

## Phase 1: Backend + Indexing (Weeks 1–2, parallel with Phase 0)

**Goal:** Indexing layer + API for UI convenience. **Not** the source of truth (contracts are).

### 1.1 Backend Scaffolding (Lightweight)

**What:** Node.js + Express + Postgres, but **read-mostly** (contracts are write source)

**Files:**
- `backend/src/main.ts` — Express server
- `backend/src/db/schema.ts` — Postgres for indexing onchain events
- `backend/src/middleware/auth.ts` — JWT verification (for UI auth only)
- `backend/.env.example` — DB_URL, RPC_URL, PERPLEXITY_API_KEY, JWT_SECRET

**Key difference:** Postgres mirrors onchain state, not the primary source. On startup, backend listens to contract events and writes to DB.

**Estimate:** 4 hours (lighter than before)

### 1.2 API Routes (Mostly Read)

**What:** RESTful endpoints for UI convenience (contract calls are the writes)

**Routes:**
```
GET    /api/accounts              (read from Postgres cache, sourced from contract)
GET    /api/accounts/:id
GET    /api/policies              (read policy history from Postgres)
GET    /api/policies/:id
GET    /api/intents               (read intent log from Postgres, sourced from contract events)
GET    /api/intents/:id
GET    /api/ledger                (read ledger from Postgres, indexed from contract events)
GET    /api/ledger/:id

GET    /api/audit-log             (immutable, directly from contract events, queryable)

POST   /api/auth/login            (JWT for UI auth)
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/contract-state/:account (direct contract call, not cached—proves onchain state)
```

**Why mostly read?** Writes happen via contract transactions. API is for UI convenience, not the single source of truth.

**Estimate:** 4 hours

### 1.3 Event Indexing (Subgraph)

**What:** Index Treasury contract events for fast querying

**Setup:**
- Deploy Subgraph to The Graph Protocol (or Goldsky)
- Watch Treasury.sol events: IntentCreated, IntentApproved, IntentExecuted, LedgerEntryPosted
- Expose GraphQL API: `query { intents { id, status, amount } }`

**Why?** Direct RPC queries are slow. Subgraph indexes events, allows complex queries (e.g., "all intents with status='pending'").

**Estimate:** 4 hours

### 1.4 Auth System (Hybrid)

**What:** WalletConnect auth (non-custodial, user controls wallet)

**Flow:**
- Demo: topbar user switcher (no wallet needed)
- Prod: WalletConnect prompt → user connects MetaMask/Ledger/Gnosis Safe → backend verifies signature → issue JWT
- JWT used for API calls; contract calls via ethers.js + WalletConnect (no API needed)

**Components:**
- `@web3modal/ethers` → WalletConnect UI + provider
- `connectWallet()` → prompt user to connect wallet (any WalletConnect-compatible wallet)
- `verifySignature()` → backend signs nonce, user signs with their wallet, backend verifies
- JWT payload: `{ walletAddress, userId, role, iat, exp }`

**Why WalletConnect?**
- User controls their own wallet (MetaMask, Ledger, Gnosis Safe, hardware, etc.)
- Non-custodial ✅ (TreasuryFlow never sees private keys)
- Institutional-grade (multi-sig treasuries supported)
- Future-proof (ERC-4337 account abstraction supported)

**Estimate:** 3 hours

---

## Phase 2: Compliance & Audit (Weeks 2–3)

**Goal:** Production-ready compliance + audit reporting, using onchain proofs.

### 2.1 Audit Trail (Onchain Events)

**What:** Immutable log of all state changes via contract events

**Implementation:**
- All intents, approvals, executions emit events on Treasury contract
- Events include: initiator (wallet), approver, timestamp, amount, policy reason
- Regulatory endpoint: `GET /api/v1/audit-report?from=...&to=...` → queries Subgraph + contract events → PDF with onchain proofs

**Why onchain?**
- Cannot be forged or deleted (contract immutability)
- Auditors/regulators can verify independently (no trust required)
- Cryptographic proof of execution (tx hash, block number)

**Estimate:** 2 hours (contract events do the work)

### 2.2 Compliance Hooks (SAR, AML, KYC)

**What:** Automated triggers for regulatory reporting, with onchain evidence

**Triggers:**
- High-value transfer ($100k+) → query contract events, flag for manual review
- New counterparty (first transaction) → require KYC before approval
- Rapid transfers to same counterparty → flag for AML review
- Unusual time-of-day transfers → Perplexity flags + log to contract

**Implementation:**
- Backend listens to contract events (real-time)
- On trigger: emit compliance event, call Perplexity, log reason onchain or to Postgres
- UI: compliance dashboard showing flags + onchain tx proofs

**Estimate:** 3 hours

### 2.3 Audit Report Generation (PDF with Onchain Proofs)

**What:** PDF export with policy rationale + onchain settlement proof

**Implement:**
- Endpoint: `GET /api/audit-report?from=...&to=...` → PDF
- Content:
  - Summary: total volume, policies fired, approvals, exceptions
  - Policy listing: name, type, conditions, decisions made (from contract events)
  - Ledger: all entries with tx hash, block number, timestamp (immutable proof)
  - Approval chain: who approved what, when, why (from contract events)
  - Rationale: Perplexity-generated explanation + citations (v1.0) or onchain reason field (future)
  - **New:** QR codes linking to Etherscan for each tx (regulators can verify independently)

**Why this matters?** Audit reports are no longer "trust us"—they're "here's the proof on Base chain."

**Estimate:** 4 hours (backend) + 1 hour (UI)

---

## Phase 3: Production Deployment (Week 4)

**Goal:** Hosted contracts, scaled API, secure settlement.

### 3.1 Smart Contract Deployment to Base Mainnet

**What:** Deploy Treasury.sol, PolicyEngine.sol, IntentRegistry.sol to production

**Steps:**
- Audit contracts (internal review or professional audit if needed)
- Deploy to Base mainnet via Hardhat/Foundry
- Initialize with authorized signers (approvers, admins)
- Seed with 1M USDC for pilot customers
- Update frontend RPC to Base mainnet

**Why Base?** Low gas (10-50x cheaper than Ethereum), high throughput, native USDC support.

**Estimate:** 2 hours

### 3.2 API Deployment + Indexing

**What:** Deploy Express server + Postgres + Subgraph to production

**Files:**
- `Dockerfile` (Node.js + Postgres client)
- `docker-compose.yml` (app + postgres locally)
- Vercel (API) or Railway (full stack)
- Goldsky or self-hosted Subgraph (event indexing)

**Hosting:**
- **API:** Vercel Functions or Railway (auto-scales, managed Postgres)
- **Subgraph:** Goldsky (managed) or self-hosted (cheaper)
- **Contracts:** Immutable on Base (no hosting cost)

**Estimate:** 1 hour (Vercel is fastest)

### 3.3 Security & Secrets

**What:** Never commit secrets, rotate keys

**Checklist:**
- [ ] Move all secrets to `.env` (gitignored)
- [ ] Use `process.env` in code, never hardcode
- [ ] JWT_SECRET generated on deploy (don't commit)
- [ ] RPC_URL protected (use Alchemy/Infura API keys)
- [ ] Rotate Perplexity API key annually
- [ ] Enable HTTPS (free with Vercel)
- [ ] Add CORS headers (restrict to your domain)
- [ ] Rate limit `/api/auth/login` (brute force protection)
- [ ] **Contract:** Use multi-sig for admin functions (no single private key)

**Estimate:** 1 hour

### 3.4 Fiat Onramp + Offramp (Non-Custodial, v1.1)

**What:** Fiat bridges via Coinbase (platform does NOT hold fiat)

**Important:** 
- **Fiat cannot be held on TreasuryFlow** (non-custodial, no banking license needed)
- Fiat only flows through as pass-through: USD → Coinbase Onramp → USDC (in user's embedded wallet) → Coinbase Offramp → USD

**Onramp flow (pending Coinbase approval):**
- Intent with `type: 'onramp'` → routes user to Coinbase Onramp widget
- User deposits USD from bank → Coinbase holds temporarily → mints USDC directly into user's embedded wallet
- TreasuryFlow never touches USD or USDC during this flow

**Offramp flow (pending Coinbase approval):**
- Intent with `type: 'offramp'` → user signs tx to move USDC from embedded wallet to Coinbase
- Coinbase Offramp converts USDC → USD → ACH transfer to user's bank account
- TreasuryFlow never holds USD; Coinbase handles ACH settlement

**Status:** Scaffolded in code, "Coming soon" in UI. Pending Coinbase partnership approval.

**Estimate:** 0 hours (scaffolded, not required for v1.0)

---

## Phase 4: "Billion Dollar" Features — Composability + Network Effects (v1.0→v1.1)

**These unlock composability and network effects. Customer-facing and revenue-generating.**

### 4.1 Morpho Yield Integration (MVP — Base Sepolia testnet)

**What:** Auto-deposit idle USDC to Morpho, earn interest while non-custodial

**Implement:**
- New policy type: `type: 'deposit_yield'` with `destination: 'morpho'`
- Example: Policy triggers "if idle USDC > $100k for >7 days, deposit 80% to Morpho"
- User approves → signs tx: `USDC.approve(morphoRouter, amount)` + `Morpho.supply(usdc, amount, user.address)`
- Morpho mints mUSDC to user's wallet (user owns yield position)
- UI: "Deposit to Morpho" shows ~5–10% APY forecast
- Perplexity: "Morpho is offering 7.2% APY on USDC. Your $80k will earn $5,760/year. Recommend depositing."

**Why Morpho?**
- **Non-custodial compliant:** user's wallet approves, user owns mUSDC, can withdraw anytime
- **Yield solves** "idle USDC earns nothing" problem
- **Composable:** user can migrate mUSDC to Aave, Compound later if they want
- **MVP differentiator:** "Automate policies AND earn yield on idle cash"

**Why this works with non-custodial mission:**
- User's wallet: signs approvals
- Morpho contract: receives USDC, mints mUSDC to user
- User's wallet: holds mUSDC, receives yield
- TreasuryFlow: just logged the policy + intent, never touched USDC

**Estimate:** 2 hours (Morpho SDK integration) + 1 hour (UI) + 1 hour (Perplexity)

**Impact:** +$50k–500k annual yield per customer (adds product value, user keeps 100% of yield)

**Live on:** Base Sepolia (testnet) for MVP demo

### 4.2 DeFi Expansions (v1.1+: Aave, Curve, Uniswap)

**After MVP proves Morpho pattern, expand to other protocols**
- Same flow: policy routes to protocol, user owns position
- Expansion: arbitrage detection, multi-protocol rebalancing, yield farming strategies

---

### 4.3 Cross-Chain Routing (Polygon, Arbitrum, Optimism)

**What:** Optimize sweeps across chains for lowest gas + best rates

**Implement:**
- Bridge monitoring: query Hop Protocol, Across, Stargate rates
- When sweep triggers: find cheapest route across chains
- Execute: Treasury.sweep() on Base + bridge to destination → single atomic intent
- Perplexity: "Sweeping $1M Polygon USDC to Base: Hop ($500 gas) is 20% cheaper than Across ($620)."

**Why onchain?** Bridges are onchain. Optimizing routes = calling contract functions, not APIs.

**Estimate:** 4 hours (bridge integrations) + 2 hours (UI)

**Impact:** Save 10–20 bps on large sweeps (=$50k–200k/year per customer)

### 4.4 Treasury-as-a-Service (Composable Settlement)

**What:** Other protocols pay TreasuryFlow to route payments through your treasury

**Implement:**
- Endpoint: other contracts call `Treasury.routePayment(to, amount, reason)`
- You earn 1–5 bps on every routed transfer
- Example: Payroll protocol calls `Treasury.payEmployees()` → settles via your treasury contract
- Postgres logs who's routing through you; Perplexity suggests new integrations

**Why onchain?** Composability is the killer feature. Your Treasury contract becomes infrastructure.

**Estimate:** 2 hours (contract interface) + 1 hour (UI dashboard)

**Impact:** New revenue stream ($100k–$1M/year per popular customer)

### 4.5 Anomaly Detection Engine (via Perplexity)

**What:** Flag unusual transaction patterns and ask Perplexity to explain them

**Implement:**
- Anomaly scorer (compute on each new contract event):
  - High-value transfer (>2x normal for counterparty)
  - Unusual time-of-day (outside 9-5 business hours)
  - New counterparty (first transaction)
  - Rapid sequential transfers (>3 in 1 hour)
  - Balance drop >20% in single day
- Call Perplexity when score > threshold:
  - Prompt: "This transaction flagged as unusual. Explain if it's normal or concerning: [transaction details + nearby history]"
  - Show Perplexity response inline on Activity page, Approvals page
- Confidence score: "This looks normal (92% confidence)" vs. "⚠️ High risk (78% confidence)"

**Estimate:** 3 hours (scorer) + 2 hours (Perplexity integration)

**Impact:** Catch fraud + operational errors before settlement

### 4.6 Market Shock Detector & Auto-Rebalancing

**What:** Monitor price feeds, detect >X% move, trigger auto-rebalancing via contract

**Implement:**
- Price feed poller (CoinGecko free API, every 5 min) + Chainlink oracle fallback
- Threshold detector: if USDC, ETH, BTC moves >5%, trigger rebalancing policy
- Execute: `Treasury.rebalance()` calls contract → swaps via Uniswap → settles onchain
- Alert UI: "🚨 USDC rate moved +7.5% — auto-rebalance triggered (tx hash: 0x...)"
- Perplexity: "Current rates favor moving $X to Y to maintain 60/40 balance."

**Why onchain?** Rebalancing is direct contract calls (atomic, verifiable), not API calls + manual execution.

**Estimate:** 2 hours (oracle integration) + 1 hour (UI) + 1 hour (Perplexity)

**Impact:** Prevent capital loss from rate swings in real-time

### 4.7 Counterparty Risk Scoring (via Perplexity)

**What:** AI-powered risk assessment based on onchain transaction history

**Implement:**
- On first transaction with new counterparty:
  - Query contract events: amount, timing, frequency, name, prior policy approvals
  - Call Perplexity: "Rate this counterparty's risk (low/medium/high). Consider: amount, timing, patterns, onchain reputation."
  - Show risk score + rationale on approval UI
- Risk dashboard: table of all counterparties with scores + trend sparklines
- Update score after each onchain transaction

**Estimate:** 2 hours (risk engine) + 2 hours (Perplexity integration) + 1 hour (UI)

**Impact:** 40% fewer approval delays; better risk transparency

### 4.8 Predictive Rebalancing

**What:** Forecast balance changes 1-7 days out, suggest proactive rebalancing

**Implement:**
- Pattern analysis: detect recurring intents from contract events (payroll on Fri, sweep on Mon)
- Perplexity: given upcoming scheduled intents + patterns, forecast balances in 3/5/7 days
- Recommendation: "Rebalance Polygon to reserve by Wed to cover Fri payroll (forecast balance: $5k, threshold: $25k)"
- UI: forecast card in Accounts page showing predicted balances

**Estimate:** 2 hours (pattern analysis) + 1 hour (Perplexity integration)

**Impact:** Eliminate reactive rebalancing; more predictable cash position

### 4.9 Nice-to-Haves (v1.1+)

**Counterparty Management:** CRUD for counterparties + KYC status tracking (3 hours)

**Multi-Currency Support:** Track BTC, ETH, USDT beyond USDC (4 hours)

**Streaming AI Responses:** Token-by-token rendering for policy drafter (1 hour)

---

## Branch Strategy

### Setup

```bash
# Current state: main branch is demo (✅ shipped)
git branch production
git push origin production

# Work on production branch
git checkout production
```

### Workflow

**Demo branch (`main`):**
- Stays pristine, no breaking changes
- Use for all investor/customer demos
- Tag releases (v0.1, v0.2, v0.3, etc.)
- Document with "# Demo" in README

**Production branch (`production`):**
- Shared domain logic with main (no drift)
- Smart contracts: add `/contracts/` directory (Solidity + Foundry)
- Backend: add `/backend/` directory (API + event indexing)
- Database: add migrations (read-mostly, sourced from onchain events)
- Auth: add JWT middleware + wallet integration
- Subgraph: add `/subgraph/` directory (for querying onchain events)
- Tag releases (v1.0-alpha, v1.0-beta, v1.0, etc.)

**Merging strategy:**
- Do NOT merge production back to main
- Do NOT merge main forward to production (causes drift)
- **Share only:** `src/types/domain.ts`, `src/domain/`, `src/services/perplexity.ts`
  - Smart contract logic (policy engine, execution) mirrors domain logic; keep in sync

---

## Timeline & Effort

| Phase | Goal | Duration | Blocker? | Start |
|-------|------|----------|----------|-------|
| 0 | Smart contracts + ethers.js | 1 week | No (contracts are independent) | Week 1 |
| 1 | Backend API + Postgres indexing | 1.5 weeks | No (runs parallel with Phase 0) | Week 1 |
| 2 | Compliance + audit (onchain proofs) | 1 week | No | Week 2 |
| 3 | Deploy contracts to Base + API hosting | 0.5 weeks | No | Week 3 |
| 4 | DeFi integrations + composability | 2+ weeks | Some (customer feedback) | Week 4+ |

**Critical path:** None. Smart contracts (Phase 0) and backend API (Phase 1) are independent and run in parallel.

**Key difference from traditional approach:** Contracts are deployed to testnet immediately (week 1), so we can demo real onchain settlement weeks before production launch. No API dependency.

---

## Go-to-Market (After v1.0)

**Target customer:** Anyone managing USDC treasury with 100+/month transactions
- Fintech platforms (payroll, marketplaces, payment networks)
- Stablecoins, RWAs, regulated fintech holding USDC
- Early-stage startups + mature companies doing multi-chain treasury management
- Platforms currently using Coinbase API + manual reconciliation

**Sales approach:**
1. **Usage-driven revenue** (primary): 0.5–1 bps settlement fee per transaction
   - Transparent, costs less than traditional banking + Coinbase SaaS
   - Example: Payroll platform doing $50M/month in payouts: pays $250–500/month (vs. $10k+ with traditional banking)
2. **Premium SaaS** (optional): $5k–20k/month for compliance, anomaly detection, DeFi integrations
3. **Success fees:** 10–20% of annual audit cost savings (customer's auditor verifies savings)
4. **Composability revenue:** 1–5 bps on payments routed through Treasury contract (new partners = new rev streams)

**Go-to-market motion:**
- **Month 1–2:** Founder sales to 3–5 target customers (fintech, payroll, platforms with high payout volume)
  - Lead with: "Pay 10 bps/month instead of $10k/month on Coinbase + manual audits"
  - Show: Real onchain settlement on Base Sepolia (testnet demo)
- **Month 3:** Case studies + content (regulatory benefits, cost savings, 24/7 audit visibility)
- **Month 4+:** Product launch (ProductHunt, fintech newsletters) + partnerships (payment networks, accounting firms)

**Month 1 after launch:** 2–3 pilot customers
**Month 3:** 5–10 paying customers
**Month 6:** 20+ customers ($200k–400k ARR)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Coinbase API approval takes 4+ weeks | Blocks real execution | Start Phase 1 in parallel; demo still works with mocked Coinbase calls |
| Database migration locks tables | Production downtime | Use `ALTER TABLE ... CONCURRENTLY` in Postgres; test migrations locally first |
| Customer auth requires audit trail | Compliance requirement not met | Implement audit middleware in Phase 1, not Phase 5 |
| Perplexity API errors in production | Customer-facing outages | Mock fallback always active; alert on 3 consecutive failures |
| Bug in policy engine discovered in prod | Revenue risk | Ship with 100% test coverage + shadow-run policies (log but don't execute) for first week |

---

## Success Criteria

**v1.0 Launch (4 weeks):**
- [ ] Smart contracts deployed to Base Sepolia testnet (PolicyEngine.sol, IntentRegistry.sol, LedgerContract.sol)
- [ ] WalletConnect integration working (user connects MetaMask/Ledger/Gnosis Safe, signs txs, private keys never exposed)
- [ ] Frontend wired to WalletConnect + contracts (policy creation → contract call, execution → user signs + settles)
- [ ] **Morpho yield integration** (MVP feature): users can auto-deposit idle USDC to Morpho for 5–10% APY, earn interest while non-custodial
- [ ] Backend API + Subgraph indexing onchain events (read-mostly, for UI convenience)
- [ ] Audit trail sourced from contract events (immutable, regulators query Etherscan directly)
- [ ] Compliance hooks triggering on onchain events (SAR/AML logging + Perplexity explanations)
- [ ] Wallet auth working (users authenticate via WalletConnect signature)
- [ ] Deployed to Base Sepolia + Vercel/Railway
- [ ] 3 pilot customers managing USDC treasury via non-custodial policies (sweeps, rebalances, payouts) + earning yield on idle cash (Morpho)
- [ ] **Zero custody risk** (TreasuryFlow never holds user USDC, fiat, or keys)
- [ ] Zero ledger-to-reality gaps (all transactions logged onchain, regulators can verify independently on Etherscan)
- [ ] Earning settlement fees on every transaction (0.5–1 bps, tracked via on-chain logs)
- [ ] Users earning yield (Morpho APY, user keeps 100% of interest)

**Revenue target:** 
- v1.0 (Month 1): $5k–20k/month from 3 pilot customers (0.5–1 bps settlement fees)
- v1.1 (Month 3): $50k–100k/month from 10+ customers + composability revenue
- Month 6: $200k–400k ARR

---

## Files to Create

**Smart Contracts (Foundry):**
```
contracts/
├── src/
│  ├── Treasury.sol           (main vault + execution)
│  ├── PolicyEngine.sol       (policy registry + validation)
│  ├── IntentRegistry.sol     (immutable intent log)
│  └── interfaces/
│     ├── IUSDC.sol
│     └── ILending.sol        (for Aave integration, v1.1)
├── test/
│  ├── Treasury.t.sol
│  ├── PolicyEngine.t.sol
│  └── IntentRegistry.t.sol
├── script/
│  └── Deploy.s.sol           (deployment script)
├── .env.example
└── foundry.toml
```

**Backend structure (lightweight):**
```
backend/
├── src/
│  ├── main.ts                (Express server)
│  ├── middleware/
│  │  ├── auth.ts             (JWT verification)
│  │  └── errorHandler.ts
│  ├── routes/
│  │  ├── index.ts            (read-mostly endpoints)
│  │  └── audit.ts
│  ├── db/
│  │  ├── schema.ts           (indexed onchain events)
│  │  └── migrations/
│  ├── services/
│  │  ├── eventIndexer.ts     (listens to contract events)
│  │  └── complianceService.ts
│  └── types.ts
├── .env.example
└── package.json

subgraph/
├── schema.graphql            (GraphQL schema for onchain data)
├── src/
│  └── mappings.ts            (event → GraphQL mapping)
└── subgraph.yaml
```

**Frontend changes (minimal):**
```
app/
├── src/
│  ├── web3/                  [NEW] Smart contract integration
│  │  ├── contracts.ts        (Treasury.sol ABI + address)
│  │  ├── provider.ts         (Base RPC connection)
│  │  └── treasury.ts         (wrapper functions: executeIntent, etc.)
│  ├── api/                   [NEW] API client (read-mostly)
│  │  ├── client.ts           (fetch wrapper)
│  │  └── audit.ts            (audit report queries)
│  ├── store/
│  │  ├── index.ts            [MODIFIED] dispatch to contract calls
│  │  ├── slice-*.ts          [MINIMALLY MODIFIED] actions call treasury.ts
│  │  └── useAuth.ts          [NEW] wallet + JWT auth
│  └── hooks/
│     └── useWeb3.ts          [NEW] contract interaction + gas estimation
```

---

---

## 🛑 STOPPING POINT: When to Pause Before Production Coding

**STOP HERE before moving to Phases 1–3 (Backend, Compliance, Deployment).**

### What You Should Have After Phase 0 Complete:

✅ **Smart contracts deployed to Base Sepolia:**
- PolicyEngine.sol, IntentRegistry.sol, LedgerContract.sol (100% test coverage)
- All contracts tested on local Anvil, then deployed to testnet
- Seeded with 1M USDC from faucet for demo

✅ **Frontend wired to WalletConnect + contracts:**
- WalletConnect integration (MetaMask, Ledger, Gnosis Safe work)
- User connects wallet → balance updates
- Policy creation → contract call (event logged onchain)
- Intent creation + approval → contract calls (approval logged onchain)

✅ **Morpho yield integration working:**
- User can click "Deposit to Morpho" → approves USDC → user signs deposit
- mUSDC received in user's wallet
- Dashboard shows yield accrual (simulated or real)

✅ **All 5 Perplexity features integrated into UI:**
- Anomaly detection: flags shown on Activity page + Approvals page
- Counterparty risk: risk score + explanation on approval UI + risk dashboard
- Market shock detector: alerts + Perplexity suggestions appear in real-time
- Audit report PDF: user can generate audit report with Perplexity summaries + Etherscan links
- Predictive rebalancing: forecast card on Accounts page + recommendation

✅ **Phase 1.z demo scenarios fully wired:**
- All 7 scenarios walkthrough end-to-end
- Each scenario uses real contract calls to Base Sepolia
- No production code yet; all simulated/demo data

✅ **Ready for investor/customer demo:**
- 10–15 minute walkthrough showing: wallet connection → policy → yield → risk → audit trail
- All data comes from Base Sepolia (provable onchain)
- Use case is clear: "Automate policies, earn yield, prove execution onchain, no custody risk"

---

### What NOT to Build Yet:

❌ **Backend API (Phase 1)** — Don't build Postgres, REST API, event indexing yet
- Demo runs entirely in frontend + contract calls
- Add backend only after Phase 0 is solid and customer feedback is in

❌ **Production deployment (Phase 3)** — Don't deploy to Base mainnet yet
- Keep everything on Base Sepolia testnet during demo week
- Move to mainnet after customer validation + security review

❌ **Advanced compliance (Phase 2)** — Don't build SAR/AML/KYC hooks yet
- Basic audit trail (contract events) is enough for demo
- Add compliance after feedback from compliance officer

❌ **DeFi integrations (Phase 4)** — Don't add Aave, Curve, Uniswap yet
- Morpho is the MVP DeFi feature; enough to prove concept
- Expand protocols after v1.0 launch

---

### Why This Stopping Point?

**You'll have:**
1. Proof that onchain settlement works (contracts on testnet)
2. Proof that non-custodial works (user's wallet signs, user keeps keys)
3. Proof that Perplexity AI adds value (anomaly detection, risk scoring, forecasting)
4. Proof that yield works without custody (Morpho integration)
5. A 10–15 minute demoable product (investors/customers can play with it)

**You'll avoid:**
- Building a full production backend too early (customer feedback may change it)
- Deploying to mainnet before validating demand (save $ on gas, reduce risk)
- Compliance complexity before you know who your customers are

**Next move:** Demo this to 3–5 target customers. Gather feedback. Then decide: do you need a full backend API for their use case, or is frontend + contracts enough?

---

## 📝 Implementation Prompt for Next AI Agent Session

**Copy and paste this into a fresh Claude Code session to begin Phase 0 implementation:**

---

### PROMPT: TreasuryFlow MVP — Phase 0 Implementation (Smart Contracts + Web3 + Perplexity)

**Project:** TreasuryFlow — non-custodial treasury automation on Base Chain

**Vision:** "Keep your USDC in your wallet. We'll automate policies & prove execution onchain."

**Scope:** Phase 0 only. Build smart contracts + WalletConnect + 5 Perplexity features. Deploy to Base Sepolia testnet. Wire demo scenarios (Phase 1.z). NO backend API, NO production deployment yet.

**Timeline:** 1 week (40 hours estimated)

**Architecture (summarized):**
- **Non-custodial:** Users hold USDC in their own wallet (WalletConnect: MetaMask, Ledger, Gnosis Safe, hardware). TreasuryFlow is policy engine + ledger, never holds funds.
- **Onchain:** Policies + intents + ledger stored as contract events on Base Sepolia. Immutable, queryable, regulators verify on Etherscan.
- **Morpho yield:** User can auto-deposit idle USDC to Morpho for 5–10% APY while staying non-custodial (user owns mUSDC position in their wallet).
- **Perplexity AI:** 5 features (anomaly detection, risk scoring, market shock alerts, predictive forecasting, audit reports) using cheapest LLMs (Haiku for most; Sonnet for reasoning-heavy tasks).

---

### FILES TO MODIFY / CREATE:

**Smart Contracts (NEW `/contracts/` directory):**
```
contracts/
├── src/
│  ├── PolicyEngine.sol       (policy registry, validation)
│  ├── IntentRegistry.sol     (immutable intent log)
│  ├── LedgerContract.sol     (transaction ledger)
│  └── interfaces/
│     └── IUSDC.sol           (USDC interface)
├── test/
│  ├── PolicyEngine.t.sol     (100% coverage)
│  ├── IntentRegistry.t.sol   (100% coverage)
│  └── LedgerContract.t.sol   (100% coverage)
├── script/
│  └── Deploy.s.sol           (deployment to Base Sepolia)
├── foundry.toml
└── .env.example
```

**Frontend (MODIFY existing + NEW files):**
```
src/
├── web3/                         [NEW]
│  ├── walletconnect.ts          (WalletConnect v2 integration)
│  ├── contracts.ts               (contract ABIs + addresses)
│  ├── provider.ts                (Base RPC provider)
│  ├── intents.ts                 (policy/intent/ledger wrapper functions)
│  ├── morpho.ts                  (Morpho SDK integration)
│  └── anomaly.ts                 [NEW] Anomaly scorer (threshold logic)
├── services/
│  ├── perplexity.ts             [EXISTING, EXPAND]
│  │  ├── explainAnomaly()        [NEW]
│  │  ├── riskScore()             [NEW]
│  │  ├── marketInsight()         [NEW]
│  │  ├── auditSummary()          [NEW]
│  │  ├── forecastRebalance()     [NEW]
├── pages/
│  ├── Dashboard.tsx             [MODIFY] Add WalletConnect button, Morpho suggestion
│  ├── Policies.tsx              [MODIFY] Wire to contract calls
│  ├── Approvals.tsx             [MODIFY] Show anomaly warnings + risk scores
│  ├── Activity.tsx              [NEW] Transaction ledger from contract events
│  ├── Risk.tsx                  [NEW] Counterparty risk dashboard
│  ├── Audit.tsx                 [NEW] PDF report generation
│  └── Forecast.tsx              [NEW] Predictive rebalancing card
└── components/
   ├── AnomalyWarning.tsx        [NEW]
   ├── RiskCard.tsx              [NEW]
   ├── MarketAlert.tsx           [NEW]
   ├── ForecastCard.tsx          [NEW]
   └── AuditReportModal.tsx      [NEW]
```

---

### MILESTONES (Recommended order & effort):

**0.1 Smart Contracts (8 hours)**
- [ ] PolicyEngine.sol: policy creation, validation, versioning events
- [ ] IntentRegistry.sol: intent creation, approval chain, execution proof
- [ ] LedgerContract.sol: transaction recording
- [ ] Deploy.s.sol: deployment script for Base Sepolia
- [ ] Test: 100% coverage (Foundry tests for each contract)

**0.2 WalletConnect + Web3 (8 hours)**
- [ ] WalletConnect v2 setup + MetaMask/Ledger connection UI
- [ ] ethers.js v6 provider for Base Sepolia + Morpho
- [ ] Contract ABI files + addresses
- [ ] Wrapper functions: createPolicy(), createIntent(), approveIntent(), executeIntent()
- [ ] Morpho SDK: depositToMorpho(), withdrawFromMorpho(), getMorphoBalance()
- [ ] Wire Dashboard.tsx: show wallet address, USDC balance, Morpho suggestion

**0.3 Anomaly Detection (6 hours)**
- [ ] Scorer: compute anomaly score (high-value, timing, counterparty, rapid transfers, balance drops)
- [ ] Perplexity integration: when score > 50, call explainAnomaly() → brief explanation
- [ ] UI: show warning on Activity page + Approvals page
- [ ] Wire Approvals.tsx to show risk

**0.4 Counterparty Risk Scoring (5 hours)**
- [ ] On first transaction with new counterparty, call Perplexity: riskScore() → low/medium/high + rationale
- [ ] Risk dashboard: table of counterparties + risk + trend
- [ ] Wire Approvals.tsx to show risk card
- [ ] Update score on each transaction

**0.5 Market Shock Detector (4 hours)**
- [ ] Price poller: fetch USDC/USD from CoinGecko every 5 min (or mock for demo)
- [ ] Threshold: if move > 5%, trigger alert
- [ ] Perplexity integration: call marketInsight() → suggest rebalance
- [ ] UI alert card with insight

**0.6 Audit Report PDF (5 hours)**
- [ ] Collect ledger entries from contract events (or localStorage demo fallback)
- [ ] For each policy decision, call auditSummary() for Perplexity rationale
- [ ] PDF generation: ledger table + approvals + Perplexity summaries + Etherscan QR codes
- [ ] UI: Audit.tsx page with date picker + download button

**0.7 Predictive Rebalancing (4 hours)**
- [ ] Pattern detector: identify recurring intents (payroll Fri, sweep Mon)
- [ ] Perplexity: forecastRebalance() → predict balances 1–7 days out + recommendation
- [ ] UI: forecast card on Dashboard + Forecast.tsx page
- [ ] Chart: show predicted balances over time

---

### DEMO SCENARIOS (Phase 1.z) — Wire in order after each milestone:

After each milestone is complete, add corresponding demo scenario:

1. **Scenario 1 (after 0.2):** Connect wallet → create sweep policy
2. **Scenario 2 (after 0.2):** Policy triggers → deposit to Morpho for yield
3. **Scenario 3 (after 0.3):** Unusual transfer → anomaly warning + Perplexity explanation
4. **Scenario 4 (after 0.4):** New counterparty → risk assessment
5. **Scenario 5 (after 0.5):** Market rate move → alert + insight
6. **Scenario 6 (after 0.7):** Forecast card → recommendation
7. **Scenario 7 (after 0.6):** Generate audit PDF with Perplexity summaries

---

### CHEAP LLM STRATEGY:

| Task | LLM | Reason |
|------|-----|--------|
| Anomaly explanation | **Haiku** | Simple "is this risky?" classification |
| Risk scoring | **Sonnet** | Better reasoning; worth slight cost increase |
| Market insight | **Haiku** | Quick suggestion generation |
| Audit summaries | **Haiku** | Summarization is Haiku's strength |
| Forecast | **Sonnet** | Reasoning + forecasting; justifies Sonnet |

**Total LLM cost:** ~$5–10 for entire demo week (negligible).

---

### ENVIRONMENT & SETUP:

**Contracts:**
- Foundry installed (forge, anvil)
- Deploy to Base Sepolia testnet
- Use Alchemy or Infura for RPC
- USDC address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base Sepolia)
- Morpho address: (lookup on Base Sepolia)

**Frontend:**
- ethers.js v6.8.0+
- @web3modal/ethers v4.0.0+ (WalletConnect UI)
- morpho-sdk (if available; else use direct Morpho contract calls)
- pdfkit for PDF generation

**Perplexity API:**
- Use Perplexity API key (provided in .env)
- Mock fallback if key missing (for dev/testing)

---

### SUCCESS CRITERIA (Phase 0 complete):

- [ ] 3 smart contracts deployed to Base Sepolia + 100% test coverage
- [ ] WalletConnect working (user connects MetaMask/Ledger/Gnosis Safe)
- [ ] Policy creation → contract event logged onchain
- [ ] Morpho integration → user deposits USDC, receives mUSDC in their wallet
- [ ] Anomaly detection → flags appear on Activity + Approvals pages
- [ ] Counterparty risk → score + explanation shown on approval UI + risk dashboard
- [ ] Market shock → real-time alert with Perplexity insight
- [ ] Audit report → PDF downloadable with Perplexity summaries + Etherscan links
- [ ] Predictive forecast → card on Dashboard with recommendation
- [ ] All 7 demo scenarios wired and demoable end-to-end
- [ ] Base Sepolia deployment works; contracts are immutable + queryable

---

### NOTES:

1. **No production deployment yet.** Keep everything on testnet (free gas, easy reset).
2. **No backend API yet.** This phase is frontend + contracts only.
3. **Demo data is OK.** Use seeded USDC balances, mock market prices, simulated recurring intents. All good for demo.
4. **WalletConnect is real.** User's wallet is real (testnet, but real signatures). This is NOT a mock.
5. **Perplexity is real.** Use actual Perplexity API (with Haiku/Sonnet as described). Don't mock it; the AI explanations are the MVP value.
6. **Share contract ABIs + addresses** once deployed so frontend can wire in.

---

**Ready to build. Good luck!**

---
