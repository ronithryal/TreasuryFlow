// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC usdc;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
    }

    // ── metadata ───────────────────────────────────────────────────────────────

    function test_metadata() public view {
        assertEq(usdc.name(),     "TreasuryFlow Mock USDC");
        assertEq(usdc.symbol(),   "mUSDC");
        assertEq(usdc.decimals(), 6);
    }

    // ── mint ───────────────────────────────────────────────────────────────────

    function test_mint_increasesBalanceAndSupply() public {
        usdc.mint(alice, 1_000e6);
        assertEq(usdc.balanceOf(alice), 1_000e6);
        assertEq(usdc.totalSupply(),    1_000e6);
    }

    function test_mint_multipleRecipients() public {
        usdc.mint(alice, 500e6);
        usdc.mint(bob,   300e6);
        assertEq(usdc.totalSupply(), 800e6);
    }

    function test_mint_emitsTransferFromZero() public {
        vm.expectEmit(true, true, false, true);
        emit MockUSDC.Transfer(address(0), alice, 1_000e6);
        usdc.mint(alice, 1_000e6);
    }

    function test_mint_revertsOnZeroAddress() public {
        vm.expectRevert("Invalid recipient");
        usdc.mint(address(0), 1_000e6);
    }

    function test_mint_zeroAmountIsAllowed() public {
        usdc.mint(alice, 0);
        assertEq(usdc.balanceOf(alice), 0);
    }

    // ── transfer ───────────────────────────────────────────────────────────────

    function test_transfer_movesTokens() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.transfer(bob, 400e6);
        assertEq(usdc.balanceOf(alice), 600e6);
        assertEq(usdc.balanceOf(bob),   400e6);
    }

    function test_transfer_emitsEvent() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit MockUSDC.Transfer(alice, bob, 400e6);
        usdc.transfer(bob, 400e6);
    }

    function test_transfer_revertsOnInsufficientBalance() public {
        usdc.mint(alice, 100e6);
        vm.prank(alice);
        vm.expectRevert("Insufficient balance");
        usdc.transfer(bob, 101e6);
    }

    function test_transfer_revertsToZeroAddress() public {
        usdc.mint(alice, 100e6);
        vm.prank(alice);
        vm.expectRevert("Invalid recipient");
        usdc.transfer(address(0), 100e6);
    }

    // ── approve / allowance ────────────────────────────────────────────────────

    function test_approve_setsAllowance() public {
        vm.prank(alice);
        usdc.approve(bob, 500e6);
        assertEq(usdc.allowance(alice, bob), 500e6);
    }

    function test_approve_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit MockUSDC.Approval(alice, bob, 500e6);
        usdc.approve(bob, 500e6);
    }

    function test_approve_canOverwrite() public {
        vm.startPrank(alice);
        usdc.approve(bob, 500e6);
        usdc.approve(bob, 200e6);
        vm.stopPrank();
        assertEq(usdc.allowance(alice, bob), 200e6);
    }

    // ── transferFrom ───────────────────────────────────────────────────────────

    function test_transferFrom_consumesAllowance() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(bob, 500e6);

        vm.prank(bob);
        usdc.transferFrom(alice, bob, 300e6);

        assertEq(usdc.balanceOf(alice),    700e6);
        assertEq(usdc.balanceOf(bob),      300e6);
        assertEq(usdc.allowance(alice, bob), 200e6);
    }

    function test_transferFrom_maxAllowanceDoesNotDecrease() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(bob, type(uint256).max);

        vm.prank(bob);
        usdc.transferFrom(alice, bob, 500e6);

        assertEq(usdc.allowance(alice, bob), type(uint256).max);
    }

    function test_transferFrom_revertsOnInsufficientAllowance() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(bob, 100e6);

        vm.prank(bob);
        vm.expectRevert("Insufficient allowance");
        usdc.transferFrom(alice, bob, 101e6);
    }

    function test_transferFrom_revertsWithoutApproval() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(bob);
        vm.expectRevert("Insufficient allowance");
        usdc.transferFrom(alice, bob, 1e6);
    }

    function test_transferFrom_revertsToZeroAddress() public {
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(bob, 500e6);

        vm.prank(bob);
        vm.expectRevert("Invalid recipient");
        usdc.transferFrom(alice, address(0), 100e6);
    }
}
