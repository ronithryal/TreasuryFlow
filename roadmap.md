# Roadmap: Demo → Production

## Strategy

**Two branches, one codebase:**

| Branch | Purpose | Status | Target | Use Case |
|--------|---------|--------|--------|----------|
| **`main`** (demo) | Demoable MVP for investor/customer demos | ✅ Shipped | Evergreen | Sales calls, investor pitches, proof-of-concept |
| **`production`** | Real backend, Coinbase integration, auth, compliance | 🔨 In progress | 4 weeks | v1.0 selling to startups |

**Key principle:** Demo branch stays pristine and lightweight (localStorage, mock AI, seeded data). Production branch adds real infrastructure without breaking the domain logic.

**Shared across both:**
- `src/types/domain.ts` (policy, intent, ledger types)
- `src/domain/` (policy engine, approvals, execution, ledger — pure functions)
- `src/services/perplexity.ts` (AI adapter)
- UI components and pages (logic same, some API calls differ)

**Different between branches:**
- Store persistence (localStorage vs. API + cache)
- Approval flow (demo: simulated, prod: real user identity)
- Execution (demo: deterministic ledger, prod: actual Coinbase API calls)
- Auth (demo: topbar user switcher, prod: real JWT session)
- AI surfaces (demo: mock responses, prod: real Perplexity calls + citations)

---

## Current Limitations (from eng.md)

| Limitation | Demo Impact | Prod Impact | Fix in Prod |
|-----------|------------|------------|-----------|
| No onchain execution | ✅ Acceptable (seeded data + ledger sim) | ❌ Critical blocker | Real Coinbase API + settlement polling |
| No bank settlement | ✅ Acceptable (cash-out shows `partner_pending`) | ❌ Critical blocker | Coinbase Offramp + ACH/wire partners |
| localStorage only | ✅ Acceptable (reset button works) | ❌ Data loss risk | Postgres + API backend + versioning |
| No real auth | ✅ Acceptable (topbar user switcher) | ❌ No compliance | JWT + session management + audit log |
| No real counterparties | ✅ Acceptable (seeded list) | ❌ Missing feature | Live counterparty CRUD + KYC hooks |
| No compliance reporting | ✅ Acceptable (CSV export) | ❌ Customer requirement | PDF audit reports + SAR/AML triggers + compliance hooks |
| Buffered AI responses | ✅ Acceptable (instant mock) | ✅ Fine (can stream later) | Streaming UI (v1.1 nice-to-have) |
| Vite dev proxy only | ✅ Works locally | ❌ Won't work in prod | Serverless function (Lambda/Vercel) |

---

## Phase 1: Foundation (Weeks 1–2)

**Goal:** Real backend + database + auth. Domain logic untouched.

### 1.1 Backend Scaffolding

**What:** Node.js + Express + Postgres + TypeORM

**Files:**
- `backend/src/main.ts` — Express server
- `backend/src/db/migrations/` — Postgres schema (accounts, policies, intents, ledger, users, audit_log)
- `backend/src/middleware/auth.ts` — JWT verification
- `backend/src/middleware/audit.ts` — Log all writes to audit_log table
- `backend/.env.example` — DB_URL, PERPLEXITY_API_KEY, JWT_SECRET
- `backend/package.json` — dependencies

**Dependency:** Must have database schema matching `src/types/domain.ts` exactly

**Estimate:** 6 hours

### 1.2 API Routes (CRUD)

**What:** RESTful endpoints for all domains

