# TreasuryFlow Golden Path Plan — Revised

## Context

A YC buyer evaluated TreasuryFlow and identified a core trust gap: the product claims "policy-enforced, non-custodial, onchain treasury execution" but the implementation does not deliver that. The goal is to make one complete golden-path demo credible enough that a CFO/controller can verify the claim.

**Why this matters:** Every critical selling point (onchain audit trail, maker-checker enforcement, policy gating) is either cosmetic or disconnected in the current code. Fixing the surface UX without fixing the contracts does not close the trust gap.

**Architecture correction from first draft:** The previous plan allowed TreasuryVault to be called directly by the frontend, bypassing IntentRegistry approval. That breaks the core claim. The revised architecture routes all execution through IntentRegistry so the approval chain is enforced at the contract layer.

---

## Scope Boundaries

### P0 — Trust loop defects (must fix)
These directly break the core claim that policy-controlled, maker-checked, onchain execution is real.

### Honest UI — Not broken product defects
These are intentionally not live yet (pending approvals, vendor enablement, production config). The fix is honest labeling, not implementation.

### Deferred — Out of scope for this session
CDP Embedded Wallets, full login/auth, production WalletConnect, Coinbase/Ramp/Circle integrations, ERP integrations, yield strategy deployment, compliance/SOC 2/KYB.

---

## Current State: Root Causes

### P0 Trust-Loop Defects — Smart Contracts

| Issue | Impact |
|-------|--------|
| `IntentRegistry.sol`: zero access control — anyone can call `approveIntent(intentId, anyAddress)` | Maker-checker is frontend theater, not contract enforcement |
| `IntentRegistry.sol`: never calls `PolicyEngine.validateIntent()` | Policy is not enforced at intent creation or execution |
| `TreasuryVault.sol`: does not reference `PolicyEngine` | `executePolicy()` accepts any policy ID with no validation |
| `TreasuryVault.sol`: `executePolicy()` never transfers to `destination` — tokens sit in vault | The "payment" never reaches the recipient |
| `LedgerContract.sol`: `onlyOwner` blocks connected demo wallet from recording | Ledger steps silently fail in demo |
| `PolicyEngine.sol`: `createPolicy()` is `onlyOwner` — demo wallet cannot create policies | AI Policy Builder testnet path fails silently |
| All 5 contracts are completely decoupled | No onchain enforcement chain exists |

### P0 Trust-Loop Defects — Frontend

| Issue | File | Impact |
|-------|------|--------|
| Destination hardcoded to `0x000...dEaD` | `web3/useTestnetExecution.ts:45` | Payment never reaches intended recipient |
| AI Policy Builder: `handleGenerate` is always a 2-second setTimeout | `components/shared/AIPolicyBuilder.tsx` | "AI" label is false for buyers |
| "Force Mock AI" toggle publicly visible in Settings | `pages/Settings.tsx:104–123` | Destroys credibility mid-demo |
| Audit page empty after golden path — no IntentExecuted events shown | `pages/Audit.tsx` | Cannot verify execution happened |
| Finance language: "intent", "Deploy to Safes", mixed `$X usdc` | Throughout | CFO language mismatch |

### Honest UI — Gated/Pending Features (label, don't implement)

| Feature | Current State | P0 Fix |
|---------|--------------|--------|
| CDP Embedded Wallets | Button navigates to `/roadmap` with no feedback | Show "Coming soon: pending CDP Embedded Wallet enablement." styled chip |
| Sign In / Login | Button present but no auth system | Route to demo explanation: "This demo uses simulated finance roles to show maker-checker workflows. Login coming soon." |
| WalletConnect | May work partially; not reliably tested | Show "Testnet wallet required" with MetaMask/Coinbase Wallet as the supported path. If WalletConnect fails, show clear fallback, not treasury execution errors. |
| Yield "Configure Deployment Policy" (mock mode) | No-op button, no feedback | Disabled button with tooltip: "Requires wallet connection. Open testnet demo to configure." |

---

## Revised P0 Architecture

The enforced onchain path for every payment request:

