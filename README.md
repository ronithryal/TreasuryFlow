# TreasuryFlow

**TreasuryFlow is the non-custodial treasury operating system for the digital dollar economy — automating policy execution, continuous AI-verified audits, and real-time market response, all without ever touching your funds. We don't ask you to trust us. We prove it onchain.**

---

## 🚀 The Thesis: Eliminating the Cost of Trust

Traditional treasury operations are slow, manual, and expensive. Accounting firms charge $200k–$500k/year for audits that happen months after the fact. Reconciliation consumes 1–2 full-time employees. Market shocks (like the SVB collapse) require days of manual reconciliation and response.

TreasuryFlow replaces the "trust us" model with **mathematical proof**. We combine:

1.  **Onchain Policy Engine** (Base Sepolia) — Immutable rules for sweeps, payouts, and rebalancing.
2.  **AI-Powered Forensics** (Perplexity Agent API) — Continuous, 24/7 auditing with automated transaction rationales, risk scoring, and anomaly detection.
3.  **Non-Custodial Architecture** — You keep your keys. We use WalletConnect to ensure your money does exactly what you told it to do, without ever taking custody.

---

## 🏗️ Dual-Demo Architecture

TreasuryFlow uses a unique **Feature-Flagged Execution Engine** that allows the exact same codebase to power two distinct demo experiences:

*   **Mock Demo (`VITE_APP_MODE=mock`)**: A lightning-fast, zero-setup environment for exploring UI, AI rationales, and policy drafting. No wallet or testnet ETH required.
*   **Testnet Demo (`VITE_APP_MODE=testnet`)**: A cryptographically verifiable environment on **Base Sepolia**. Users connect their own wallets, mint testnet USDC, and sign real transactions to execute policies.

This architecture ensures 100% UI parity while providing either a frictionless demo or a "proof of execution" for investors and auditors.

---

## ✨ Features

### ✅ Shipped (v0.1 & v0.2)

*   **Autonomous Policy Engine**:
    *   **Sweep**: Move excess reserves above a custom threshold.
    *   **Rebalance**: Maintain minimum balance across multiple chains/accounts.
    *   **Payout Runs**: Batch vendor/contractor payouts with risk flagging.
    *   **Deposit Routing**: Automatically split inbound deposits (e.g., 90/10 routes).
    *   **Cash-out**: Route through partner bank settlement (simulated).
*   **Maker-Checker Approval Workflow**:
    *   Auto-approve below thresholds.
    *   Multi-approver rules for high-value or risky transactions.
    *   First-time counterparty flagging.
    *   Real-time balance impact previews.
*   **Ledger & Reconciliation**:
    *   Deterministic execution and real-time ledger posting.
    *   Month-end completeness scoring.
    *   ERP-ready CSV export (NetSuite/QuickBooks compatible).
*   **Advanced AI Surfaces (Perplexity Agent API)**:
    *   **Policy Drafting**: Natural language → Validated Policy JSON.
    *   **Intent Explainer**: "Why did this policy fire?" with citations.
    *   **Tag Suggester**: Automated accounting categorization with reasoning.
    *   **Anomaly Detection**: Flags unusual patterns (timing, value, frequency).
    *   **Risk Scoring**: AI assessment of new counterparties.
    *   **Market Shock Insights**: Real-time analysis of price volatility.
    *   **Predictive Forecasting**: 1-7 day balance projections.
    *   **Audit Rationales**: Human-readable explanations for every onchain event.

### 🛡️ Testnet Proof (Base Sepolia)

*   **MockUSDC Faucet**: Onboard in one click by minting 100k testnet USDC.
*   **TreasuryVault Contract**: Real onchain custody (testnet) and execution.
*   **Cryptographic Audit Trail**: Every policy execution emits a `PolicyExecuted` event, readable on Basescan.
*   **WalletConnect Integration**: Support for MetaMask, Coinbase Wallet, Rainbow, and any WC-compatible wallet.

#### Deployed Contracts — Base Sepolia (Chain ID 84532)

