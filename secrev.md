# TreasuryFlow Security Review

**Date:** 2026-04-28 | **Mode:** Daily (8/10 confidence gate) | **Branch:** main

---

## Architecture Summary

React 18 + TypeScript + Vite frontend-only SPA. Dual-mode: `mock` (Zustand, no Web3) / `testnet` (wagmi + viem, Base Sepolia). No backend, no database, no auth/RBAC. AI via Perplexity Agent API with server-side key injection. Four Solidity contracts on Base Sepolia testnet.

---

## Attack Surface

| Surface | Count | Notes |
|---------|-------|-------|
| Public endpoints | 0 | No backend |
| API endpoints | 1 | Vite dev proxy `/api/agent-proxy` — dev only |
| External integrations | 3 | Perplexity AI, WalletConnect, Alchemy RPC |
| CI/CD workflows | 0 | No `.github` directory |
| Smart contracts | 4 | MockUSDC, TreasuryVault, PolicyEngine, LedgerContract |
| Secret management | — | `.env` files, gitignored |

---

## Findings

### Finding 1 — HIGH (9/10) · RESOLVED

**TreasuryVault: Unrestricted drain via `withdraw()`**
[contracts/src/TreasuryVault.sol:59](contracts/src/TreasuryVault.sol#L59)

`withdraw(uint256 amount)` has no access control and no per-depositor balance tracking. Any address can call it and receive `amount` tokens from the vault — regardless of whether they ever deposited anything.

**Exploit:**
1. User deposits 50,000 mUSDC via `executePolicy()`
2. Attacker (any address) calls `vault.withdraw(50_000_000_000)`
3. Transfer succeeds. Vault is drained.

**Fix:**
```solidity
mapping(address => uint256) public deposited;

function executePolicy(...) external {
    // ...existing logic...
    deposited[msg.sender] += amount;
}

function withdraw(uint256 amount) external {
    require(amount > 0, "Invalid amount");
    require(deposited[msg.sender] >= amount, "Insufficient balance");
    deposited[msg.sender] -= amount;
    bool ok = IERC20Minimal(token).transfer(msg.sender, amount);
    require(ok, "Transfer failed");
    emit Withdraw(msg.sender, amount);
}
```

---

### Finding 2 — HIGH (10/10) · RESOLVED

**PolicyEngine: No access control on any state-mutating function**
[contracts/src/PolicyEngine.sol:42](contracts/src/PolicyEngine.sol#L42)

`createPolicy()`, `updatePolicy()`, and `setPolicyActive()` have zero access control. Any address can register policies, overwrite existing ones, or disable all operations. `validateIntent()` routes actual transaction approvals through these stored policies.

**Exploit:**
- Attacker calls `updatePolicy(targetId, ..., destination=attackerAddress)` — next `validateIntent` approves transfers to attacker
- Or: attacker calls `setPolicyActive(id, false)` on all policies — treasury freezes

**Fix:**
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyEngine is Ownable {
    function createPolicy(...) external onlyOwner returns (uint256) { ... }
    function updatePolicy(...) external onlyOwner { ... }
    function setPolicyActive(...) external onlyOwner { ... }
}
```

---

### Finding 3 — MEDIUM (8/10) · RESOLVED

**LedgerContract: Anyone can forge ledger entries**
[contracts/src/LedgerContract.sol:19](contracts/src/LedgerContract.sol#L19)

`recordEntry()` has no caller check. Any address can emit `LedgerEntryRecorded` with arbitrary parameters. The UI imports and binds this contract via [app/src/web3/contracts.ts](app/src/web3/contracts.ts).

**Exploit:** Attacker calls `recordEntry(victimAddr, attackerAddr, 1_000_000e6, ...)` — fake $1M outflow appears in audit reports.

**Fix:** Add `onlyOwner` or a `RECORDER_ROLE`. Only the treasury operator should be able to record entries.

---

### Finding 4 — MEDIUM (8/10) · RESOLVED

**Ed25519 signature malleability in WalletConnect relay auth**
`app/package-lock.json` — CVE GHSA-x3ff-w252-2g7j

`@stablelib/ed25519 <= 2.0.2` pulled in transitively via `@walletconnect/relay-auth`. Allows producing a second valid signature without the private key. Affects WalletConnect relay authentication.

**Fix:**
```bash
cd app && npm audit fix --force
# Review @web3modal/wagmi 5.x breaking changes
# Re-test wallet connection, executePolicy, and mint flows
```

---

## What's Clean

- No secrets in git history
- `.env` files properly gitignored across all packages
- No XSS vectors (React default escaping holds, no `dangerouslySetInnerHTML`)
- API key never bundled into client code (Vite proxy pattern is correct)
- LLM output validated through Zod, no `eval()` of AI responses
- User input goes into AI `input` field (user turn), not system prompts — not prompt injection
- Lockfile present and tracked
- No CI/CD workflows to exploit

---

## Recommended Additions

- ✅ Add `.gitleaks.toml` to auto-catch secret commits
- ✅ Set up GitHub Actions: `forge test` + `npm audit` + `npm run typecheck` on push

---

## Filter Stats

| Stage | Count |
|-------|-------|
| Candidates scanned | ~15 |
| Hard-exclusion filtered | 6 |
| Confidence gate filtered | 3 |
| Verification filtered | 2 |
| **Reported** | **4** |

---

*This is an AI-assisted scan. For a production treasury system handling real funds, engage a qualified smart contract auditor before mainnet deployment.*