```
[Initiator wallet]
  1. IntentRegistry.createIntent(policyId, amount, destination)
       └─> validates: PolicyEngine.validateIntent(policyId, msg.sender, destination, amount)
       └─> reverts if policy inactive, amount exceeds cap, or addresses mismatch
       └─> stores intent.initiator = msg.sender, status = Pending
       └─> [policy validation happens BEFORE the user grants any token allowance]

  2. USDC.approve(vault, amount)
       └─> user grants vault permission to pull tokens
       └─> done after policy validation so a rejected policy doesn't require a wasted approval tx

[Demo approver (server-side key, never in client bundle)]
  3. POST /api/demo-approve { intentId }
       └─> calls IntentRegistry.approveIntent(intentId) from demo approver address
       └─> enforces: msg.sender != intent.initiator  (onchain maker-checker)
       └─> stores intent.approver = demo approver address, status = Approved

[Initiator wallet again — only the initiator may execute]
  4. IntentRegistry.executeIntent(intentId)
       └─> enforces: msg.sender == intent.initiator  (only initiator can execute)
       └─> enforces: status == Approved
       └─> calls TreasuryVault.executeApprovedIntent(initiator, destination, amount, policyId)
             └─> enforces: msg.sender == intentRegistry  (onlyIntentRegistry modifier)
             └─> PolicyEngine.validateIntent(...)  (second onchain policy check)
             └─> USDC.transferFrom(initiator, vault, amount)
             └─> USDC.transfer(destination, amount)
             └─> emits PolicyExecuted(policyId, initiator, destination, amount, timestamp)
       └─> LedgerContract.recordEntry(from, to, amount, "mUSDC", bytes32(intentId), block.number)
             └─> intentRef = bytes32(uint256(intentId)) — non-zero, unique reference
             └─> audit UI attaches real txHash from receipt.transactionHash, not from this field
       └─> emits IntentExecuted(intentId, msg.sender)
       └─> emits LedgerEntryPosted(intentId, block.number)

[Frontend]
  5. Reads txHash = receipt.transactionHash from step 4's receipt
  6. Displays audit entry using: intentId, policyId, initiator, approver, destination, amount,
     receipt.transactionHash (not the LedgerContract intentRef), block, Basescan link,
     "What am I verifying?" explainer
```

**Key invariants:**
- Policy is validated (createIntent) before the user is asked to approve token spend — no wasted allowance tx on rejected policy.
- TreasuryVault has NO public execution method. Only IntentRegistry can trigger fund movement.
- `executeIntent` is restricted to the initiator (`require(msg.sender == intent.initiator)`).
- `executeIntent` takes no txHash parameter — txHash is always read from `receipt.transactionHash`.
- LedgerContract receives `bytes32(uint256(intentId))` as its reference field (non-zero, meaningful) — the audit UI uses the actual receipt hash, not this field.
- PolicyEngine is NOT permissionless. Demo policies are pre-deployed by the contract owner.
- Intent rejection is restricted to the initiator (`cancelIntent`). Approver rejection is deferred.

---

## Contract Changes

### `PolicyEngine.sol` — minimal changes
**File:** `contracts/src/PolicyEngine.sol`

Keep `onlyOwner` on `createPolicy()`. The golden path uses pre-deployed demo policies; no wallet needs to create policies at demo time.

Add to Policy struct and `validateIntent()`:
- `maxAmount` field (`uint256`, 0 = uncapped) — enforced in `validateIntent()` if > 0
- Address wildcard: if `policy.source == address(0)`, skip source check; same for `policy.destination`

Update `createPolicy()` signature to accept `maxAmount`:
```solidity
function createPolicy(
  string calldata name,
  string calldata policyType,
  address source,      // address(0) = any source
  address destination, // address(0) = any destination
  uint256 maxAmount,   // 0 = uncapped
  string calldata conditions
) external onlyOwner returns (uint256 policyId)
```

Updated `validateIntent()`:
```solidity
function validateIntent(uint256 policyId, address source, address destination, uint256 amount)
  external view returns (bool)
{
  Policy storage p = policies[policyId];
  if (p.id == 0 || !p.active) return false;
  if (p.source != address(0) && p.source != source) return false;
  if (p.destination != address(0) && p.destination != destination) return false;
  if (p.maxAmount > 0 && amount > p.maxAmount) return false;
  if (amount == 0) return false;
  return true;
}
```

