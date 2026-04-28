// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/TreasuryVault.sol";

contract TreasuryVaultTest is Test {
    MockUSDC usdc;
    TreasuryVault vault;
    address user = address(0xBEEF);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new TreasuryVault(address(usdc));
        usdc.mint(user, 100_000e6);
    }

    function test_executePolicy_pullsFundsAndEmits() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 50_000e6);

        vm.expectEmit(false, true, true, true);
        emit TreasuryVault.PolicyExecuted("pol_sweep_1", user, address(0xDEAD), 50_000e6, "sweep", block.timestamp);

        vault.executePolicy("pol_sweep_1", address(0xDEAD), 50_000e6, "sweep");
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(vault)), 50_000e6);
        assertEq(usdc.balanceOf(user), 50_000e6);
    }

    function test_withdraw_returnsFunds() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 50_000e6);
        vault.executePolicy("pol_sweep_1", address(0xDEAD), 50_000e6, "sweep");
        vault.withdraw(20_000e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(user), 70_000e6);
        assertEq(vault.balance(), 30_000e6);
    }

    function test_executePolicy_revertsOnZeroAmount() public {
        vm.startPrank(user);
        vm.expectRevert(bytes("Invalid amount"));
        vault.executePolicy("pol_x", address(0xDEAD), 0, "sweep");
        vm.stopPrank();
    }
}
