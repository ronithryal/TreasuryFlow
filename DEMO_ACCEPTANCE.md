# TreasuryFlow Demo Acceptance Criteria

**Status:** Ready for P0 execution  
**Last Updated:** 2026-04-29  
**Owner:** QA / Frontend agent

---

## P0: Golden Path (Trust-Loop Enforcement)

**Success = one complete, verifiable end-to-end flow that proves policy-enforced, onchain execution.**

---

### P0 Contract Acceptance

**Branch:** `p0/contract-architecture`  
**Tests required:** All pass without warnings or regressions

#### Unit Tests (forge test -v)

**PolicyEngine.t.sol:**
- [ ] `test_createPolicy_storesMaxAmount` — Policy struct includes and enforces maxAmount field
- [ ] `test_validateIntent_rejectsExceededMax` — validateIntent returns false when amount > maxAmount
- [ ] `test_validateIntent_acceptsWildcardSource` — When policy.source == address(0), any source is accepted
- [ ] `test_validateIntent_acceptsWildcardDest` — When policy.destination == address(0), any destination is accepted
- [ ] `test_validateIntent_rejectsInactivePolicies` — Policy with active=false fails validation
- [ ] `test_validateIntent_rejectsZeroAmount` — amount == 0 returns false
- [ ] `test_createPolicy_remainsOnlyOwner` — Non-owner cannot call createPolicy (owner-only for P0)

**IntentRegistry.t.sol:**
- [ ] `test_createIntent_callsValidateIntent` — Intent creation fails if PolicyEngine.validateIntent returns false
- [ ] `test_createIntent_storesInitiator` — Intent.initiator == msg.sender
- [ ] `test_createIntent_storesPending` — Intent.status == Pending after creation
- [ ] `test_createIntent_emitsIntentCreated` — Event logged with intentId, policyId, amount, destination, initiator
- [ ] `test_approveIntent_storesApprover` — Intent.approver == msg.sender after approval
- [ ] `test_approveIntent_makerCheckerEnforced` — Initiator cannot approve their own intent (reverts)
- [ ] `test_approveIntent_differentWallet_succeeds` — Different address can approve successfully
- [ ] `test_approveIntent_requiresPending` — Cannot approve non-Pending intent
- [ ] `test_executeIntent_requiresApproved` — Cannot execute Pending intent (reverts)
- [ ] `test_executeIntent_onlyInitiator` — Only intent.initiator can call executeIntent (reverts otherwise)
- [ ] `test_executeIntent_triggersVault` — Calls vault.executeApprovedIntent with correct params
- [ ] `test_executeIntent_emitsIntentExecuted` — Event logged
- [ ] `test_cancelIntent_onlyInitiator` — Only initiator can cancel
- [ ] `test_cancelIntent_onlyPending` — Cannot cancel non-Pending intent

**TreasuryVault.t.sol:**
- [ ] `test_executeApprovedIntent_onlyIntentRegistry` — Direct call from non-registry address reverts
- [ ] `test_executeApprovedIntent_validatesPolicy` — Reverts if policy validation fails
- [ ] `test_executeApprovedIntent_transfersFromInitiator` — Calls USDC.transferFrom(initiator, vault, amount)
- [ ] `test_executeApprovedIntent_transfersToDestination` — Calls USDC.transfer(destination, amount)
- [ ] `test_executeApprovedIntent_vaultEndsAtZero` — Vault balance == 0 after transfer (no dust)
- [ ] `test_executeApprovedIntent_emitsPolicyExecuted` — Event emitted with policyId (uint256), initiator, destination, amount, timestamp
- [ ] `test_setIntentRegistry_onlyOnce` — Can set once; second call reverts
- [ ] `test_executeApprovedIntent_revertsInvalidAmount` — amount == 0 reverts

**LedgerContract.t.sol:**
- [ ] `test_setAuthorized_addsCaller` — Authorized address can now call recordEntry
- [ ] `test_recordEntry_onlyRecorder` — Non-authorized address cannot call (reverts)
- [ ] `test_recordEntry_storesEntry` — Entry stored with correct fields (from, to, amount, token, ref, block)
- [ ] `test_recordEntry_emitsEvent` — Event logged

