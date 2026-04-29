# TreasuryFlow Architecture & Shared Interfaces

**Status:** Stable for P0  
**Last Updated:** 2026-04-29  
**Owner:** Orchestrator / All agents (read-only)

---

## Executive Summary

TreasuryFlow enforces trust through **deterministic onchain execution**. The core path is:

```
User wallet (initiator)
  ↓ createIntent(policyId, amount, destination)
    └─ PolicyEngine.validateIntent() ← policy validation happens FIRST
    └─ If policy invalid, reverts BEFORE user grants token approval
  ↓ USDC.approve(vault, amount) ← only after policy OK
  ↓ POST /api/demo-approve { intentId } ← server-side approver signature (P0 only)
  ↓ executeIntent(intentId) ← only initiator can call
    └─ IntentRegistry → TreasuryVault.executeApprovedIntent()
    └─ Transfer: initiator → vault → destination
    └─ Emit: IntentExecuted, PolicyExecuted, LedgerEntryRecorded
  ↓ Frontend reads receipt.transactionHash
  ↓ Audit page displays: initiator, approver, policy, amount, destination, txHash (Basescan link)
```

**Key invariant:** Policy is validated BEFORE user pays gas or signs approvals.

---

## Shared Data Structures

These types are the contract between agents. **Do not modify without consensus.**

### Intent (Solidity)

```solidity
struct Intent {
  uint256 id;                    // auto-incrementing ID
  address initiator;             // msg.sender who created intent
  uint256 policyId;              // reference to Policy
  uint256 amount;                // amount in smallest token unit (e.g., 6 decimals for USDC)
  address destination;           // recipient address
  address approver;              // address who approved (set in approveIntent)
  IntentStatus status;           // Pending, Approved, Executed, Rejected
  bytes32 txHash;                // set to bytes32(0) at creation; NOT used in execution
  uint256 createdAt;             // block.timestamp
}

enum IntentStatus {
  Pending,     // 0
  Approved,    // 1
  Executed,    // 2
  Rejected     // 3
}
```

**Frontend representation (TypeScript):**

```typescript
interface Intent {
  id: bigint;
  initiator: `0x${string}`;
  policyId: bigint;
  amount: bigint;
  destination: `0x${string}`;
  approver: `0x${string}` | null;
  status: 'Pending' | 'Approved' | 'Executed' | 'Rejected';
  createdAt: bigint;
}
```

**Critical notes:**
- `initiator` is immutable; set at creation by msg.sender
- `approver` is immutable after approval; set when approver calls approveIntent
- `status` transitions are one-way: Pending → Approved → Executed (no backwards transitions)
- `status` can also transition Pending → Rejected (only initiator can initiate this)
- `txHash` field is deprecated; do NOT use it in frontend or event streams

---

### Policy (Solidity)

```solidity
struct Policy {
  uint256 id;                    // auto-incrementing ID
  string name;                   // human-readable (e.g., "Vendor Payment")
  string policyType;             // category (e.g., "payment", "sweep", "deposit_routing")
  address source;                // initiator whitelist; address(0) = any source
  address destination;           // recipient whitelist; address(0) = any destination
  uint256 maxAmount;             // max amount per transaction; 0 = uncapped
  bool active;                   // toggle for enable/disable
  string conditions;             // placeholder for complex conditions (unused in P0)
}
```

**Frontend representation (TypeScript):**

```typescript
interface Policy {
  id: bigint;
  name: string;
  policyType: 'payment' | 'sweep' | 'deposit_routing' | string;
  source: `0x${string}` | null; // null = wildcard
  destination: `0x${string}` | null; // null = wildcard
  maxAmount: bigint;
  active: boolean;
  conditions: string;
}
```

**Wildcard rules:**
- `source == address(0)` means any initiator can create intents under this policy
- `destination == address(0)` means any recipient address is allowed
- If both are wildcards (common in P0), policy permits any valid amount up to maxAmount

---

### Contract Events

**All events in a single transaction have the same block.number and receipt.transactionHash.**

#### IntentRegistry

```solidity
event IntentCreated(
  uint256 indexed intentId,
  uint256 indexed policyId,
  uint256 amount,
  address indexed destination,
  address initiator
);

event IntentApproved(
  uint256 indexed intentId,
  address indexed approver
);

event IntentExecuted(
  uint256 indexed intentId,
  address indexed executor  // == initiator
);

event IntentRejected(
  uint256 indexed intentId,
  address indexed cancelledBy,  // == initiator
  string reason
);
```

#### TreasuryVault

```solidity
event PolicyExecuted(
  uint256 indexed policyId,
  address indexed initiator,
  address destination,
  uint256 amount,
  uint256 timestamp
);
```

