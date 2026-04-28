// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyEngine is Ownable {
    constructor() Ownable(msg.sender) {}
    struct Policy {
        uint256 id;
        string name;
        string policyType;
        address source;
        address destination;
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
        string conditions,
        uint256 version
    );

    event PolicyUpdated(
        uint256 indexed policyId,
        string name,
        string policyType,
        address indexed source,
        address indexed destination,
        string conditions,
        uint256 version
    );

    event PolicyStatusChanged(uint256 indexed policyId, bool active, uint256 version);

    function createPolicy(
        string calldata name,
        string calldata policyType,
        address source,
        address destination,
        string calldata conditions
    ) external onlyOwner returns (uint256 policyId) {
        policyId = nextPolicyId++;
        policies[policyId] = Policy({
            id: policyId,
            name: name,
            policyType: policyType,
            source: source,
            destination: destination,
            conditions: conditions,
            version: 1,
            createdAt: block.timestamp,
            active: true
        });

        emit PolicyCreated(policyId, name, policyType, source, destination, conditions, 1);
    }

    function updatePolicy(
        uint256 policyId,
        string calldata name,
        string calldata policyType,
        address source,
        address destination,
        string calldata conditions,
        bool active
    ) external onlyOwner {
        Policy storage policy = policies[policyId];
        require(policy.id != 0, "Policy not found");

        policy.name = name;
        policy.policyType = policyType;
        policy.source = source;
        policy.destination = destination;
        policy.conditions = conditions;
        policy.active = active;
        policy.version += 1;

        emit PolicyUpdated(policyId, name, policyType, source, destination, conditions, policy.version);
    }

    function setPolicyActive(uint256 policyId, bool active) external onlyOwner {
        Policy storage policy = policies[policyId];
        require(policy.id != 0, "Policy not found");
        policy.active = active;
        policy.version += 1;
        emit PolicyStatusChanged(policyId, active, policy.version);
    }

    function validateIntent(
        uint256 policyId,
        address source,
        address destination,
        uint256 amount
    ) external view returns (bool valid) {
        Policy storage policy = policies[policyId];
        if (policy.id == 0 || !policy.active) return false;
        if (source != policy.source) return false;
        if (destination != policy.destination) return false;
        if (amount == 0) return false;
        return true;
    }
}
