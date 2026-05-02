<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

---

## Implementation Status (Updated 2026-05-02)

This document was generated from a Perplexity research session. The sections below have been annotated with current build status:

- **[LIVE]** — fully implemented and working in production/testnet
- **[SCAFFOLD — COMING SOON]** — UI and interfaces exist; live execution gated; users see "Coming soon"
- **[DEFERRED]** — not started; no scaffold yet

**Constraint:** Fiat-to-crypto rails (CDP Onramp, Offramp, ACH/wire) are **[SCAFFOLD — COMING SOON]** across all phases. Reason: no adequate sandbox available for safe pre-production testing; production verification has timelags that preclude early wiring. The full user-facing UI flow is built and visible; live execution is gated until v1.1.

**What is live today:**
- All AI reasoning: Hermes (via Perplexity Sonar), MarketContext service (Exa + Perplexity + Fireworks), policy drafting, rationale explainer, anomaly detection, risk scoring **[LIVE]**
- Smart contracts on Base Sepolia: PolicyEngine, IntentRegistry, TreasuryVault, LedgerContract, MockUSDC **[LIVE]**
- Onchain execution: maker-checker approval, contract-enforced policy validation, real mUSDC transfers, Basescan audit evidence **[LIVE]**
- WalletConnect integration **[LIVE]**

---

# A) Tie this stack into a full product roadmap based on a consolidation of the OpenFX article + what you said any treasury management platform needs in general

B) Define the Json schemas for proposals and plans

C) Show me how to wire Hermes and OpenClaw around CDP and contracts

Here’s a consolidated, opinionated plan for TreasuryFlow across A/B/C, with AI (Hermes + OpenClaw + Exa/Perplexity/Fireworks) at the core and CDP + your contracts as rails.

***

## A) Product roadmap with this stack

OpenFX’s vision is “programmatic treasury”: APIs and AI automate trading, payments, and liquidity across chains and currencies, with humans checking the machine’s work.[^1][^2][^3] A serious TMS also needs visibility, forecasting, risk, payments orchestration, and reconciliation.[^4][^5][^6]

Below is a phased roadmap that assumes the stack you described.

### Phase 0 – AI‑ready infrastructure (you’re here / almost here)

**Goal:** Make everything AI‑addressable and observable.

- **Data \& domain model**
    - Implement core entities in your backend:
        - `TreasuryWallet` (CDP Embedded, external via WalletConnect, “fake” demo wallets).[^7][^8][^9]
        - `BalanceSnapshot`, `Exposure` (per currency/chain/counterparty), `Policy`, `ActionProposal`, `ExecutionPlan`, `ExecutionRecord`.[^1][^5]
- **Rails**
    - Integrate:
        - CDP Embedded Wallets and Onramp API (fiat ↔ stablecoin funding and off‑ramp) **[SCAFFOLD — COMING SOON]**: UI scaffolded, live execution gated.[^10][^7][^8]
        - Your stablecoin contracts + DEX/router contracts via RPC **[LIVE]**.
        - WalletConnect for external/institutional wallets and custodians **[LIVE]**.[^9][^11]
        - Custody adapters (Coinbase Custody, Fireblocks, Anchorage, BitGo) **[SCAFFOLD — COMING SOON]**: interface-complete stubs; users see "Connect your custodian" in Settings.
    - Add **demo wallets**:
        - `type: DEMO` wallets backed by real keys/Embedded Wallets but small funded amounts, tagged in DB **[LIVE]**.
- **Agents infra**
    - Cloud OpenClaw:
        - Skills for: chain reads/writes, WalletConnect actions, demo wallet ops **[LIVE]**; CDP fiat skills and custody skills **[SCAFFOLD — COMING SOON]**.[^7][^9]
    - Cloud Hermes Agent (e.g. via NVIDIA Build/hosted):
        - Connected to: OpenClaw, an internal API for state (`/api/portfolio_state`), and a MarketContext service **[LIVE]**.

**Outcome:** AI can “see” your treasury (via structured APIs) and “touch” all rails through OpenClaw skills.

***