**Integration Test: GoldenPath.t.sol**
- [ ] All 5 contracts deployed and wired together
- [ ] Demo policies pre-deployed (id=1 Vendor Payment, id=2 Treasury Sweep, id=3 Yield Deposit)
- [ ] Initiator wallet receives 5,000 mUSDC
- [ ] Initiator approves vault for 5,000 mUSDC
- [ ] Initiator calls createIntent(1, 5000e6, recipient) — succeeds
- [ ] Intent status is Pending after creation
- [ ] Initiator attempts approveIntent on own intent — reverts "Cannot self-approve"
- [ ] Approver (different address) calls approveIntent(intentId) — succeeds
- [ ] Intent status is Approved after approval
- [ ] Initiator calls executeIntent(intentId) — succeeds
- [ ] Recipient balance increased by 5,000 mUSDC
- [ ] Vault balance == 0 after execution
- [ ] IntentExecuted event emitted
- [ ] PolicyExecuted event emitted (with policyId as uint256)
- [ ] LedgerEntryRecorded event emitted (with intentRef = bytes32(uint256(intentId)))
- [ ] Direct call to vault.executeApprovedIntent from non-registry reverts

**Deployment Test: Deploy.s.sol**
- [ ] Script deploys in order: MockUSDC → PolicyEngine → LedgerContract → TreasuryVault → IntentRegistry
- [ ] vault.setIntentRegistry called with correct address
- [ ] ledger.setAuthorized called with IntentRegistry address
- [ ] 3 demo policies created:
  - [ ] id=1 "Vendor Payment" source=address(0) dest=address(0) maxAmount=10_000e6
  - [ ] id=2 "Treasury Sweep" source=address(0) dest=address(0) maxAmount=100_000e6
  - [ ] id=3 "Yield Deposit" source=address(0) dest=address(0) maxAmount=500_000e6
- [ ] All 5 contract addresses logged to console
- [ ] Addresses match in subsequent contract reads

**Regression Tests:**
- [ ] All existing tests in contracts/ pass without modification
- [ ] No tests removed or skipped
- [ ] No new test skips (xit/xtest)

---

### P0 Frontend Acceptance

**Branch:** `p0/frontend-honest-path`  
**Tests required:** npm run typecheck && npm test (all pass)

#### TypeScript & Build

- [ ] `npm run typecheck` produces **zero** errors
- [ ] `npm run build` completes without warnings
- [ ] No unused imports or variables in modified files

#### Unit Tests (npm test)

**useTestnetExecution.ts:**
- [ ] Step 1: createIntent called with correct params, emits IntentCreated
- [ ] Step 2: USDC.approve succeeds
- [ ] Step 3: POST /api/demo-approve returns { approvalTxHash, approverAddress }
- [ ] Step 4: executeIntent called by initiator, receipt.transactionHash captured
- [ ] Error handling: createIntent rejection shows "Policy rejected" message

**demo-approve.ts (API):**
- [ ] POST request accepted (405 on GET)
- [ ] Missing intentId returns 400
- [ ] Missing DEMO_APPROVER_KEY env var returns 503
- [ ] Valid request calls IntentRegistry.approveIntent and waits for receipt
- [ ] Response includes approvalTxHash and approverAddress

**usePolicyExecutionLogs.ts (hooks):**
- [ ] useIntentExecutionLogs fetches getLogs for IntentExecuted from IntentRegistry
- [ ] Fetches getLogs for PolicyExecuted from TreasuryVault
- [ ] Fetches getLogs for LedgerEntryRecorded from LedgerContract
- [ ] Merges events by intentId + block number
- [ ] Deduplicates (same event fetched twice = one display row)
- [ ] Polls every 15 seconds in testnet mode

**Audit.tsx:**
- [ ] Displays "No executions yet" when ledger is empty
- [ ] After golden path, displays execution row with:
  - [ ] Intent ID (e.g. "Intent #1")
  - [ ] Policy ID + Policy Name (resolved from PolicyEngine)
  - [ ] Initiator address (truncated, copyable)
  - [ ] Approver address (truncated, copyable)
  - [ ] Amount formatted with symbol (e.g. "5,000.00 USDC")
  - [ ] Destination address (truncated)
  - [ ] Transaction hash as clickable Basescan link
  - [ ] Block number and timestamp
