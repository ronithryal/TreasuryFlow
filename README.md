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

TreasuryFlow powers two distinct demo experiences from a single codebase:

*   **Mock Demo (`VITE_APP_MODE=mock`)**: A lightning-fast, zero-setup environment for exploring UI, AI rationales, and policy drafting. No wallet or testnet ETH required.
*   **Testnet Demo (`VITE_APP_MODE=testnet`)**: A cryptographically verifiable environment on **Base Sepolia**. Users connect their own wallets, mint testnet USDC, and sign real transactions to execute policies.

### TreasuryFlow Demo Modes

| Capability | Mock Demo | Testnet Demo |
|---|---|---|
| Wallet required | No | Yes, Base Sepolia |
| Token balances | Seed/mock data | Base Sepolia mUSDC |
| Policy enforcement | Simulated | PolicyEngine validates onchain |
| Payment request lifecycle | Simulated | IntentRegistry onchain |
| Maker-checker | UI role simulation | Contract-enforced initiator != approver |
| Fund movement | Simulated | TreasuryVault transfers mUSDC |
| Ledger/audit evidence | Mock bundles | Onchain events + receipt tx hash |
| AI policy builder | Mock/template behavior | Still partially demo/template |
| CDP Embedded Wallets | Coming soon | Coming soon |
| Login/auth | Simulated roles | Simulated roles |
| Yield deployment | Coming soon/demo only | Testnet demo path only; no real yield |

---

## 🛡️ What is real vs simulated

TreasuryFlow is currently in an advanced MVP/Pilot stage. We are transparent about where the logic lives:

### Real in Testnet (Base Sepolia)
- **Onchain Contracts**: Fully deployed and functional logic for `PolicyEngine`, `IntentRegistry`, `TreasuryVault`, and `LedgerContract`.
- **Policy Validation**: `PolicyEngine` enforces limits (max amount) and allowed participants (source/destination) onchain.
- **Payment Request Lifecycle**: The full "Create → Approve → Execute" intent lifecycle is handled by `IntentRegistry`.
- **Maker-Checker Enforcement**: Smart contracts strictly forbid the initiator of an intent from being its approver.
- **Fund Movement**: `TreasuryVault` executes real transfers of `mUSDC` testnet tokens.
- **Forensic Evidence**: The Audit page consumes live contract events and displays verifiable transaction hashes with deep-links to Basescan.

### Simulated or Coming Soon
- **Production Auth**: The demo uses role simulation (Initiator vs. CFO). Real auth/RBAC is coming in v1.0.
- **CDP Embedded Wallets**: UI placeholders exist; integration is pending CDP enablement.
- **Production Approvals**: Server-side demo signing is used for the "CFO" step to simplify the demo. Production will support Safe, WalletConnect, and CDP approvals.
- **Integrations**: Coinbase for Business, Ramp, Circle, and ERP (NetSuite/QuickBooks) sync are on the roadmap.
- **Real Yield**: While the "Yield" flow runs through the onchain golden path, it does not currently interact with real Aave/Morpho/Sky contracts.
- **Compliance Workflows**: SOC 2 and KYB automations are roadmap items.

---

## ⛓️ Base Sepolia Deployment (Chain ID 84532)

The following P0 contracts are live on Base Sepolia. You can verify their source and state on Basescan.

| Contract | Address |
|----------|---------|
| MockUSDC | [`0x240fb77d1c6bbe72bb59a08b379c7d94e905839b`](https://sepolia.basescan.org/address/0x240fb77d1c6bbe72bb59a08b379c7d94e905839b) |
| PolicyEngine | [`0x0f01f0632a35493b63c87a4a422a783213abad0e`](https://sepolia.basescan.org/address/0x0f01f0632a35493b63c87a4a422a783213abad0e) |
| LedgerContract | [`0x7e97006ccaf3050ae1f5c2187baab1b03287c12b`](https://sepolia.basescan.org/address/0x7e97006ccaf3050ae1f5c2187baab1b03287c12b) |
| TreasuryVault | [`0x5f88f257cd264d0cfb2844debc8ea04406be8a1d`](https://sepolia.basescan.org/address/0x5f88f257cd264d0cfb2844debc8ea04406be8a1d) |
| IntentRegistry | [`0x53eb4406785aa86b64c662102745fc85cf93d459`](https://sepolia.basescan.org/address/0x53eb4406785aa86b64c662102745fc85cf93d459) |

### Pre-deployed Demo Policies
The `Deploy.s.sol` script pre-configures the following policies in `PolicyEngine`:
- **Policy #1**: `Vendor Payment` — Max 10,000 USDC.
- **Policy #2**: `Treasury Sweep` — Max 100,000 USDC.
- **Policy #3**: `Yield Deposit` — Max 500,000 USDC.

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite, Tailwind CSS.
*   **State Management**: Zustand (Domain-sliced with localStorage persistence).
*   **AI**: Perplexity Agent API (Structured JSON outputs + Citations).
*   **Web3**: Wagmi, Viem, Reown AppKit (Web3Modal).
*   **Smart Contracts**: Solidity, Foundry (Deployed to Base Sepolia).

---

## 🚦 Quick Start

### Prerequisites
*   Node.js 18+
*   Foundry (for contract testing)

### Installation
```bash
cd app
npm install
```

### Local Development
```bash
cp .env.example .env
# Set VITE_APP_MODE=mock (default) or testnet
# See .env.example for required contract addresses and keys
npm run dev
```

### Testing & Verification
**Contracts**:
```bash
cd contracts
forge test -v
```

**App**:
```bash
cd app
npm run typecheck
npm test
npm run build
```

---

## 📅 Roadmap

### Phase 1: MVP Demo (Current)
✅ Core policy engine + dual-demo architecture.
✅ Perplexity AI integration (8 surfaces).
✅ Base Sepolia contract deployment (P0 Refactor).
✅ Maker-Checker "Golden Path" enforcement.

### Phase 2: Production Ready (v1.0)
🔨 **Coinbase Integration**: Real execution via Coinbase for Business.
🔨 **Authentication**: Role-based access control (RBAC).
🔨 **Audit PDF**: Exportable forensic reports with Perplexity citations.

---

## 📄 License
MIT — See [LICENSE](./LICENSE) for details.