### Phase 1 – Real‑time visibility \& monitoring (OpenFX + classic TMS)

**Goal:** Single pane of glass + agent‑driven monitoring, not just dashboards.

- **Features**
    - Dashboard:
        - All wallets and accounts (Embedded, external, demo) with balances by currency/chain/issuer.[^1][^8][^5]
    - Exposure view:
        - Per currency, chain, counterparty, and stablecoin issuer, with “concentration” metrics.[^12][^4]
    - Alerts:
        - Threshold breaches (liquidity below X, issuer >Y%, chain risk too high).
        - Anomalies (unusual flows, rogue addresses).
- **AI’s role**
    - Hermes “Monitoring” workflow:
        - Periodically calls OpenClaw skills to fetch balances + recent transactions.
        - Synthesizes a natural‑language snapshot (“You’re 73% in USD, 50% onchain, 35% with issuer A; yesterday you were 60%…”).
        - Flags anomalies and emits `Alert` objects with rationales.[^1][^13]

**Outcome:** A control tower UI that already feels AI‑native: Hermes explains your posture, not you interpreting raw charts.

***

### Phase 2 – Policy engine + AI proposals (human checks machine’s work)

**Goal:** AI proposes portfolio actions; policy + humans gate execution.[^1][^13]

- **Policy layer**
    - Define `Policy` schema:
        - Liquidity buffers, concentration limits by issuer/currency/counterparty/chain, demo vs production limits.[^12][^5]
    - Deterministic validator:
        - For any `ActionProposal`, emit `PolicyCheckResult[]` (PASS/WARN/FAIL with messages).
- **Proposal loop**
    - Hermes “Exposure \& Policy” workflow:
        - Reads `BalanceSnapshot` / `Exposure` / `Policy`.
        - Calls MarketContext service (Exa + Perplexity + Fireworks) for up‑to‑date risk/liquidity context.[^1][^3]
        - Generates structured `ActionProposal[]` (e.g. rebalances, hedges, funding shifts) plus rationales and impact estimates.
        - Backend validates proposals against policy, stores them, and sets status `UNDER_REVIEW`.
- **UX**
    - “Treasury Inbox”:
        - List proposals by date, risk, and impact.
        - Show pass/warn/fail checks and rationales.
        - Approve/reject/edit, then trigger ExecutionPlan generation.

**Outcome:** You now have the OpenFX “human checks machine’s work” loop: LLM agents propose, humans supervise, policy guardsrails enforce.[^1][^2][^13]

***

### Phase 3 – Programmatic rebalancing \& FX routing

**Goal:** Live, end‑to‑end flows: quotes → best route → execution via stablecoins + CDP, with Hermes orchestrating.[^1][^2][^3]

- **Execution pipeline**
    - On approval, Hermes is called to transform an `ActionProposal` into an `ExecutionPlan` (strict JSON) **[LIVE]**.
    - Plan steps cover:
        - Onramp/offramp via CDP Hosted Onramp and/or Embedded Wallets **[SCAFFOLD — COMING SOON]**: step type exists, skill returns mock, UI shows "Coming soon".[^10][^7]
        - Stablecoin swaps using your contracts/DEX routers **[LIVE]**.
        - Transfers between wallets (Embedded, external via WalletConnect) **[LIVE]**.[^9][^11]
        - Custody adapter transfers (`coinbase_custody_transfer`, `fireblocks_transfer`, etc.) **[SCAFFOLD — COMING SOON]**: skill stubs return typed mock responses.
- **OpenClaw**
    - Executes steps:
        - Skills `contract_swap`, `transfer_stablecoin`, `walletconnect_send_tx` **[LIVE]**.
        - Skills `cdp_get_buy_quote`, `cdp_initiate_onramp` **[SCAFFOLD — COMING SOON]**: scaffold only, no live fiat execution.
        - Updates `ExecutionRecord` and the plan status step‑by‑step **[LIVE]**.
- **AI**
    - Uses MarketContext + quotes from OpenClaw to choose venues/routes.
    - Uses Fireworks for safe JSON shaping of `ExecutionPlan` compatible with your schemas.[^1][^3]