> Note for P1 (AI Policy Builder testnet): opening `createPolicy` to non-owners or routing through a signing service is deferred. For P0, pre-deployed policies cover the golden path.

---

### `IntentRegistry.sol` — full rewrite
**File:** `contracts/src/IntentRegistry.sol`

Constructor: `constructor(address _policyEngine, address _vault, address _ledger)`

Intent struct gains:
- `initiator` (`address`) — set to `msg.sender` in `createIntent`
- `approver` (`address`) — set in `approveIntent`

Remove `createdBy` (replaced by `initiator`). Keep `txHash` field for storage but it is set internally during execution, not passed as a parameter.

```solidity
// createIntent — validates policy before registering
function createIntent(uint256 policyId, uint256 amount, address destination)
  external returns (uint256 intentId)
{
  require(
    IPolicyEngine(policyEngine).validateIntent(policyId, msg.sender, destination, amount),
    "Policy rejected"
  );
  require(amount > 0, "Invalid amount");
  require(destination != address(0), "Invalid destination");
  intentId = nextIntentId++;
  intents[intentId] = Intent({
    id: intentId,
    initiator: msg.sender,
    policyId: policyId,
    amount: amount,
    destination: destination,
    approver: address(0),
    status: IntentStatus.Pending,
    txHash: bytes32(0),
    createdAt: block.timestamp
  });
  emit IntentCreated(intentId, policyId, amount, destination, msg.sender);
}

// approveIntent — msg.sender is the approver; enforces maker-checker
function approveIntent(uint256 intentId) external {
  Intent storage intent = intents[intentId];
  require(intent.id != 0, "Not found");
  require(intent.status == IntentStatus.Pending, "Not pending");
  require(msg.sender != intent.initiator, "Cannot self-approve");
  require(!approvals[intentId][msg.sender], "Already approved");
  approvals[intentId][msg.sender] = true;
  intent.approver = msg.sender;
  intent.status = IntentStatus.Approved;
  emit IntentApproved(intentId, msg.sender);
}

// executeIntent — no txHash parameter; only initiator may call; reads txHash from receipt
function executeIntent(uint256 intentId) external {
  Intent storage intent = intents[intentId];
  require(intent.id != 0, "Not found");
  require(intent.status == IntentStatus.Approved, "Not approved");
  require(msg.sender == intent.initiator, "Only initiator can execute");
  intent.status = IntentStatus.Executed;
  // Trigger actual fund transfer through vault (vault enforces onlyIntentRegistry)
  ITreasuryVault(vault).executeApprovedIntent(
    intent.initiator, intent.destination, intent.amount, intent.policyId
  );
  // Record ledger entry (best-effort — IntentRegistry is authorized by LedgerContract).
  // Pass bytes32(intentId) as the reference — non-zero and unique.
  // The audit UI attaches the real txHash from receipt.transactionHash, not this field.
  try ILedgerContract(ledger).recordEntry(
    intent.initiator, intent.destination, intent.amount, "mUSDC",
    bytes32(uint256(intentId)), block.number
  ) {} catch {}
  emit IntentExecuted(intentId, msg.sender);
  emit LedgerEntryPosted(intentId, block.number);
}

// cancelIntent — initiator can cancel their own pending intent only
function cancelIntent(uint256 intentId, string calldata reason) external {
  Intent storage intent = intents[intentId];
  require(intent.id != 0, "Not found");
  require(intent.status == IntentStatus.Pending, "Not pending");
  require(msg.sender == intent.initiator, "Only initiator can cancel");
  intent.status = IntentStatus.Rejected;
  emit IntentRejected(intentId, msg.sender, reason);
}
```

Events updated to include `initiator` and `approver`:
```solidity
event IntentCreated(uint256 indexed intentId, uint256 indexed policyId, uint256 amount, address indexed destination, address initiator);
event IntentApproved(uint256 indexed intentId, address indexed approver);
event IntentExecuted(uint256 indexed intentId, address indexed executor);
event IntentRejected(uint256 indexed intentId, address indexed cancelledBy, string reason);
event LedgerEntryPosted(uint256 indexed intentId, uint256 blockNumber);
```

---

