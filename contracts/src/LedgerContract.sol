// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LedgerContract is Ownable {
    constructor() Ownable(msg.sender) {}
    event LedgerEntryRecorded(
        address indexed from,
        address indexed to,
        uint256 amount,
        string asset,
        bytes32 indexed txHash,
        uint256 blockNumber,
        uint256 timestamp
    );

    function recordEntry(
        address from,
        address to,
        uint256 amount,
        string calldata asset,
        bytes32 txHash,
        uint256 blockNumber
    ) external onlyOwner {
        require(from != address(0), "Invalid from");
        require(to != address(0), "Invalid to");
        require(amount > 0, "Invalid amount");
        require(bytes(asset).length > 0, "Invalid asset");
        require(txHash != bytes32(0), "Invalid tx hash");

        emit LedgerEntryRecorded(from, to, amount, asset, txHash, blockNumber, block.timestamp);
    }
}