- **Demo vs production**
    - Same pipelines:
        - `mode: DEMO` → demo wallets, capped sizes, labeled as demo.
        - `mode: PRODUCTION` → real balances, extra approvals.

**Outcome:** You’ve now hit the OpenFX bar: programmatic treasury that can run continuously, with humans in the approvals loop and stablecoin rails at the core.[^1][^2][^3]

***

### Phase 4 – Forecasting, payments orchestration, reconciliation

**Goal:** Become a full AI‑first TMS on top of your programmatic treasury engine.[^4][^5][^6]

- **Forecasting**
    - AI generates `ForecastScenario[]` **[LIVE — Phase 4]**:
        - Based on historical flows, pipeline events (invoices, payroll), and macro context.
        - Recommends pre‑funding corridors, hedge ratios, and liquidity buffers.
- **Payments**
    - Vendor/payroll flows:
        - Create recurring payments from external wallets via WalletConnect **[LIVE — Phase 4]**.[^9]
        - CDP Embedded Wallet payments **[SCAFFOLD — COMING SOON]**: scaffolded; live execution deferred.[^7]
    - Hermes chooses rails (pure stablecoin vs onramp + local payout), OpenClaw executes.
    - **Note on fiat payouts:** "onramp + local payout" path is **[SCAFFOLD — COMING SOON]**. Pure stablecoin path is fully live.
- **Reconciliation**
    - Unified ledger:
        - Auto‑matching chain TXs, CDP events, and internal ledger rows.
    - AI handles classification and exception explanations.

**Outcome:** TreasuryFlow becomes the “AI operating system” for cash, risk, and payments across rails.

***

## B) JSON schemas for ActionProposal and ExecutionPlan

These are condensed but expressive; you can extend as needed.

### `ActionProposal` (business intent)

```json
{
  "$schema": "https://treasuryflow.app/schemas/action_proposal.json",
  "title": "ActionProposal",
  "type": "object",
  "required": [
    "id",
    "version",
    "createdAt",
    "createdBy",
    "type",
    "status",
    "portfolioId",
    "mode",
    "inputs",
    "expectedImpact",
    "rationale"
  ],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "version": { "type": "integer", "minimum": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "createdBy": { "type": "string" },   // e.g. "hermes", "user:<id>"
    "type": {
      "type": "string",
      "enum": ["REBAlANCE", "FX_HEDGE", "FUNDING", "PAYMENT", "YIELD_SHIFT"]
    },
    "status": {
      "type": "string",
      "enum": [
        "DRAFT",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "EXECUTED_PARTIAL",
        "EXECUTED_FULL"
      ]
    },
    "portfolioId": { "type": "string" },
    "priority": {
      "type": "string",
      "enum": ["LOW", "MEDIUM", "HIGH"],
      "default": "MEDIUM"
    },
    "mode": {
      "type": "string",
      "enum": ["DEMO", "PRODUCTION"],
      "default": "DEMO"
    },

    "inputs": {
      "type": "object",
      "required": ["source", "target"],
      "properties": {
        "source": {
          "type": "object",
          "properties": {
            "walletIds": { "type": "array", "items": { "type": "string" } },
            "currencies": { "type": "array", "items": { "type": "string" } },
            "chains": { "type": "array", "items": { "type": "string" } }
          },
          "additionalProperties": true
        },
        "target": {
          "type": "object",
          "properties": {
            "targetAllocations": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["asset", "targetPct"],
                "properties": {
                  "asset": { "type": "string" },
                  "targetPct": { "type": "number" },
                  "minPct": { "type": "number" },
                  "maxPct": { "type": "number" }
                }
              }
            },
            "minLiquidityBufferUsd": { "type": "number" },
            "hedgeHorizonDays": { "type": "integer" }
          },
          "additionalProperties": true
        },
        "constraints": {
          "type": "object",
          "properties": {
            "maxSlippageBps": { "type": "integer" },
            "maxNotionalUsd": { "type": "number" },
            "allowedVenues": { "type": "array", "items": { "type": "string" } },
            "disallowedVenues": {
              "type": "array",
              "items": { "type": "string" }
            }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": false
    },

    "expectedImpact": {
      "type": "object",
      "properties": {
        "beforeExposure": { "type": "object", "additionalProperties": true },
        "afterExposure": { "type": "object", "additionalProperties": true },
        "estimatedPnlUsd": { "type": "number" },
        "feeEstimateUsd": { "type": "number" },
        "riskScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "additionalProperties": false
    },

    "policyChecks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["policyId", "result"],
        "properties": {
          "policyId": { "type": "string" },
          "result": { "type": "string", "enum": ["PASS", "WARN", "FAIL"] },
          "messages": { "type": "array", "items": { "type": "string" } }
        }
      }
    },

    "rationale": {
      "type": "object",
      "required": ["summary"],
      "properties": {
        "summary": { "type": "string" },
        "details": { "type": "string" },
        "marketContextId": { "type": "string" }
      }
    },

    "linkedExecutionPlanId": { "type": "string" },
    "metadata": { "type": "object", "additionalProperties": true }
  }
}
```


