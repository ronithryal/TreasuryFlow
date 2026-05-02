# TreasuryFlow Updated Plan and Prompts

This document assumes the infra-starter pass has already been run and the repo now has branch/workstream scaffolding, ownership boundaries, and acceptance docs in place. The next step is to execute the actual build in two phases: **Prompt 1 = P0 buyer-demo unblockers**, then **Prompt 2 = OpenFX-first scaffolding plus deeper EigenCloud-style verification**. This sequencing follows the audit's conclusion that the main buyer-critical blocker is still the missing self-contained golden path and related active gaps, while OpenFX is the highest-leverage next roadmap narrative once P0 is stable.[cite:1]

## Model assignment

| Prompt | Model to use | Why |
|---|---|---|
| **Prompt 1: P0 buyer-demo unblockers** | **Claude CLI Sonnet-class** | Best for high-coordination product logic, state-machine changes, evidence modeling, and careful UX/control fixes. |
| **Prompt 1 subagents** | **Gemini CLI** on isolated tasks only | Good for fixture cleanup, seeded data variation, rationale schema tests, and narrow UI cleanup. |
| **Prompt 2: OpenFX-first scaffolding** | **Gemini CLI** | Fastest for adapter scaffolding, mock providers, UI shells, and repetitive integration wiring. |
| **Prompt 2 EigenCloud slice** | **Claude CLI Sonnet-class** | Better for verifiable execution design, deterministic replay semantics, append-only audit log abstractions, and verification receipts. |

## Execution order

1. Run **Prompt 1** first and do not begin Prompt 2 until the P0 acceptance checklist is green.[cite:1]
2. Use 2-3 parallel subagents under Prompt 1 only if their file surfaces do not overlap.
3. Once the canonical payout demo is reliable, begin **Prompt 2** with OpenFX first, then provider scaffolding, then EigenCloud-style verification.[cite:1]

## Updated Plan 1

### Goal

Eliminate the remaining buyer-demo blocker and all active control gaps by shipping a self-contained canonical payment flow that proves request creation through independent approval, policy validation, execution, ledger posting, reconciliation, and audit evidence without requiring wallet debugging.[cite:1]

### Must-fix scope

#### 1. Canonical golden path
- Add a one-click canonical payout demo action that resets demo state and runs a deterministic end-to-end scenario.[cite:1]
- Replace wallet-required completion with a clearly labeled `server_signed_demo` or `simulated_demo` execution path.[cite:1]
- Use a threshold-crossing bank payout scenario that surfaces first-time counterparty review and cash-out threshold approval.[cite:1]

#### 2. Audit evidence completion
- Generate an evidence packet that includes initiator, distinct approver, policy evaluation result, execution reference, ledger links, reconciliation links, and a non-technical proof interpreter.[cite:1]
- Ensure the Audit page is populated after the canonical run and no longer defaults to an empty proof state in demo mode.[cite:1]

#### 3. AI rationale correctness
- Fix mismatches between request type and explanation output so a bank cash-out cannot be explained as a reserve sweep.[cite:1]
- Add schema validation, context grounding, and deterministic fallback copy.

#### 4. Risk realism
- Replace templated or duplicated counterparty data with varied volumes, identities, histories, and distinct rationales.[cite:1]
- Keep a few intentionally elevated-risk examples, but make them look analytically grounded.

#### 5. Reconciliation guardrails
- Block export when required categories are missing, or require override reason + reviewer identity before export proceeds.[cite:1]
- Ensure export state updates at row level, not blanket-marking all entries exported.[cite:1]

#### 6. Editable approval matrix
- Convert static thresholds into editable policy controls by amount, entity, source wallet, destination type, new counterparty, risk score, rail type, initiator, and emergency override.[cite:1]

#### 7. Stablecoin-to-bank detail
- Make ACH/wire payout rails explicit in data model and UI, including recipient bank verification, fees, settlement ETA, returns/failure placeholders, and accounting treatment fields.[cite:1]

#### 8. Language cleanup
- Normalize finance formatting and terminology so payment amounts, rail labels, and policy language read consistently.[cite:1]

### Prompt 1 (use Claude CLI Sonnet-class)

