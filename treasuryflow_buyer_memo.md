# TreasuryFlow buyer memo

Perspective: YC founder/CFO team evaluating whether TreasuryFlow could replace or sit alongside Coinbase for Business, Kyriba, or Ramp for stablecoin treasury operations.

Sources used: live demo, GitHub repository inspection via GitHub tooling, Coinbase Business product material, Ramp Stablecoin Account support material, Kyriba USDC announcement, and Circle Mint treasury case study.

## Executive verdict

TreasuryFlow has a strong wedge: onchain policy enforcement plus AI-assisted treasury forensics is more differentiated than “another crypto dashboard,” and the demo does a good job making a finance workflow feel concrete through approvals, reconciliation, risk, forecast, and audit surfaces ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would not switch my company’s stablecoin treasury to TreasuryFlow based solely on this demo, because the end-to-end value proposition, “money only moves according to provable policy,” cannot be validated in the product experience or the inspected implementation yet ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/), [TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

The best near-term positioning is not “replace Coinbase, Ramp, or Kyriba,” but “be the policy, audit, and AI-controls layer that sits on top of Coinbase Business/Circle/Ramp wallets until TreasuryFlow has audited contracts, production integrations, live ERP sync, and real payment execution” ([Coinbase Business](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business), [Ramp Stablecoin Account overview](https://support.ramp.com/hc/en-us/articles/50390917452947-Ramp-Stablecoin-Account-overview), [Kyriba USDC announcement](https://www.prnewswire.com/de/pressemitteilungen/kyriba-brings-afp-jp-morgan-asset-management-and-circle-into-a-single-ai-orchestrated-treasury-platform-302755861.html)).  

## A. What did not work or needs fixing

### Critical demo blockers

The “Approve Onchain” flow does not complete without a connected wallet, leaving an approval stuck in pending state and preventing the demo from showing the full lifecycle from proposed transaction to approval, execution, ledger entry, and onchain audit evidence ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The Audit page’s onchain policy execution feed stays empty unless a wallet approval happens, which means the demo does not prove the product’s central claim that TreasuryFlow creates verifiable onchain execution history ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The AI Policy Builder appears canned, because materially different prompts produce the same “Sweep & Yield,” “Hourly Check,” “Balance > $100,000,” and “Deposit to Morpho” compiled output ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The Yield page contains “Configure Deployment Policy” buttons for strategies such as Morpho Blue, Aave v3, and Sky/Maker that do not open a modal, navigate, or give any error feedback ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The Entities page includes a “Provision CDP Wallet” action that produces no visible result, which makes the multi-entity/custody story feel incomplete ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The landing page Sign In button does not lead to a meaningful authenticated demo path, which creates uncertainty about whether the product has a real user/account model yet ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

### Technical trust gaps from the repo

The inspected runtime path bypasses the stated onchain policy engine by calling the vault execution path directly, so the demo does not currently prove that PolicyEngine authorization is what moves funds ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

The inspected IntentRegistry contract has no effective onchain access control on approval, execution, or rejection methods, which means the maker-checker control story appears enforced in JavaScript rather than in the smart contract layer ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

The inspected testnet execution path hardcodes the destination to a burn-style `0x000...dEaD` address, so the product is not yet demonstrating correct policy-to-recipient settlement behavior ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

The inspected repository shows important “AI” and “yield” surfaces implemented as hardcoded or stubbed experiences, including fixed forecast data, counterparty-specific risk branching, prompt-insensitive AI policy generation, a minimal audit PDF, and setTimeout-style yield behavior ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

The inspected repository includes a mismatch between claimed contract test coverage and actual tests, which would make me slow down before trusting any “auditable contract system” messaging ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

The inspected ledger contract exists but is not wired into the app’s ledger recording path, so the current “immutable ledger” experience appears to be app-state driven rather than onchain-ledger driven ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

### UX and finance-language issues

The app uses “intent” as the primary object, but a finance team expects words like payment, transfer, sweep, payout, reserve movement, and approval request ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

“Deploy to Safes” is meaningful to crypto-native users but unclear to a CFO or controller, so it should be reframed as “Activate policy,” “Route through multisig,” or “Deploy to Safe multisig” with an explanation ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

Amounts sometimes mix a dollar sign and “USDC,” such as `$186,400.00 usdc`, which is imprecise for accounting presentation and should be standardized as either dollar-equivalent display or token-denominated display ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The “Proof Onchain / Verify Ledger” path opens a block explorer without explaining what evidence the buyer should inspect, which makes the proof feel like a link rather than an audit artifact ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The Settings page exposes a “Force mock AI” toggle, which directly undermines the credibility of the AI-forensics positioning during a buyer demo ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The reconciliation workflow shows statuses like tagged, reviewed, and exported, but the review step is not explained or made actionable enough for a controller to understand the close process ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

## B. What I would want to see next

### Must-have product flows

I would want one complete transaction lifecycle in demo mode: create payment or sweep, attach policy, route approval, enforce segregation of duties, sign with a test wallet, execute on Base Sepolia, write to ledger, reconcile, export evidence, and open an explainer that maps each UI step to the onchain event ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want manual payment initiation in addition to policy-driven automation, because real finance teams need one-off vendor payments, refunds, intercompany transfers, emergency liquidity moves, and exception handling ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want vendor onboarding with wallet address verification, risk screening, approval requirements for new payees, and immutable change history before I would let the product move investor funds ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want configurable approval matrices by amount, entity, destination, risk score, policy type, and initiator role, because the read-only thresholds in the demo are not enough for a controller-owned system ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want ERP field mapping rather than CSV export only, including chart of accounts, entity, department, vendor, memo, transaction hash, policy ID, approver, and evidence bundle URL ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want 30/60/90-day liquidity forecasts with scenario modeling, burn-rate assumptions, payroll/vendor schedules, reserve policies, and stress cases rather than only a 7-day chart ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want scheduled reporting, including daily cash position, weekly exception digest, monthly close packet, and board-ready stablecoin treasury summary ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

### Must-have trust and compliance proof

I would want audited smart contracts, public audit reports, clear upgradeability/admin-key disclosures, and a bug bounty before any mainnet funds touch TreasuryFlow contracts ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

I would want SOC 2 readiness or a security packet, privacy policy, terms of service, data retention policy, incident response process, and data residency posture before introducing TreasuryFlow to my controller or auditor ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want a “proof interpreter” in the UI that explains transaction hash, policy hash, signer, approver, threshold, pre/post balances, and resulting ledger entry in plain English for non-technical finance users ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I would want the AI features to show provenance, confidence, inputs used, fallback behavior, and whether the output came from a live model or deterministic mock, because AI-generated financial controls cannot be a black box ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

### Integrations I would require

Coinbase Business integration matters because Coinbase already offers USDC global payouts, payment links, payout APIs, recipient email flows, payment links, QuickBooks/Xero sync through CoinTracker, USDC Rewards, and bank cash-out through Wire or ACH ([Coinbase Business](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business)).  

Ramp integration or parity matters because Ramp’s Stablecoin Account already sits inside its Cash & Treasury product, supports USDC/USDT deposits across multiple networks, lets stablecoins fund Ramp Card repayment and bill pay, uses Ramp’s permissions, and syncs treasury transactions to connected ERPs ([Ramp Stablecoin Account overview](https://support.ramp.com/hc/en-us/articles/50390917452947-Ramp-Stablecoin-Account-overview)).  

Circle Mint integration matters because Circle demonstrates treasury-grade USDC workflows with role-based permissions, dual approvals, near-real-time monitoring, ISO 20022 camt.053-style reporting, bank-grade reference IDs, Oracle integration paths, and transaction reporting APIs ([Circle Mint treasury case study](https://www.circle.com/fr/case-studies/circle-treasury-management)).  

## C. What keeps me from switching

### From Coinbase for Business

Coinbase Business already supports global USDC payouts to onchain addresses or email addresses, payment links, Payouts API automation, under-second Base settlement for payment links, no network fees for payment links, QuickBooks/Xero sync through CoinTracker, USDC Rewards, and cash-out to linked bank accounts through Wire or ACH ([Coinbase Business](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business)).  

TreasuryFlow does not yet show a real replacement for Coinbase’s custody, bank cash-out, recipient onboarding, payment API, or accounting-sync workflows in the demo ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

My likely buying motion would be “TreasuryFlow as a controls layer on top of Coinbase,” not “TreasuryFlow replaces Coinbase,” until the Coinbase integration is live and can prove it reduces reconciliation, approval risk, and audit prep time ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/), [Coinbase Business](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business)).  

### From Kyriba

Kyriba is now positioning USDC inside an enterprise treasury system with Circle integration, existing treasury workflows, Trusted Agentic AI, J.P. Morgan Asset Management’s Morgan Money, liquidity planning, FX risk management, and AFP stablecoin education for treasury teams ([Kyriba USDC announcement](https://www.prnewswire.com/de/pressemitteilungen/kyriba-brings-afp-jp-morgan-asset-management-and-circle-into-a-single-ai-orchestrated-treasury-platform-302755861.html)).  

TreasuryFlow does not yet show enterprise-grade multi-entity cash visibility, live bank/ERP integration, FX, hedging, configurable approval matrices, or the kind of workflow depth that would make a Kyriba replacement credible ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The right wedge against Kyriba is probably a crypto-native, startup-friendly, provable-controls layer rather than a broad treasury management suite replacement ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/), [Kyriba USDC announcement](https://www.prnewswire.com/de/pressemitteilungen/kyriba-brings-afp-jp-morgan-asset-management-and-circle-into-a-single-ai-orchestrated-treasury-platform-302755861.html)).  

### From Ramp

Ramp already combines stablecoin balances with the workflows many startups use daily, including card repayment, bill pay, reimbursements, treasury permissions, GL account mapping, and ERP sync ([Ramp Stablecoin Account overview](https://support.ramp.com/hc/en-us/articles/50390917452947-Ramp-Stablecoin-Account-overview)).  

TreasuryFlow does not yet cover cards, AP automation, invoice workflows, reimbursements, employee spend controls, or native ERP sync in the demo ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The best argument against Ramp is not breadth, but proof: Ramp can own spend operations, while TreasuryFlow could own provable stablecoin policy enforcement, exception detection, and audit evidence if those claims become real in production ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/), [Ramp Stablecoin Account overview](https://support.ramp.com/hc/en-us/articles/50390917452947-Ramp-Stablecoin-Account-overview)).  

### Universal blockers

I cannot switch until I can complete one real transaction lifecycle in the demo without hand-waving around wallet connection, policy enforcement, ledger recording, and evidence generation ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

I cannot switch until the smart contracts actually enforce the policy controls the UI describes, because the repo inspection suggests the current implementation relies too heavily on frontend logic and demo scaffolding for core controls ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

I cannot switch until the product has pricing, production security posture, integration commitments, and references or design partners with real stablecoin treasury volume ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

## D. What I liked

The dashboard is strong because it speaks CFO language immediately: managed funds, reserves, operating liquidity, pending approvals, liquidity health, and exceptions are the right first-screen concepts ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The role switcher is a clever demo device because it lets a buyer understand maker-checker workflows without needing four real accounts during a sales call ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The approval detail drawer is one of the best parts of the product because it shows pre/post balance impact, triggering policy, initiator, timeline, and AI explanation in one place ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The reconciliation page feels useful because month-end readiness, missing tags, tagged entries, exported entries, CSV export, and ERP-export simulation are concrete controller workflows rather than abstract crypto analytics ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The risk page points in the right direction because counterparty forensics, AI rationale, trust index, first-time vendor flags, and recommendations could become a differentiated operational control layer ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The forecast page is directionally compelling because it translates treasury data into a specific action recommendation, such as moving liquidity before a projected gap ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

The product vision is compelling because it attacks a real gap: crypto-native companies need the speed of stablecoins without giving up approvals, segregation of duties, audit trails, reconciliation, and board-level explainability ([Circle Mint treasury case study](https://www.circle.com/fr/case-studies/circle-treasury-management), [Coinbase Business](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business)).  

## Recommended next demo build

Build one “golden path” demo that is impossible to dismiss as mocked: fund test wallet, create vendor, create policy, propose payout, require second approval, execute onchain, record ledger entry, reconcile, export evidence bundle, and show Basescan proof with a human-readable proof explanation ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

Rename product objects into finance language, while retaining technical terms underneath: payment request instead of intent, activate policy instead of deploy to Safes, evidence bundle instead of proof onchain, and recipient onboarding instead of wallet provisioning ([TreasuryFlow demo](https://testnet-treasuryflow.vercel.app/)).  

Treat Coinbase/Circle/Ramp as initial integration partners rather than enemies, because they already provide fiat rails, custody, rewards, payouts, cards, ERP sync, and business-account primitives that TreasuryFlow can augment with policy proof and AI audit controls ([Coinbase Business](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business), [Ramp Stablecoin Account overview](https://support.ramp.com/hc/en-us/articles/50390917452947-Ramp-Stablecoin-Account-overview), [Circle Mint treasury case study](https://www.circle.com/fr/case-studies/circle-treasury-management)).  

Move the core claim from “AI treasury dashboard” to “provable treasury controls for stablecoins,” because incumbents can copy dashboards faster than they can credibly copy a contract-enforced, audit-ready policy layer ([TreasuryFlow GitHub repository](https://github.com/ronithryal/TreasuryFlow)).  