### `ExecutionPlan` (low‑level how; OpenClaw‑friendly)

```json
{
  "$schema": "https://treasuryflow.app/schemas/execution_plan.json",
  "title": "ExecutionPlan",
  "type": "object",
  "required": [
    "id",
    "version",
    "createdAt",
    "createdBy",
    "proposalId",
    "status",
    "mode",
    "steps"
  ],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "version": { "type": "integer", "minimum": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "createdBy": { "type": "string" },  // usually "hermes"
    "proposalId": { "type": "string" },
    "status": {
      "type": "string",
      "enum": [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "CANCELLED"
      ]
    },
    "mode": {
      "type": "string",
      "enum": ["DEMO", "PRODUCTION"],
      "default": "DEMO"
    },

    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "index", "type", "status", "tool", "params"],
        "properties": {
          "id": { "type": "string" },
          "index": { "type": "integer" },
          "dependsOn": { "type": "array", "items": { "type": "string" } },
          "type": {
            "type": "string",
            "enum": [
              "QUOTE",
              "SWAP",
              "TRANSFER",
              "ONRAMP",
              "OFFRAMP",
              "APPROVAL",
              "LEDGER_WRITE",
              "NOOP"
            ]
          },
          "status": {
            "type": "string",
            "enum": ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"]
          },
          "tool": {
            "type": "object",
            "required": ["kind", "name"],
            "properties": {
              "kind": { "type": "string", "enum": ["OPENCLAW_SKILL", "INTERNAL_API"] },
              "name": { "type": "string" }
            }
          },
          "params": {
            "type": "object",
            "additionalProperties": true
          },
          "expectedOutcome": {
            "type": "object",
            "properties": {
              "maxSlippageBps": { "type": "integer" },
              "minReceiveAmount": { "type": "string" },
              "maxFeeUsd": { "type": "number" }
            },
            "additionalProperties": true
          },
          "result": {
            "type": "object",
            "properties": {
              "raw": { "type": "object", "additionalProperties": true },
              "txHash": { "type": "string" },
              "quoteId": { "type": "string" }
            }
          },
          "error": {
            "type": "object",
            "properties": {
              "message": { "type": "string" },
              "code": { "type": "string" },
              "retryable": { "type": "boolean" }
            }
          }
        }
      }
    },

    "summary": {
      "type": "object",
      "properties": {
        "estimatedFeeUsd": { "type": "number" },
        "estimatedPnlUsd": { "type": "number" },
        "chainsInvolved": { "type": "array", "items": { "type": "string" } },
        "walletsInvolved": { "type": "array", "items": { "type": "string" } }
      }
    },

    "metadata": { "type": "object", "additionalProperties": true }
  }
}
```

These schemas are what you enforce server‑side; Hermes outputs must conform.

***

## C) Wiring Hermes + OpenClaw around CDP and contracts

This is the concrete wiring so agents can safely operate on your rails.

### 1. OpenClaw skills you need

Implement these as cloud‑hosted skills OpenClaw can call.

