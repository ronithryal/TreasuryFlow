// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/PolicyEngine.sol";
import "../src/LedgerContract.sol";
import "../src/TreasuryVault.sol";
import "../src/IntentRegistry.sol";

/// @notice Full-suite tests for IntentRegistry covering:
///   - valid policy allows intent creation
///   - invalid/inactive policy blocks intent creation
///   - amount above maxAmount blocks intent creation
///   - initiator cannot self-approve
///   - different approver can approve
///   - execute before approval reverts
///   - non-initiator cannot execute approved intent
///   - approved execution works (tokens land at destination)
///   - initiator can cancel pending intent
///   - non-initiator cannot cancel intent
///   - ledger/audit events emitted
contract IntentRegistryTest is Test {
    MockUSDC usdc;
    PolicyEngine policyEngine;
    LedgerContract ledgerContract;
    TreasuryVault vault;
    IntentRegistry registry;

    address owner    = address(this);
    address initiator = address(0xA11CE);
    address approver  = address(0xB0B);
    address dest      = address(0xBEEF);
    address stranger  = address(0xBAD);

    uint256 validPolicyId;
    uint256 AMOUNT = 5_000e6;

    function setUp() public {
        usdc          = new MockUSDC();
        policyEngine  = new PolicyEngine();
        ledgerContract = new LedgerContract();
        vault         = new TreasuryVault(address(usdc), address(policyEngine));

        registry = new IntentRegistry(
            address(policyEngine),
            address(vault),
            address(ledgerContract)
        );

        vault.setIntentRegistry(address(registry));
        ledgerContract.setAuthorized(address(registry), true);

        // Create a valid demo policy (wildcard source/dest, maxAmount = 10_000 mUSDC)
        validPolicyId = policyEngine.createPolicy(
            "Vendor Payment",
            "payment",
            address(0),
            address(0),
            10_000e6,
            "{}"
        );

        // Fund initiator and pre-approve vault
        usdc.mint(initiator, 50_000e6);
        vm.prank(initiator);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ── createIntent — policy validation ────────────────────────────────────

    /// valid policy allows intent creation
    function test_createIntent_validPolicyAllows() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        assertEq(id, 1);
        (,address init,,,,,IntentRegistry.IntentStatus status,) = registry.intents(id);
        assertEq(init, initiator);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Pending));
    }

    /// invalid policy (non-existent id) blocks intent creation
    function test_createIntent_invalidPolicyReverts() public {
        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.createIntent(999, AMOUNT, dest);
    }

    /// inactive policy blocks intent creation
    function test_createIntent_inactivePolicyReverts() public {
        policyEngine.setPolicyActive(validPolicyId, false);
        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.createIntent(validPolicyId, AMOUNT, dest);
    }

    /// amount above maxAmount blocks intent creation
    function test_createIntent_amountAboveMaxReverts() public {
        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.createIntent(validPolicyId, 10_001e6, dest); // maxAmount = 10_000e6
    }

    function test_createIntent_zeroAmountReverts() public {
        vm.prank(initiator);
        vm.expectRevert("Policy rejected"); // validateIntent returns false for amount==0
        registry.createIntent(validPolicyId, 0, dest);
    }

    function test_createIntent_zeroDestinationReverts() public {
        vm.prank(initiator);
        vm.expectRevert("Invalid destination");
        registry.createIntent(validPolicyId, AMOUNT, address(0));
    }

    function test_createIntent_emitsEvent() public {
        vm.prank(initiator);
        vm.expectEmit(true, true, true, true);
        emit IntentRegistry.IntentCreated(1, validPolicyId, AMOUNT, dest, initiator);
        registry.createIntent(validPolicyId, AMOUNT, dest);
    }

    // ── approveIntent — maker-checker ──────────────────────────────────────

    /// initiator cannot self-approve
    function test_approveIntent_selfApproveReverts() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(initiator);
        vm.expectRevert("Cannot self-approve");
        registry.approveIntent(id);
    }

    /// different approver can approve; approver stored as msg.sender
    function test_approveIntent_differentApproverSucceeds() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(approver);
        registry.approveIntent(id);

        (,,,,, address storedApprover, IntentRegistry.IntentStatus status,) = registry.intents(id);
        assertEq(storedApprover, approver);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Approved));
    }

    function test_approveIntent_emitsEvent() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(approver);
        vm.expectEmit(true, true, false, false);
        emit IntentRegistry.IntentApproved(id, approver);
        registry.approveIntent(id);
    }

    function test_approveIntent_revertsNotFound() public {
        vm.prank(approver);
        vm.expectRevert("Not found");
        registry.approveIntent(999);
    }

    function test_approveIntent_revertsNotPending() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        // Second approval attempt — intent is now Approved, not Pending
        vm.prank(stranger);
        vm.expectRevert("Not pending");
        registry.approveIntent(id);
    }

    // ── executeIntent ──────────────────────────────────────────────────────

    /// execute before approval reverts
    function test_executeIntent_requiresApproved() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(initiator);
        vm.expectRevert("Not approved");
        registry.executeIntent(id);
    }

    /// non-initiator cannot execute approved intent
    function test_executeIntent_nonInitiatorReverts() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        vm.prank(stranger);
        vm.expectRevert("Only initiator can execute");
        registry.executeIntent(id);
    }

    /// approved execution transfers tokens to destination, vault ends at zero
    function test_executeIntent_transfersToDestination() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        uint256 destBefore = usdc.balanceOf(dest);

        vm.prank(initiator);
        registry.executeIntent(id);

        assertEq(usdc.balanceOf(dest), destBefore + AMOUNT);
        assertEq(vault.balance(), 0); // vault is a pass-through, ends at zero
    }

    /// vault balance is zero after transfer-style execution
    function test_executeIntent_vaultBalanceZeroAfterExecution() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        vm.prank(initiator);
        registry.executeIntent(id);

        assertEq(vault.balance(), 0);
    }

    /// ledger/audit events emitted (IntentExecuted + LedgerEntryPosted)
    function test_executeIntent_emitsAuditEvents() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        vm.prank(initiator);
        vm.expectEmit(true, true, false, false);
        emit IntentRegistry.IntentExecuted(id, initiator);
        vm.expectEmit(true, false, false, false);
        emit IntentRegistry.LedgerEntryPosted(id, block.number);
        registry.executeIntent(id);
    }

    function test_executeIntent_cannotExecuteTwice() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);
        vm.prank(initiator);
        registry.executeIntent(id);

        vm.prank(initiator);
        vm.expectRevert("Not approved");
        registry.executeIntent(id);
    }

    // ── cancelIntent ────────────────────────────────────────────────────────

    /// initiator can cancel pending intent
    function test_cancelIntent_initiatorSucceeds() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(initiator);
        registry.cancelIntent(id, "changed my mind");

        (,,,,,, IntentRegistry.IntentStatus status,) = registry.intents(id);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Rejected));
    }

    /// non-initiator cannot cancel intent
    function test_cancelIntent_nonInitiatorReverts() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(stranger);
        vm.expectRevert("Only initiator can cancel");
        registry.cancelIntent(id, "attempting hijack");
    }

    function test_cancelIntent_approverCannotCancel() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(approver);
        vm.expectRevert("Only initiator can cancel");
        registry.cancelIntent(id, "approver trying to cancel");
    }

    function test_cancelIntent_emitsEvent() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        vm.prank(initiator);
        vm.expectEmit(true, true, false, true);
        emit IntentRegistry.IntentRejected(id, initiator, "changed my mind");
        registry.cancelIntent(id, "changed my mind");
    }

    function test_cancelIntent_revertsOnAlreadyApproved() public {
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);
        vm.prank(approver);
        registry.approveIntent(id);

        vm.prank(initiator);
        vm.expectRevert("Not pending");
        registry.cancelIntent(id, "too late");
    }

    // ── intent struct fields ─────────────────────────────────────────────────

    function test_intent_fields_correct() public {
        vm.warp(1_700_000_000);
        vm.prank(initiator);
        uint256 id = registry.createIntent(validPolicyId, AMOUNT, dest);

        (uint256 iid, address init, uint256 pid, uint256 amt, address dst,,, uint256 createdAt)
            = registry.intents(id);

        assertEq(iid, 1);
        assertEq(init, initiator);
        assertEq(pid, validPolicyId);
        assertEq(amt, AMOUNT);
        assertEq(dst, dest);
        assertEq(createdAt, 1_700_000_000);
    }
}