### `TreasuryVault.sol` — targeted rewrite
**File:** `contracts/src/TreasuryVault.sol`

Constructor: `constructor(address _token, address _policyEngine)`

Add `address public intentRegistry` with a one-time setter (called by owner after IntentRegistry is deployed):
```solidity
function setIntentRegistry(address _intentRegistry) external onlyOwner {
  require(intentRegistry == address(0), "Already set");
  intentRegistry = _intentRegistry;
}
modifier onlyIntentRegistry() {
  require(msg.sender == intentRegistry, "Only IntentRegistry");
  _;
}
```

Remove the old public `executePolicy(string, ...)`. Replace with:
```solidity
// Called exclusively by IntentRegistry — cannot be reached by any other caller
function executeApprovedIntent(
  address initiator,
  address destination,
  uint256 amount,
  uint256 policyId
) external onlyIntentRegistry {
  require(
    IPolicyEngine(policyEngine).validateIntent(policyId, initiator, destination, amount),
    "Policy rejected"
  );
  bool ok1 = IERC20Minimal(token).transferFrom(initiator, address(this), amount);
  require(ok1, "Pull failed");
  bool ok2 = IERC20Minimal(token).transfer(destination, amount);
  require(ok2, "Push failed");
  emit PolicyExecuted(policyId, initiator, destination, amount, block.timestamp);
}
```

Keep `withdraw()` (with `deposited` balance tracking) for the faucet/refund flow. Keep `balance()` view. Remove `deposited` tracking from `executeApprovedIntent` (this is a transfer, not a deposit).

Update `PolicyExecuted` event signature: `policyId` becomes `uint256` (was `string`).

---

### `LedgerContract.sol` — add authorized callers
**File:** `contracts/src/LedgerContract.sol`

```solidity
mapping(address => bool) public authorized;

function setAuthorized(address caller, bool enabled) external onlyOwner {
  authorized[caller] = enabled;
}

modifier onlyRecorder() {
  require(msg.sender == owner() || authorized[msg.sender], "Not authorized");
  _;
}
// Replace onlyOwner with onlyRecorder on recordEntry()
```

No other changes.

---

### `Deploy.s.sol` — wire contracts and pre-deploy demo policies
**File:** `contracts/script/Deploy.s.sol`

Deployment order resolves the circular dependency between IntentRegistry and TreasuryVault:

```
1. Deploy MockUSDC
2. Deploy PolicyEngine
3. Deploy LedgerContract
4. Deploy TreasuryVault(mockUSDC, policyEngine)  — no intentRegistry yet
5. Deploy IntentRegistry(policyEngine, vault, ledger)
6. vault.setIntentRegistry(address(intentRegistry))   — wire vault → registry
7. ledger.setAuthorized(address(intentRegistry), true) — registry can record ledger
8. Create 3 demo policies (deployer is owner):
   - policyId=1  "Vendor Payment"  source=0x0 dest=0x0 maxAmount=10_000e6   type="payment"
   - policyId=2  "Treasury Sweep"  source=0x0 dest=0x0 maxAmount=100_000e6  type="sweep"
   - policyId=3  "Yield Deposit"   source=0x0 dest=0x0 maxAmount=500_000e6  type="deposit_routing"
9. console.log all 5 addresses
```

After redeployment: manually update hardcoded addresses in `app/src/web3/testnet.ts`.

---

## Frontend Changes

### `app/src/web3/useTestnetExecution.ts`

Replace the current 6-step execution sequence with the correct 4-step sequence:

```
Step 1 — IntentRegistry.createIntent(policyId, amount, destination)
  User signs. PolicyEngine validates at this point — if policy rejects, no token approval wasted.
  Frontend reads onchainIntentId from the emitted IntentCreated log.

Step 2 — USDC.approve(vault, amount)
  User signs. Grants vault permission to pull tokens when executeApprovedIntent is called.
  Done AFTER policy validation to avoid wasted approval transactions.

Step 3 — POST /api/demo-approve { intentId: onchainIntentId }
  No user signature. Server approves using demo approver key.
  Frontend receives { approvalTxHash, approverAddress }.

Step 4 — IntentRegistry.executeIntent(intentId)
  User signs. Triggers vault transfer internally. Returns receipt.
  Frontend reads txHash = receipt.transactionHash.
```

