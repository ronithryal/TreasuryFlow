// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PolicyEngine.sol";
import "../src/IntentRegistry.sol";
import "../src/LedgerContract.sol";
import "../src/MockUSDC.sol";
import "../src/TreasuryVault.sol";

/// @notice Deployment order resolves the TreasuryVault ↔ IntentRegistry
///         circular dependency:
///           1. Deploy MockUSDC
///           2. Deploy PolicyEngine
///           3. Deploy LedgerContract
///           4. Deploy TreasuryVault(token, policyEngine)  — no registry yet
///           5. Deploy IntentRegistry(policyEngine, vault, ledger)
///           6. vault.setIntentRegistry(registry)          — wire vault → registry
///           7. ledger.setAuthorized(registry, true)       — allow registry to record
///           8. Create 3 pre-deployed demo policies
contract DeployScript is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        // 1. MockUSDC
        MockUSDC mockUsdc = new MockUSDC();

        // 2. PolicyEngine
        PolicyEngine policyEngine = new PolicyEngine();

        // 3. LedgerContract
        LedgerContract ledgerContract = new LedgerContract();

        // 4. TreasuryVault (no intentRegistry yet)
        TreasuryVault vault = new TreasuryVault(address(mockUsdc), address(policyEngine));

        // 5. IntentRegistry
        IntentRegistry intentRegistry = new IntentRegistry(
            address(policyEngine),
            address(vault),
            address(ledgerContract)
        );

        // 6. Wire vault → registry (one-time setter)
        vault.setIntentRegistry(address(intentRegistry));

        // 7. Authorize registry to record ledger entries
        ledgerContract.setAuthorized(address(intentRegistry), true);

        // 8. Pre-deploy 3 demo policies (deployer is owner)
        //    policyId=1  "Vendor Payment"  wildcard source/dest  maxAmount=10_000 USDC
        policyEngine.createPolicy(
            "Vendor Payment",
            "payment",
            address(0),    // any source
            address(0),    // any destination
            10_000e6,      // max 10,000 mUSDC
            "{\"requires_approval\":true,\"max_amount\":10000}"
        );

        //    policyId=2  "Treasury Sweep"  wildcard source/dest  maxAmount=100_000 USDC
        policyEngine.createPolicy(
            "Treasury Sweep",
            "sweep",
            address(0),
            address(0),
            100_000e6,     // max 100,000 mUSDC
            "{\"requires_approval\":true,\"max_amount\":100000}"
        );

        //    policyId=3  "Yield Deposit"   wildcard source/dest  maxAmount=500_000 USDC
        policyEngine.createPolicy(
            "Yield Deposit",
            "deposit_routing",
            address(0),
            address(0),
            500_000e6,     // max 500,000 mUSDC
            "{\"requires_approval\":true,\"max_amount\":500000}"
        );

        vm.stopBroadcast();

        // Print all addresses for manual update of app/src/web3/testnet.ts
        console2.log("MockUSDC:        ", address(mockUsdc));
        console2.log("PolicyEngine:    ", address(policyEngine));
        console2.log("LedgerContract:  ", address(ledgerContract));
        console2.log("TreasuryVault:   ", address(vault));
        console2.log("IntentRegistry:  ", address(intentRegistry));
    }
}