| Contract | Address |
|----------|---------|
| MockUSDC | [`0x576aAA911eC1caAd7F234F21b3607a98C9F669F2`](https://sepolia.basescan.org/address/0x576aAA911eC1caAd7F234F21b3607a98C9F669F2) |
| TreasuryVault | [`0xaCB7F3Da6cF6cC7Fe35e74B35477A3065172151A`](https://sepolia.basescan.org/address/0xaCB7F3Da6cF6cC7Fe35e74B35477A3065172151A) |
| PolicyEngine | [`0x01E0149639EB224CCc0557d3bd33b0FB05505a64`](https://sepolia.basescan.org/address/0x01E0149639EB224CCc0557d3bd33b0FB05505a64) |
| IntentRegistry | [`0xf510c47823139B6819e4090d4583B518c66ee0d7`](https://sepolia.basescan.org/address/0xf510c47823139B6819e4090d4583B518c66ee0d7) |
| LedgerContract | [`0x20cF3fB0A14FEce0889f69e1243a9d9f78AC508b`](https://sepolia.basescan.org/address/0x20cF3fB0A14FEce0889f69e1243a9d9f78AC508b) |

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite, Tailwind CSS.
*   **State Management**: Zustand (Domain-sliced with localStorage persistence).
*   **AI**: Perplexity Agent API (Structured JSON outputs + Citations).
*   **Web3**: Wagmi, Viem, Web3Modal (AppKit).
*   **Smart Contracts**: Solidity, Foundry (Deployed to Base Sepolia).
*   **Validation**: Zod (Branded IDs + System boundary validation).

---

## 🚦 Quick Start

### Prerequisites

*   Node.js 18+
*   npm or yarn

### Installation

```bash
cd app
npm install
```

### Development

```bash
cp .env.example .env
# Set VITE_APP_MODE=mock (default) or testnet
# Optional: Add PERPLEXITY_API_KEY for live AI calls (otherwise uses mock fallback)

npm run dev
```

Opens http://localhost:5173 with HMR.

### Testing

```bash
npm run test        # Runs 28+ unit tests (100% domain coverage)
```

---

## 🚀 Deployment

### Live Demos

**TreasuryFlow is deployed on Vercel:**

- **Mock Demo** (No wallet required): https://treasuryflow-mock.vercel.app
- **Testnet Demo** (Base Sepolia): https://treasuryflow-testnet.vercel.app

### Deploy Your Own

1. Clone this repository and push to GitHub
2. Connect your GitHub repo to [Vercel](https://vercel.com)
3. Set environment variables in Vercel Project Settings:
   ```
   VITE_APP_MODE=mock       # or "testnet"
   VITE_PERPLEXITY_API_KEY=your_key  # Optional (uses mock fallback if not set)
   ```
4. Deploy with `vercel deploy` or via the Vercel Dashboard

**For Testnet Demo Users:**
- Connect a Web3 wallet (MetaMask, Coinbase Wallet, Rainbow, or WalletConnect-compatible)
- Add Base Sepolia (Chain ID 84532) to your wallet
- Request Base Sepolia ETH from the [Base Faucet](https://faucet.base.org)
- Use the MockUSDC faucet in the app to mint 100k testnet USDC

---

## 📅 Roadmap

### Phase 1: MVP Demo (Current)
✅ Core policy engine + dual-demo architecture.
✅ Perplexity AI integration (8 surfaces).
✅ Base Sepolia contract deployment & WalletConnect.
✅ Comprehensive security review resolved (OpenZeppelin access controls & balance-tracking).
✅ CI/CD pipelines & automated secret scanning configured.

### Phase 2: Production Ready (v1.0)
🔨 **Coinbase for Business Integration**: Real onchain execution via Coinbase API.
🔨 **Compliance Reporting**: PDF audit reports with Perplexity citations.
🔨 **Real Backend**: Postgres + Node.js (replacing localStorage).
🔨 **Authentication**: Role-based access control (RBAC).

### Phase 3: Market Expansion (v1.1)
🔨 **Fiat On/Offramps**: Coinbase Onramp/Offramp integration.
🔨 **ERP Sync**: Direct integration with NetSuite, QuickBooks, and Xero.
🔨 **Expanded AI Audit**: Automated month-end close summaries.

---

## 📄 License

MIT — See [LICENSE](./LICENSE) for details.

---

**Built by the TreasuryFlow Team.**
**Status:** v0.2 MVP in production demo. v1.0 Coinbase integrations in progress.
