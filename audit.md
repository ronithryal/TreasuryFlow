# TreasuryFlow — Code Cleanup Audit Report

**Date:** 2026-05-02  
**Scope:** `app/src/`, `contracts/src/`, `contracts/test/`, `app/api/`, root scripts  
**Excluded:** `node_modules/`, `dist/`, `build/`, `.git/`, auto-generated files  
**Status:** Analysis only — no changes made

---

## Executive Summary

TreasuryFlow is well-structured with clear separation of concerns and good domain logic isolation. This audit identified **12 quality issues** spanning dead code, DRY violations, unused exports, and type safety gaps. The Solidity contracts are clean with no dead code detected.

**Estimated cleanup effort: ~90 minutes across 5 phases, removing ~50 lines.**

---

## Summary Table

| Priority | File | Issue | Effort |
|----------|------|-------|--------|
| MEDIUM | `app/src/web3/walletconnect.ts` | Entire file is unused re-exports — delete | 5m |
| HIGH | `app/src/lib/format.ts` | Add address shortening utils to consolidate 3 duplicates | 15m |
| HIGH | `app/src/pages/Yield.tsx` | Move `useYieldExecution` import to top of file | 5m |
| MEDIUM | `app/src/services/ai-features.ts` | 5 dead exported functions (lines 191–223) | 10m |
| LOW | `app/src/web3/mode.ts` | `IS_MOCK` exported but never imported | 2m |
| LOW | `app/src/pages/Audit.tsx` | `policyDecision: any` — replace with proper type | 10m |
| LOW | `app/src/components/shared/AIPolicyBuilder.tsx` | Untracked TODO without feature flag | 5m |
| INFO | `app/api/demo-approve.ts` | Hardcoded demo key needs README note | 30m |

---

## Issue Breakdown

### 1. Dead Code

#### 1.1 Unused Re-export File
- **File:** `app/src/web3/walletconnect.ts`
- **Issue:** Re-exports `useWeb3Modal` and `projectId`, but no file in the codebase imports from `walletconnect.ts`. Consumers import directly from `@web3modal/wagmi/react` and `./wagmi` respectively.
- **Action:** Delete the file.

#### 1.2 Unused Export: `IS_MOCK`
- **File:** `app/src/web3/mode.ts:15`
- **Code:** `export const IS_MOCK = APP_MODE === "mock";`
- **Issue:** Zero importers across the entire codebase. All code uses `IS_TESTNET`.
- **Action:** Remove line 15.

#### 1.3 Dead AI Feature Functions (5 functions)
- **File:** `app/src/services/ai-features.ts:191–223`
- **Functions:** `explainAnomaly`, `assessCounterpartyRisk`, `generateMarketInsight`, `generateAuditRationale`, `forecastBalances`
- **Issue:** All five are exported but never called anywhere. Only `explainIntent`, `suggestTags`, and `draftPolicy` are consumed.
- **Action:** Delete lines 191–223, or wrap with `/* @deprecated: not yet integrated */` if keeping as stubs for future sprints.

---

### 2. DRY Violations (Redundant Logic)

#### 2.1 Address Shortening Logic Duplicated in 3 Places
- **Topbar.tsx:45**
  ```ts
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  ```
- **Audit.tsx:467–470**
  ```ts
  const short = (addr: string, n = 6) =>
    addr && addr.length > 12 ? `${addr.slice(0, n)}…${addr.slice(-4)}` : addr;
  const shortTx = (hash: string) =>
    hash && hash.length > 12 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
  ```
- **Issues:**
  - Three near-identical implementations
  - Inconsistent ellipsis (`...` vs `…`)
  - Audit version has null-safety checks that Topbar lacks
- **Action:** Add to `app/src/lib/format.ts` (which already exports `fmtMoney`, `fmtDateAbs`, etc.):
  ```ts
  export function shortenAddress(addr: string, prefix = 6): string {
    return addr && addr.length > 12 ? `${addr.slice(0, prefix)}…${addr.slice(-4)}` : addr;
  }
  export function shortenTxHash(hash: string, prefix = 10): string {
    return hash && hash.length > 12 ? `${hash.slice(0, prefix)}…${hash.slice(-6)}` : hash;
  }
  ```
  Then replace inline versions in both files with imports from `lib/format.ts`.

---

### 3. Boilerplate & Structural Issues

