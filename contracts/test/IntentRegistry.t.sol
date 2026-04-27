// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/IntentRegistry.sol";

contract IntentRegistryTest is Test {
    IntentRegistry internal registry;

    function setUp() public {
        registry = new IntentRegistry();
    }

    function testCreateIntent() public {
        uint256 id = registry.createIntent(1, 1000, address(0xBEEF));
        assertEq(id, 1);

        (uint256 intentId, uint256 policyId, uint256 amount, address destination, address createdBy, IntentRegistry.IntentStatus status,,) =
            registry.intents(id);

        assertEq(intentId, 1);
        assertEq(policyId, 1);
        assertEq(amount, 1000);
        assertEq(destination, address(0xBEEF));
        assertEq(createdBy, address(this));
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Pending));
    }

    function testApproveAndExecuteIntent() public {
        uint256 id = registry.createIntent(1, 1000, address(0xBEEF));
        registry.approveIntent(id, address(0xCAFE));

        bytes32 txHash = keccak256("txHash");
        registry.executeIntent(id, txHash);

        (,,,,, IntentRegistry.IntentStatus status, bytes32 storedTxHash,) = registry.intents(id);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Executed));
        assertEq(storedTxHash, txHash);
    }

    function testRejectIntent() public {
        uint256 id = registry.createIntent(1, 1000, address(0xBEEF));
        registry.rejectIntent(id, "manual review failed");

        (,,,,, IntentRegistry.IntentStatus status,,) = registry.intents(id);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Rejected));
    }
}