**Routes:**
```
POST   /api/accounts              (admin only)
GET    /api/accounts              (read-only, current user's entities)
GET    /api/accounts/:id
PATCH  /api/accounts/:id          (balance updates only via execution, not manual edit)

POST   /api/policies
GET    /api/policies
GET    /api/policies/:id
PATCH  /api/policies/:id
DELETE /api/policies/:id

POST   /api/intents              (create manual intent or trigger policy)
GET    /api/intents
GET    /api/intents/:id
PATCH  /api/intents/:id          (decision: approve/reject/changes-requested)

POST   /api/ledger/execute       (execute intent, post entries)
GET    /api/ledger
GET    /api/ledger/:id

GET    /api/audit-log            (immutable, read-only)

POST   /api/auth/login           (username + password → JWT)
POST   /api/auth/logout
GET    /api/auth/me              (current user + permissions)

POST   /api/counterparties
GET    /api/counterparties
PATCH  /api/counterparties/:id
```

**Transactionality:** All write endpoints must be atomic (intent create → audit entry, execution → ledger post + balance update, approval → audit + state transition)

**Estimate:** 8 hours

### 1.3 Auth System

**What:** JWT + session, role-based access control

**Components:**
- User model (id, email, role, entity_id, created_at)
- Role enum (admin, treasurer, approver, viewer)
- Permissions matrix (who can approve $10k+ intents, who can create policies, etc.)
- JWT payload: `{ userId, email, role, entityId, iat, exp }`
- Middleware: `authRequired`, `requireRole('approver')`, `auditLog`

**Signup/Login:**
- Signup: email + password → hash → user row → JWT
- Login: email + password → verify hash → JWT
- Logout: client discards JWT (stateless)
- Session expiry: 24 hours, refresh token optional for later

**Estimate:** 4 hours

### 1.4 Database Schema & Migrations

**What:** Postgres tables matching domain types

**Tables:**
```sql
users (id, email, password_hash, role, entity_id, created_at)
entities (id, name, region, created_at)
accounts (id, entity_id, name, chain, account_type, balance, available_balance, status, policy_limits, created_at)
policies (id, entity_id, name, type, source_id, dest_id, conditions, approval_rule, status, created_at, next_eval_at)
intents (id, entity_id, policy_id, type, source_id, dest_id, amount, asset, status, created_by, approved_by, created_at, approved_at)
executions (id, intent_id, status, tx_ref, settled_at, failure_reason, created_at)
ledger_entries (id, execution_id, account_id, direction, amount, asset, purpose, category, cost_center, tx_ref, effective_at, created_at)
counterparties (id, entity_id, name, normal_range_min, normal_range_max, preferred_settlement, created_at)
audit_log (id, entity_id, user_id, action, entity_type, entity_id, changes, created_at) [immutable]
```

**Indexes:** on (entity_id, status), (user_id), (created_at) for fast queries

**Estimate:** 3 hours

### 1.5 Frontend → Backend Wiring

**What:** Replace localStorage calls with API calls

**Changes in `src/store/index.ts`:**
- Each slice action calls API endpoint instead of mutating state directly
- Responses are validated with Zod before updating store
- Error handling: retry logic for transient failures, show toast for user-facing errors
- Optimistic updates (update UI immediately, roll back if API fails)

**Estimate:** 6 hours

---

## Phase 2: Coinbase Integration (Weeks 2–3)

**Goal:** Real onchain execution + balance polling

### 2.1 Coinbase for Business API

**What:** Integrate Coinbase's v1 API (currently in beta)

**Setup:**
- Org ID + API key → `backend/.env`
- Helper: `backend/src/integrations/coinbase.ts`
  - `pollBalances(orgId, apiKey) → Promise<{ accountId, balance }[]>`
  - `executeTransfer(orgId, apiKey, params) → Promise<{ txRef, status }>`
  - Error handling: retry on rate limit, log failures

**Functionality:**
- Poll balances for all seeded accounts (Base, Ethereum, Polygon) every 30s
- On execution, call `executeTransfer()` → wait for settlement confirmation
- Update intent status: `executing` → `partner_pending` → `completed` or `failed`
- Post ledger entries only after confirmed on-chain

**Estimate:** 8 hours

### 2.2 Settlement Polling & Retry

**What:** Job queue for watching in-flight transfers

