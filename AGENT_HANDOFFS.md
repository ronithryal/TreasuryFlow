# TreasuryFlow Agent Handoffs & Responsibilities

**Status:** Ready for execution  
**Last Updated:** 2026-04-29  
**Owner:** Orchestrator

---

## Overview

This document defines **clear ownership** and **explicit handoff points** between parallel agents during Plan 0 (P0) execution. Each agent owns specific files and is responsible for delivering acceptance criteria with zero ambiguity.

---

## Agent Roles & Responsibilities

### 🏗️ Orchestrator / Infra Agent

**Duration:** 1–2 hours  
**Branch:** `infra/workstreams-and-acceptance`  
**Merge order:** FIRST

#### Deliverables
- [x] WORKSTREAMS.md — Branch strategy and task split
- [x] DEMO_ACCEPTANCE.md — Acceptance checklists and verification steps
- [x] ARCHITECTURE_NOTES.md — Shared interfaces and data model
- [x] AGENT_HANDOFFS.md — This document
- [ ] `.claude/settings.local.json` — File freeze configuration (see below)
- [ ] `scripts/demo-reset.sh` — Placeholder skeleton (or assign to P0c agent)
- [ ] `scripts/deploy-testnet.sh` — Placeholder skeleton (or assign to P0c agent)
- [ ] Update `CLAUDE.md` with workstream summary

#### Responsibilities
- Establish clear file ownership (no stepping on each other)
- Define shared interfaces before other agents start
- Create placeholder scripts (no implementation)
- Document merge order and conflict prevention
- Act as conflict resolver if agents disagree on implementation

#### Success Criteria
- All coordination docs created
- No ambiguity about file ownership
- Contracts and Frontend agents can start immediately with zero blocking questions
- Demo reset / deployment scripts have clear boundaries

#### Blockers / Questions
- *None expected* — This is prep work with no dependencies

---

### 🔗 Contracts Agent

**Duration:** 2–3 hours  
**Branch:** `p0/contract-architecture`  
**Merge order:** SECOND (after infra)

#### Deliverables

**Modified files:**
- `contracts/src/PolicyEngine.sol` — Add `maxAmount`, wildcard support
- `contracts/src/IntentRegistry.sol` — Full rewrite with initiator, approver, access control
- `contracts/src/TreasuryVault.sol` — Remove public executePolicy, add executeApprovedIntent
- `contracts/src/LedgerContract.sol` — Add authorized caller mechanism
- `contracts/script/Deploy.s.sol` — Wire all contracts, deploy demo policies
- `contracts/test/PolicyEngine.t.sol` — Add new test cases (no removal)
- `contracts/test/IntentRegistry.t.sol` — Add access control and maker-checker tests (no removal)
- `contracts/test/TreasuryVault.t.sol` — Add onlyIntentRegistry and policy tests (no removal)
- `contracts/test/GoldenPath.t.sol` — NEW: end-to-end integration test

**New file:**
- `contracts/addresses.json` — Output from Deploy.s.sol with all 5 contract addresses

#### Responsibilities

1. **Rewrite contracts** per IMPLEMENTATION_PLAN.md specifications
2. **Add tests** for all new code (no removal of existing tests)
3. **Ensure all tests pass:** `forge test -v` with zero failures
4. **Log contract addresses** from Deploy.s.sol to a JSON file
5. **Document changes** in PR: which contract, what changed, why
6. **Communicate addresses** to Frontend agent immediately after merge

#### File Boundaries (Frozen)
- ❌ DO NOT modify `app/` directory
- ❌ DO NOT modify `app/src/types/domain.ts`
- ❌ DO NOT modify `app/src/store/`
- ❌ DO NOT modify `app/seed/`
- ✅ CAN modify: all `contracts/` files (except interfaces if agreed)

#### Acceptance Criteria (from DEMO_ACCEPTANCE.md)
- [ ] All unit tests pass: PolicyEngine, IntentRegistry, TreasuryVault, LedgerContract
- [ ] Integration test passes: GoldenPath.t.sol end-to-end
- [ ] All existing tests still pass (zero regressions)
- [ ] `contracts/addresses.json` contains all 5 addresses
- [ ] ABI changes (if any) documented in ARCHITECTURE_NOTES
- [ ] Event shapes match ARCHITECTURE_NOTES exactly
- [ ] No console.log in production code
- [ ] All functions have Solidity comments explaining purpose

