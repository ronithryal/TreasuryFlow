# TreasuryFlow P0 — Risks & Mitigation

**Status:** Risk assessment for Plan 0 execution  
**Last Updated:** 2026-04-29  
**Owner:** Orchestrator

---

## Executive Summary

Plan 0 has **3 critical merge points**, **2 high-risk interface changes**, and **1 major environmental dependency**. Mitigation is documented below. Most risks are addressed by clear file ownership and pre-agreed interfaces.

---

## Critical Merge Points

### 1️⃣ Contracts → Main (P0a Merge)

**Risk:** Contract redeployment produces new addresses; frontend hardcodes old addresses → broken demo

**Mitigation:**
- ✅ Contracts agent outputs `contracts/addresses.json` with all 5 addresses
- ✅ Frontend agent **only** reads from `contracts/addresses.json`
- ✅ Grep verification in PR: `grep -r "0x[0-9a-f]\{40\}" app/src/web3/` must not match hardcoded addresses
- ✅ ARCHITECTURE_NOTES.md frozen; addresses never appear in app code

**Pre-Merge Checklist:**
- [ ] Deploy.s.sol runs successfully on Base Sepolia testnet
- [ ] All 5 contract addresses logged and saved to `contracts/addresses.json`
- [ ] `forge test -v` passes with zero failures
- [ ] All existing tests still pass (no regressions)

**Post-Merge Action:**
- Frontend agent immediately updates `app/src/web3/testnet.ts` to read from `contracts/addresses.json`

---

### 2️⃣ Frontend → Main (P0b Merge)

**Risk:** ABI mismatch between frontend and contract → transaction failures in demo

**Scenario:** Contract function signature changes (e.g., createIntent now takes 4 params instead of 3); frontend still calls with 3 params → reverts

**Mitigation:**
- ✅ ABI changes agreed in ARCHITECTURE_NOTES.md **before** any code changes
- ✅ All ABIs locked: IntentRegistry, TreasuryVault, PolicyEngine, LedgerContract
- ✅ Frontend agent updates `app/src/web3/testnet.ts` ABI imports after contracts merge
- ✅ TypeScript type checking catches param count mismatches at compile time

**Pre-Merge Checklist:**
- [ ] `npm run typecheck` produces zero errors
- [ ] All function signatures in testnet.ts match contract ABIs exactly
- [ ] Golden path test completes all 4 steps without errors
- [ ] Audit page displays all required fields (intentId, policyId, initiator, approver, amount, destination, txHash)

**Post-Merge Action:**
- QA runs full golden path test on Base Sepolia testnet
- Verify Basescan link works and shows correct events

---

### 3️⃣ Infra → Main (Plan 0 Complete)

**Risk:** Documentation is out of sync with code → next sprint confused about branch strategy and ownership

**Mitigation:**
- ✅ All coordination docs are living documents; update them if reality diverges
- ✅ Commit messages reference which doc they follow (e.g., "feat(contracts): P0 contract architecture per IMPLEMENTATION_PLAN.md")
- ✅ PR reviews explicitly verify docs are accurate

---

## High-Risk Interface Changes

### Intent struct (across Solidity + TypeScript)

**What changed:** Added `initiator` and `approver` fields; removed or deprecated `createdBy` and `txHash`

**Risk:** TypeScript code reads old Intent shape → type mismatch or missing data

**Mitigation:**
- ✅ Intent struct frozen in ARCHITECTURE_NOTES.md before P0a starts
- ✅ Both agents read ARCHITECTURE_NOTES.md before writing ANY code
- ✅ TypeScript type must match exactly: `initiator`, `approver`, `status`, `createdAt`, `policyId`, `amount`, `destination`
- ✅ Tests verify struct shape in both Solidity and TypeScript

**Verification:**
```typescript
// TypeScript must match this:
interface Intent {
  id: bigint;
  initiator: `0x${string}`;
  approver: `0x${string}` | null;
  policyId: bigint;
  amount: bigint;
  destination: `0x${string}`;
  status: 'Pending' | 'Approved' | 'Executed' | 'Rejected';
  createdAt: bigint;
}

// Solidity must match this:
struct Intent {
  uint256 id;
  address initiator;
  uint256 policyId;
  uint256 amount;
  address destination;
  address approver;
  IntentStatus status;
  uint256 createdAt;
}
```

---

### Contract Events (across log parsing and Audit page)

**What changed:** Event signatures and field order; txHash removed from LedgerEntryRecorded

**Risk:** Event parsing fails because field names/types changed → Audit page empty

**Mitigation:**
- ✅ Event shapes frozen in ARCHITECTURE_NOTES.md
- ✅ Contracts agent must emit events matching ARCHITECTURE_NOTES exactly
- ✅ Frontend agent must parse events using matching field names and types
- ✅ Unit tests verify event emission with correct fields

