// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LedgerContract.sol";

contract LedgerContractTest is Test {
    LedgerContract internal ledger;

    address owner      = address(this);
    address from       = address(0xA11CE);
    address to         = address(0xBEEF);
    address authorized = address(0xA070);
    address attacker   = address(0xBAD);

    // intentRef = bytes32(uint256(intentId)), not a tx hash
    bytes32 intentRef = bytes32(uint256(42));

    function setUp() public {
        ledger = new LedgerContract();
    }

    // ── owner recording ────────────────────────────────────────────────────────

    function testRecordEntry_ownerSucceeds() public {
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", intentRef, block.number);
        assertTrue(true);
    }

    function test_recordEntry_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit LedgerContract.LedgerEntryRecorded(from, to, 1_000e6, "mUSDC", intentRef, block.number, block.timestamp);
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", intentRef, block.number);
    }

    // ── authorized caller ──────────────────────────────────────────────────────

    function test_setAuthorized_onlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        ledger.setAuthorized(attacker, true);
    }

    function test_authorizedCaller_canRecord() public {
        ledger.setAuthorized(authorized, true);
        vm.prank(authorized);
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", intentRef, block.number);
        assertTrue(true);
    }

    function test_unauthorizedCaller_reverts() public {
        vm.prank(attacker);
        vm.expectRevert("Not authorized");
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", intentRef, block.number);
    }

    function test_revokeAuthorization_reverts() public {
        ledger.setAuthorized(authorized, true);
        ledger.setAuthorized(authorized, false);
        vm.prank(authorized);
        vm.expectRevert("Not authorized");
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", intentRef, block.number);
    }

    // ── revert cases ───────────────────────────────────────────────────────────

    function test_recordEntry_revertsOnZeroAmount() public {
        vm.expectRevert("Invalid amount");
        ledger.recordEntry(from, to, 0, "mUSDC", intentRef, block.number);
    }

    function test_recordEntry_revertsOnZeroFrom() public {
        vm.expectRevert("Invalid from");
        ledger.recordEntry(address(0), to, 1_000e6, "mUSDC", intentRef, block.number);
    }

    function test_recordEntry_revertsOnZeroTo() public {
        vm.expectRevert("Invalid to");
        ledger.recordEntry(from, address(0), 1_000e6, "mUSDC", intentRef, block.number);
    }

    function test_recordEntry_revertsOnEmptyAsset() public {
        vm.expectRevert("Invalid asset");
        ledger.recordEntry(from, to, 1_000e6, "", intentRef, block.number);
    }

    function test_recordEntry_revertsOnZeroIntentRef() public {
        vm.expectRevert("Invalid intentRef");
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", bytes32(0), block.number);
    }

    // ── multiple entries ───────────────────────────────────────────────────────

    function test_recordEntry_multipleEntriesSucceed() public {
        ledger.recordEntry(from, to, 1_000e6, "mUSDC", bytes32(uint256(1)), 1);
        ledger.recordEntry(from, to, 2_000e6, "mUSDC", bytes32(uint256(2)), 2);
        ledger.recordEntry(to,   from, 500e6,  "mUSDC", bytes32(uint256(3)), 3);
        assertTrue(true);
    }
}