#### Handoff to Frontend Agent
1. **Before merging to main:**
   - Provide `contracts/addresses.json` with all 5 contract addresses
   - Confirm Deploy.s.sol runs successfully on Base Sepolia testnet
   - List any ABI changes from the original implementation

2. **After merge:**
   - Frontend agent reads addresses from JSON
   - Frontend agent updates `app/src/web3/testnet.ts` with new addresses
   - Frontend agent updates contract ABIs in testnet.ts if needed

#### Blockers / Questions
- *Q: Can I use assembly in TreasuryVault?*  
  A: Avoid if possible; use standard Solidity. If necessary, add detailed comments.

- *Q: What's the exact policy validation logic?*  
  A: See ARCHITECTURE_NOTES.md → Shared Data Structures → Policy validation rules

- *Q: How do I test the ledger integration?*  
  A: GoldenPath.t.sol must call recordEntry via try/catch (same as production)

---

### 🎨 Frontend Agent

**Duration:** 2–3 hours  
**Branch:** `p0/frontend-honest-path`  
**Merge order:** THIRD (after contracts; can start early but must merge after)

#### Deliverables

**Modified files:**
- `app/src/web3/testnet.ts` — Update contract addresses from contracts/addresses.json
- `app/src/web3/useTestnetExecution.ts` — Rewrite 4-step flow (createIntent → approve → demo-approve → executeIntent)
- `app/src/pages/Audit.tsx` — Display merged events, add "What am I verifying?" explainer
- `app/src/web3/usePolicyExecutionLogs.ts` — Add useIntentExecutionLogs hook
- `app/src/components/shared/AIPolicyBuilder.tsx` — Disable testnet policy creation
- `app/src/pages/Settings.tsx` — Hide "Force Mock AI" toggle unless DEV
- `app/src/pages/Yield.tsx` — Disable "Configure Deployment Policy" in mock mode

**New files:**
- `app/api/demo-approve.ts` — Server-side demo approver endpoint

#### Responsibilities

1. **Update contract addresses** from contracts/addresses.json immediately after contracts merge
2. **Rewrite execution hooks** per IMPLEMENTATION_PLAN.md 4-step flow
3. **Implement Audit page** to display merged contract events
4. **Add demo-approve endpoint** for server-side approver signing
5. **Disable gated features** with honest "Coming soon" labels
6. **Ensure all tests pass:** `npm run typecheck && npm test`
7. **Test golden path** on Base Sepolia testnet manually
8. **Document changes** in PR: which hook, what changed, why

#### File Boundaries (Frozen)
- ❌ DO NOT modify `contracts/` directory
- ❌ DO NOT modify `app/src/types/domain.ts` (not in P0 scope)
- ❌ DO NOT modify `app/src/store/` (not in P0 scope)
- ❌ DO NOT modify `app/seed/` (not in P0 scope)
- ✅ CAN modify: `app/src/web3/`, `app/src/pages/`, `app/api/`, `app/src/components/`

#### Preconditions
- Must wait for Contracts agent to merge (contracts/addresses.json must exist)
- Cannot deploy frontend until contract addresses are known
- Must read ARCHITECTURE_NOTES.md before starting

#### Acceptance Criteria (from DEMO_ACCEPTANCE.md)
- [ ] `npm run typecheck` produces zero errors
- [ ] `npm test` all tests pass
- [ ] Golden path works on Base Sepolia testnet:
  - [ ] createIntent succeeds with wallet signature
  - [ ] USDC.approve succeeds
  - [ ] demo-approve endpoint returns approval
  - [ ] executeIntent succeeds
  - [ ] Receipt txHash captured
- [ ] Audit page displays execution with all fields:
  - [ ] Intent ID, Policy ID, Policy Name
  - [ ] Initiator and Approver addresses
  - [ ] Amount and Destination
  - [ ] Transaction hash linked to Basescan
  - [ ] "What am I verifying?" explainer text