#### LedgerContract

```solidity
event LedgerEntryRecorded(
  uint256 indexed entryId,
  address from,
  address to,
  uint256 amount,
  string tokenSymbol,
  bytes32 intentRef,           // bytes32(uint256(intentId)) — NOT txHash
  uint256 blockNumber
);
```

---

## Frontend Data Flow

### State Management (Zustand)

**Slices (do NOT modify during P0):**

```typescript
// src/store/slice-intents.ts
interface IntentsSlice {
  intents: Record<bigint, Intent>;
  addIntent(intent: Intent): void;
  updateIntentStatus(id: bigint, status: IntentStatus): void;
  approveIntent(id: bigint, approver: string): void;
}

// src/store/slice-policies.ts
interface PoliciesSlice {
  policies: Record<bigint, Policy>;
  setPolicies(policies: Policy[]): void;
  getPolicyById(id: bigint): Policy | undefined;
}

// src/store/slice-ledger.ts
interface LedgerSlice {
  entries: LedgerEntry[];
  addEntry(entry: LedgerEntry): void;
  resetToSeed(): void;
}
```

**Critical constraint:** Ledger slice is read-only in P0. No frontend logic writes to it; only contract events populate it via `useIntentExecutionLogs`.

### API Endpoints

#### POST /api/demo-approve

**Request:**
```typescript
{
  intentId: number
}
```

**Response (200):**
```typescript
{
  approvalTxHash: string,         // viem receipt hash
  approverAddress: `0x${string}`  // msg.sender of approveIntent call
}
```

**Error responses:**
- 400: Missing intentId
- 403: Approver not configured (security gate)
- 503: DEMO_APPROVER_KEY or RPC URL missing

**Server-side validation (implicit):**
- Only called after IntentRegistry.createIntent succeeds
- Must be called before IntentRegistry.executeIntent
- No rate limiting for P0 (one approval per demo session expected)

### Contract Interaction Hooks

**useTestnetExecution.ts — The golden path orchestrator**

```typescript
interface UseTestnetExecutionResult {
  createIntent: (policyId: bigint, amount: bigint, destination: string) => Promise<{
    intentId: bigint;
    createTxHash: string;
    approveTxHash: string;
  }>;
  approveIntent: (intentId: bigint) => Promise<{
    approvalTxHash: string;
    approverAddress: string;
  }>;
  executeIntent: (intentId: bigint) => Promise<{
    executeTxHash: string;
    receipt: TransactionReceipt;
  }>;
}
```

**Contract ABIs (in testnet.ts):**

```typescript
// IntentRegistry ABI (key functions)
const INTENT_REGISTRY_ABI = [
  {
    name: 'createIntent',
    type: 'function',
    inputs: [
      { name: 'policyId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'destination', type: 'address' }
    ],
    outputs: [{ name: 'intentId', type: 'uint256' }]
  },
  {
    name: 'approveIntent',
    type: 'function',
    inputs: [{ name: 'intentId', type: 'uint256' }]  // NO address param
  },
  {
    name: 'executeIntent',
    type: 'function',
    inputs: [{ name: 'intentId', type: 'uint256' }]  // NO txHash param
  },
  {
    name: 'IntentCreated',
    type: 'event',
    inputs: [
      { name: 'intentId', type: 'uint256', indexed: true },
      { name: 'policyId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'destination', type: 'address', indexed: true },
      { name: 'initiator', type: 'address' }
    ]
  },
  // ... IntentApproved, IntentExecuted, IntentRejected
];

// PolicyEngine ABI (key function)
const POLICY_ENGINE_ABI = [
  {
    name: 'validateIntent',
    type: 'function',
    inputs: [
      { name: 'policyId', type: 'uint256' },
      { name: 'source', type: 'address' },
      { name: 'destination', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getPolicyById',
    type: 'function',
    inputs: [{ name: 'policyId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'id', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'policyType', type: 'string' },
      { name: 'source', type: 'address' },
      { name: 'destination', type: 'address' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'conditions', type: 'string' }
    ]}]
  }
];

// USDC (ERC20) ABI
const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ]
  },
  // ... standard ERC20 functions
];
```

---

## Deployment & Addresses

### Contract Deployment Order

1. **MockUSDC** — test token
2. **PolicyEngine** — validates intents
3. **LedgerContract** — records audit trail
4. **TreasuryVault(mockUSDC, policyEngine)** — executes transfers
5. **IntentRegistry(policyEngine, vault, ledger)** — routes lifecycle

### Post-Deployment Setup