**CDP Onramp + Embedded Wallets — [SCAFFOLD — COMING SOON]**[^10][^7][^8]

> All CDP fiat skills are scaffolded. Skills exist, return typed mock responses, and surface "Coming soon" in the UI. No live fiat execution until sandbox availability and verification timelags are resolved (v1.1).

- `cdp_get_buy_quote` **[SCAFFOLD]**
    - Wraps your backend endpoint that calls CDP’s buy/quote API.
    - Params: `purchaseCurrency`, `purchaseNetwork`, `paymentAmount`, `paymentCurrency`, `paymentMethod`, `country`, `subdivision`, `destinationAddress`.
- `cdp_initiate_onramp` **[SCAFFOLD]**
    - Starts the onramp session (redirect URL / hosted widget URL).
    - Params: `quoteId`, `walletId`, metadata.
- `cdp_get_wallet_balance` **[SCAFFOLD]**
    - Reads CDP Embedded Wallet balances by `walletId`.[^8]

**Custody Adapters — [SCAFFOLD — COMING SOON]**

> Interface-complete stubs for all four custodians. Users see "Connect your custodian" in Settings. Live API keys wired per customer contract.

- `coinbase_custody_transfer` **[SCAFFOLD]**
- `fireblocks_transfer` **[SCAFFOLD]**
- `anchorage_transfer` **[SCAFFOLD]**
- `bitgo_transfer` **[SCAFFOLD]**

**On‑chain contracts — [LIVE]**

- `chain_get_balances` **[LIVE]**
    - Inputs: `walletAddresses[]`, `chain`.
    - Returns normalized token balances.
- `contract_call_read` **[LIVE]**
    - Generic view call: `contractAddress`, `functionSignature`, `args`, `chain`.
- `contract_swap` **[LIVE]**
    - Wraps your router/DEX swap function.
    - Params: `chain`, `routerAddress`, `walletId`, `tokenIn`, `tokenOut`, `amountIn`, `minAmountOut`, `deadline`, `demoMode`.
- `transfer_stablecoin` **[LIVE]**
    - ERC‑20 transfer: `chain`, `tokenAddress`, `fromWalletId`, `toWalletAddress`, `amount`, `demoMode`.

**WalletConnect and external custodians — [LIVE]**[^9][^11]

- `walletconnect_send_tx` **[LIVE]**
    - Params: `walletConnectorId`, `chain`, `txData`.
    - Returns `txHash` and metadata.
- `walletconnect_sign_message` **[LIVE]**
    - Used for approvals or off‑chain attestations.

**Demo/fake wallets — [LIVE]**

- `create_demo_wallet` **[LIVE]**
    - Creates a `TreasuryWallet` of type `DEMO` with `maxDailyOutflowUsd` guard.
- `fund_demo_wallet` **[LIVE]**
    - Testnet: uses `MockUSDC.mint()` faucet on Base Sepolia.

Each skill is deterministic; OpenClaw logs inputs/outputs and status.

***

### 2. Hermes tools configuration

Expose a small set of tools to Hermes:

- `tool_get_portfolio_state`
    - Backend endpoint returning compressed `BalanceSnapshot`, `Exposure`, `Policy`, etc.
- `tool_market_context`
    - Backend endpoint that:
        - Calls Exa (search).
        - Calls Perplexity Agent to synthesize context.
        - Calls Fireworks to structure into `MarketContext` JSON.[^1][^3]
- `tool_openclaw_call`
    - Backend route that calls OpenClaw with:
        - `{ "skillName": string, "params": object }`.

Hermes never talks directly to CDP, RPCs, or WalletConnect; it always uses `tool_openclaw_call`.

***

### 3. Example flow: rebalancing proposal → plan → execution

**Step 1 – Proposal**

1. Backend calls Hermes with:
    - Current compressed state via `tool_get_portfolio_state`.
    - Instruction: “Generate `ActionProposal[]` JSON for rebalancing within policy.”
2. Hermes:
    - Calls `tool_market_context` for macro/liquidity info (Exa + Perplexity + Fireworks).[^1][^3]
    - Computes proposals and returns JSON matching `ActionProposal` schema.