```text
You are the lead implementation agent for TreasuryFlow Plan 1 / P0.

Mission:
Remove the buyer-demo blocker and fix all active control gaps by shipping a self-contained canonical payout flow that fully demonstrates TreasuryFlow's control loop without requiring the viewer to connect a wallet.

Context:
- TreasuryFlow's current main blocker is the missing end-to-end proof path.
- The buyer must be able to see request creation, independent approval, policy validation, execution, ledger posting, reconciliation, and audit evidence in one deterministic flow.
- The demo must remain honest: non-live behavior should be labeled clearly as demo/simulated/server-signed.
- The core money movement path should remain deterministic.

Implement the following:
1. Add a one-click canonical payout demo reset/replay action.
2. Create a deterministic canonical payout state machine.
3. Add a demo execution adapter supporting `wallet_live`, `server_signed_demo`, and `simulated_demo`; default the canonical flow to `server_signed_demo` or `simulated_demo`.
4. Populate the Audit page with a completed evidence packet after the canonical run.
5. Fix AI rationale mismatches with schema validation, request-context grounding, and deterministic fallback templates.
6. Make risk data realistic and differentiated.
7. Add reconciliation export guardrails.
8. Make the approval matrix editable.
9. Expand ACH/wire payout detail in recipient, rail, and status UX.
10. Normalize finance-language formatting and terminology.

Implementation guidance:
- Prefer deterministic fixtures and seeded scenarios over fake-live complexity.
- Add any missing internal abstractions needed for evidence packets, ledger links, reconciliation links, or demo reset.
- Do not start OpenFX, Coinbase, Circle, Ramp, ERP scaffolding, or EigenCloud implementation in this prompt.
- If interfaces are missing, define them cleanly and document them.

Required deliverables:
- Working code changes.
- Updated fixtures/seeds.
- Demo reset/replay support.
- Acceptance checklist updates.
- Short changelog of user-visible improvements.

Success criteria:
- The canonical payout demo can be run from a clean state with no wallet debugging.
- The Audit page shows a full evidence chain.
- Approval, reconciliation, and risk surfaces feel materially more credible.
- Non-live behavior is explicitly disclosed.
```

### Optional Prompt 1 subagent A (use Gemini CLI)

```text
You are a narrow-scope subagent for TreasuryFlow Plan 1.

Own only seeded data realism and rationale correctness.

Tasks:
1. Rewrite seeded risk and counterparty fixtures so entities have varied identities, volumes, histories, and rationale text.
2. Add or strengthen schema validation for explanation payloads.
3. Add deterministic fallback rationale templates keyed by request type, policy type, rail type, and triggered rule.
4. Update any tests/fixtures tied to these outputs.

Rules:
- Do not change shared state-machine architecture unless absolutely necessary.
- Do not touch provider scaffolding or roadmap work.
- Document all changed fixture shapes and assumptions.
```

### Optional Prompt 1 subagent B (use Gemini CLI)

```text
You are a narrow-scope subagent for TreasuryFlow Plan 1.

Own only reconciliation guardrails and threshold editing UX.

Tasks:
1. Prevent CSV/ERP export from succeeding when required fields are missing, unless override reason + reviewer identity are supplied.
2. Make export state row-level and auditable.
3. Convert static approval threshold views into editable controls.
4. Keep seeded defaults and reset behavior intact.

Rules:
- Do not rewrite the canonical flow engine.
- Preserve current terminology and finance-first UX.
- Document any shared types you touch.
```

## Updated Plan 2

### Goal

Once P0 is stable, add **fast, realistic scaffolding** for high-priority integrations with **OpenFX first**, while taking only the **EigenCloud-style verifiable AI/audit layer** beyond scaffolding.[cite:1]

### Ordered scope

1. **OpenFX-ready cross-border module** — highest priority because it is the most compelling next demo narrative.[cite:1]
2. **Coinbase Business scaffolding**.
3. **Circle Mint scaffolding**.
4. **Stablecoin-to-bank rail scaffolding**.
5. **Ramp scaffolding**.
6. **ERP sync scaffolding via Merge-shaped abstraction**.
7. **EigenCloud-style verifiable AI/audit layer** — deepest implementation in this phase.[cite:1]

### OpenFX-first requirements
- Add `FX_HEDGE` or `CROSS_BORDER_SWEEP` policy type.[cite:1]
- Show simulated quote model with corridor, rate, spread, ETA, expiry, route, and status.[cite:1]
- Label clearly: **"Live execution pending OpenFX API access — currently using simulated quotes."**[cite:1]
- Add **Disintermediation Counter** metric and before/after visual narrative comparing legacy flow vs API-orchestrated flow.[cite:1]
- Add proof-of-value scenario: **$500K USD -> MXN, 24/7 settlement**, optionally plus USD -> GBP.[cite:1]

### Provider scaffolding requirements
- Build typed adapter interfaces first.
- Build mock providers second.
- Build UI shells third.
- Preserve clear simulated/coming-soon disclosure across all providers.[cite:1]

### EigenCloud-style verification requirements
- Implement a verifiable task envelope for high-value AI tasks.[cite:1]
- Add deterministic replay where supported.[cite:1]
- Add verification receipt rendering in the Audit UI.
- Add append-only audit/evidence log abstraction.
- Expose AI task input context, rule traces, confidence, overrides, and evidence links in the UI.[cite:1]