**Verification:**
```solidity
// Contracts emit:
event IntentCreated(
  uint256 indexed intentId,
  uint256 indexed policyId,
  uint256 amount,
  address indexed destination,
  address initiator  // ← NEW, INDEXED
);

event PolicyExecuted(
  uint256 indexed policyId,       // ← NOW uint256, was string
  address indexed initiator,
  address destination,
  uint256 amount,
  uint256 timestamp
);
```

**Frontend parsing must match:**
```typescript
// Must parse with matching types
const intentCreated = {
  intentId: bigint,
  policyId: bigint,
  amount: bigint,
  destination: `0x${string}`,
  initiator: `0x${string}`,  // ← Must be present
};
```

---

## Environmental Risks

### Risk: Base Sepolia Testnet Downtime

**Severity:** CRITICAL  
**Symptom:** Deploy script hangs or returns "network unreachable"

**Mitigation:**
- ✅ Check Base Sepolia status at https://status.basescan.org before deployment
- ✅ RPC URL fallback: use Alchemy (preferred) or Infura if one is down
- ✅ Timeout: If forge script hangs for >5 min, kill and retry with different RPC

**Workaround:**
```bash
# If default RPC fails, try Alchemy
export ALCHEMY_RPC_URL="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY"
./scripts/deploy-testnet.sh

# If that fails, try Infura
export ALCHEMY_RPC_URL="https://base-sepolia.infura.io/v3/YOUR_KEY"
./scripts/deploy-testnet.sh
```

---

### Risk: Deployer Account Runs Out of ETH

**Severity:** HIGH  
**Symptom:** Deploy script completes but returns "insufficient funds" error

**Mitigation:**
- ✅ Fund deployer account with 0.5 Base Sepolia ETH before starting (costs ~$0.01 real $ on testnet faucet)
- ✅ Check balance before deploy: `cast balance --rpc-url $RPC_URL <deployer_address>`
- ✅ Estimate gas: Deploy script will estimate ~20–50k gas for 5 contracts + setup

**Workaround:**
```bash
# Request fresh ETH from Base Sepolia faucet
# https://www.coinbase.com/faucets/base-ethereum-testnet-faucet
# Then retry deployment
```

---

### Risk: DEMO_APPROVER_KEY Env Var Missing

**Severity:** MEDIUM  
**Symptom:** demo-approve.ts endpoint returns 503 "Demo approver not configured"

**Mitigation:**
- ✅ Frontend agent must document env vars in PR
- ✅ DevOps / Vercel team must set DEMO_APPROVER_KEY before deployment
- ✅ Local dev: Generate fresh address with `cast wallet new` (never reuse mainnet keys)
- ✅ README.md updated with warning: "Never fund this address on mainnet"

**Setup (for local dev):**
```bash
# Generate fresh testnet-only key
cast wallet new | grep "Private key:"
export DEMO_APPROVER_KEY=0x...

# Verify in deployed app via manual test
# (POST /api/demo-approve should succeed)
```

---

## Merge Conflict Scenarios

### Scenario 1: Both Contracts and Frontend edit testnet.ts

**Cause:** Contracts agent adds ABI; Frontend agent adds contract address  
**Prevention:** Contracts agent **does not touch** `app/src/web3/testnet.ts`; only Frontend agent does  
**Resolution:** If it happens, Frontend agent resolves by manually merging both changes

---

### Scenario 2: Contracts change PolicyEngine interface

**Cause:** Contracts agent changes validateIntent(policyId, source, dest, amount) signature  
**Prevention:** Frozen in ARCHITECTURE_NOTES.md; agreement required before changes  
**Resolution:** If it happens, both agents discuss in GitHub; Orchestrator decides

---

### Scenario 3: Frontend adds new event type; Contracts hasn't emitted it yet

**Cause:** Frontend assumes an event that Contracts doesn't emit  
**Prevention:** All events frozen in ARCHITECTURE_NOTES.md before either agent writes code  
**Resolution:** If it happens, Frontend reverts new event handling; sticks to agreed events

---

## Regression Testing Checklist

**Before merging to main, all existing tests must still pass:**

### Contracts
```bash
forge test -v
# Expected: All tests pass, no new failures
```

### Frontend
```bash
npm test
npm run typecheck
# Expected: Zero errors, all tests pass
```

### Manual Spot-Check (Local Dev)
- [ ] Overview page loads (no errors in console)
- [ ] Policies page displays seed policies
- [ ] Activity page displays mock events (mock mode works)
- [ ] Settings page functions
- [ ] No broken images or missing styles

---

## Safety Gates

### Before Infra Merge
- [ ] All 4 docs exist (WORKSTREAMS, DEMO_ACCEPTANCE, ARCHITECTURE_NOTES, AGENT_HANDOFFS)
- [ ] File ownership clearly defined (no overlap)
- [ ] Scripts created (demo-reset, deploy-testnet)

