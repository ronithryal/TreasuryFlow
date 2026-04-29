# TreasuryFlow: 5-Minute Golden Path Walkthrough

This guide walks you through the **P0 Golden Path** — the end-to-end, cryptographically verifiable payment lifecycle on the Base Sepolia testnet.

## Prerequisites
1.  **Wallet**: Have MetaMask or Coinbase Wallet installed.
2.  **Network**: Switch to **Base Sepolia** (Chain ID: 84532).
3.  **Gas**: Obtain testnet ETH from a faucet (e.g., [faucet.base.org](https://faucet.base.org)).
4.  **Configuration**: Ensure the app is running in `VITE_APP_MODE=testnet` with the server-side `DEMO_APPROVER_KEY` configured.

---

## The Golden Path

### 1. Onboard
- **Open the Testnet Demo**:
    - Run `cd app && npm run dev` in your terminal.
    - Open `http://localhost:5173` in your browser.
    - Confirm the blue/gradient setup banner appears at the top (this verifies your `.env.local` is correctly configured for Testnet Mode).
- Click **Connect Wallet** in the top-right and connect your Base Sepolia account.
- Click **Mint 100,000 mUSDC** on the setup banner. This provides the "Digital Dollars" used for the demo.

### 2. Create Payment Request
- Go to the **Overview** or **Approvals** page.
- Select a scenario (e.g., "1) Wallet + Sweep") or initiate a manual payment.
- **Critical**: Ensure you select **Policy #1 (Vendor Payment)**.
- Enter a real demo recipient address (e.g., your own address or the deployer address: `0x240fb77d1c6bbe72bb59a08b379c7d94e905839b`).
- Click **Create Payment Request Onchain**. This writes the intent to the `IntentRegistry`.

### 3. Approve Token Allowance
- Once the intent is created, the UI will prompt you to **Approve USDC**.
- This grants the `TreasuryVault` permission to pull the specific amount of `mUSDC` required for this request.
- Confirm the transaction in your wallet.

### 4. Treasury Admin Approval (Maker-Checker)
- To simulate a real finance workflow, a different entity must approve the request.
- Click **Approve as Treasury Admin demo signer**.
- The server will sign a transaction using a separate `DEMO_APPROVER_KEY`, enforcing the **maker-checker** control onchain (Initiator != Approver).

### 5. Final Execution
- Click **Execute Payment Request Onchain**.
- This final call triggers the `TreasuryVault` to:
    1. Re-validate the policy onchain.
    2. Transfer the tokens from the initiator to the destination.
    3. Post a permanent entry to the `LedgerContract`.

---

## Verifying the Proof

Open the **Audit** page to see the forensic evidence:

- **Payment Request ID**: The canonical ID from the `IntentRegistry`.
- **Policy Verification**: Confirms Policy #1 was used.
- **Initiator & Approver**: Verifies two distinct addresses handled the request.
- **Onchain Evidence**:
    - **Approval Tx**: Deep-link to the CFO's signature.
    - **Execution Tx**: Deep-link to the final movement of funds.
- **Basescan**: Click any link to open Base Sepolia transaction evidence.

### What the proof means (CFO/Controller Language)
> "This audit trail proves that a payment request was created by one authorized wallet, approved by a distinct secondary wallet, validated against immutable onchain policy constraints, executed through a non-custodial registry, and settled by the TreasuryVault on the public Base Sepolia ledger."

---

## Troubleshooting
- **Transaction Failed?** Ensure you have enough Base Sepolia ETH for gas.
- **Policy Breach?** Ensure you are sending $\le$ 10,000 USDC for Policy #1.
- **Not Connected?** Check that your wallet is on the correct network (Base Sepolia).
