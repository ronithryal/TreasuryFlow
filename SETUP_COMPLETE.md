# TreasuryFlow Infrastructure Setup — Complete ✅

**Date:** 2026-04-29  
**Status:** Ready for Plan 0 multi-agent execution  
**Next Step:** Merge `infra/workstreams-and-acceptance` to main

---

## What Was Created

This infra pass created **7 coordination documents** and **2 runbook scripts** to enable parallel multi-agent execution of Plan 0 (P0 Golden Path).

### 📋 Coordination Documents

1. **[WORKSTREAMS.md](WORKSTREAMS.md)** (2,800 words)
   - Branch strategy (4 branches, strict merge order)
   - Task split (P0a Contracts, P0b Frontend, P0c Docs)
   - Parallel execution rules
   - File ownership matrix
   - Merge conflict prevention

2. **[AGENT_HANDOFFS.md](AGENT_HANDOFFS.md)** (2,100 words)
   - Per-agent responsibilities (Infra, Contracts, Frontend, Docs)
   - Deliverables and success criteria
   - Preconditions and blockers
   - Handoff checklist template
   - Escalation protocol

3. **[ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md)** (3,200 words)
   - Shared data structures (Intent, Policy, LedgerEntry)
   - Contract event shapes (frozen)
   - Frontend hooks and ABIs
   - File ownership boundaries
   - Critical invariants and pitfalls
   - Common integrations points

4. **[DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md)** (2,600 words)
   - Unit test checklists (Solidity + TypeScript)
   - Integration test checklist (GoldenPath.t.sol)
   - Manual golden path test (8 steps)
   - Regression testing
   - Sign-off criteria

5. **[P0_RISKS.md](P0_RISKS.md)** (2,100 words)
   - 3 critical merge points
   - 2 high-risk interface changes
   - Environmental dependencies (testnet, ETH, env vars)
   - Rollback plan
   - Risk matrix (CRITICAL/HIGH/MEDIUM)

6. **[CLAUDE.md](CLAUDE.md)** (1,500 words)
   - Project overview
   - Multi-agent build structure
   - File ownership snapshot
   - Quick reference (What each agent does)
   - FAQ and escalation

7. **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** (28,000 words, pre-existing)
   - Detailed technical spec for all contract and frontend changes
   - Test requirements
   - ABI specifications
   - Event shapes

### 🛠️ Runbook Scripts

1. **[scripts/demo-reset.sh](scripts/demo-reset.sh)**
   - Clears localStorage and resets Zustand state
   - Instructions for manual DevTools clearing
   - Executable with `./scripts/demo-reset.sh`

2. **[scripts/deploy-testnet.sh](scripts/deploy-testnet.sh)**
   - Deploys all 5 contracts to Base Sepolia testnet
   - Runs `forge script Deploy.s.sol` with RPC + private key
   - Outputs contract addresses to deployment.log
   - Executable with `./scripts/deploy-testnet.sh`

---

## What's Ready for Agents

### ✅ Infra Agent Can Now:
- Create branch `infra/workstreams-and-acceptance`
- Add all 7 coordination docs + 2 scripts
- Merge to main (this is the **FIRST** merge)
- Unblock Contracts and Frontend agents

### ✅ Contracts Agent Can Now:
- Read ARCHITECTURE_NOTES.md (locked interfaces)
- Read IMPLEMENTATION_PLAN.md (technical spec)
- Read AGENT_HANDOFFS.md (responsibilities)
- Create branch `p0/contract-architecture`
- Rewrite all 5 contracts per spec
- Run `forge test -v` locally
- Deploy to Base Sepolia testnet
- Generate `contracts/addresses.json`
- Merge **SECOND** (after infra)

### ✅ Frontend Agent Can Now:
- Read ARCHITECTURE_NOTES.md (locked interfaces)
- Read DEMO_ACCEPTANCE.md (acceptance criteria)
- Read AGENT_HANDOFFS.md (preconditions)
- Create branch `p0/frontend-honest-path` (early, but wait for contracts merge)
- Wait for `contracts/addresses.json` before implementing
- Read addresses from JSON in testnet.ts
- Implement 4-step golden path flow
- Merge **THIRD** (after contracts)