### Prompt 2 main scaffold prompt (use Gemini CLI)

```text
You are the lead implementation agent for TreasuryFlow Plan 2 scaffolding.

Mission:
Build fast, credible integration scaffolding with OpenFX first, then provider adapters and UI shells for Coinbase, Circle, stablecoin-to-bank rails, Ramp, and ERP sync. Do not overbuild live integrations. Prioritize speed, realism, and buyer-story clarity.

Context:
- Plan 1 / P0 is already complete or green.
- OpenFX is the highest-leverage next scenario because it dramatizes TreasuryFlow's control model around programmatic cross-border payments.
- All non-live integrations should be clearly disclosed as simulated / demo-mode / coming soon.
- The execution path should remain deterministic.
- ERP sync should use a Merge-shaped abstraction, not Arcade.dev.

Implement in this order:
1. OpenFX-ready module.
2. Coinbase Business scaffolding.
3. Circle Mint scaffolding.
4. Stablecoin-to-bank rail scaffolding.
5. Ramp scaffolding.
6. ERP sync scaffolding.

OpenFX must include:
- FX_HEDGE or CROSS_BORDER_SWEEP policy type.
- Simulated quote object with corridor, source amount, destination amount, rate, spread, ETA, expiry, route, and status.
- UI label: "Live execution pending OpenFX API access — currently using simulated quotes."
- Disintermediation Counter metric.
- $500K USD -> MXN proof-of-value scenario with before/after comparison.

Implementation guidance:
- Start from adapters/interfaces, then mocks, then UI shells.
- Keep provider integrations lightweight and realistic.
- Do not implement Arcade.dev.
- Do not go deep on EigenCloud-style verification in this prompt beyond whatever interface hooks are needed.

Required deliverables:
- Adapter interfaces.
- Mock provider data.
- UI surfaces/shells.
- Updated architecture docs explaining scaffolding choices.
- Acceptance checklist updates.

Success criteria:
- A buyer can click through convincing demo-grade provider scenarios.
- OpenFX is the strongest new story in the product.
- Every non-live path is disclosed honestly.
```

### Prompt 2 EigenCloud slice (use Claude CLI Sonnet-class)

```text
You are the lead implementation agent for TreasuryFlow's EigenCloud-style verifiable AI/audit layer.

Mission:
Go beyond scaffolding and build the deepest part of Plan 2: reviewable, evidence-linked, partially deterministic AI outputs with verification receipts and replay support where possible.

Context:
- TreasuryFlow already has demo flows and provider scaffolding in place.
- The goal is not to teach buyers EigenCloud first; the goal is to make high-value AI outputs trustworthy and auditable.
- This should support risk scoring, anomaly detection, and audit rationale generation as verifiable tasks.
- Future EigenDA / EigenVerify style systems should be able to plug into this abstraction later.

Implement:
1. A verifiable task envelope with task type, inputs hash, model/version, rules applied, tool traces if relevant, confidence, fallback behavior, override history, result hash, and evidence links.
2. Deterministic replay mode for supported tasks.
3. Verification receipt generation and rendering in the Audit UI.
4. Append-only audit/evidence log abstraction.
5. UI for viewing AI inputs, outputs, rule traces, confidence, citations/evidence links, reviewer override, and verification status.

Rules:
- Keep the core execution path deterministic.
- Favor clear abstractions over vendor-specific lock-in.
- Make verification comprehensible to a finance buyer, not just an engineer.
- Document boundaries between deterministic replayable tasks and non-replayable tasks.

Required deliverables:
- Core abstractions and implementation.
- UI integration in the Audit surface.
- Architecture notes.
- Acceptance checklist updates.
- Demo script for showing a verified AI task.

Success criteria:
- A user can inspect an AI-generated risk score or rationale, see exactly what drove it, and view a verification receipt.
- Supported tasks can be replayed deterministically.
- The result feels like a differentiated audit-control feature rather than generic AI output.
```

## Short model reminder

- **Prompt 1:** Claude CLI Sonnet-class.
- **Prompt 1 subagents:** Gemini CLI on bounded tasks.
- **Prompt 2 main scaffolding:** Gemini CLI.
- **Prompt 2 EigenCloud slice:** Claude CLI Sonnet-class.

## Suggested run order this week

1. Start **Prompt 1** with Claude.
2. If needed, spawn 1-2 Gemini subagents for fixtures/rationale and reconciliation/thresholds.
3. Merge and validate P0.
4. Start **Prompt 2 main** with Gemini.
5. In parallel or immediately after OpenFX is stable, start **Prompt 2 EigenCloud** with Claude.
