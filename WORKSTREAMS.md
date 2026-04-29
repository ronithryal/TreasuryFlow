# TreasuryFlow Workstreams & Branch Strategy

**Status:** Ready for multi-agent parallel execution  
**Last Updated:** 2026-04-29  
**Owner:** Infra/Orchestrator

---

## Core Problem

The current codebase claims "policy-enforced, non-custodial, onchain treasury execution" but the implementation is incomplete:
- Smart contracts lack enforced approval chains and policy validation
- Frontend hardcodes payment destinations and lacks ledger evidence
- AI policy builder is mocked with 2-second timeouts
- Demo reset and replay are not deterministic

**Success = one complete golden-path demo that a CFO can cryptographically verify.**

---

## Sprint Structure

### Plan 0: Infra Setup (parallel prep, not feature work)
**Branch:** `infra/workstreams-and-acceptance`  
**Merge:** First — establishes coordination docs and file ownership  
**Owner:** Infra agent  
**Duration:** 1–2 hours  
**Deliverables:**
- WORKSTREAMS.md (this file)
- DEMO_ACCEPTANCE.md (acceptance checklists)
- ARCHITECTURE_NOTES.md (shared interfaces)
- AGENT_HANDOFFS.md (clear ownership)
- `.claude/settings.local.json` updates (file freeze boundaries)
- `scripts/demo-reset.sh` (placeholder for demo replay)
- `scripts/deploy-testnet.sh` (placeholder for fresh testnet deployment)

**Tasks:**
- [ ] Create coordination markdown files
- [ ] Define file ownership boundaries
- [ ] Map contract/frontend dependencies
- [ ] Document shared interfaces (Intent, Policy, Ledger events)
- [ ] Create demo reset skeleton
- [ ] Update CLAUDE.md with workstream summary

---

### Plan 1: P0 Golden Path (critical trust-loop fixes)
**Acceptance:** DEMO_ACCEPTANCE.md → "P0 Golden Path" section  
**Duration:** 4–6 hours  
**Teams:** Can run in parallel — see Task Split below

#### P0a: Smart Contracts — Trust-Loop Enforcement
**Branch:** `p0/contract-architecture`  
**Owner:** Contracts agent  
**Merge after:** infra branch  
**Merge before:** P0b frontend  
**Files to modify:**
- `contracts/src/PolicyEngine.sol` — Add maxAmount validation, wildcard support
- `contracts/src/IntentRegistry.sol` — Full rewrite: initiator, approver fields, no-param approveIntent/executeIntent
- `contracts/src/TreasuryVault.sol` — Remove public executePolicy, add executeApprovedIntent (onlyIntentRegistry)
- `contracts/src/LedgerContract.sol` — Add authorized caller mechanism
- `contracts/script/Deploy.s.sol` — Wire all 5 contracts, create 3 demo policies, set authorizations
- `contracts/test/GoldenPath.t.sol` — New integration test (end-to-end)
- `contracts/test/IntentRegistry.t.sol` — Add access control + maker-checker tests
- `contracts/test/TreasuryVault.t.sol` — Add onlyIntentRegistry + policy validation tests

**Tests that must pass:**
- `forge test -v` with zero failures
- GoldenPath.t.sol: initiator creates intent → approver approves → initiator executes → recipient receives tokens → ledger records event
- Maker-checker: initiator cannot self-approve, different wallet can approve
- onlyIntentRegistry: direct vault calls from non-registry revert

**Acceptance criteria:** 
- All new contract tests pass
- All existing tests still pass (no regressions)
- Deploy script logs all 5 contract addresses
- PolicyEngine.validateIntent(policyId, source, dest, amount) enforces maxAmount and wildcards

---

#### P0b: Frontend — Honest Path & Audit Trail
**Branch:** `p0/frontend-honest-path`  
**Owner:** Frontend agent  
**Merge after:** infra branch (can start in parallel with P0a but must merge after contracts)  
**Files to modify:**
- `app/src/web3/useTestnetExecution.ts` — Rewrite 4-step flow (createIntent → approve → demo-approve → executeIntent)
- `app/src/web3/testnet.ts` — Update ABIs and contract addresses after redeployment
- `app/api/demo-approve.ts` (new) — Server-side demo approver signing
- `app/src/pages/Audit.tsx` — Display IntentExecuted + PolicyExecuted + LedgerEntryRecorded events; add "What am I verifying?" explainer
- `app/src/web3/usePolicyExecutionLogs.ts` — Add useIntentExecutionLogs hook (merge IntentExecuted + PolicyExecuted by block/intentId)
- `app/src/components/shared/AIPolicyBuilder.tsx` — Disable testnet policy creation (owner-only on testnet)
- `app/src/pages/Settings.tsx` — Hide "Force Mock AI" toggle unless DEV mode
- `app/src/pages/Yield.tsx` — Disable "Configure Deployment Policy" in mock mode with tooltip