### ✅ Docs/Reset Agent Can Now:
- Scripts already created (just update as needed)
- Create branch `p0/demo-reset-runbooks`
- Update DEMO.md with additional context
- Merge **anytime after infra** (independent)

---

## Merge Order (Immutable)

```
1. infra/workstreams-and-acceptance  (Infra agent)
   ↓
2. p0/contract-architecture          (Contracts agent)
   ↓
3. p0/frontend-honest-path           (Frontend agent)
   ↓
4. p0/demo-reset-runbooks            (Docs agent, optional)
```

**Never merge in different order.** If conflicts arise, resolve in GitHub before merging.

---

## Key Interfaces (Frozen)

**These are locked in ARCHITECTURE_NOTES.md. No changes without consensus.**

### Intent Struct
```typescript
interface Intent {
  id: bigint;
  initiator: `0x${string}`;           // msg.sender who created
  approver: `0x${string}` | null;     // who approved (different address)
  policyId: bigint;
  amount: bigint;
  destination: `0x${string}`;         // recipient
  status: 'Pending' | 'Approved' | 'Executed' | 'Rejected';
  createdAt: bigint;
}
```

### Key Events (Solidity → Frontend)
- `IntentCreated(intentId, policyId, amount, destination, initiator)`
- `IntentApproved(intentId, approver)`
- `IntentExecuted(intentId, executor)`
- `PolicyExecuted(policyId, initiator, destination, amount, timestamp)`
- `LedgerEntryRecorded(entryId, from, to, amount, tokenSymbol, intentRef, blockNumber)`

### Contract Addresses (From contracts/addresses.json)
```json
{
  "USDC": "0x...",
  "POLICY_ENGINE": "0x...",
  "INTENT_REGISTRY": "0x...",
  "TREASURY_VAULT": "0x...",
  "LEDGER_CONTRACT": "0x..."
}
```

---

## Success Criteria (End of P0)

When all 3 branches merged:

✅ All contract tests pass (zero failures)  
✅ All frontend tests pass (zero TypeScript errors)  
✅ Golden path works on Base Sepolia testnet  
✅ Audit page shows correct events linked to Basescan  
✅ Maker-checker enforced (initiator ≠ approver)  
✅ Policy validation enforced (before token approval)  
✅ Demo reset script works (clears localStorage)  
✅ No regressions in existing pages  
✅ Honest UI labels on gated features  
✅ Zero hardcoded addresses (all read from JSON)  

---

## Reading Order (Quick Start)

**For any agent joining Plan 0:**

1. **[CLAUDE.md](CLAUDE.md)** (5 min) — Overview + quick reference
2. **[WORKSTREAMS.md](WORKSTREAMS.md)** (10 min) — Your branch and merge order
3. **[ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md)** (15 min) — Locked interfaces (before you code)
4. **[AGENT_HANDOFFS.md](AGENT_HANDOFFS.md)** (10 min) — Your responsibilities
5. **[DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md)** (10 min) — Acceptance criteria for your work
6. **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** (30 min) — Technical spec
7. **[P0_RISKS.md](P0_RISKS.md)** (10 min) — What could break (and how to prevent it)

**Total time:** ~90 minutes before first line of code.

---

## Common Questions

**Q: When can I start my branch?**  
A: As soon as infra merges to main. Contracts can start immediately; Frontend must wait for contracts merge before implementing.

**Q: What if contracts/addresses.json doesn't exist yet?**  
A: Frontend agent can start reading code early and prepare, but cannot merge until contracts merge and JSON exists.

**Q: What if the interfaces in ARCHITECTURE_NOTES are wrong?**  
A: Both agents review and agree **before** any code changes. If disagreement, escalate to Orchestrator.

