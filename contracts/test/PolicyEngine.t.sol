// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PolicyEngine.sol";

contract PolicyEngineTest is Test {
    PolicyEngine internal engine;

    function setUp() public {
        engine = new PolicyEngine();
    }

    function testCreatePolicy() public {
        uint256 id = engine.createPolicy("Weekly Sweep", "sweep", address(this), address(0xBEEF), "balance_above:100000");
        assertEq(id, 1);

        (uint256 policyId, string memory name,, address source, address destination,, uint256 version,, bool active) =
            engine.policies(id);

        assertEq(policyId, 1);
        assertEq(name, "Weekly Sweep");
        assertEq(source, address(this));
        assertEq(destination, address(0xBEEF));
        assertEq(version, 1);
        assertTrue(active);
    }

    function testValidateIntent() public {
        uint256 id = engine.createPolicy("Weekly Sweep", "sweep", address(this), address(0xBEEF), "balance_above:100000");
        bool valid = engine.validateIntent(id, address(this), address(0xBEEF), 1000);
        assertTrue(valid);
    }

    function testValidateIntentFalseForWrongDestination() public {
        uint256 id = engine.createPolicy("Weekly Sweep", "sweep", address(this), address(0xBEEF), "balance_above:100000");
        bool valid = engine.validateIntent(id, address(this), address(0xCAFE), 1000);
        assertFalse(valid);
    }

    function testUpdatePolicyIncrementsVersion() public {
        uint256 id = engine.createPolicy("Weekly Sweep", "sweep", address(this), address(0xBEEF), "balance_above:100000");
        engine.updatePolicy(id, "Updated Sweep", "sweep", address(this), address(0xBEEF), "balance_above:120000", true);

        (,,,,,, uint256 version,,) = engine.policies(id);
        assertEq(version, 2);
    }
}
