# PR Summary: TreasuryFlow P0 "Golden Path" Refactor

## Status: Ready for Hands-on Testing 🚀

This PR transforms the TreasuryFlow prototype into a buyer-credible, end-to-end treasury management demo on **Base Sepolia**. It enforces a 4-step onchain "Golden Path" while preserving the original mock demo.

## What Changed
### 1. Smart Contracts (P0 Architecture)
- **Maker-Checker Enforced**: `IntentRegistry` prevents initiators from approving their own requests.
- **Onchain Policies**: `PolicyEngine` validates `maxAmount` and address constraints before transfer.
- **Sovereign Vault**: `TreasuryVault` only moves funds if the registry provides a valid, approved intent.
- **Immutable Ledger**: Every execution posts a verifiable entry to `LedgerContract`.

### 2. Frontend (Honest UI Polish)
- **Terminology**: Standardized "Payment Request" over "Intent" in all buyer-facing UI.
- **Transparency**: Added "Coming Soon" states for CDP Wallets, Auth, and Real Yield.
- **Error Recovery**: Testnet demo now provides actionable steps for wallet/network/funding issues.
- **Audit Trail**: Revamped Audit page to show verifiable onchain proofs (tx hashes) with Basescan links.

### 3. Documentation
- **README.md**: Updated with demo mode tables and contract addresses.
- **DEMO.md**: Added a 5-minute walkthrough for stakeholders.
- **.env.example**: Documented all required keys for testnet deployment.

## How to Test
1.  **Branch**: Ensure you are on `refactor_demo`.
2.  **Environment**: 
    - Set `VITE_APP_MODE=testnet` in `app/.env.local`.
    - Provide `DEMO_APPROVER_KEY` (Base Sepolia only).
3.  **App**: Run `npm run dev` in `app/`.
4.  **Flow**: Follow the walkthrough in `DEMO.md`.

## Risk Areas
- **RPC Stability**: Relies on the provided `BASE_SEPOLIA_RPC_URL` (Alchemy recommended).
- **Faucet Dependency**: Users need Base Sepolia ETH for gas.

## Rollback Note
The revamped logic is isolated to the `refactor_demo` branch and gated by the `testnet` mode flag. The legacy mock demo behavior is fully preserved on `main` and as a fallback in this branch.

---
**Build Status**: ✅ `tsc` | ✅ `vitest` | ✅ `forge test` | ✅ `vite build`