- [ ] Settings page: "Force Mock AI" NOT visible (unless DEV mode)
- [ ] Yield page: "Configure Deployment Policy" disabled with tooltip
- [ ] Entities page: "Provision CDP Wallet" shows "Coming soon" message
- [ ] No console errors or warnings
- [ ] No broken images or layout shifts

#### Handoff to QA / Final Verification
1. **Before merging to main:**
   - Provide list of new contract ABIs used in testnet.ts
   - Confirm golden path works end-to-end
   - Provide test account addresses used (for reproducibility)

2. **After merge:**
   - QA runs full golden path test on staging Base Sepolia
   - Verify Audit page displays correct events
   - Verify no regressions in mock mode
   - Sign off on acceptance

#### Blockers / Questions
- *Q: How do I read the contract address from addresses.json?*  
  A: Import it in testnet.ts: `import addresses from '../../contracts/addresses.json'`

- *Q: What if contracts/addresses.json doesn't exist when I start?*  
  A: Start the branch early; wait for contracts merge before starting implementation

- *Q: How do I know if my Audit page is displaying events correctly?*  
  A: See ARCHITECTURE_NOTES.md → Audit Trail Data Model and useIntentExecutionLogs hook shape

- *Q: Should I mock the demo-approve endpoint?*  
  A: No; use @vercel/node to sign real transactions server-side (DEMO_APPROVER_KEY env var)

---

### 📚 Docs / Demo Reset Agent (Optional P0c)

**Duration:** 1 hour (optional)  
**Branch:** `p0/demo-reset-runbooks`  
**Merge order:** Anytime after infra (independent)

#### Deliverables

**Created files:**
- `scripts/demo-reset.sh` — One-click reset to seed state
- `scripts/deploy-testnet.sh` — One-click contract deployment to Base Sepolia

**Updated files:**
- `DEMO.md` — Step-by-step golden path guide with expected output
- `docs/demo-reset-guide.md` (new) — How to reset and replay the demo

#### Responsibilities

1. **Create bash scripts** for demo reset and deployment
2. **Update DEMO.md** with step-by-step walkthrough
3. **Document expected output** at each step
4. **Ensure scripts work** without manual intervention
5. **Document environment variables** needed for deployment

#### File Boundaries (Frozen)
- ✅ CAN create: `scripts/`, `docs/`
- ✅ CAN modify: `DEMO.md`
- ❌ DO NOT modify: contract or app source code

#### Acceptance Criteria
- [ ] `./scripts/demo-reset.sh` clears localStorage and resets Zustand state
- [ ] `./scripts/deploy-testnet.sh` deploys to Base Sepolia and logs addresses
- [ ] DEMO.md includes 8+ step golden path walkthrough
- [ ] DEMO.md shows expected output and screenshots (if possible)
- [ ] Scripts are executable and documented

#### Handoff
- Scripts are standalone; no dependencies on other agents
- Can be merged anytime after infra

---

## Parallel Execution Rules

### ✅ Can Run in Parallel
- **Infra** and **Contracts** (but Contracts must merge after Infra)
- **Infra** and **Docs/Reset** (independent)
- **Contracts** and **Docs/Reset** (independent)

### ❌ Cannot Run in Parallel
- **Contracts** and **Frontend** (contracts must merge first)
- **Frontend** cannot start until contracts/addresses.json exists

### Recommended Sequence
1. **Infra agent** starts immediately (1–2 hours)
2. **Contracts agent** starts immediately after Infra (overlap OK)
3. **Frontend agent** waits for Contracts to merge, then starts (can be same day)
4. **Docs/Reset agent** runs in parallel with Contracts or Frontend (independent)

---

## File Dependency Map

