// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PolicyEngine.sol";
import "../src/IntentRegistry.sol";
import "../src/LedgerContract.sol";
import "../src/MockUSDC.sol";
import "../src/TreasuryVault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        PolicyEngine policyEngine = new PolicyEngine();
        IntentRegistry intentRegistry = new IntentRegistry();
        LedgerContract ledgerContract = new LedgerContract();

        MockUSDC mockUsdc = new MockUSDC();
        TreasuryVault vault = new TreasuryVault(address(mockUsdc));

        vm.stopBroadcast();

        console2.log("PolicyEngine:", address(policyEngine));
        console2.log("IntentRegistry:", address(intentRegistry));
        console2.log("LedgerContract:", address(ledgerContract));
        console2.log("MockUSDC:", address(mockUsdc));
        console2.log("TreasuryVault:", address(vault));
    }
}
