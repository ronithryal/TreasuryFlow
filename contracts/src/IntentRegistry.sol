// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract IntentRegistry {
    enum IntentStatus {
        Pending,
        Approved,
        Executed,
        Rejected
    }

    struct Intent {
        uint256 id;
        uint256 policyId;
        uint256 amount;
        address destination;
        address createdBy;
        IntentStatus status;
        bytes32 txHash;
        uint256 createdAt;
    }

    uint256 public nextIntentId = 1;
    mapping(uint256 => Intent) public intents;
    mapping(uint256 => mapping(address => bool)) public approvals;

    event IntentCreated(
        uint256 indexed intentId,
        uint256 indexed policyId,
        uint256 amount,
        address indexed destination,
        address createdBy
    );
    event IntentApproved(uint256 indexed intentId, address indexed approver);
    event IntentExecuted(uint256 indexed intentId, bytes32 indexed txHash);
    event IntentRejected(uint256 indexed intentId, address indexed rejectedBy, string reason);
    event LedgerEntryPosted(uint256 indexed intentId, bytes32 indexed txHash, uint256 blockNumber);

    function createIntent(uint256 policyId, uint256 amount, address destination) external returns (uint256 intentId) {
        require(amount > 0, "Invalid amount");
        require(destination != address(0), "Invalid destination");

        intentId = nextIntentId++;
        intents[intentId] = Intent({
            id: intentId,
            policyId: policyId,
            amount: amount,
            destination: destination,
            createdBy: msg.sender,
            status: IntentStatus.Pending,
            txHash: bytes32(0),
            createdAt: block.timestamp
        });

        emit IntentCreated(intentId, policyId, amount, destination, msg.sender);
    }

    function approveIntent(uint256 intentId, address approver) external {
        Intent storage intent = intents[intentId];
        require(intent.id != 0, "Intent not found");
        require(intent.status == IntentStatus.Pending, "Intent not pending");
        require(!approvals[intentId][approver], "Already approved");

        approvals[intentId][approver] = true;
        intent.status = IntentStatus.Approved;
        emit IntentApproved(intentId, approver);
    }

    function executeIntent(uint256 intentId, bytes32 txHash) external {
        Intent storage intent = intents[intentId];
        require(intent.id != 0, "Intent not found");
        require(intent.status == IntentStatus.Approved, "Intent not approved");
        require(txHash != bytes32(0), "Invalid tx hash");

        intent.status = IntentStatus.Executed;
        intent.txHash = txHash;

        emit IntentExecuted(intentId, txHash);
        emit LedgerEntryPosted(intentId, txHash, block.number);
    }

    function rejectIntent(uint256 intentId, string calldata reason) external {
        Intent storage intent = intents[intentId];
        require(intent.id != 0, "Intent not found");
        require(intent.status == IntentStatus.Pending || intent.status == IntentStatus.Approved, "Cannot reject");

        intent.status = IntentStatus.Rejected;
        emit IntentRejected(intentId, msg.sender, reason);
    }
}