3. Backend:
    - Validates against JSON schema + policy validator.
    - Stores proposals, sets status to `UNDER_REVIEW`.

**Step 2 – Plan creation**

1. User approves one proposal in the UI.
2. Backend calls Hermes:
    - Input: `ActionProposal` (as JSON), plus explicit guardrails (max notional, allowed skills).
    - Task: “Transform into an `ExecutionPlan` JSON; use CDP where fiat ↔ crypto is needed, and our contracts for swaps; obey these constraints.”
3. Hermes:
    - Designs steps and chooses tools:
        - Step 0: quote via `cdp_get_buy_quote` (if needed) **[SCAFFOLD — returns mock until v1.1]**.
        - Step 1: onramp via `cdp_initiate_onramp` **[SCAFFOLD — shows "Coming soon"]**.
        - Step 2: swap via `contract_swap` **[LIVE]**.
        - Step 3: transfer via `transfer_stablecoin` **[LIVE]**.
    - Returns `ExecutionPlan` JSON.
4. Backend:
    - Validates against `ExecutionPlan` schema.
    - Requires final approval for `mode: PRODUCTION`.

**Step 3 – Execution via OpenClaw**

1. `ExecutionRunner` service:
    - Reads `ExecutionPlan`.
    - For each step:
        - Calls OpenClaw with `skillName` and `params`.
        - Updates `ExecutionPlan.steps[i].status/result/error`.
        - Writes `ExecutionRecord` rows with `txHash`, wallet, chain, etc.
2. On completion:
    - Backend recomputes `BalanceSnapshot` and `Exposure`.
    - Hermes can then run the next monitoring loop.

***

### 4. How fake wallets fit

For demos and testing against real contracts:

- Backend:
    - Maintains `TreasuryWallet` with `type: DEMO`, `riskTier: DEMO`, `maxDailyOutflowUsd`, etc.
- Hermes:
    - Reads wallet metadata via `tool_get_portfolio_state`.
    - When `mode: DEMO`, only targets `type: DEMO` wallets and testnets, or tiny mainnet amounts.
- OpenClaw:
    - `create_demo_wallet` and `fund_demo_wallet` skills.
    - Use CDP Embedded Wallets in a sandbox mode for demo users if you want “real” UX without exposing keys directly.[^7][^8]

This gives you “fake” wallets from a business perspective, but they still execute against real contracts and rails in a controlled way.

***

If you want, next we can walk through a concrete JSON example: a single `ActionProposal` plus `ExecutionPlan` for “rebalance 50k USDC from Chain A to EUR stablecoin on Chain B via CDP onramp + your swap contract,” wired precisely through the schemas and skills above.

<div align="center">⁂</div>

[^1]: https://www.openfx.com/blog/automated-treasury-management-stablecoins-llms-and-the-disintermediation-of-cross-border-payments

[^2]: https://www.linkedin.com/posts/openfx_automated-treasury-management-how-stablecoins-activity-7453150954201448448-XHRK

[^3]: https://www.openfx.com/blog/from-ledgers-to-apis-treasury-management-of-tomorrow

[^4]: https://www.kosh.ai/blog/best-integrated-treasury-management-systems-for-small-and-medium-businesses

[^5]: https://www.financialprofessionals.org/glossary/treasury-management-system

[^6]: https://stripe.com/resources/more/treasury-management-systems-101-what-they-are-how-they-work-and-how-to-choose-one

[^7]: https://docs.cdp.coinbase.com/embedded-wallets/onramp/cross-platform

[^8]: https://www.coinbase.com/developer-platform/products/embeddedwallets

[^9]: https://walletconnect.com/blog/powering-institutional-digital-asset-management-with-walletconnect-and-utila

[^10]: https://docs.cdp.coinbase.com/onramp/coinbase-hosted-onramp/overview

[^11]: https://www.canton.network/blog/walletconnect-is-now-live-on-canton-network

[^12]: https://chain.link/article/stablecoin-treasury-management

[^13]: https://eco.com/support/en/articles/14730442-ai-agents-for-stablecoin-treasury

