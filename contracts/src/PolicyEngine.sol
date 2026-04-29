// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PolicyEngine
/// @notice Stores treasury payment policies and validates intent requests against them.
///         createPolicy is owner-only — demo policies are pre-deployed at launch.
///         address(0) in source/destination acts as a wildcard (any address accepted).
///         maxAmount == 0 means uncapped.
contract PolicyEngine is Ownable {
    constructor() Ownable(msg.sender) {}

    struct Policy {
        uint256 id;
        string name;
        string policyType;
        address source;      // address(0) = any source
        address destination; // address(0) = any destination
        uint256 maxAmount;   // 0 = uncapped
        string conditions;
        uint256 version;
        uint256 createdAt;
        bool active;
    }

    uint256 public nextPolicyId = 1;
    mapping(uint256 => Policy) public policies;

    event PolicyCreated(
        uint256 indexed policyId,
        string name,
        string policyType,
        address indexed source,
        address indexed destination,
        uint256 maxAmount,
        string conditions,
        uint256 version
    );

    event PolicyUpdated(
        uint256 indexed policyId,
        string name,
        string policyType,
        address indexed source,
        address indexed destination,
        uint256 maxAmount,
        string conditions,
        uint256 version
    );

    event PolicyStatusChanged(uint256 indexed policyId, bool active, uint256 version);

    /// @notice Create a new policy. Restricted to owner.
    /// @param name         Human-readable policy name.
    /// @param policyType   Category string (e.g. "payment", "sweep", "deposit_routing").
    /// @param source       Required initiator address; address(0) = any source.
    /// @param destination  Required destination address; address(0) = any destination.
    /// @param maxAmount    Maximum per-intent amount in token base units; 0 = uncapped.
    /// @param conditions   Freeform conditions JSON/string for audit records.
    function createPolicy(
        string calldata name,
        string calldata policyType,
        address source,
        address destination,
        uint256 maxAmount,
        string calldata conditions
    ) external onlyOwner returns (uint256 policyId) {
        policyId = nextPolicyId++;
        policies[policyId] = Policy({
            id: policyId,
            name: name,
            policyType: policyType,
            source: source,
            destination: destination,
            maxAmount: maxAmount,
            conditions: conditions,
            version: 1,
            createdAt: block.timestamp,
            active: true
        });

        emit PolicyCreated(policyId, name, policyType, source, destination, maxAmount, conditions, 1);
    }

    /// @notice Update an existing policy. Restricted to owner.
    function updatePolicy(
        uint256 policyId,
        string calldata name,
        string calldata policyType,
        address source,
        address destination,
        uint256 maxAmount,
        string calldata conditions,
        bool active
    ) external onlyOwner {
        Policy storage policy = policies[policyId];
        require(policy.id != 0, "Policy not found");

        policy.name = name;
        policy.policyType = policyType;
        policy.source = source;
        policy.destination = destination;
        policy.maxAmount = maxAmount;
        policy.conditions = conditions;
        policy.active = active;
        policy.version += 1;

        emit PolicyUpdated(policyId, name, policyType, source, destination, maxAmount, conditions, policy.version);
    }

    /// @notice Activate or deactivate a policy. Restricted to owner.
    function setPolicyActive(uint256 policyId, bool active) external onlyOwner {
        Policy storage policy = policies[policyId];
        require(policy.id != 0, "Policy not found");
        policy.active = active;
        policy.version += 1;
        emit PolicyStatusChanged(policyId, active, policy.version);
    }

    /// @notice Validate whether an intent satisfies a given policy.
    ///         Returns false (does not revert) so callers can branch cleanly.
    /// @param policyId   ID of the policy to check.
    /// @param source     The initiator address.
    /// @param destination The payment destination address.
    /// @param amount     The requested transfer amount.
    function validateIntent(
        uint256 policyId,
        address source,
        address destination,
        uint256 amount
    ) external view returns (bool) {
        Policy storage p = policies[policyId];
        if (p.id == 0 || !p.active) return false;
        if (p.source != address(0) && p.source != source) return false;
        if (p.destination != address(0) && p.destination != destination) return false;
        if (p.maxAmount > 0 && amount > p.maxAmount) return false;
        if (amount == 0) return false;
        return true;
    }
}