```solidity
// Called by deployer (owner)
vault.setIntentRegistry(address(intentRegistry));
ledger.setAuthorized(address(intentRegistry), true);

// Create 3 demo policies
policyEngine.createPolicy(
  "Vendor Payment",
  "payment",
  address(0),     // wildcard source
  address(0),     // wildcard destination
  10_000e6,       // 10,000 USDC max
  ""              // no special conditions
);

policyEngine.createPolicy(
  "Treasury Sweep",
  "sweep",
  address(0),
  address(0),
  100_000e6,      // 100,000 USDC max
  ""
);

policyEngine.createPolicy(
  "Yield Deposit",
  "deposit_routing",
  address(0),
  address(0),
  500_000e6,      // 500,000 USDC max
  ""
);
```

### Address Storage (Frontend)

**File:** `app/src/web3/testnet.ts`

```typescript
export const CONTRACTS = {
  USDC: '0x...',
  POLICY_ENGINE: '0x...',
  INTENT_REGISTRY: '0x...',
  TREASURY_VAULT: '0x...',
  LEDGER_CONTRACT: '0x...',
};

// Updated IMMEDIATELY after Deploy.s.sol runs
// Frontend reads from this single source of truth
```

---

## Audit Trail Data Model

### Audit Entry (Derived from Events)

The Audit page displays merged data from three contract events:

```typescript
interface AuditEntry {
  intentId: bigint;
  policyId: bigint;
  policyName: string;              // resolved via PolicyEngine.getPolicyById
  initiator: `0x${string}`;        // from IntentCreated event
  approver: `0x${string}`;         // from IntentApproved event
  amount: bigint;
  destination: `0x${string}`;
  transactionHash: string;          // receipt.transactionHash (NOT contract field)
  blockNumber: bigint;
  timestamp: bigint;                // block timestamp
  status: 'Executed' | 'Pending' | 'Rejected';
}
```

### Event Merging Logic (useIntentExecutionLogs)

```typescript
interface ExecutionLog {
  intentId: bigint;
  block: bigint;
  events: {
    intentCreated?: { policyId, destination, initiator };
    intentApproved?: { approver };
    intentExecuted?: { executor };
    policyExecuted?: { amount };
    ledgerRecorded?: { blockNumber };
  };
  txHash?: string; // populated from receipt, not events
}
```

**Merging strategy:**
1. Fetch all `IntentCreated` events from IntentRegistry
2. For each intentId, fetch `IntentApproved`, `IntentExecuted`, `PolicyExecuted`, `LedgerEntryRecorded`
3. Deduplicate by intentId + block number (same tx = same entry)
4. Resolve policyId → policy name via PolicyEngine
5. Attach receipt.transactionHash (from viem, NOT from LedgerEntryRecorded.intentRef)
6. Display in reverse chronological order

**Critical note:** Never display `LedgerEntryRecorded.intentRef` as a transaction hash. Always use `receipt.transactionHash`.

---

## File Ownership & Boundaries

**Frozen during P0 (read-only for all agents except owner):**

| Path | Owner | Reason |
|------|-------|--------|
| `app/src/types/domain.ts` | Frontend | Intent, Policy, LedgerEntry type definitions |
| `app/src/store/` | Frontend | Zustand slices (intents, policies, ledger, etc.) |
| `app/src/seed/` | Frontend | Demo data (unchanged during P0) |
| `contracts/src/interfaces/` | Contracts | Interface definitions |

**Open for modification (P0a: Contracts agent):**

| Path | Owner | Notes |
|------|-------|-------|
| `contracts/src/*.sol` (all contracts) | Contracts | See IMPLEMENTATION_PLAN for details |
| `contracts/script/Deploy.s.sol` | Contracts | Wire all contracts, deploy demo policies |
| `contracts/test/*.t.sol` | Contracts | Add new tests (no removal of existing) |
| `contracts/addresses.json` | Contracts | New file: output from Deploy.s.sol |

**Open for modification (P0b: Frontend agent, after contracts merge):**

| Path | Owner | Notes |
|------|-------|-------|
| `app/src/web3/testnet.ts` | Frontend | Update addresses from contracts/addresses.json |
| `app/src/web3/useTestnetExecution.ts` | Frontend | Rewrite 4-step flow |
| `app/api/demo-approve.ts` | Frontend | New endpoint: server-side approver signing |
| `app/src/pages/Audit.tsx` | Frontend | Display merged events |
| `app/src/web3/usePolicyExecutionLogs.ts` | Frontend | New hook: merge 3 event streams |
| `app/src/components/shared/AIPolicyBuilder.tsx` | Frontend | Disable testnet policy creation |
| `app/src/pages/Settings.tsx` | Frontend | Hide "Force Mock AI" unless DEV |
| `app/src/pages/Yield.tsx` | Frontend | Disable "Configure Deployment Policy" |

