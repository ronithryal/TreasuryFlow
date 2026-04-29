# TreasuryFlow — Multi-Agent Build Plan

**Project:** TreasuryFlow (Non-custodial Treasury OS)  
**Status:** Infra setup complete, ready for Plan 0 execution  
**Last Updated:** 2026-04-29

---

## The Problem

TreasuryFlow claims "policy-enforced, non-custodial, onchain treasury execution" but the current implementation is **incomplete**:
- Smart contracts lack enforced approval chains (maker-checker) and policy validation
- Frontend hardcodes payment destinations and lacks cryptographic audit evidence
- Demo reset and replay are not deterministic
- Gated features (CDP wallets, AI policy builder, yield) are mocked but not labeled honestly

**Success = one complete golden-path demo that a CFO can cryptographically verify onchain.**

---

## Multi-Agent Build Structure

### Plan 0: P0 Golden Path (Trust-Loop Enforcement) ← **CURRENT**

**Duration:** ~5–6 hours  
**Agents:** Infra, Contracts, Frontend (+ optional Docs/Reset)  
**Success:** Golden path demo on Base Sepolia testnet with verifiable onchain events

**Workstreams:**
1. **`infra/workstreams-and-acceptance`** (1–2 hours)
   - Infra agent: Create coordination docs, define ownership, document handoffs
   - **Merge FIRST** — establishes all shared contracts
   
2. **`p0/contract-architecture`** (2–3 hours)
   - Contracts agent: Rewrite PolicyEngine, IntentRegistry, TreasuryVault, LedgerContract
   - **Merge SECOND** — provides contract addresses to frontend
   - Blocker for: Frontend agent
   
3. **`p0/frontend-honest-path`** (2–3 hours)
   - Frontend agent: Wire frontend to contracts, build Audit page, add demo-approve endpoint
   - **Merge THIRD** — depends on contract addresses from P0a
   - Can start early but must merge after contracts
   
4. **`p0/demo-reset-runbooks`** (1 hour, optional)
   - Docs/Reset agent: Create demo reset/deploy scripts, update DEMO.md
   - **Merge anytime after infra** — independent track

**Acceptance:** See [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md) for detailed checklists

---

### Plan 1: Scaffolding & Integration Stubs (Post-P0)

**Scope:** Provider adapters (OpenFX, Coinbase, Circle, Ramp, Rails), EigenCloud verification layer, E2E tests  
**Agents:** 2–3 (TBD after P0)  
**Duration:** ~4–6 hours  
**Success:** All providers stubbed with mocked responses; E2E tests passing

---

### Plan 2: Core Integrations (Post-P1)

**Scope:** Real OpenFX settlement, live provider APIs, EigenCloud onchain verification, ERP webhooks  
**Agents:** 2–3 (TBD after P1)  
**Duration:** ~8–12 hours  
**Success:** End-to-end integration test for payment request → execution → settlement

---

## Key Files & Coordination Docs

**Read these in order:**

1. **[WORKSTREAMS.md](WORKSTREAMS.md)** — Branch strategy, task split, merge order
2. **[AGENT_HANDOFFS.md](AGENT_HANDOFFS.md)** — Clear ownership, preconditions, blockers
3. **[ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md)** — Shared interfaces, data model, ABIs
4. **[DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md)** — Acceptance checklists for each workstream
5. **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** — Detailed technical spec (contract changes, frontend rewrites)

---

## File Ownership (P0)

### Frozen (Read-Only)
- `app/src/types/domain.ts` — Intent, Policy, LedgerEntry types (agreed in ARCHITECTURE_NOTES)
- `app/src/store/` — Zustand slices (unchanged in P0)
- `app/seed/` — Demo seed data (unchanged in P0)
- `contracts/src/interfaces/` — Interface definitions (agreed beforehand)

### Contracts Agent Owns (P0a)
- `contracts/src/*.sol` — All contract implementations
- `contracts/script/Deploy.s.sol` — Deployment script
- `contracts/test/` — All tests
- `contracts/addresses.json` — Output from Deploy.s.sol