#### 3.1 Mid-file Import in Yield.tsx
- **File:** `app/src/pages/Yield.tsx:251`
- **Issue:** `import { useYieldExecution }` appears after component definitions, violating consistent import ordering.
- **Action:** Move to the top-of-file import block (lines 1–12).

#### 3.2 Contract ABI Duplicated Across Backend and Frontend
- **Files:** `app/api/demo-approve.ts:17–19` and `app/src/web3/testnet.ts`
- **Issue:** `INTENT_REGISTRY_ABI` is defined independently in both files.
- **Action (medium-term):** Extract shared ABIs to `contracts/abis.json` and import from there in both locations.

#### 3.3 Untracked TODO Without Feature Flag
- **File:** `app/src/components/shared/AIPolicyBuilder.tsx:12`
- **Comment:** `// TODO: replace keyword map with real LLM intent classification`
- **Action:** Either implement, wrap with `if (AI_ENABLED)`, or add `/* @deprecated */` stub for sprint tracking.

---

### 4. Type Safety

#### 4.1 `any` Type in API Handler
- **File:** `app/src/pages/Audit.tsx:212` (inside `ai-features.ts`)
- **Code:** `export async function generateAuditRationale(policyDecision: any): Promise<string>`
- **Issue:** Loses type safety for audit decision objects.
- **Action:** Replace `any` with a proper union type from `app/src/types/domain.ts`.

---

### 5. Security / Documentation

#### 5.1 Hardcoded Demo Private Key
- **File:** `app/api/demo-approve.ts:36–37`
- **Code:**
  ```ts
  const SEEDED_DEMO_APPROVER_KEY =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  ```
- **Status:** Safe — this is publicly known Hardhat account[1], used only as a demo fallback. Code correctly prefers `DEMO_APPROVER_KEY` env var.
- **Action:** Add a note to README clarifying that this key is publicly known and production deploys must set `DEMO_APPROVER_KEY` via environment variable.

---

## Code Metrics

| Metric | Value | Health |
|--------|-------|--------|
| Total TS/TSX files | 90 | ✓ Manageable |
| Unused exports | 6 (`IS_MOCK` + `walletconnect.ts` re-exports) | ⚠ Remove |
| Dead functions | 5 (AI features) | ⚠ Clean up |
| Redundant logic blocks | 3 (address shortening) | ⚠ Consolidate |
| TODO/FIXME comments | 1 | ✓ Tracked |
| Unused `package.json` dependencies | 0 | ✓ Clean |
| Solidity contracts with dead code | 0 | ✓ Clean |

---

## Actionable Refactoring Roadmap

### Phase 1 — Quick Wins (~15 min)
- [ ] Delete `app/src/web3/walletconnect.ts`
- [ ] Remove `IS_MOCK` from `app/src/web3/mode.ts:15`
- [ ] Move `useYieldExecution` import to top of `Yield.tsx`

### Phase 2 — Consolidate Duplicate Logic (~25 min)
- [ ] Add `shortenAddress` + `shortenTxHash` to `app/src/lib/format.ts`
- [ ] Replace inline implementations in `Topbar.tsx:45` and `Audit.tsx:467–470`
- [ ] Standardize ellipsis character to `…` everywhere

### Phase 3 — Dead Code Cleanup (~10 min)
- [ ] Delete 5 unused AI functions from `ai-features.ts:191–223`
  - Or: wrap with `/* @deprecated */` if keeping as stubs

### Phase 4 — Type Safety (~10 min)
- [ ] Replace `any` in `generateAuditRationale` with proper type from `domain.ts`
- [ ] Add feature flag or deprecation comment to `AIPolicyBuilder.tsx` TODO

### Phase 5 — Documentation (~10 min)
- [ ] Add README note re: demo private key in `demo-approve.ts`
- [ ] Document ABI duplication between frontend and backend (track for Phase 2 monorepo cleanup)

---

## Smart Contract Assessment

| Contract | LOC | Dead Code | Status |
|----------|-----|-----------|--------|
| `MockUSDC.sol` | 58 | None | ✓ Clean |
| `IntentRegistry.sol` | 184 | None | ✓ Clean |
| `PolicyEngine.sol` | 141 | None | ✓ Clean |
| `TreasuryVault.sol` | 96 | None | ✓ Clean |
| `LedgerContract.sol` | 61 | None | ✓ Clean |

---

*Generated by Claude Code on 2026-05-02. No files were modified during this audit.*