```
Infra branch
  ├─ Creates: WORKSTREAMS.md, DEMO_ACCEPTANCE.md, ARCHITECTURE_NOTES.md, AGENT_HANDOFFS.md
  └─ Affects: Nothing else (pure documentation)

Contracts branch
  ├─ Modifies: contracts/src/*, contracts/script/*, contracts/test/*
  ├─ Creates: contracts/addresses.json
  ├─ Depends on: ARCHITECTURE_NOTES.md (interface agreement)
  └─ Blocks: Frontend (needs addresses.json)

Frontend branch
  ├─ Modifies: app/src/web3/*, app/src/pages/*, app/api/*
  ├─ Reads: contracts/addresses.json
  ├─ Depends on: Contracts merge + contracts/addresses.json
  └─ Affects: Audit page, Settings page, Yield page

Docs/Reset branch
  ├─ Modifies: scripts/*, DEMO.md
  ├─ Depends on: ARCHITECTURE_NOTES.md (background reading)
  └─ Independent: Can merge anytime after Infra
```

---

## Handoff Checklist (Template)

**Before any agent merges to main:**

### Pre-Merge Review
- [ ] Agent has read ARCHITECTURE_NOTES.md and agreed on shared interfaces
- [ ] Agent has read DEMO_ACCEPTANCE.md for acceptance criteria
- [ ] Agent has read AGENT_HANDOFFS.md for responsibilities
- [ ] All unit tests pass locally
- [ ] All TypeScript checks pass (if applicable)
- [ ] No console.log or debug statements left behind
- [ ] Commit messages reference IMPLEMENTATION_PLAN.md section

### PR Content
- [ ] PR title: Clear, concise (e.g., "feat(contracts): P0 golden path architecture")
- [ ] PR body: Lists files modified, explains what changed and why
- [ ] Links to IMPLEMENTATION_PLAN.md if relevant
- [ ] Links to ARCHITECTURE_NOTES.md if interfaces were used
- [ ] Mentions any ABI or type changes

### Handoff Communication
- [ ] Agent provides detailed list of changes to other agents (if dependencies exist)
- [ ] **Contracts agent:** Provide contracts/addresses.json content and confirmation of Deploy.s.sol success
- [ ] **Frontend agent:** Provide list of new contract ABIs and confirmation of golden path test
- [ ] **Docs agent:** Provide script usage instructions

### Testing
- [ ] Unit tests: 100% pass rate
- [ ] Integration tests: 100% pass rate
- [ ] No regressions: All existing tests still pass
- [ ] Manual spot-check: Try one critical flow end-to-end

### Acceptance Sign-Off
- [ ] Orchestrator reviews for file ownership violations
- [ ] Orchestrator confirms all acceptance criteria met
- [ ] Next agent ready to pick up (if dependent)

---

## Escalation Protocol

### If Blocked
1. **Check ARCHITECTURE_NOTES.md** — Does it answer your question?
2. **Check IMPLEMENTATION_PLAN.md** — Is the spec clear?
3. **Check DEMO_ACCEPTANCE.md** — Does it clarify acceptance?
4. **Slack Orchestrator** — Document the blocker with:
   - What you're trying to do
   - What constraint is blocking you
   - What information you need
5. **Wait for unblock** — Don't work around the constraint

### If Accepting Handoff
1. **Read all coordination docs** — WORKSTREAMS, ARCHITECTURE_NOTES, AGENT_HANDOFFS
2. **Review acceptance criteria** — DEMO_ACCEPTANCE.md
3. **List any preconditions** — Does the previous agent need to deliver something first?
4. **Ask for clarification** if anything is ambiguous
5. **Start branch** when ready (no preconditions blocking)

### If Disagreeing on Interface or Approach
1. **Document the issue** in a GitHub discussion or comment
2. **Propose alternative** with pros/cons
3. **Escalate to Orchestrator** if consensus not reached within 30 minutes
4. **Wait for decision** — Don't proceed with different interface than agreed

---

## Success Metrics

**Plan 0 succeeds when:**
- ✅ All agents delivered on time and within scope
- ✅ All acceptance criteria met
- ✅ Zero regressions in existing functionality
- ✅ One complete golden-path demo on Base Sepolia testnet
- ✅ Audit page shows verifiable onchain events
- ✅ All branches merged in correct order with zero conflicts
- ✅ Handoffs were clear and no agent was blocked
- ✅ Next sprint can start with fresh roadmap

---

## Links

- [WORKSTREAMS.md](WORKSTREAMS.md) — Branch strategy
- [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md) — Acceptance checklists
- [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared interfaces
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Technical spec