- [ ] "What am I verifying?" expandable section shows:
  - [ ] Policy #N was active and permitted this transfer
  - [ ] Maker-checker enforced (initiator ≠ approver)
  - [ ] Fund movement: from → to on Base Sepolia
  - [ ] Basescan link

#### Manual Golden Path Test (testnet mode)

**Environment:** `VITE_APP_MODE=testnet` on Base Sepolia testnet

**Setup (one-time):**
- [ ] Base Sepolia testnet configured in wallet
- [ ] MetaMask or Coinbase Wallet connected
- [ ] Fresh account with 0.1 Base Sepolia ETH
- [ ] Account has 0 mUSDC balance

**Golden Path Steps:**

1. **Mint mUSDC**
   - [ ] Navigate to Settings page
   - [ ] Click "Mint Test USDC" button
   - [ ] Sign transaction in wallet
   - [ ] Confirm: account balance now shows 10,000 mUSDC

2. **Create Payment Request**
   - [ ] Navigate to Approvals page
   - [ ] Click "Create Request"
   - [ ] Fill form:
     - [ ] Policy: "Vendor Payment" (Policy #1)
     - [ ] Amount: 5,000 USDC
     - [ ] Destination: Use demo recipient (e.g., fixed testnet address)
   - [ ] Click "Create and Sign"
   - [ ] Wallet signs two transactions:
     - [ ] createIntent(1, 5000e6, recipient) — succeeds
     - [ ] USDC.approve(vault, 5000e6) — succeeds (after policy validation)
   - [ ] UI shows "Request created" with Intent ID
   - [ ] Confirm intent shows as Pending on Approvals page

3. **Approve (Server)**
   - [ ] UI automatically shows "Treasury Admin approving..."
   - [ ] Backend calls POST /api/demo-approve { intentId }
   - [ ] Approval completes without user action
   - [ ] Intent status changes to Approved in UI

4. **Execute**
   - [ ] Click "Execute" on Approved intent
   - [ ] Sign executeIntent(intentId) in wallet
   - [ ] Transaction succeeds
   - [ ] UI shows "Execution complete"
   - [ ] Intent status changes to Executed

5. **Verify in Audit**
   - [ ] Navigate to Audit page
   - [ ] New execution row visible with all fields populated
   - [ ] Click Basescan link → transaction displays on Basescan
   - [ ] Verify on Basescan:
     - [ ] From: initiator wallet
     - [ ] To: (internal calls; look for Transfer event)
     - [ ] Shows multiple events: IntentCreated, IntentApproved, IntentExecuted, PolicyExecuted, Transfer

6. **Verify Settings**
   - [ ] Navigate to Settings page
   - [ ] "Force Mock AI" toggle **NOT visible** (must check DEV mode to confirm it's hidden)
   - [ ] Other settings visible and functional

7. **Verify Yield Page**
   - [ ] Navigate to Yield page
   - [ ] "Configure Deployment Policy" button is **disabled**
   - [ ] Hover shows tooltip: "Requires onchain policy creation. Available in production."

8. **Verify Entities Page**
   - [ ] Navigate to Entities page
   - [ ] "Provision CDP Wallet" shows text: "Coming soon: pending CDP Embedded Wallet enablement."

---

### P0 Complete Demo Reset & Replay

**Optional branch:** `p0/demo-reset-runbooks`

#### Demo Reset Script

- [ ] `./scripts/demo-reset.sh` script exists and is executable
- [ ] Running the script:
  - [ ] Clears localStorage (verifiable by opening DevTools → Storage)
  - [ ] Resets Zustand state to seed (all intents gone, account balance reset to seed)
  - [ ] UI returns to blank state (no intents, default policies visible)
  - [ ] Does NOT restart dev server or lose wallet connection

#### Demo Deployment Script

- [ ] `./scripts/deploy-testnet.sh` script exists and is executable
- [ ] Running the script:
  - [ ] Deploys all contracts via `forge create` or similar
  - [ ] Logs all 5 contract addresses
  - [ ] Updates `app/src/web3/testnet.ts` with new addresses (or prompts to do so manually)
  - [ ] Ready for immediate golden path test

#### DEMO.md Walkthrough

- [ ] DEMO.md includes exact step-by-step instructions
- [ ] Includes expected output/screenshots at each step
- [ ] Mentions Base Sepolia requirement
- [ ] Mentions role of demo approver (server-side, automated)
- [ ] Links to this file for acceptance criteria

---

### P0 Regression Testing

**All other pages must still work as before:**

- [ ] Overview page loads without errors
- [ ] Policies page displays seed policies
- [ ] Activity page displays mock events
- [ ] Reconciliation page functions (if present in seed)
- [ ] No console errors in DevTools
- [ ] No broken images or missing styles
- [ ] Layout responsive on mobile (if applicable)

---

## Plan 1: Scaffolding (Deferred to Post-P0)

### P1a: OpenFX Adapter Scaffold

- [ ] `app/src/services/providers/openfx.ts` created (stub only)
- [ ] Mock responses for getBalance, getTransactionHistory
- [ ] No actual API calls (stubs return mocked data)
- [ ] TypeScript compiles without errors

### P1b: Provider Adapters (Coinbase, Circle, Ramp, Rails)

- [ ] Each provider has a stub adapter in `app/src/services/providers/`
- [ ] Adapter conforms to shared ProviderInterface type
- [ ] No actual API calls (all responses mocked)
- [ ] Integrations page shows provider options (disabled, "Coming soon")

### P1c: EigenCloud-Style Verification

- [ ] `app/src/services/audit-engine.ts` created (stub)
- [ ] Accepts Intent/Execution as input
- [ ] Returns AI-generated rationale (mocked)
- [ ] VerificationPanel component displays mock results
- [ ] No calls to Perplexity (mocked only)

### P1d: Demo Docs & Integration Tests

- [ ] `app/e2e/golden-path.spec.ts` created (Playwright)
- [ ] E2E test runs: connect wallet → create intent → execute → verify audit
- [ ] Test passes consistently on Base Sepolia testnet
- [ ] `docs/flows/` directory with payment request and reconciliation diagrams
- [ ] `docs/api/` directory with /api/demo-approve documentation

---

## Plan 2: Core Integrations (Post-P1)

### P2a: OpenFX Live Integration

- [ ] Replace stub calls with real OpenFX API calls
- [ ] Wire onchain policy engine to OpenFX settlement rules
- [ ] Test payment request → OpenFX SWIFT settlement flow

### P2b: Provider Adapter Implementation

- [ ] Replace stubs with real Coinbase, Circle, Ramp, Rails API calls
- [ ] Test multi-provider payment request execution
- [ ] Add UI provider selection and configuration

### P2c: EigenCloud Integration

- [ ] Real EigenCloud network for onchain verification
- [ ] Continuous AI audit against live transaction history
- [ ] Risk scoring and anomaly detection displayed in UI

### P2d: ERP & Webhook Sync

- [ ] NetSuite / QuickBooks webhook receivers
- [ ] Real-time ledger sync to ERP
- [ ] Transaction classification and reconciliation automation

---

## Acceptance Sign-Off

**P0 Complete When:**
- ✅ All P0 contract tests pass
- ✅ All P0 frontend tests pass
- ✅ One complete golden path demo on Base Sepolia testnet
- ✅ Audit page shows verifiable onchain events
- ✅ Maker-checker enforced (initiator ≠ approver)
- ✅ No hardcoded addresses or mock logic in production path
- ✅ Honest UI labels on gated features (Coming soon, Disabled)
- ✅ Demo reset script works
- ✅ PR merged with no regressions

**Plan 1 Complete When:**
- ✅ All P1 scaffolds created and buildable
- ✅ No actual API calls (all mocked)
- ✅ E2E test passes (Playwright)
- ✅ Documentation complete for all flows

**Plan 2 Complete When:**
- ✅ OpenFX, provider adapters, and EigenCloud all live
- ✅ ERP webhooks receiving and processing
- ✅ End-to-end integration test passes
- ✅ Production-grade audit and risk scoring

---

## Escalation & Questions

- **Test failing?** → Check IMPLEMENTATION_PLAN.md for spec
- **Unsure of acceptance criteria?** → Re-read the relevant section above
- **Need to change criteria?** → Update this file and document in PR
- **Blocker?** → File in AGENT_HANDOFFS.md

---

## Links

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Technical spec
- [WORKSTREAMS.md](WORKSTREAMS.md) — Branch strategy
- [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md) — Shared interfaces
- [DEMO.md](DEMO.md) — Quick demo guide
