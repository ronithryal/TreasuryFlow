// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/PolicyEngine.sol";
import "../src/LedgerContract.sol";
import "../src/TreasuryVault.sol";
import "../src/IntentRegistry.sol";

/// @notice TreasuryVault unit tests covering:
///   - vault direct execution by non-registry reverts
///   - approved execution transfers tokens to destination
///   - vault balance is zero after transfer-style execution
///   - policy re-validation inside vault
///   - withdraw faucet flow still works
contract TreasuryVaultTest is Test {
    MockUSDC usdc;
    PolicyEngine policyEngine;
    LedgerContract ledgerContract;
    TreasuryVault vault;
    IntentRegistry registry;

    address owner     = address(this);
    address initiator = address(0xA11CE);
    address approver  = address(0xB0B);
    address dest      = address(0xBEEF);
    address attacker  = address(0xBAD);

    uint256 validPolicyId;

    function setUp() public {
        usdc           = new MockUSDC();
        policyEngine   = new PolicyEngine();
        ledgerContract = new LedgerContract();
        vault          = new TreasuryVault(address(usdc), address(policyEngine));
        registry       = new IntentRegistry(
            address(policyEngine),
            address(vault),
            address(ledgerContract)
        );

        vault.setIntentRegistry(address(registry));
        ledgerContract.setAuthorized(address(registry), true);

        validPolicyId = policyEngine.createPolicy(
            "Vendor Payment",
            "payment",
            address(0),
            address(0),
            10_000e6,
            "{}"
        );

        usdc.mint(initiator, 50_000e6);
        vm.prank(initiator);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ── constructor ────────────────────────────────────────────────────────

    function test_constructor_setsToken() public view {
        assertEq(vault.token(), address(usdc));
    }

    function test_constructor_setsPolicyEngine() public view {
        assertEq(vault.policyEngine(), address(policyEngine));
    }

    function test_constructor_revertsOnZeroToken() public {
        vm.expectRevert("Invalid token");
        new TreasuryVault(address(0), address(policyEngine));
    }

    function test_constructor_revertsOnZeroPolicyEngine() public {
        vm.expectRevert("Invalid policyEngine");
        new TreasuryVault(address(usdc), address(0));
    }

    // ── setIntentRegistry ─────────────────────────────────────────────────

    function test_setIntentRegistry_ownerSucceeds() public view {
        assertEq(vault.intentRegistry(), address(registry));
    }

    function test_setIntentRegistry_revertsIfAlreadySet() public {
        vm.expectRevert("Already set");
        vault.setIntentRegistry(address(0x1234));
    }

    function test_setIntentRegistry_onlyOwner() public {
        TreasuryVault v2 = new TreasuryVault(address(usdc), address(policyEngine));
        vm.prank(attacker);
        vm.expectRevert();
        v2.setIntentRegistry(address(registry));
    }

    // ── executeApprovedIntent — access control ────────────────────────────

    /// vault direct execution by non-registry reverts
    function test_executeApprovedIntent_onlyIntentRegistry() public {
        vm.prank(attacker);
        vm.expectRevert("Only IntentRegistry");
        vault.executeApprovedIntent(initiator, dest, 5_000e6, validPolicyId);
    }

    function test_executeApprovedIntent_ownerDirectCallReverts() public {
        vm.prank(owner);
        vm.expectRevert("Only IntentRegistry");
        vault.executeApprovedIntent(initiator, dest, 5_000e6, validPolicyId);
    }

    // ── executeApprovedIntent — policy validation ─────────────────────────

    /// invalid policyId reverts (vault re-validates)
    function test_executeApprovedIntent_revertsOnInvalidPolicy() public {
        // We must call through registry to get past onlyIntentRegistry,
        // so create an intent with valid policy then deactivate before execute.
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, 5_000e6, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        // Deactivate policy — vault will re-validate and reject
        policyEngine.setPolicyActive(validPolicyId, false);

        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.executeIntent(id);
    }

    /// amount > maxAmount reverts (vault re-validates)
    function test_executeApprovedIntent_revertsWhenAmountExceedsMax() public {
        // Create a tight-cap policy that we'll then update to a lower cap
        uint256 tightPolicyId = policyEngine.createPolicy(
            "Tight", "payment", address(0), address(0), 5_000e6, "{}"
        );

        vm.prank(initiator);
        uint256 id = registry.createIntent(tightPolicyId, 5_000e6, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        // Update policy maxAmount to below the intent amount before execute
        policyEngine.updatePolicy(
            tightPolicyId, "Tight", "payment", address(0), address(0), 4_000e6, "{}", true
        );

        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.executeIntent(id);
    }

    // ── executeApprovedIntent — token transfers ───────────────────────────

    /// approved execution transfers tokens to destination; vault ends at zero
    function test_executeApprovedIntent_transfersToDestination() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, 5_000e6, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        uint256 destBefore = usdc.balanceOf(dest);
        uint256 initBefore = usdc.balanceOf(initiator);

        vm.prank(initiator);
        registry.executeIntent(id);

        assertEq(usdc.balanceOf(dest), destBefore + 5_000e6);
        assertEq(usdc.balanceOf(initiator), initBefore - 5_000e6);
    }

    /// vault balance is zero after transfer-style execution
    function test_vault_balanceZeroAfterExecution() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, 5_000e6, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        vm.prank(initiator);
        registry.executeIntent(id);

        assertEq(vault.balance(), 0);
    }

    /// emits PolicyExecuted with uint256 policyId
    function test_executeApprovedIntent_emitsPolicyExecuted() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, 5_000e6, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        vm.prank(initiator);
        vm.expectEmit(true, true, true, true);
        emit TreasuryVault.PolicyExecuted(validPolicyId, initiator, dest, 5_000e6, block.timestamp);
        registry.executeIntent(id);
    }

    // ── withdraw (faucet flow) ─────────────────────────────────────────────

    function test_withdraw_revertsOnZeroAmount() public {
        vm.prank(initiator);
        vm.expectRevert("Invalid amount");
        vault.withdraw(0);
    }

    function test_withdraw_revertsWhenNoDeposit() public {
        vm.prank(initiator);
        vm.expectRevert("Insufficient balance");
        vault.withdraw(1e6);
    }

    // ── balance ────────────────────────────────────────────────────────────

    function test_balance_startsAtZero() public view {
        assertEq(vault.balance(), 0);
    }
}