### Frontend Agent Owns (P0b)
- `app/src/web3/{testnet.ts,useTestnetExecution.ts}` — Contract interaction hooks
- `app/api/demo-approve.ts` — Server-side approver endpoint
- `app/src/pages/Audit.tsx` — Audit evidence page
- `app/src/web3/usePolicyExecutionLogs.ts` — Event merging hooks
- `app/src/components/shared/AIPolicyBuilder.tsx` — Disable testnet policy creation
- `app/src/pages/Settings.tsx` — Hide dev toggles in prod
- `app/src/pages/Yield.tsx` — Disable deployment policy in mock mode

### Docs Agent Owns (P0c)
- `scripts/demo-reset.sh` — Reset script
- `scripts/deploy-testnet.sh` — Deployment script
- `DEMO.md` — Walkthrough guide

---

## Critical Handoff Points

### Contracts → Frontend
- **Blocks:** Frontend cannot write code until contracts/addresses.json exists
- **Handoff:** Contracts agent provides:
  - `contracts/addresses.json` with all 5 contract addresses
  - List of any ABI changes from original spec
  - Confirmation that Deploy.s.sol succeeds on Base Sepolia
- **Frontend reads from:** `contracts/addresses.json` in `app/src/web3/testnet.ts`

### Frontend → QA/Verification
- **Blocks:** Demo cannot go live until frontend golden path passes
- **Handoff:** Frontend agent provides:
  - Confirmation golden path works end-to-end
  - Test account addresses used (for reproducibility)
  - List of any new env vars needed (e.g., DEMO_APPROVER_KEY)

---

## Merge Order (Strict)

1. **infra/workstreams-and-acceptance** → main
2. **p0/contract-architecture** → main
3. **p0/frontend-honest-path** → main
4. **p0/demo-reset-runbooks** → main (anytime after infra)

**Never merge in different order.** If conflicts arise, resolve before merging.

---

## Success Criteria (End of Plan 0)

✅ **Contracts:** All tests pass, no regressions, 5 contracts deployed and wired  
✅ **Frontend:** All tests pass, no regressions, golden path works on Base Sepolia  
✅ **Audit:** Transaction hash linked to Basescan, events merged correctly  
✅ **Maker-Checker:** Initiator ≠ approver enforced at contract layer  
✅ **Policy Validation:** Enforced at createIntent (before token approval)  
✅ **Honest UI:** Gated features labeled "Coming soon" (CDP, AI builder, yield)  
✅ **Demo Reset:** One-click reset to seed state works  
✅ **No Hardcoding:** Addresses read from contracts/addresses.json only  

---

## Quick Reference: What Each Agent Does

### Infra Agent
- **Input:** This project (status quo)
- **Output:** 4 coordination docs + 2 placeholder scripts + clear ownership boundaries
- **Duration:** 1–2 hours
- **Merge order:** FIRST (unblocks all others)
- **Acceptance:** Docs exist, file boundaries clear, no ambiguity

### Contracts Agent
- **Input:** IMPLEMENTATION_PLAN.md + ARCHITECTURE_NOTES.md (interfaces agreed)
- **Output:** 5 rewritten contracts + Deploy.s.sol + addresses.json + all tests passing
- **Duration:** 2–3 hours
- **Merge order:** SECOND (unblocks Frontend)
- **Acceptance:** All forge tests pass; Golden Path integration test succeeds
- **Handoff:** Provide addresses.json + confirmation to Frontend

### Frontend Agent
- **Input:** contracts/addresses.json + ARCHITECTURE_NOTES.md (interfaces)
- **Output:** 4-step execution hook + Audit page + demo-approve endpoint + 6 honest UI fixes
- **Duration:** 2–3 hours
- **Merge order:** THIRD (depends on Contracts)
- **Acceptance:** Golden path works end-to-end on Base Sepolia; all npm tests pass
- **Precondition:** Must wait for Contracts to merge

### Docs/Reset Agent
- **Input:** Project structure + ARCHITECTURE_NOTES.md
- **Output:** 2 bash scripts + DEMO.md update + demo reset guide
- **Duration:** 1 hour
- **Merge order:** Anytime after Infra (independent)
- **Acceptance:** Scripts work; DEMO.md is step-by-step and reproducible
- **No blockers:** Can work in parallel with Contracts and Frontend

---

## Running the Build

