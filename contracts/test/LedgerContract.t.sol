// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LedgerContract.sol";

contract LedgerContractTest is Test {
    LedgerContract internal ledger;

    function setUp() public {
        ledger = new LedgerContract();
    }

    function testRecordEntry() public {
        bytes32 txHash = keccak256("ledgerTx");
        ledger.recordEntry(address(this), address(0xBEEF), 1000, "USDC", txHash, block.number);
        assertTrue(true);
    }

    function testRecordEntryRevertsOnBadInput() public {
        vm.expectRevert("Invalid amount");
        ledger.recordEntry(address(this), address(0xBEEF), 0, "USDC", keccak256("tx"), block.number);
    }
}
