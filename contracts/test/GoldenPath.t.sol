// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/PolicyEngine.sol";
import "../src/LedgerContract.sol";
import "../src/TreasuryVault.sol";
import "../src/IntentRegistry.sol";

/// @title GoldenPath integration test
/// @notice End-to-end test of the full payment flow:
///   Deploy → Policy → createIntent → approveIntent → executeIntent
///   Verifies all invariants from the P0 architecture doc.
contract GoldenPathTest is Test {
    MockUSDC usdc;
    PolicyEngine policyEngine;
    LedgerContract ledgerContract;
    TreasuryVault vault;
    IntentRegistry registry;

    address deployer  = address(this);
    address initiator = address(0xA11CE);
    address approver  = address(0xB0B);
    address recipient = address(0xBEEF);
    address stranger  = address(0xBAD);

    uint256 AMOUNT = 5_000e6;

    function setUp() public {
        // 1. Deploy all contracts in correct order
        usdc           = new MockUSDC();
        policyEngine   = new PolicyEngine();
        ledgerContract = new LedgerContract();
        vault          = new TreasuryVault(address(usdc), address(policyEngine));
        registry       = new IntentRegistry(
            address(policyEngine),
            address(vault),
            address(ledgerContract)
        );

        // Wire vault → registry (one-time)
        vault.setIntentRegistry(address(registry));

        // Authorize registry to record ledger entries
        ledgerContract.setAuthorized(address(registry), true);
    }

    function test_goldenPath_endToEnd() public {
        // 2. Owner creates "Vendor Payment" policy (source=0, dest=0, maxAmount=10_000 mUSDC)
        uint256 policyId = policyEngine.createPolicy(
            "Vendor Payment",
            "payment",
            address(0),   // any source
            address(0),   // any destination
            10_000e6,     // max 10,000 mUSDC
            "{\"requires_approval\":true}"
        );
        assertEq(policyId, 1);

        // 3. Mint 5,000 mUSDC to initiator; initiator approves vault
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        // 4. Initiator calls createIntent(1, 5_000e6, recipient)
        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);
        assertEq(intentId, 1);

        // 5. Approver (different address) calls approveIntent — succeeds
        vm.prank(approver);
        registry.approveIntent(intentId);

        // Verify intent state
        (,address storedInitiator,, uint256 storedAmount,, address storedApprover, IntentRegistry.IntentStatus status,)
            = registry.intents(intentId);
        assertEq(storedInitiator, initiator);
        assertEq(storedAmount, AMOUNT);
        assertEq(storedApprover, approver);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Approved));

        // 6. Initiator attempts approveIntent on their own intent — reverts "Cannot self-approve"
        vm.prank(initiator);
        vm.expectRevert("Not pending"); // already Approved, so "Not pending" fires first
        registry.approveIntent(intentId);

        // 7. Initiator calls executeIntent
        uint256 recipientBefore = usdc.balanceOf(recipient);

        vm.prank(initiator);
        registry.executeIntent(intentId);

        // 8. Assert: recipient balance = 5,000 mUSDC
        assertEq(usdc.balanceOf(recipient), recipientBefore + AMOUNT);

        // 9. Assert: vault balance = 0 (pass-through transfer)
        assertEq(vault.balance(), 0);

        // 10. Assert: IntentExecuted event — checked via status
        (,,,,,, IntentRegistry.IntentStatus finalStatus,) = registry.intents(intentId);
        assertEq(uint256(finalStatus), uint256(IntentRegistry.IntentStatus.Executed));
    }

    function test_goldenPath_selfApproveReverts() public {
        uint256 policyId = policyEngine.createPolicy(
            "Vendor Payment", "payment", address(0), address(0), 10_000e6, "{}"
        );
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);

        vm.prank(initiator);
        vm.expectRevert("Cannot self-approve");
        registry.approveIntent(intentId);
    }

    function test_goldenPath_directVaultCallReverts() public {
        uint256 policyId = policyEngine.createPolicy(
            "Vendor Payment", "payment", address(0), address(0), 10_000e6, "{}"
        );

        // 13. Direct call to vault.executeApprovedIntent from non-registry reverts
        vm.prank(stranger);
        vm.expectRevert("Only IntentRegistry");
        vault.executeApprovedIntent(initiator, recipient, AMOUNT, policyId);

        // Even deployer (owner) cannot directly call
        vm.prank(deployer);
        vm.expectRevert("Only IntentRegistry");
        vault.executeApprovedIntent(initiator, recipient, AMOUNT, policyId);
    }

    function test_goldenPath_invalidPolicyBlocksCreate() public {
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.createIntent(999, AMOUNT, recipient); // non-existent policy
    }

    function test_goldenPath_inactivePolicyBlocksCreate() public {
        uint256 policyId = policyEngine.createPolicy(
            "VP", "payment", address(0), address(0), 10_000e6, "{}"
        );
        policyEngine.setPolicyActive(policyId, false);

        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        vm.expectRevert("Policy rejected");
        registry.createIntent(policyId, AMOUNT, recipient);
    }

    function test_goldenPath_executeBeforeApprovalReverts() public {
        uint256 policyId = policyEngine.createPolicy(
            "VP", "payment", address(0), address(0), 10_000e6, "{}"
        );
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);

        vm.prank(initiator);
        vm.expectRevert("Not approved");
        registry.executeIntent(intentId);
    }

    function test_goldenPath_nonInitiatorCannotExecute() public {
        uint256 policyId = policyEngine.createPolicy(
            "VP", "payment", address(0), address(0), 10_000e6, "{}"
        );
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);

        vm.prank(approver);
        registry.approveIntent(intentId);

        vm.prank(stranger);
        vm.expectRevert("Only initiator can execute");
        registry.executeIntent(intentId);
    }

    function test_goldenPath_ledgerAndAuditEventsEmitted() public {
        uint256 policyId = policyEngine.createPolicy(
            "VP", "payment", address(0), address(0), 10_000e6, "{}"
        );
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);

        vm.prank(approver);
        registry.approveIntent(intentId);

        // Expect all three audit events in the executeIntent transaction
        vm.recordLogs();
        vm.prank(initiator);
        registry.executeIntent(intentId);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool foundIntentExecuted  = false;
        bool foundPolicyExecuted  = false;
        bool foundLedgerEntry     = false;
        bool foundLedgerPosted    = false;

        bytes32 intentExecutedSig  = keccak256("IntentExecuted(uint256,address)");
        bytes32 policyExecutedSig  = keccak256("PolicyExecuted(uint256,address,address,uint256,uint256)");
        bytes32 ledgerRecordedSig  = keccak256("LedgerEntryRecorded(address,address,uint256,string,bytes32,uint256,uint256)");
        bytes32 ledgerPostedSig    = keccak256("LedgerEntryPosted(uint256,uint256)");

        for (uint i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == intentExecutedSig)  foundIntentExecuted = true;
            if (logs[i].topics[0] == policyExecutedSig)  foundPolicyExecuted = true;
            if (logs[i].topics[0] == ledgerRecordedSig)  foundLedgerEntry    = true;
            if (logs[i].topics[0] == ledgerPostedSig)    foundLedgerPosted   = true;
        }

        assertTrue(foundIntentExecuted,  "IntentExecuted not emitted");
        assertTrue(foundPolicyExecuted,  "PolicyExecuted not emitted");
        assertTrue(foundLedgerEntry,     "LedgerEntryRecorded not emitted");
        assertTrue(foundLedgerPosted,    "LedgerEntryPosted not emitted");
    }

    function test_goldenPath_initiatorCanCancelPending() public {
        uint256 policyId = policyEngine.createPolicy(
            "VP", "payment", address(0), address(0), 10_000e6, "{}"
        );
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);

        vm.prank(initiator);
        registry.cancelIntent(intentId, "testing cancel");

        (,,,,,, IntentRegistry.IntentStatus status,) = registry.intents(intentId);
        assertEq(uint256(status), uint256(IntentRegistry.IntentStatus.Rejected));
    }

    function test_goldenPath_nonInitiatorCannotCancel() public {
        uint256 policyId = policyEngine.createPolicy(
            "VP", "payment", address(0), address(0), 10_000e6, "{}"
        );
        usdc.mint(initiator, AMOUNT);
        vm.prank(initiator);
        usdc.approve(address(vault), AMOUNT);

        vm.prank(initiator);
        uint256 intentId = registry.createIntent(policyId, AMOUNT, recipient);

        vm.prank(stranger);
        vm.expectRevert("Only initiator can cancel");
        registry.cancelIntent(intentId, "attempted hijack");
    }
}