### Start Infra
```bash
# Infra agent creates all coordination docs
git checkout -b infra/workstreams-and-acceptance
# Create: WORKSTREAMS.md, DEMO_ACCEPTANCE.md, ARCHITECTURE_NOTES.md, AGENT_HANDOFFS.md
# Create: scripts/demo-reset.sh, scripts/deploy-testnet.sh
git add . && git commit -m "infra: P0 workstreams and acceptance docs"
git push origin infra/workstreams-and-acceptance
# → Create PR, merge to main
```

### Start Contracts (after Infra merges)
```bash
# Contracts agent reads IMPLEMENTATION_PLAN.md and ARCHITECTURE_NOTES.md
git checkout -b p0/contract-architecture
# Edit: contracts/src/*.sol, contracts/script/Deploy.s.sol, contracts/test/*.t.sol
# Verify: forge test -v (all pass)
# Output: contracts/addresses.json
git add . && git commit -m "feat(contracts): P0 golden path architecture"
git push origin p0/contract-architecture
# → Create PR, request review, merge to main
```

### Start Frontend (after Contracts merges)
```bash
# Frontend agent reads ARCHITECTURE_NOTES.md and contracts/addresses.json
git checkout -b p0/frontend-honest-path
# Edit: app/src/web3/testnet.ts (read addresses.json)
# Edit: app/src/web3/useTestnetExecution.ts (4-step flow)
# Create: app/api/demo-approve.ts (server-side approver)
# Edit: app/src/pages/Audit.tsx (display events)
# Create: app/src/web3/usePolicyExecutionLogs.ts (merge events)
# Edit: app/src/{pages,components}/ (honest UI)
# Verify: npm run typecheck && npm test (all pass)
# Test: Golden path on Base Sepolia testnet
git add . && git commit -m "feat(frontend): P0 golden path + Audit + demo-approve"
git push origin p0/frontend-honest-path
# → Create PR, request review, merge to main
```

### Start Docs/Reset (anytime after Infra)
```bash
# Docs agent can work in parallel with Contracts
git checkout -b p0/demo-reset-runbooks
# Create: scripts/ files with detailed comments
# Update: DEMO.md with step-by-step guide
git add . && git commit -m "docs: P0 demo reset and deployment scripts"
git push origin p0/demo-reset-runbooks
# → Create PR, merge to main (low priority)
```

---

## FAQ

**Q: Can Frontend and Contracts run in parallel?**  
A: Contracts agent can start immediately after Infra. Frontend agent can read code early, but **cannot merge until Contracts merges** (needs addresses.json).

**Q: What if I need to change the Intent struct?**  
A: Update ARCHITECTURE_NOTES.md first. Both agents must agree before any code changes.

**Q: What if Deploy.s.sol fails?**  
A: Check RPC URL, private key balance, and Base Sepolia testnet status. Document in PR; escalate to Orchestrator if needed.

**Q: Can I hardcode contract addresses in the frontend?**  
A: **No.** Read from `contracts/addresses.json` via `testnet.ts`. See ARCHITECTURE_NOTES.md for details.

**Q: How do I know if my PR is ready to merge?**  
A: Check AGENT_HANDOFFS.md → "Handoff Checklist" and DEMO_ACCEPTANCE.md for your workstream.

---

## Escalation & Questions

**Need help?** Check these in order:
1. [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared interfaces and data model
2. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Detailed technical spec
3. [AGENT_HANDOFFS.md](AGENT_HANDOFFS.md) → Blockers/Questions section
4. Slack Orchestrator with specific question and context

**Found a bug or inconsistency?**
- Document in GitHub issue
- Tag Orchestrator
- Wait for guidance before workarounds

---

## Links

- [WORKSTREAMS.md](WORKSTREAMS.md) — Full branch strategy and merge order
- [AGENT_HANDOFFS.md](AGENT_HANDOFFS.md) — Per-agent responsibilities and handoff checklist
- [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared data structures and interfaces
- [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md) — Detailed acceptance criteria and checklists
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Technical specification
- [eng.md](eng.md) — Architecture overview (updated periodically)
- [README.md](README.md) — Project README

---

**Next step:** Infra agent creates all coordination docs and scripts. Once merged, Contracts and Frontend agents can begin immediately.