**Tests that must pass:**
- `npm run typecheck` zero errors
- `npm test` all tests pass
- Audit page shows 3+ fields per execution: intentId, policyId, initiator, approver, amount, destination, txHash (linked to Basescan)

**Acceptance criteria:**
- Golden path (create → approve → execute) completes without errors
- Audit page displays txHash linked to Basescan (from receipt.transactionHash, not contract field)
- "Force Mock AI" not visible in Settings (unless DEV)
- "What am I verifying?" explainer present and readable

---

#### P0c: Demo Reset & Replay (optional parallel track)
**Branch:** `p0/demo-reset-runbooks`  
**Owner:** Docs/Infra agent  
**Merge after:** infra branch  
**Files to create/modify:**
- `scripts/demo-reset.sh` — One-click reset to seed state (Zustand + localStorage)
- `scripts/deploy-testnet.sh` — Deploy contracts to Base Sepolia, save addresses
- `DEMO.md` — Update with step-by-step golden path walkthrough
- `docs/demo-reset-guide.md` (new) — How to reset and replay the demo

**Acceptance criteria:**
- `./scripts/demo-reset.sh` clears localStorage and resets Zustand to seed state
- `./scripts/deploy-testnet.sh` deploys to Base Sepolia and outputs contract addresses
- DEMO.md updated with exact steps and expected output

---

### Plan 2: Scaffolding & Future Integrations (deferred)
**Duration:** TBD (after P0 is shipped)  
**Acceptance:** DEMO_ACCEPTANCE.md → "Plan 2" section

#### P1a: OpenFX Adapter Scaffold
**Branch:** `p1/openfx-scaffold`  
**Scope:** Stubbed providers, placeholder API calls, no real bank connectivity
**Files:**
- `app/src/services/providers/` (new directory)
  - `openfx.ts` — Stubbed OpenFX adapter with mock responses
  - `types.ts` — Provider interface definitions
- `app/src/pages/Integrations.tsx` (new) — Settings page for provider selection
- Tests: placeholder shapes only

---

#### P1b: Provider Adapters (Coinbase, Circle, Ramp, Rails)
**Branch:** `p1/provider-adapters`  
**Scope:** Stubbed adapters, no real network calls
**Files:**
- `app/src/services/providers/{coinbase,circle,ramp,rails}.ts`
- `app/src/services/erc-sync.ts` (new) — ERP-like sync abstraction
- Tests: shapes and schema validation only

---

#### P1c: EigenCloud-Style Verification Layer
**Branch:** `p1/eigencloud-verification`  
**Scope:** AI-powered audit and risk scoring (defer actual EigenCloud integration)
**Files:**
- `app/src/services/audit-engine.ts` (new) — Wraps Perplexity for continuous verification
- `app/src/components/shared/VerificationPanel.tsx` (new) — Show AI audit results
- `contracts/src/VerificationRegistry.sol` (new stub) — Placeholder for future onchain verification

---

#### P1d: Demo Docs & Integration Tests
**Branch:** `p1/demo-docs-and-tests`  
**Scope:** E2E tests for golden path, docs for all flows
**Files:**
- `app/e2e/golden-path.spec.ts` (new) — Playwright: connect wallet → create intent → execute → verify audit
- `docs/flows/` — Flow diagrams for payment request, reconciliation, AI audit
- `docs/api/` — API endpoints for demo-approve, policy validation

---

## Merge Order (Strict)

Each must pass all tests and not introduce regressions:

1. **infra/workstreams-and-acceptance** — Coordination docs + file ownership
2. **p0/contract-architecture** — Smart contracts fixed, all tests green
3. **p0/frontend-honest-path** — Frontend wired to contracts, typecheck passes
4. **p0/demo-reset-runbooks** (optional) — Demo reset scripts + docs
5. **p1/openfx-scaffold** → p1/provider-adapters → p1/eigencloud-verification → p1/demo-docs-and-tests *(Can merge in any order; happens after Plan 0)*

---

## Parallel Execution Rules

**Can run in parallel:**
- P0a (contracts) and P0b (frontend) — *but P0b must merge AFTER P0a*
- P0c (demo reset) — independent, merge anytime after infra
- P1 workstreams — all after Plan 0 is complete

**Cannot run in parallel:**
- infra must be first (establishes boundaries)
- p0 contracts must be before p0 frontend (contracts → frontend dependency)

---

## File Ownership & Freeze Boundaries

