// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ITreasuryInterfaces.sol";

/// @title IntentRegistry
/// @notice Owns the payment-request lifecycle:
///           Pending → Approved → Executed (or Rejected/Cancelled by initiator).
///
///         Key invariants enforced onchain:
///           • createIntent validates the policy BEFORE storing the intent —
///             no wasted token-approval tx on a rejected policy.
///           • approveIntent uses msg.sender; initiator != approver enforced.
///           • executeIntent only callable by the original initiator.
///           • executeIntent requires Approved status.
///           • Actual fund movement happens inside TreasuryVault, gated by
///             the onlyIntentRegistry modifier there.
///           • txHash is never a parameter — the audit UI reads it from the receipt.
contract IntentRegistry {
    enum IntentStatus {
        Pending,
        Approved,
        Executed,
        Rejected
    }

    struct Intent {
        uint256 id;
        address initiator;
        uint256 policyId;
        uint256 amount;
        address destination;
        address approver;
        IntentStatus status;
        uint256 createdAt;
    }

    address public immutable policyEngine;
    address public immutable vault;
    address public immutable ledger;

    uint256 public nextIntentId = 1;
    mapping(uint256 => Intent) public intents;
    /// @notice Tracks whether a specific address has already approved an intent.
    mapping(uint256 => mapping(address => bool)) public approvals;

    // ── Events ──────────────────────────────────────────────────────────────────

    /// @dev Emitted on createIntent. Includes initiator for audit display.
    event IntentCreated(
        uint256 indexed intentId,
        uint256 indexed policyId,
        uint256 amount,
        address indexed destination,
        address initiator
    );

    /// @dev Emitted on approveIntent. msg.sender is the approver.
    event IntentApproved(uint256 indexed intentId, address indexed approver);

    /// @dev Emitted on executeIntent. executor == initiator (enforced).
    event IntentExecuted(uint256 indexed intentId, address indexed executor);

    /// @dev Emitted on cancelIntent. cancelledBy == initiator (enforced).
    event IntentRejected(uint256 indexed intentId, address indexed cancelledBy, string reason);

    /// @dev Emitted alongside IntentExecuted to surface the block for audit indexing.
    event LedgerEntryPosted(uint256 indexed intentId, uint256 blockNumber);

    constructor(address _policyEngine, address _vault, address _ledger) {
        require(_policyEngine != address(0), "Invalid policyEngine");
        require(_vault != address(0), "Invalid vault");
        require(_ledger != address(0), "Invalid ledger");
        policyEngine = _policyEngine;
        vault = _vault;
        ledger = _ledger;
    }

    // ── createIntent ─────────────────────────────────────────────────────────

    /// @notice Create a payment intent. Policy is validated BEFORE storing,
    ///         so a rejected policy never forces a wasted approve() tx on the user.
    /// @param policyId    Policy to gate this intent.
    /// @param amount      Transfer amount in token base units.
    /// @param destination Recipient address.
    function createIntent(
        uint256 policyId,
        uint256 amount,
        address destination
    ) external returns (uint256 intentId) {
        require(
            IPolicyEngine(policyEngine).validateIntent(policyId, msg.sender, destination, amount),
            "Policy rejected"
        );
        require(amount > 0, "Invalid amount");
        require(destination != address(0), "Invalid destination");

        intentId = nextIntentId++;
        intents[intentId] = Intent({
            id: intentId,
            initiator: msg.sender,
            policyId: policyId,
            amount: amount,
            destination: destination,
            approver: address(0),
            status: IntentStatus.Pending,
            createdAt: block.timestamp
        });

        emit IntentCreated(intentId, policyId, amount, destination, msg.sender);
    }

    // ── approveIntent ─────────────────────────────────────────────────────────

    /// @notice Approve a pending intent. msg.sender becomes the approver.
    ///         Enforces maker-checker: initiator cannot approve their own intent.
    /// @param intentId ID of the intent to approve.
    function approveIntent(uint256 intentId) external {
        Intent storage intent = intents[intentId];
        require(intent.id != 0, "Not found");
        require(intent.status == IntentStatus.Pending, "Not pending");
        require(msg.sender != intent.initiator, "Cannot self-approve");
        require(!approvals[intentId][msg.sender], "Already approved");

        approvals[intentId][msg.sender] = true;
        intent.approver = msg.sender;
        intent.status = IntentStatus.Approved;

        emit IntentApproved(intentId, msg.sender);
    }

    // ── executeIntent ─────────────────────────────────────────────────────────

    /// @notice Execute an approved intent. Only the original initiator may call.
    ///         Calls TreasuryVault.executeApprovedIntent (which re-validates policy).
    ///         Records a ledger entry (best-effort — failure does not revert).
    ///         txHash is never passed as a parameter; the audit UI reads it from the receipt.
    /// @param intentId ID of the approved intent to execute.
    function executeIntent(uint256 intentId) external {
        Intent storage intent = intents[intentId];
        require(intent.id != 0, "Not found");
        require(intent.status == IntentStatus.Approved, "Not approved");
        require(msg.sender == intent.initiator, "Only initiator can execute");

        intent.status = IntentStatus.Executed;

        // Trigger fund movement via vault (vault enforces onlyIntentRegistry)
        ITreasuryVault(vault).executeApprovedIntent(
            intent.initiator,
            intent.destination,
            intent.amount,
            intent.policyId
        );

        // Record ledger entry (best-effort — intentRef = bytes32(intentId), not a tx hash)
        try ILedgerContract(ledger).recordEntry(
            intent.initiator,
            intent.destination,
            intent.amount,
            "mUSDC",
            bytes32(uint256(intentId)),
            block.number
        ) {} catch {}

        emit IntentExecuted(intentId, msg.sender);
        emit LedgerEntryPosted(intentId, block.number);
    }

    // ── cancelIntent ──────────────────────────────────────────────────────────

    /// @notice Cancel a pending intent. Only the initiator may cancel.
    ///         Approver-side rejection is deferred to P1.
    /// @param intentId ID of the pending intent to cancel.
    /// @param reason   Human-readable cancellation reason for the audit record.
    function cancelIntent(uint256 intentId, string calldata reason) external {
        Intent storage intent = intents[intentId];
        require(intent.id != 0, "Not found");
        require(intent.status == IntentStatus.Pending, "Not pending");
        require(msg.sender == intent.initiator, "Only initiator can cancel");

        intent.status = IntentStatus.Rejected;
        emit IntentRejected(intentId, msg.sender, reason);
    }
}