Key removals:
- Remove `const destination = "0x000...dEaD"`. Use `intent.destination as 0x${string}`.
- Remove direct vault.executePolicy call from the frontend.
- Remove the IntentRegistry.approveIntent call from the frontend (now server-side only).
- Remove the LedgerContract.recordEntry call from the frontend (now called by IntentRegistry internally).
- Remove txHash as a parameter anywhere — always read from receipt.

Update ABIs in `testnet.ts`:
- `IntentRegistry.approveIntent`: `[{ name: 'intentId', type: 'uint256' }]` (no address param)
- `IntentRegistry.executeIntent`: `[{ name: 'intentId', type: 'uint256' }]` (no txHash param)
- `TreasuryVault`: remove `executePolicy` ABI entry; no vault calls in frontend
- `PolicyExecuted` event: `policyId` is now `uint256` (was `string`)
- Add `IntentExecuted` and `LedgerEntryPosted` event ABIs to IntentRegistry

Also update `useYieldExecution.ts`: the `executeDeployPolicy` function calls `PolicyEngine.createPolicy` directly (owner-only on testnet). In P0 this should be either removed or disabled with a "Coming soon" response since createPolicy stays owner-only.

---

## Serverless Demo Approver

**New file: `app/api/demo-approve.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicClient, createWalletClient, http, privateKeyToAccount } from 'viem'
import { baseSepolia } from 'viem/chains'
import { INTENT_REGISTRY_ADDRESS, INTENT_REGISTRY_ABI } from '../src/web3/testnet'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { intentId } = req.body as { intentId: number }
  if (typeof intentId !== 'number') return res.status(400).json({ error: 'intentId required' })

  const key = process.env.DEMO_APPROVER_KEY
  if (!key) return res.status(503).json({ error: 'Demo approver not configured' })

  const account = privateKeyToAccount(`0x${key}` as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.ALCHEMY_RPC_URL),
  })

  const hash = await client.writeContract({
    address: INTENT_REGISTRY_ADDRESS,
    abi: INTENT_REGISTRY_ABI,
    functionName: 'approveIntent',
    args: [BigInt(intentId)],
  })

  // Wait for confirmation before returning so the frontend can immediately execute
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(process.env.ALCHEMY_RPC_URL) })
  await publicClient.waitForTransactionReceipt({ hash })

  res.json({ approvalTxHash: hash, approverAddress: account.address })
}
```

**Env vars (server-side only, no VITE_ prefix):**
- `DEMO_APPROVER_KEY` — hex private key of a fresh Base Sepolia-only wallet, never funded on mainnet
- `ALCHEMY_RPC_URL` — full RPC URL (reuse existing key, just build the URL server-side)

**Security notes:**
- `DEMO_APPROVER_KEY` is not bundled into the frontend (no `VITE_` prefix)
- The approver wallet controls testnet-only tokens with no mainnet value
- No rate-limiting needed for demo (one approval per demo session is the expected pattern)
- README must state: "Never fund the demo approver address on mainnet. Production replaces this with Safe/WalletConnect/CDP Embedded Wallets."

---

## Audit Evidence Flow

**What the Audit page shows after the golden path:**

Source data: `IntentExecuted` events from `IntentRegistry` + `PolicyExecuted` events from `TreasuryVault` + `LedgerEntryRecorded` events from `LedgerContract`.

All three events are emitted in the same `executeIntent` transaction — same block.number, same txHash. The real txHash comes from the viem `TransactionReceipt` (stored in Zustand by `recordTestnetExecution`), NOT from any field inside the contract events. The `LedgerEntryRecorded.txHash` field contains `bytes32(intentId)` as a reference, not the transaction hash — the audit UI must never display this field as a tx hash.

Merge by block number + intentId. The receipt hash is the single canonical txHash for all three events.

Per-execution row displays:
- Intent ID, Policy ID, Policy name (resolved from PolicyEngine read)
- Initiator wallet (truncated), Approver wallet (truncated)
- Amount (e.g. `5,000 USDC`), Destination (truncated)
- Transaction hash → Basescan link
- Block number + timestamp

