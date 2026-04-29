// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPolicyEngine {
    function validateIntent(
        uint256 policyId,
        address source,
        address destination,
        uint256 amount
    ) external view returns (bool);
}

interface ITreasuryVault {
    function executeApprovedIntent(
        address initiator,
        address destination,
        uint256 amount,
        uint256 policyId
    ) external;
}

interface ILedgerContract {
    function recordEntry(
        address from,
        address to,
        uint256 amount,
        string calldata asset,
        bytes32 intentRef,
        uint256 blockNumber
    ) external;
}