**Q: What if Deploy.s.sol fails on testnet?**  
A: Document in PR. Likely causes: RPC down, no ETH, wrong chain ID. Contracts agent retries after fixing.

**Q: Can I hardcode contract addresses in the frontend?**  
A: **No.** Read from contracts/addresses.json via testnet.ts. See ARCHITECTURE_NOTES.md for details.

**Q: What if my PR has regressions?**  
A: Revert locally, fix, push again. Run all tests (`forge test -v` or `npm test`) before opening PR.

---

## File Checklist (Repo is Ready)

- [x] WORKSTREAMS.md created
- [x] AGENT_HANDOFFS.md created
- [x] ARCHITECTURE_NOTES.md created
- [x] DEMO_ACCEPTANCE.md created
- [x] P0_RISKS.md created
- [x] CLAUDE.md created
- [x] scripts/demo-reset.sh created (executable)
- [x] scripts/deploy-testnet.sh created (executable)
- [x] IMPLEMENTATION_PLAN.md already exists (pre-existing spec)
- [x] DEMO.md already exists (5-min walkthrough)
- [x] README.md already exists (project overview)
- [x] eng.md already exists (architecture overview)

---

## Next Step: Start Infra Branch

```bash
# Create infra branch
git checkout -b infra/workstreams-and-acceptance

# Add all new files
git add WORKSTREAMS.md AGENT_HANDOFFS.md ARCHITECTURE_NOTES.md \
        DEMO_ACCEPTANCE.md P0_RISKS.md CLAUDE.md scripts/

# Commit with context
git commit -m "infra: P0 workstreams and acceptance docs

- WORKSTREAMS.md: Branch strategy and task split
- AGENT_HANDOFFS.md: Agent responsibilities and handoffs
- ARCHITECTURE_NOTES.md: Locked shared interfaces
- DEMO_ACCEPTANCE.md: Acceptance checklists
- P0_RISKS.md: Risk assessment and mitigation
- CLAUDE.md: Multi-agent build overview
- scripts/{demo-reset,deploy-testnet}.sh: Runbook stubs

Enables parallel execution of Plan 0 with zero ambiguity.
See WORKSTREAMS.md for full context."

# Push and open PR
git push origin infra/workstreams-and-acceptance
```

---

## Status Summary

| Component | Status | Owner | Next |
|-----------|--------|-------|------|
| Coordination docs | ✅ Done | Infra | Merge to main |
| Runbook scripts | ✅ Done | Infra | Merge to main |
| Contract spec | ✅ Frozen | Contracts | Read + implement |
| Frontend spec | ✅ Frozen | Frontend | Wait for contracts |
| Acceptance criteria | ✅ Defined | QA | Validate at merge |

---

## Links

- [CLAUDE.md](CLAUDE.md) — Multi-agent overview
- [WORKSTREAMS.md](WORKSTREAMS.md) — Branch strategy
- [AGENT_HANDOFFS.md](AGENT_HANDOFFS.md) — Agent responsibilities
- [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared interfaces
- [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md) — Acceptance criteria
- [P0_RISKS.md](P0_RISKS.md) — Risk assessment
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Technical spec
- [DEMO.md](DEMO.md) — 5-minute walkthrough
- [README.md](README.md) — Project overview
- [eng.md](eng.md) — Architecture overview

---

## TL;DR

✅ **Infra setup complete.** All coordination docs created. File ownership clear. Interfaces locked.  
✅ **Contracts agent** can start immediately after infra merges.  
✅ **Frontend agent** can read early, starts implementing after contracts merge.  
✅ **P0 scope** is well-defined: golden path only (no Plan 1/Plan 2 in scope).  
✅ **Merge order** is strict: infra → contracts → frontend → optional docs.  
✅ **Success metric** is clear: one cryptographically verifiable golden path on Base Sepolia testnet.  

**Next:** Create `infra/workstreams-and-acceptance` branch, commit all 7 docs + 2 scripts, open PR.