**"What am I verifying?" expandable section:**
```
This transaction hash proves that:
1. Policy #1 ("Vendor Payment") was active and permitted this transfer.
   Policy enforced: source wildcard, destination wildcard, max 10,000 USDC.
2. The payment request was created by 0xInitiator... and approved by 0xApprover...
   These are two different addresses — maker-checker was enforced at the contract layer.
3. 5,000 USDC moved from 0xInitiator... to 0xDestination... on Base Sepolia.
   View on Basescan: [link]
4. A ledger entry was recorded onchain: LedgerEntryRecorded event in LedgerContract.
   [LedgerContract Basescan link]
```

**Hook: `useIntentExecutionLogs()` (new or updated in `usePolicyExecutionLogs.ts`)**
- Fetches `getLogs` for `IntentExecuted` from IntentRegistry
- Fetches `getLogs` for `PolicyExecuted` from TreasuryVault
- Merges by block number, deduplicates
- Polls every 15 seconds
- In testnet mode, replaces mock bundles entirely

---

## Tests

### `IntentRegistry.t.sol` — new tests to add
- `test_createIntent_validatesPolicy` — invalid policyId reverts with "Policy rejected"
- `test_createIntent_inactivePolicyReverts` — setPolicyActive(false) then createIntent reverts
- `test_approveIntent_usesMsgSender` — approver stored is msg.sender
- `test_approveIntent_makerCheckerEnforced` — initiator calling approveIntent reverts "Cannot self-approve"
- `test_approveIntent_differentWallet_succeeds` — different address can approve
- `test_executeIntent_triggersVaultTransfer` — recipient balance increases after execution
- `test_executeIntent_emitsIntentExecuted` — event emitted
- `test_cancelIntent_onlyInitiator` — non-initiator cannot cancel; initiator can cancel pending intent
- `test_executeIntent_requiresApprovedStatus` — executing a Pending intent reverts

### `TreasuryVault.t.sol` — new tests to add
- `test_executeApprovedIntent_onlyIntentRegistry` — direct call from non-registry address reverts
- `test_executeApprovedIntent_validatesPolicy` — invalid policyId reverts
- `test_executeApprovedIntent_transfersToDestination` — destination receives tokens, vault ends at zero
- `test_executeApprovedIntent_revertsWhenPolicyInactive` — inactive policy reverts
- `test_executeApprovedIntent_revertsWhenAmountExceedsMax` — amount > maxAmount reverts

### `GoldenPath.t.sol` — new integration test
Complete end-to-end:
1. Deploy all contracts wired together
2. Owner creates "Vendor Payment" policy (source=0, dest=0, maxAmount=10_000e6)
3. Mint 5,000 mUSDC to initiator; initiator approves vault
4. Initiator calls `createIntent(1, 5_000e6, recipient)`
5. Approver (different address) calls `approveIntent(intentId)` — succeeds
6. Initiator attempts `approveIntent` on their own intent — reverts "Cannot self-approve"
7. Initiator calls `executeIntent(intentId)`
8. Assert: recipient balance = 5,000 mUSDC
9. Assert: vault balance = 0
10. Assert: `IntentExecuted` event emitted
11. Assert: `PolicyExecuted` event emitted
12. Assert: `LedgerEntryPosted` event emitted
13. Assert: direct call to `vault.executeApprovedIntent(...)` from non-registry reverts

---

## Deferred / Coming Soon

| Item | Treatment |
|------|-----------|
| CDP Embedded Wallets | Honest UI: "Coming soon: pending CDP Embedded Wallet enablement" |
| Login / auth | Honest UI: replace Sign In with "Enter Demo →" or tooltip explaining role-switcher |
| Production WalletConnect | Keep in connector list; show "Connect MetaMask or Coinbase Wallet on Base Sepolia" as primary path if connection fails |
| PolicyEngine permissionless createPolicy (AI Policy Builder testnet) | Deferred to P1 — requires either opening createPolicy or a server-side signing service |
| Yield strategy deployment (Morpho, Aave) | Yield "Configure Deployment Policy" buttons: disabled + tooltip in mock mode, existing testnet flow may stay but calls PolicyEngine.createPolicy which is owner-only — show error honestly |
| Coinbase/Ramp/Circle integrations | Phase 2 |
| ERP sync | Phase 2 |
| Intent rejection by approver | Deferred — only initiator can cancel (cancelIntent) for P0 |

