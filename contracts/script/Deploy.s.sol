// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PolicyEngine.sol";
import "../src/IntentRegistry.sol";
import "../src/LedgerContract.sol";

contract DeployScript is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        PolicyEngine policyEngine = new PolicyEngine();
        IntentRegistry intentRegistry = new IntentRegistry();
        LedgerContract ledgerContract = new LedgerContract();

        vm.stopBroadcast();

        console2.log("PolicyEngine:", address(policyEngine));
        console2.log("IntentRegistry:", address(intentRegistry));
        console2.log("LedgerContract:", address(ledgerContract));
    }
}
