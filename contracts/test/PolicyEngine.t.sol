// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PolicyEngine.sol";

contract PolicyEngineTest is Test {
    PolicyEngine internal engine;

    address owner   = address(this);
    address alice   = address(0xA11CE);
    address bob     = address(0xB0B);
    address dest    = address(0xBEEF);

    function setUp() public {
        engine = new PolicyEngine();
    }

    // ── createPolicy ───────────────────────────────────────────────────────────

    function test_createPolicy_ownerSucceeds() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        assertEq(id, 1);
        (uint256 pid,,,,,,,,,bool active) = engine.policies(id);
        assertEq(pid, 1);
        assertTrue(active);
    }

    function test_createPolicy_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
    }

    function test_createPolicy_incrementsId() public {
        uint256 id1 = engine.createPolicy("P1", "payment", address(0), address(0), 1e6, "{}");
        uint256 id2 = engine.createPolicy("P2", "sweep",   address(0), address(0), 2e6, "{}");
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(engine.nextPolicyId(), 3);
    }

    function test_createPolicy_emitsEvent() public {
        vm.expectEmit(true, true, true, false);
        emit PolicyEngine.PolicyCreated(1, "VP", "payment", address(0), address(0), 10_000e6, "{}", 1);
        engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
    }

    // ── validateIntent — wildcard tests ────────────────────────────────────────

    function test_validateIntent_wildcardSourceAndDest() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        assertTrue(engine.validateIntent(id, alice, dest, 5_000e6));
    }

    function test_validateIntent_specificSourceMatches() public {
        uint256 id = engine.createPolicy("VP", "payment", alice, address(0), 10_000e6, "{}");
        assertTrue(engine.validateIntent(id, alice, dest, 1_000e6));
    }

    function test_validateIntent_specificSourceMismatch() public {
        uint256 id = engine.createPolicy("VP", "payment", alice, address(0), 10_000e6, "{}");
        assertFalse(engine.validateIntent(id, bob, dest, 1_000e6));
    }

    function test_validateIntent_specificDestMatches() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), dest, 10_000e6, "{}");
        assertTrue(engine.validateIntent(id, alice, dest, 1_000e6));
    }

    function test_validateIntent_specificDestMismatch() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), dest, 10_000e6, "{}");
        assertFalse(engine.validateIntent(id, alice, bob, 1_000e6));
    }

    // ── validateIntent — maxAmount tests ───────────────────────────────────────

    function test_validateIntent_belowMaxAmount_passes() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        assertTrue(engine.validateIntent(id, alice, dest, 9_999e6));
    }

    function test_validateIntent_exactMaxAmount_passes() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        assertTrue(engine.validateIntent(id, alice, dest, 10_000e6));
    }

    function test_validateIntent_aboveMaxAmount_blocked() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        assertFalse(engine.validateIntent(id, alice, dest, 10_001e6));
    }

    function test_validateIntent_uncappedMaxAmount_passes() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 0, "{}");
        assertTrue(engine.validateIntent(id, alice, dest, type(uint256).max / 2));
    }

    // ── validateIntent — inactive and zero amount ───────────────────────────

    function test_validateIntent_inactivePolicy_blocked() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        engine.setPolicyActive(id, false);
        assertFalse(engine.validateIntent(id, alice, dest, 1_000e6));
    }

    function test_validateIntent_zeroPolicyId_blocked() public {
        assertFalse(engine.validateIntent(999, alice, dest, 1_000e6));
    }

    function test_validateIntent_zeroAmount_blocked() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        assertFalse(engine.validateIntent(id, alice, dest, 0));
    }

    // ── setPolicyActive ────────────────────────────────────────────────────────

    function test_setPolicyActive_deactivates() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        engine.setPolicyActive(id, false);
        (,,,,,,,,, bool active) = engine.policies(id);
        assertFalse(active);
    }

    function test_setPolicyActive_reactivates() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        engine.setPolicyActive(id, false);
        engine.setPolicyActive(id, true);
        (,,,,,,,,, bool active) = engine.policies(id);
        assertTrue(active);
    }

    function test_setPolicyActive_revertsOnMissing() public {
        vm.expectRevert("Policy not found");
        engine.setPolicyActive(999, false);
    }

    function test_setPolicyActive_onlyOwner() public {
        uint256 id = engine.createPolicy("VP", "payment", address(0), address(0), 10_000e6, "{}");
        vm.prank(alice);
        vm.expectRevert();
        engine.setPolicyActive(id, false);
    }
}