---

## Exact Files to Change

| Priority | File | Change |
|----------|------|--------|
| P0 | `contracts/src/PolicyEngine.sol` | Add `maxAmount` to struct + createPolicy sig; wildcard support in validateIntent; keep onlyOwner |
| P0 | `contracts/src/IntentRegistry.sol` | Full rewrite: initiator field, no-param approveIntent, no-param executeIntent, cancelIntent, vault call |
| P0 | `contracts/src/TreasuryVault.sol` | Remove public executePolicy; add executeApprovedIntent (onlyIntentRegistry); add setIntentRegistry |
| P0 | `contracts/src/LedgerContract.sol` | Add authorized mapping + setAuthorized; onlyRecorder modifier |
| P0 | `contracts/script/Deploy.s.sol` | Wire 5 contracts, setIntentRegistry, setAuthorized, create 3 demo policies |
| P0 | `app/src/web3/testnet.ts` | Updated ABIs (IntentRegistry, TreasuryVault), new addresses after redeployment |
| P0 | `app/src/web3/useTestnetExecution.ts` | 4-step flow, fix 0xdEaD destination, remove direct vault call, remove txHash param |
| P0 | `app/api/demo-approve.ts` (new) | Server-side signing of approveIntent |
| P1 | `app/src/pages/Audit.tsx` | useIntentExecutionLogs, hide mock bundles in testnet mode, "What am I verifying?" |
| P1 | `app/src/web3/usePolicyExecutionLogs.ts` | Add useIntentExecutionLogs hook; merge IntentExecuted + PolicyExecuted + LedgerEntryRecorded |
| P1 | `app/src/components/shared/AIPolicyBuilder.tsx` | Prompt-sensitive templates; disable testnet deploy (PolicyEngine is owner-only) |
| P1 | `app/src/pages/Settings.tsx` | Hide Force Mock AI unless `import.meta.env.DEV` |
| P2 | `app/src/pages/Yield.tsx` | Disable Configure Deployment Policy in mock mode; honest message in testnet (owner-only) |
| P2 | `app/src/pages/Entities.tsx` | CDP copy: "Coming soon: pending CDP Embedded Wallet enablement" |
| P2 | `app/src/pages/Landing.tsx` | Replace Sign In with Enter Demo or tooltip |
| P2 | Throughout | UX copy: "Payment Request" for intent, "Activate Policy", USDC amounts, reconciliation tooltips |
| P2 | `contracts/test/IntentRegistry.t.sol` | New access control + maker-checker tests |
| P2 | `contracts/test/TreasuryVault.t.sol` | New onlyIntentRegistry + policy validation tests |
| P2 | `contracts/test/GoldenPath.t.sol` | New full integration test |
| P3 | `README.md` | Real vs simulated table |
| P3 | `DEMO.md` (new) | 5-minute golden path guide |

---

---

## Verification

**Contracts (`cd contracts && forge test -v`):**
- All existing tests pass (no regressions)
- New tests pass: maker-checker enforced, self-approve reverts, onlyIntentRegistry enforced, policy validation reverts, destination receives tokens, GoldenPath end-to-end

**Frontend (`cd app && npm run typecheck`):**
- Zero TypeScript errors
- `npm test` — all unit tests pass

**Manual golden path check (testnet demo, VITE_APP_MODE=testnet):**
1. Connect MetaMask on Base Sepolia
2. Mint test USDC
3. Create payment request (5,000 USDC to demo recipient) — confirm in wallet
4. UI shows "Approving as Treasury Admin demo signer..." automatically
5. Execute — confirm in wallet
6. Audit page shows: intentId, policyId #1 ("Vendor Payment"), initiator ≠ approver addresses, 5,000 USDC, destination, txHash, Basescan link, "What am I verifying?" explainer
7. Settings page: no "Force mock AI" toggle visible
8. Yield page: "Configure Deployment Policy" disabled with tooltip in mock mode
9. Entities: "Provision CDP Wallet" shows "Coming soon: pending CDP Embedded Wallet enablement"