See `ARCHITECTURE_NOTES.md` for detailed ownership. Summary:

| Area | Owner | Frozen Until |
|------|-------|--------------|
| `contracts/src/*.sol` | Contracts agent | P0a merges |
| `contracts/script/Deploy.s.sol` | Contracts agent | P0a merges |
| `contracts/test/` | Contracts agent | P0a merges |
| `app/src/web3/{testnet.ts,useTestnetExecution.ts}` | Frontend agent (after contracts) | P0b merges |
| `app/src/pages/Audit.tsx` | Frontend agent | P0b merges |
| `app/src/types/domain.ts` | Shared — agreed in ARCHITECTURE_NOTES | frozen initially, unfrozen after P0 |
| `app/src/store/` | Not touched in P0 | locked to reading only |
| `app/seed/` | Not touched in P0 | locked |

See `.claude/settings.local.json` for actual freeze configurations.

---

## Shared Interfaces (Cross-Cutting Concerns)

**Must be agreed before P0 work starts:**
- Intent struct (initiator, approver, policyId, amount, destination, status, createdAt)
- Policy struct (id, name, source, destination, maxAmount, active, conditions)
- Event shapes (IntentCreated, IntentApproved, IntentExecuted, PolicyExecuted, LedgerEntryRecorded)
- Ledger entry reference field (bytes32(uint256(intentId)), not txHash)

**See ARCHITECTURE_NOTES.md for full definitions.**

---

## Risk & Conflict Mitigation

### Highest-Risk Merge Points
1. **P0a → main** — Contract redeployment changes INTENT_REGISTRY_ADDRESS, TREASURY_VAULT_ADDRESS, etc.
   - *Mitigation:* Contracts agent provides new addresses immediately after merge
   - Frontend agent updates `testnet.ts` as first commit in P0b branch

2. **P0b → main** — Frontend hooks into new contract ABIs
   - *Mitigation:* All ABI changes documented in ARCHITECTURE_NOTES before work starts
   - Frontend agent verifies ABIs match Deploy.s.sol output

3. **Domain type changes** — Intent, Policy, Ledger structs must be synchronized
   - *Mitigation:* Shared definition in ARCHITECTURE_NOTES, frozen during P0
   - Both agents must read and agree before making ANY type changes

### Merge Conflict Prevention
- Contracts agent commits new contract addresses to `contracts/addresses.json` (new file)
- Frontend agent reads addresses from that file; no hardcoded addresses in frontend
- No simultaneous edits to `app/src/types/domain.ts` — only Frontend agent touches during P0
- Ledger event shape agreed upfront; no changes mid-sprint

---

## Handoff Checklist Before Merge

**Before merging any branch:**
- [ ] All tests passing (`forge test` and `npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] All new files have JSDoc or Solidity comments explaining purpose
- [ ] No console.log or debug statements left behind
- [ ] Commit messages reference IMPLEMENTATION_PLAN.md section if applicable
- [ ] Cross-cutting changes documented in PR

**Before merging P0 branches to main:**
- [ ] DEMO_ACCEPTANCE.md checklist for "P0 Golden Path" is 100% complete
- [ ] Manual golden path test on Base Sepolia testnet passes
- [ ] Audit page shows correct events with proper txHash
- [ ] No regressions in other pages (Settings, Policies, Approvals)

---

## Success Criteria (End of Plan 0)

✅ One complete golden-path demo from createIntent → executeIntent → audit evidence  
✅ All intent lifecycle events recorded onchain and visible in Audit page  
✅ Maker-checker enforced at contract layer (initiator ≠ approver)  
✅ Policy validation enforced at createIntent and executeIntent steps  
✅ All TypeScript + Solidity tests pass  
✅ No hardcoded addresses or mock logic in production path  
✅ Settings / AI builder / Yield pages show honest "Coming soon" messages  
✅ One-click demo reset works (localStorage cleared, seed state restored)  

---

## Questions & Escalation

If blocked:
- **Contract behavior question?** → Check IMPLEMENTATION_PLAN.md "Contract Changes" section or ask Contracts agent
- **Frontend type mismatch?** → Check ARCHITECTURE_NOTES.md or ask Frontend agent
- **Branch merge conflict?** → Refer to "Merge Conflict Prevention" section above
- **Acceptance criteria unclear?** → Check DEMO_ACCEPTANCE.md or ask Orchestrator

---

## Links

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Detailed technical spec
- [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md) — Acceptance checklists
- [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared interfaces
- [AGENT_HANDOFFS.md](AGENT_HANDOFFS.md) — Per-agent responsibilities
- [eng.md](eng.md) — Architecture overview (updated periodically)
