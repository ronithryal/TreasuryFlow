// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// Treasury vault that records sweeps, rebalances, and yield deposits. Each
/// `executePolicy` call pulls tokens from msg.sender and emits a
/// `PolicyExecuted` log keyed by an offchain policy id — that's the audit
/// trail the UI reads back via Alchemy.
contract TreasuryVault {
    address public immutable token;
    mapping(address => uint256) public deposited;

    /// `policyId` is a string so the testnet demo can pass the same
    /// `pol_xxx` ids the Zustand store uses, no mapping table needed.
    event PolicyExecuted(
        string policyId,
        address indexed source,
        address indexed destination,
        uint256 amount,
        string action,
        uint256 timestamp
    );

    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);

    constructor(address _token) {
        require(_token != address(0), "Invalid token");
        token = _token;
    }

    /// Executes a policy-driven transfer. The vault custodies the tokens; the
    /// log proves the policy ran. `destination` is informational so investors
    /// see where it would have gone in production (Morpho, ops account, etc).
    function executePolicy(
        string calldata policyId,
        address destination,
        uint256 amount,
        string calldata action
    ) external {
        require(amount > 0, "Invalid amount");
        require(bytes(policyId).length > 0, "Invalid policyId");
        require(bytes(action).length > 0, "Invalid action");

        bool ok = IERC20Minimal(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "Transfer failed");

        emit PolicyExecuted(policyId, msg.sender, destination, amount, action, block.timestamp);
        deposited[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /// Lets the depositor pull their own funds back out (useful for the
    /// "withdraw" demo step). Not access-controlled because this is a testnet
    /// vault — production would gate this behind a Safe.
    function withdraw(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(deposited[msg.sender] >= amount, "Insufficient balance");
        deposited[msg.sender] -= amount;
        bool ok = IERC20Minimal(token).transfer(msg.sender, amount);
        require(ok, "Transfer failed");
        emit Withdraw(msg.sender, amount);
    }

    function balance() external view returns (uint256) {
        return IERC20Minimal(token).balanceOf(address(this));
    }
}