### Before Contracts Merge
- [ ] All contract tests pass
- [ ] No existing test removed
- [ ] Deploy.s.sol outputs addresses.json
- [ ] All events match ARCHITECTURE_NOTES
- [ ] Intent struct matches ARCHITECTURE_NOTES

### Before Frontend Merge
- [ ] npm run typecheck: zero errors
- [ ] npm test: all tests pass
- [ ] Golden path works on Base Sepolia testnet
- [ ] Audit page displays events correctly
- [ ] Basescan link works
- [ ] No hardcoded addresses (verified via grep)

### Before Demo Reset Merge
- [ ] Scripts are executable (chmod +x)
- [ ] DEMO.md has 8+ step walkthrough
- [ ] Expected output documented

---

## Rollback Plan

### If Infra Merge Breaks Main
```bash
git revert HEAD --no-edit
# Coordination docs are non-blocking; safe to revert
```

### If Contracts Merge Breaks Main
```bash
git revert HEAD --no-edit
# If addresses.json has wrong format or Deploy.s.sol fails:
# Contracts agent fixes issue and reopens PR
```

### If Frontend Merge Breaks Main
```bash
git revert HEAD --no-edit
# Most likely cause: ABI mismatch or hardcoded address
# Frontend agent verifies testnet.ts against contracts/addresses.json
# Fixes and reopens PR
```

---

## Success Indicators (Mid-Plan Checkpoints)

### After Infra Merges (1–2 hours in)
✅ WORKSTREAMS.md describes exact merge order  
✅ ARCHITECTURE_NOTES.md locks Intent, Policy, Event shapes  
✅ AGENT_HANDOFFS.md clear on preconditions and blockers  
✅ Contracts and Frontend agents ready to start

### After Contracts Merges (3–4 hours in)
✅ All contract tests pass  
✅ Deploy.s.sol runs on Base Sepolia testnet  
✅ contracts/addresses.json has all 5 addresses  
✅ Frontend agent unblocked (can read addresses.json)

### After Frontend Merges (5–6 hours in)
✅ Golden path works end-to-end on Base Sepolia  
✅ Audit page shows verifiable onchain events  
✅ Basescan link works  
✅ Maker-checker enforced (initiator ≠ approver)  
✅ Policy validation enforced at createIntent

---

## Risk Summary (Traffic Light)

| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|-----------|-----------|-------|
| Contract address hardcoding | 🔴 CRITICAL | LOW | Read from contracts/addresses.json only | Frontend |
| ABI mismatch | 🔴 CRITICAL | LOW | Freeze ABIs in ARCHITECTURE_NOTES | Both |
| Testnet downtime | 🟠 HIGH | LOW | Check status; use fallback RPC | Contracts |
| Deployer out of ETH | 🟠 HIGH | MEDIUM | Fund account before deploy | Contracts |
| Event parsing fails | 🟠 HIGH | LOW | Freeze event shapes in ARCHITECTURE_NOTES | Frontend |
| Missing env var (DEMO_APPROVER_KEY) | 🟡 MEDIUM | MEDIUM | Document in PR; set before deploy | Frontend |
| Regression in other pages | 🟡 MEDIUM | LOW | Run existing tests before merge | Both |
| Merge conflict on struct/enum | 🟡 MEDIUM | LOW | Frozen interfaces; no simultaneous edits | Both |

---

## Escalation Protocol

**If something goes wrong:**

1. **Document the issue** with:
   - What you were trying to do
   - What happened
   - What you expected
   - Git status, error messages, logs

2. **Check the relevant doc:**
   - Contract error → IMPLEMENTATION_PLAN.md
   - Type mismatch → ARCHITECTURE_NOTES.md
   - Merge conflict → AGENT_HANDOFFS.md → Merge Conflict Prevention
   - Unknown → This file (P0_RISKS.md)

3. **Slack Orchestrator** with:
   - Clear problem statement
   - All relevant info from step 1
   - What you've already tried

4. **Wait for guidance** — Don't work around unless explicitly told to

---

## Key Takeaways

1. **Pre-agreement > Last-minute fixes:** Interfaces frozen in ARCHITECTURE_NOTES before code starts
2. **Clear ownership > Shared responsibility:** Each agent owns specific files; no overlap
3. **Strict merge order > Parallel conflicts:** Always merge in: Infra → Contracts → Frontend
4. **Testnet-first validation > Post-merge surprises:** Test every contract change on Base Sepolia before PR
5. **Read ARCHITECTURE_NOTES first > Trial-and-error:** All shared types defined; no guessing

---

## Links

- [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared interfaces (frozen)
- [AGENT_HANDOFFS.md](AGENT_HANDOFFS.md) — Responsibilities and merge conflicts
- [WORKSTREAMS.md](WORKSTREAMS.md) — Merge order
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Technical spec
