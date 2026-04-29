// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LedgerContract
/// @notice Append-only onchain ledger. Records a compact entry for every
///         executed treasury intent. The `intentRef` field contains
///         bytes32(uint256(intentId)) — a non-zero, unique reference to the
///         IntentRegistry entry. It is NOT a transaction hash; the audit UI
///         reads the real txHash from the receipt of the executeIntent call.
contract LedgerContract is Ownable {
    constructor() Ownable(msg.sender) {}

    /// @notice Addresses allowed to call recordEntry in addition to the owner.
    mapping(address => bool) public authorized;

    event LedgerEntryRecorded(
        address indexed from,
        address indexed to,
        uint256 amount,
        string asset,
        bytes32 indexed intentRef, // bytes32(uint256(intentId)) — not a tx hash
        uint256 blockNumber,
        uint256 timestamp
    );

    /// @notice Grant or revoke recording rights to a contract (e.g. IntentRegistry).
    function setAuthorized(address caller, bool enabled) external onlyOwner {
        authorized[caller] = enabled;
    }

    modifier onlyRecorder() {
        require(msg.sender == owner() || authorized[msg.sender], "Not authorized");
        _;
    }

    /// @notice Record a ledger entry. Called by IntentRegistry during executeIntent.
    /// @param from       Initiator address (tokens leave from here).
    /// @param to         Destination address.
    /// @param amount     Amount transferred in token base units.
    /// @param asset      Asset symbol string (e.g. "mUSDC").
    /// @param intentRef  bytes32(uint256(intentId)) — unique non-zero reference.
    /// @param blockNumber Block number of the executeIntent transaction.
    function recordEntry(
        address from,
        address to,
        uint256 amount,
        string calldata asset,
        bytes32 intentRef,
        uint256 blockNumber
    ) external onlyRecorder {
        require(from != address(0), "Invalid from");
        require(to != address(0), "Invalid to");
        require(amount > 0, "Invalid amount");
        require(bytes(asset).length > 0, "Invalid asset");
        require(intentRef != bytes32(0), "Invalid intentRef");

        emit LedgerEntryRecorded(from, to, amount, asset, intentRef, blockNumber, block.timestamp);
    }
}
