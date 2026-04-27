# TreasuryFlow

**AI-powered treasury operations console** using Perplexity Agent API for 24/7, verifiable, and cited audits of digital dollar reserves.

[Vision](#vision) • [Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Roadmap](#roadmap)

## Vision

> "Our app uses Perplexity Agent API to provide 24/7, verifiable, and cited audits of our reserves, effectively automating the $500k/year role of a traditional accounting firm while responding to market shocks in seconds."

The billion-dollar path for a treasury app isn't managing money—it's **reducing the cost of trust**. TreasuryFlow automates:
- Continuous, verifiable audits (every transaction auto-tagged and explained)
- 24/7 policy engine (sweep, rebalance, payout rules fire automatically)
- Real-time market response (<30 seconds from shock to rebalancing)
- Compliance as code (policies embed approvals, limits, and audit trails)

## Features

### Shipped (v0.1)
✅ **Policy Engine**
- Sweep: move excess reserves above threshold
- Rebalance: maintain minimum balance across chains
- Payout runs: batch vendor/contractor payouts
- Deposit routing: split inbound deposits (90/10 routes)
- Cash-out: route through partner bank settlement

✅ **Maker-Checker Approval Workflow**
- Auto-approve below thresholds
- Multi-approver rules for high-value or risky transactions
- First-time counterparty flagging
- Real-time balance impact preview

✅ **Ledger & Reconciliation**
- Deterministic execution and ledger posting
- Auto-tag suggestions via Perplexity Agent API (with citations)
- Intent rationale explainer (why did this policy fire?)
- Month-end completeness scoring
- ERP-ready CSV export

✅ **AI Surfaces**
- Policy drafting assistant: "convert this rule to a policy" → JSON with validation
- Intent explainer: "why did this intent fire?" → 2-3 sentence rationale + citations
- Tag suggester: "what's the accounting category?" → structured JSON (purpose, category, cost center)
- All surfaces have mock fallback (no API key required for demo)

✅ **UX**
- Dark mode + light mode
- Persistent state (localStorage)
- User switching (simulate maker-checker roles)
- 7 demo scenario buttons (Wallet Connect, Morpho Yield, Anomaly, Risk, Market Shock, Forecast, Audit)
- Risk flags with descriptive context

✅ **Web3 & Smart Contracts (Phase 0)**
- Deployed to Base Sepolia (PolicyEngine, IntentRegistry, LedgerContract)
- WalletConnect integration via Web3Modal
- Morpho Yield integration
- 5 new AI-powered hooks (Anomaly detection, Risk scoring, Market shock insights, Predictive forecasting, Audit rationales)

### Verified
- 28 unit tests (policy engine, approvals, execution, ledger, reconciliation — 100% branch coverage)
- 4 end-to-end demo scenarios
- Production build: 145KB gzip
- Zero TypeScript errors

### Coming Soon (v1.0)
🔨 **Coinbase for Business Integration** (pending approval)
- Real onchain execution via Coinbase API
- Live balance polling (Base, Ethereum, Polygon)
- Actual USDC transfers (sweep, rebalance, payouts)
- Settlement confirmation and retry logic

🔨 **Compliance & Audit**
- PDF audit reports with Perplexity citations
- Policy change log (version history)
- Approval chain reconstruction
- Counterparty limit audit trail

🔨 **Real Backend**
- Postgres database + Node.js API
- Authentication & session management
- Immutable audit log
- WebSocket real-time updates

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd app
npm install
```

### Development

```bash
cp .env.example .env
# Optional: add PERPLEXITY_API_KEY=... to .env for live AI calls
# Without a key, the app uses deterministic mock responses

npm run dev
```

Opens http://localhost:5173 with HMR enabled.

### Testing

```bash
npm run test        # Run all 28 unit tests
npm run test:watch  # Watch mode
```

### Production Build

```bash
npm run build       # Creates dist/
npm run preview     # Preview production build locally
```

Deploy `dist/` to any static host (Vercel, Netlify, S3, etc.).

## Environment Variables

### Development
- **`PERPLEXITY_API_KEY`** (optional) — Perplexity API key for live Agent API calls. If unset, uses deterministic mock responses.
- Vite dev proxy (`/api/agent-proxy`) injects the bearer token server-side (never exposed to browser).

### Production
- **`VITE_AGENT_PROXY_URL`** (optional) — URL of your production proxy (e.g., Vercel serverless function or Lambda).
- Without this, the app falls back to mock client.

### Production Perplexity Proxy (Example: Vercel)
You'll need a simple serverless function to inject the Perplexity API key on behalf of the client:

```typescript
// api/agent-proxy.ts (Vercel)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const response = await fetch('https://api.perplexity.ai/v1/agent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
  
  return res.status(response.status).json(await response.json());
}
```

Then set `VITE_AGENT_PROXY_URL=https://your-vercel-domain.com/api/agent-proxy` in production.