---

## Common Pitfalls & Invariants

### ❌ Don't Do This

1. **Hardcode contract addresses in frontend** — Read from `testnet.ts` only
2. **Pass txHash to contract functions** — Never; read from receipt instead
3. **Call TreasuryVault.executePolicy directly** — Only IntentRegistry can call it
4. **Allow initiator to self-approve** — Contract rejects; UI must prevent it too
5. **Use LedgerEntryRecorded.intentRef as txHash** — Use receipt.transactionHash
6. **Validate policy in frontend only** — Contract MUST validate at createIntent
7. **Emit txHash in contract events** — Let receipt provide the truth

### ✅ Do This Instead

1. **Read contract addresses from `testnet.ts`** — Single source of truth
2. **Capture txHash from receipt** — `receipt.transactionHash` in viem
3. **Route all execution through IntentRegistry** — Contracts enforce the flow
4. **Enforce maker-checker at both layers** — Contract prevents; UI prevents too
5. **Use receipt hash for audit display** — Basescan link always accurate
6. **Validate policy onchain before asking for approval** — Prevents wasted gas
7. **Read events, not contract state fields** — Immutable and verifiable

---

## Integration Points (High Conflict Risk)

### 1. Contract Address Updates

**When:** After contracts merge (P0a)  
**Who:** Frontend agent must read from contracts/addresses.json  
**Risk:** Frontend hardcoding old addresses  
**Mitigation:** All addresses in `testnet.ts` as constants; use grep to verify no other hardcoded values

### 2. ABI Changes

**When:** If contract function signatures change  
**Who:** Both agents must agree on new ABI before merging  
**Risk:** Type mismatch between frontend and contract calls  
**Mitigation:** ABIs documented in ARCHITECTURE_NOTES; no changes mid-sprint without consensus

### 3. Event Shape Changes

**When:** If new fields added to contract events  
**Who:** Frontend must update event parsing in useIntentExecutionLogs  
**Risk:** Missing or malformed event data in Audit page  
**Mitigation:** Event shapes frozen in ARCHITECTURE_NOTES; any change requires full agreement

### 4. Intent Status Enum

**When:** If new statuses added or removed  
**Who:** Solidity + TypeScript both affected  
**Risk:** Enum mismatch (e.g., frontend shows "Cancelled" but contract has no such state)  
**Mitigation:** `IntentStatus` frozen during P0; no changes without explicit approval

---

## Testing Strategy

### Unit Tests (Solidity)

**Run:** `cd contracts && forge test -v`  
**Coverage goal:** 95%+ on new code  
**Critical paths:**
- Policy validation at createIntent
- Maker-checker enforcement in approveIntent
- onlyIntentRegistry guard on executeApprovedIntent
- Event emission and field values

### Unit Tests (TypeScript)

**Run:** `cd app && npm test`  
**Coverage goal:** 80%+ on new hooks and API endpoints  
**Critical paths:**
- useTestnetExecution: 4-step flow
- demo-approve: signature and response
- useIntentExecutionLogs: event merging and deduplication

### Integration Tests (Solidity)

**File:** `contracts/test/GoldenPath.t.sol`  
**Scope:** End-to-end intent lifecycle with all 5 contracts wired

### Manual Tests (Testnet)

**Environment:** Base Sepolia  
**Scope:** Complete golden path from UI  
**Validation:** Audit page shows correct fields, Basescan link works

---

## Monitoring & Debugging

### Contract Debugging

**Check intent status:**
```solidity
IntentRegistry(addr).getIntent(intentId)
  → returns: initiator, approver, status, amount, destination
```

**Check policy validation:**
```solidity
PolicyEngine(addr).validateIntent(policyId, source, dest, amount)
  → returns: bool (false if invalid)
```

**Check vault balance:**
```solidity
USDC(addr).balanceOf(vault)
  → returns: uint256
```

### Frontend Debugging

**Check intent in Zustand:**
```typescript
useIntentsStore().intents[intentId]
  → logs current state
```

**Check event merging:**
```typescript
// In browser console
fetch('/api/demo-logs?intentId=1')
  → returns merged AuditEntry
```

**Check receipt:**
```typescript
// In useTestnetExecution callback
console.log(receipt.transactionHash, receipt.blockNumber, receipt.logs)
```

---

## Links

- [WORKSTREAMS.md](WORKSTREAMS.md) — Branch strategy
- [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md) — Acceptance checklists
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Technical spec
- [eng.md](eng.md) — Architecture overview