**Components:**
- Bull queue (Redis-backed, persists across restarts)
- Job: `{ intentId, txRef, orgId, retryCount }`
- Worker: polls Coinbase for status every 10s, max 10 retries (100s total)
- On success: post ledger entries, mark intent executed
- On failure: mark intent failed, set failure_reason, notify approver

**Estimate:** 4 hours

### 2.3 Real-time Balance Updates (WebSocket)

**What:** Push balance changes to connected clients

**Components:**
- WebSocket server (ws or Socket.IO)
- Endpoint: `GET /api/ws` (upgrade to WS)
- On balance change: broadcast to all clients watching that account
- Client reconnection: fetch latest state from API to resync

**Estimate:** 4 hours (nice-to-have for v1.0, can defer to v1.1)

---

## Phase 3: Compliance & Audit (Week 3–4)

**Goal:** Production-ready compliance + audit reporting

### 3.1 Audit Trail

**What:** Immutable log of all state changes

**Implementation:**
- Middleware logs every write: `{ user_id, action, entity_type, entity_id, before, after, timestamp }`
- Read-only endpoint: `GET /api/audit-log` (authorized for compliance officer role)
- Query by date range, entity type, user, action
- Export to JSON/CSV for external audit

**Estimate:** 2 hours

### 3.2 Compliance Hooks

**What:** SAR, AML, KYC triggers + logging

**Triggers:**
- High-value transfer ($100k+) → log for manual review
- New counterparty (first transaction) → require KYC check before approval
- Rapid transfers to same counterparty → flag for AML review
- Unusual time-of-day transfers → log for anomaly detection

**Hooks:**
- Event emitter: `complianceEvent({ type: 'high_value' | 'new_counterparty' | 'rapid_transfers', ...metadata })`
- Compliance service: handles logging, email alerts, approver notifications
- Can integrate with external services (FinCEN, OFAC) in v2.0

**Estimate:** 3 hours

### 3.3 Audit Report Generation

**What:** PDF export with policy rationale + transaction history + Perplexity citations

**Implement:**
- Endpoint: `GET /api/audit-report?startDate=...&endDate=...` → PDF
- Content:
  - Summary (total volume, policies fired, approvals, exceptions)
  - Policy listing (name, type, conditions, decisions made)
  - Ledger (all entries, tagged, categorized)
  - Approval chain (who approved what, when, why)
  - Rationale (for each intent: Perplexity-generated explanation + citations)
- Library: PDFKit or ReportLab

**Estimate:** 4 hours

---

## Phase 4: Production Deployment (Week 4)

**Goal:** Hosted, scaled, secure

### 4.1 Containerization & Infra

**What:** Docker + Vercel/Railway deployment

**Files:**
- `Dockerfile` (Node.js + Postgres client)
- `docker-compose.yml` (app + postgres locally)
- `backend/.env.production` (secrets via env vars, not file)

**Hosting options:**
- **Vercel** (frontend + serverless API routes) + managed Postgres (Vercel Storage or Neon)
- **Railway** (one-click Postgres + Node.js deployment)
- **AWS** (Lambda + RDS + CloudFront)

**Estimate:** 2 hours (Vercel is fastest, 30 min)

### 4.2 Security & Secrets

**What:** Never commit secrets, rotate keys

