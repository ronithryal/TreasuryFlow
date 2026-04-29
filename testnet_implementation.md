# Testnet Implementation Strategy

Here is the optimal architectural strategy for maintaining both demos simultaneously and dynamically handling data when a user connects their wallet.

### 1. Strategy: Maintaining "Mock Demo" and "Testnet Demo"
**Do not maintain two separate long-living branches.** If you try to maintain a `main` branch and a `sepolia` branch indefinitely, you will face constant, painful merge conflicts every time you build a new UI feature (like the AI Policy builder).

**The Solution: Feature Flagging via Environment Variables**
Instead of branch separation, use a single unified codebase where the *execution engine* is determined at build time by an environment variable.

1. **Merge Strategy**: You will eventually merge `sepolia` into `main`. 
2. **Environment Variable**: Introduce a new variable in your `.env` files:
   * `.env.mock` -> `VITE_APP_MODE=mock`
   * `.env.testnet` -> `VITE_APP_MODE=testnet`
3. **Execution Routing**: Everywhere in your code that executes an action (e.g., `ApprovalDecisionBar.tsx`), use a simple conditional:
   ```typescript
   if (import.meta.env.VITE_APP_MODE === 'testnet') {
     // Execute via Wagmi / Safe SDK (Sepolia)
     await writeContractAsync({...})
   } else {
     // Execute via Zustand store (Mock Demo)
     decideOnIntent(id, decision)
   }
   ```
4. **Deployments**: On Vercel or your hosting provider, you simply set up two separate projects pointing to the *exact same GitHub `main` branch*. 
   * Project A: `demo.treasuryflow.com` (Environment Variable set to `mock`)
   * Project B: `testnet.treasuryflow.com` (Environment Variable set to `testnet`)

This guarantees that both demos always have the exact same UI, CSS, and features, but the underlying engine completely ignores the Web3 logic on the mock demo.

---

### 2. Strategy: Dynamic Data Hydration on Sepolia
When a user arrives at the testnet demo and connects their Sepolia wallet, the app must transition from "empty/mock state" to "real onchain state". Here is the step-by-step technical flow to achieve this:

**Step 1: The Faucet & Contract Setup**
You need to deploy two simple smart contracts to Base Sepolia:
1. **Mock USDC Contract**: A standard ERC20 token with a public `mint()` function.
2. **Treasury Vault Contract**: A simple contract that accepts deposits, executes sweeps, and emits events. Secured via per-depositor balance tracking and OpenZeppelin `Ownable` on related registry contracts.

**Step 2: Wallet Connection & Hydration**
Use Wagmi's `useAccount()` to detect when a wallet connects. When connected, trigger a `hydrateTestnet(address)` function in your Zustand store:
* Wipe the static seed data.
* Set the `Base Operating` account address to the user's connected wallet address.
* Use Wagmi's `useReadContract` to fetch the user's real Sepolia ETH and Mock USDC balances and update the UI accordingly.

**Step 3: The "Fund Account" Onboarding**
If the user's fetched balance is 0, render a "Testnet Setup" banner. 
* Add a button: "Mint 100k Testnet USDC". 
* When clicked, this fires a transaction to your Mock USDC contract. Once the block confirms, the UI updates to show their newly minted balance. Now they have money to move.

**Step 4: Proving Onchain Actions**
When the user approves a transaction (e.g., an Anomaly Warning or a Morpho Yield deposit), they will sign a real transaction sending their Mock USDC to your Treasury Vault Contract.
* **Attestations**: To prove that the "Policy" was executed autonomously, the smart contract should emit an event (e.g., `PolicyExecuted(policyId, amount, destination)`). 
* **The Audit Page**: Instead of pulling from local Zustand arrays, the `/audit` page on the testnet demo will query an RPC node (via Alchemy) for those specific `PolicyExecuted` logs. You then render the actual transaction hashes directly in the UI, hyperlinked to [sepolia.basescan.org](https://sepolia.basescan.org/). 

This proves to investors and users that:
1. The UI successfully compiles intent.
2. Real tokens are moving onchain.
3. The audit trail is cryptographically verifiable on a block explorer.