## Architecture

**Domain-first design:**
- `src/types/domain.ts` — Single source of truth (Zod schemas + branded ID types)
- `src/domain/` — Pure policy engine, approval rules, execution simulator, ledger (testable without UI)
- `src/store/` — Zustand slices per domain with localStorage persistence
- `src/components/shared/` — Reusable UI primitives
- `src/pages/` — Page-level UI composition
- `src/services/perplexity.ts` — AI adapter (fetch + mock implementations)

**Key principles:**
- All state transitions are pure functions (enables deterministic testing)
- Zod validates at system boundaries only
- Branded IDs prevent cross-wiring at compile time
- Mock AI client enables demoing without API keys

See [eng.md](./eng.md) for full architecture, known limitations, and tech debt.

## Roadmap

See [product.md](./product.md) for detailed vision, customer personas, roadmap (v0.1 → v1.0 → v2.0), metrics, and competitive differentiation.

**Quick timeline:**
- **v0.1** (shipped): MVP demo + Perplexity AI integration
- **v1.0** (next 4 weeks): Coinbase for Business + real backend + compliance reporting
- **v1.1** (weeks 5–8): Coinbase Onramp/Offramp + expanded AI audit
- **v2.0** (months 3+): Liquidity pools, cross-chain routing, institutional partnerships

## Use Cases

### Treasury Manager
Reduce operational overhead: policies run autonomously, approvals in seconds, 100% audit trail.

### Finance Controller
Provide auditors continuous, verifiable compliance: real-time tagged ledger, drop-in audit reports, 40% cost reduction ($200k/year for $50M AUM).

### CFO
Respond to market shocks in seconds: real-time rebalancing, policy-enforced counterparty limits, zero $10M+ capital events.

### Compliance Officer
Reduce audit burden by 60%: every decision logged with rationale, policy versioning, Perplexity citations.

## Testing the Demo

**7 scenario buttons on Overview page:**

1. **Wallet + Sweep** — Connect Wallet & trigger sweep policy
2. **Morpho Yield** — Deposit idle USDC to Morpho for yield
3. **Anomaly Warning** — High-value transfer at odd time triggers AI review
4. **Counterparty Risk** — First-time vendor triggers AI risk assessment
5. **Market Shock** — Price alert triggers rebalancing suggestion
6. **Predictive Forecast** — AI balance projections 1-7 days out
7. **Audit PDF** — Generate immutable onchain audit report

Each scenario completes its full lifecycle visibly: intent → approval (if needed) → execution → ledger update.

## Support & Contribution

- 📋 [Engineering Log](./eng.md) — Architecture decisions, known limitations, tech debt
- 📈 [Product Log](./product.md) — Vision, roadmap, metrics, customer archetypes
- 🐛 [Issues](https://github.com/ronithryal/TreasuryFlow/issues) — Bug reports and feature requests
- 💬 Slack/Discord (coming soon)

## License

MIT — See [LICENSE](./LICENSE) for details.

---

**Built with:** React 18 • TypeScript • Vite • Tailwind CSS • Zustand • Perplexity Agent API • Zod • Vitest

**Status:** MVP in production demo. Coinbase integrations pending approval (v1.0).