**Checklist:**
- [ ] Move all secrets to `.env` (gitignored)
- [ ] Use `process.env` in code, never hardcode
- [ ] Generate JWT_SECRET on deploy (don't commit)
- [ ] Rotate Perplexity API key annually
- [ ] Enable HTTPS (free with Vercel/Railway)
- [ ] Add CORS headers (restrict to your domain)
- [ ] Rate limit `/api/auth/login` (brute force protection)
- [ ] Hash passwords with bcrypt

**Estimate:** 1 hour

### 4.3 Monitoring & Observability

**What:** Error tracking + performance monitoring

**Tools:**
- Sentry (error logging + sourcemaps)
- LogRocket (session replay + console logs)
- Datadog or New Relic (metrics + APM)

**Estimate:** 1 hour (optional for v1.0, can add in v1.1)

---

## Phase 5: "Billion Dollar" Features — 24/7 Audits + Market Shock Response (v1.0→v1.1)

**These unlock the vision: 24/7 verifiable audits + market shock response. Customer-facing and revenue-generating.**

### 5.1 Real-Time Audit Report Generation

**What:** On-demand PDF audit reports with Perplexity-generated explanations

**Implement:**
- Backend: PDF generation service (PDFKit or ReportLab)
- Endpoint: `GET /api/audit-report?from=...&to=...` → PDF
- Content: full ledger, policy decisions, approval chain, Perplexity summaries (1-3 sentences per policy + citations)
- Perplexity prompt: "Summarize why this policy decision was made. Include key factors and risks considered."
- UI: "Generate report" button in Reconciliation, exports PDF with timestamp

**Estimate:** 4 hours (backend) + 2 hours (UI)

**Impact:** Automates 60% of audit prep work ($300k/year savings per customer)

### 5.2 Anomaly Detection Engine (via Perplexity)

**What:** Flag unusual transaction patterns and ask Perplexity to explain them

**Implement:**
- Anomaly scorer (compute on each new ledger entry):
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

### 5.3 Market Shock Detector & Auto-Rebalancing Alert

**What:** Monitor price feeds, detect >X% move, trigger auto-rebalancing

**Implement:**
- Price feed poller (CoinGecko free API, every 5 min)
- Threshold detector: if USDC, ETH, BTC moves >5%, trigger alert
- Alert UI: dashboard alert "🚨 USDC rate moved +7.5% — rebalance opportunity"
- Link to existing rebalance policy: "Trigger rebalance now"
- Perplexity: "Based on current rates and your reserve composition, recommend moving $X to Y to maintain 60/40 balance"

**Estimate:** 2 hours (price poller) + 1 hour (UI) + 1 hour (Perplexity)

**Impact:** Prevent capital loss from rate swings; catch arbitrage opportunities

### 5.4 Counterparty Risk Scoring (via Perplexity)

**What:** AI-powered risk assessment based on transaction history

**Implement:**
- On first transaction with new counterparty, or on manual refresh:
  - Gather: amount, timing, frequency, name, prior policy approvals
  - Call Perplexity: "Rate this counterparty's risk (low/medium/high). Consider: amount ($X is 3x normal?), timing (business hours?), patterns (new vendor?). Explain."
  - Show risk score + rationale on approval UI: "MEDIUM RISK: amount is 3x normal, but timing is business hours. Recommend approval with monitoring."
- Risk dashboard: table of all counterparties with scores + trend sparklines
- Update score after each transaction

**Estimate:** 3 hours (risk engine) + 2 hours (Perplexity integration) + 1 hour (UI)

**Impact:** 40% fewer approval delays; better risk transparency

### 5.5 Settlement Verification (Onchain)

**What:** Confirm ledger entries match actual onchain settlement

**Implement:**
- For onchain intents (sweep, rebalance, payout):
  - After execution, poll Coinbase API for tx status
  - Match ledger entry.txReference to actual onchain transaction
  - Update ledger entry: `settlementStatus: "pending" | "confirmed" | "failed"`
  - Show confirmation timestamp + block number on Activity page
- For bank cash-outs:
  - Webhook from Coinbase Offramp confirms ACH posted
  - Update status: `bank_settlement_status: "pending" | "ach_posted" | "failed"`

**Estimate:** 2 hours (Coinbase polling) + 1 hour (webhook handler)

**Impact:** 100% audit trail integrity; eliminate ledger-to-reality gaps

### 5.6 Predictive Rebalancing

**What:** Forecast balance changes 1-7 days out, suggest proactive rebalancing

**Implement:**
- Pattern analysis: detect recurring intents (payroll on Fri, sweep on Mon, weekly vendors)
- Perplexity: given upcoming scheduled intents + patterns, forecast balances in 3/5/7 days
- Prompt: "Here are our scheduled intents for the next week. What will our balance look like in 3 days? Do we need to rebalance now?"
- Recommendation: "Rebalance Polygon to reserve by Wed to cover Fri payroll (forecast balance: $5k, threshold: $25k)"
- UI: forecast card in Accounts page showing predicted balances

**Estimate:** 2 hours (pattern analysis) + 1 hour (Perplexity integration)

**Impact:** Eliminate reactive rebalancing; more predictable cash position

### 5.7 24/7 Audit API

**What:** Public endpoint to generate audit report on-demand for regulators/auditors

**Implement:**
- Endpoint: `GET /api/v1/audit-report?from=2024-01-01&to=2024-01-31&format=pdf|json`
- Auth: API key (with audit-read permission) or OAuth
- Returns: full transaction ledger, policy decisions, approval chain, Perplexity summaries
- Audit trail: log every request to audit_access_log
- Compliance: responses are cryptographically signed (optional)

**Estimate:** 1 hour (wrapper endpoint, reuse Phase 5.1 PDF generation)

**Impact:** Regulators get real-time visibility; reduces audit friction

### 5.8 Compliance Hooks (SAR, AML, KYC)

**What:** Automated triggers for regulatory reporting

**Implement:**
- Triggers on intent creation:
  - SAR: High-value transfer (>$10k) or 3+ transfers to same counterparty in <24h
  - AML: Rapid transfers (>5 in <1h) or rapid consolidation pattern
  - KYC: First transaction with counterparty above $50k
- Event emitter: `complianceEvent({ type: 'sar' | 'aml' | 'kyc', intentId, reason })`
- Perplexity: explain trigger ("Pattern matches money laundering: 5 small transfers consolidating to 1 large transfer")
- UI: Compliance dashboard with flags + Perplexity explanations
- Immutable log: write to audit_compliance table for regulators

**Estimate:** 2 hours (trigger logic) + 1 hour (Perplexity) + 1 hour (UI)

**Impact:** Reduce compliance burden; document all decisions

---

### 5.9 Counterparty Management (v1.1+)

**What:** CRUD for counterparties + KYC status tracking

**Status:** Nice-to-have for v1.0, prioritize if customers request

**Estimate:** 3 hours

### 5.10 Bank Settlement (Coinbase Offramp)

**Status:** ⏳ Pending approval (keep scaffolded in code, show as "coming soon")

**Placeholder:**
- Intent with `type: 'cash_out'` and `destination.preferredSettlement: 'bank_cashout'`
- UI shows "Settlement via Coinbase Offramp (coming soon)"
- Once approved, integrate the Coinbase Offramp API

### 5.11 Multi-Currency Support (v1.1+)

**What:** Track BTC, ETH, USDT beyond USDC

**Nice-to-have if:** Customers want cross-chain reserve management

**Estimate:** 4 hours

### 5.12 Streaming AI Responses (v1.1+)

**What:** Token-by-token rendering for policy drafter

**Nice-to-have if:** Demo needs to show "AI thinking" in real-time

**Estimate:** 1 hour

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
- Backend: add `/backend/` directory
- Database: add migrations
- Auth: add JWT middleware
- Coinbase: add integration module
- Tag releases (v1.0-alpha, v1.0-beta, v1.0, etc.)

**Merging strategy:**
- Do NOT merge production back to main
- Do NOT merge main forward to production (causes drift)
- **Share only:** `src/types/domain.ts`, `src/domain/`, `src/services/perplexity.ts`
  - Use git subtree or monorepo if sharing code; for now, mirror manually if small changes

---

## Timeline & Effort

| Phase | Goal | Duration | Blocker? | Start |
|-------|------|----------|----------|-------|
| 1 | Backend + DB + Auth | 2 weeks | No (can run in parallel) | Week 1 |
| 2 | Coinbase Integration | 1 week | Yes (Coinbase API approval) | Week 2 |
| 3 | Compliance + Audit | 1 week | No | Week 3 |
| 4 | Deploy to production | 1 week | No (any hosting works) | Week 4 |
| 5 | Customer features + sales | 2+ weeks | Some (customer feedback) | Week 5+ |

**Critical path:** Coinbase approval (2-4 weeks typical for API partnership).

**Parallel work:** Start Phase 1 immediately while waiting for Coinbase approval.

---

## Go-to-Market (After v1.0)

**Target customer:** Early-stage fintech / web3 platforms ($10M–500M AUM, existing Coinbase Business account)

**Sales approach:**
1. **Case studies:** time saved, audit cost reduction, execution latency improvement
2. **Pricing:** $5k–20k/month based on AUM + policy count
3. **Success fees:** 10–20% of annual audit cost savings (paid after savings verified)
4. **Partnerships:** Coinbase partner program, fintech integrators, accounting firms

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
- [ ] Backend API fully implemented + tested
- [ ] Coinbase integration working (or mocked with plan to activate)
- [ ] Audit trail + compliance hooks in place
- [ ] JWT auth + RBAC enforced
- [ ] Deployed to production (Vercel or Railway)
- [ ] 3 pilot customers using it
- [ ] Zero data loss events
- [ ] 99% uptime SLA met

**Revenue target:** $200k ARR by month 6 post-launch

---

## Files to Create

**Backend structure:**
```
backend/
├── src/
│  ├── main.ts                (Express server)
│  ├── middleware/
│  │  ├── auth.ts
│  │  ├── audit.ts
│  │  └── errorHandler.ts
│  ├── routes/
│  │  ├── accounts.ts
│  │  ├── policies.ts
│  │  ├── intents.ts
│  │  ├── ledger.ts
│  │  ├── auth.ts
│  │  └── auditLog.ts
│  ├── db/
│  │  ├── schema.ts           (TypeORM entities)
│  │  └── migrations/
│  │     └── 001_initial.ts
│  ├── integrations/
│  │  ├── coinbase.ts
│  │  └── perplexity.ts
│  ├── services/
│  │  ├── authService.ts
│  │  ├── policyService.ts
│  │  └── complianceService.ts
│  └── types.ts               (reuse src/types/domain.ts from frontend)
├── .env.example
├── package.json
├── tsconfig.json
└── Dockerfile

# Root level
├── docker-compose.yml
└── .github/workflows/
   └── deploy.yml             (CI/CD)
```

**Frontend changes (minimal):**
```
app/
├── src/
│  ├── api/                   [NEW] HTTP client
│  │  ├── client.ts           (Axios or fetch wrapper)
│  │  ├── accounts.ts         (account API calls)
│  │  ├── policies.ts
│  │  ├── intents.ts
│  │  └── auth.ts
│  ├── store/
│  │  ├── index.ts            [MODIFIED] dispatch to API instead of direct mutations
│  │  ├── slice-*.ts          [MINIMALLY MODIFIED] actions call API
│  │  └── useAuth.ts          [NEW] hook for JWT auth state
│  └── hooks/
│     └── useApi.ts           [NEW] error handling + retry logic
```

---

## Summary

**The plan:** Keep demo branch alive and demoable forever. Build production branch in parallel with real backend, database, auth, and Coinbase integration. Start shipping to customers after 4 weeks when v1.0 is stable.

**Critical decision:** Do Phases 1–2 in parallel (don't wait for Coinbase approval). Demo still fully functional with mocked Coinbase calls while you build real infrastructure.

**Expected outcome:** By week 5, have 2–3 customers using production v1.0 with real USDC transfers, audit trails, and compliance reporting.
