# Product Log — TreasuryFlow

## Vision

**"Our app uses Perplexity Agent API to provide 24/7, verifiable, and cited audits of our reserves, effectively automating the $500k/year role of a traditional accounting firm while responding to market shocks in seconds."**

The billion-dollar path for a treasury app isn't managing money—it's **reducing the cost of trust**. Traditional treasury operations rely on:
- Manual reconciliation (1–2 FTE per $50M AUM)
- Quarterly or semi-annual audits ($200k–500k each)
- Latency on policy decisions (days to weeks)
- Opaque counterparty risk (static limits, no real-time verification)

TreasuryFlow automates this by:
1. **Continuous, verifiable audits** — Every transaction is auto-tagged, categorized, and explained with Perplexity citations
2. **24/7 policy engine** — Sweep, rebalance, payout rules fire automatically; humans approve in seconds, not days
3. **Real-time market response** — Detect imbalance or counterparty risk, trigger rebalancing, execute within seconds
4. **Compliance as code** — Policies embed approval thresholds, counterparty limits, and audit trails; no manual compliance checks

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

**Verified:**
- 28 unit tests (policy engine, approvals, execution, ledger, reconciliation)
- 4 end-to-end demo scenarios (sweep, rebalance, payout batch, deposit routing)
- Perplexity Agent API integration with mock fallback (no API key required for demo)
- Production build: 145KB gzip, zero TS errors, runs in preview mode

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

### Phase 2: v1.0 (Next 4 weeks) — Production Ready
**Coinbase for Business Integration (pending approval)**
- Real onchain execution via Coinbase API
- Live balance polling (Base, Ethereum, Polygon)
- Actual USDC transfers (sweep, rebalance, payout runs)
- Settlement confirmation and error handling (retry logic)

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
- Market shock detector (e.g., >5% rate move → trigger rebalance alert)

**Multi-Entity Support**
- Subsidiary/entity selector in UI
- Entity-scoped policies and approvals
- Consolidation reporting (group-level balance view)

### Phase 3: v1.1 (Weeks 5–8) — Market Expansion
**Coinbase Onramp/Offramp**
- Fiat-to-digital-dollar funding (via Coinbase Onramp)
- Digital-to-fiat settlement (via Coinbase Offramp)
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

**Ideal First Customers:**
- $10M–500M AUM fintech / web3 platform treasuries
- High-volume payout operations (payroll, customer refunds)
- Multi-chain asset management (Base → Polygon arbitrage, Ethereum reserves)
- Existing Coinbase Business account holders

**Deal Structure:**
- SaaS: $5k–50k/month based on AUM and policy count
- Success fees: 10–20% of annual audit cost savings (only after savings verified)

## Competitive Differentiation

| Feature | TreasuryFlow | Traditional | Competitors (Notional, Ondo, etc.) |
|---------|--------------|-------------|-------------------------------------|
| **24/7 Audits** | ✅ Perplexity-cited | Manual, quarterly | No |
| **Natural Language Policies** | ✅ Draft with AI | No | No |
| **Real-time Execution** | ✅ <30s approval+exec | 2–5 days | Minutes to hours |
| **Multi-chain** | ✅ Base, Eth, Polygon | Single chain or custodian | Limited |
| **Compliance Reporting** | ✅ PDF + SAR/AML hooks | Manual prep | Partial |
| **Open Settlement** | ✅ Coinbase partner | N/A | Closed ecosystem |
| **Cost to Customer** | $5k–50k/month | $500k/year audit + 1 FTE | $100k–250k/month |

## Anti-Goals

- ❌ We are **not** a wallet or self-custody solution
- ❌ We are **not** a trading bot or yield farming tool (we optimize allocation, not returns)
- ❌ We are **not** replacing risk committees (policies are guardrails, humans decide strategy)
- ❌ We are **not** a consumer app (B2B2C through platforms only)

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
