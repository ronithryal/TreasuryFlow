// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ITreasuryInterfaces.sol";

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title TreasuryVault
/// @notice Holds no public execution entrypoint. Fund movements are gated
///         exclusively through IntentRegistry via executeApprovedIntent.
///         This enforces the onchain approval chain: no approval → no transfer.
contract TreasuryVault is Ownable {
    address public immutable token;
    address public immutable policyEngine;
    address public intentRegistry;

    /// @notice Tracks deposited balance per address for the faucet/withdraw flow.
    mapping(address => uint256) public deposited;

    event PolicyExecuted(
        uint256 indexed policyId,
        address indexed initiator,
        address indexed destination,
        uint256 amount,
        uint256 timestamp
    );

    event IntentRegistrySet(address intentRegistry);
    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);

    constructor(address _token, address _policyEngine) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        require(_policyEngine != address(0), "Invalid policyEngine");
        token = _token;
        policyEngine = _policyEngine;
    }

    /// @notice Wire the IntentRegistry address. One-time setter, owner-only.
    function setIntentRegistry(address _intentRegistry) external onlyOwner {
        require(intentRegistry == address(0), "Already set");
        require(_intentRegistry != address(0), "Invalid address");
        intentRegistry = _intentRegistry;
        emit IntentRegistrySet(_intentRegistry);
    }

    modifier onlyIntentRegistry() {
        require(msg.sender == intentRegistry, "Only IntentRegistry");
        _;
    }

    /// @notice Execute an approved intent. Called exclusively by IntentRegistry.
    ///         Validates policy again before touching funds (defense-in-depth).
    ///         Transfers tokens from initiator → vault → destination atomically.
    /// @param initiator    Address that created the intent (tokens pulled from here).
    /// @param destination  Payment destination.
    /// @param amount       Amount in token base units.
    /// @param policyId     Policy ID to re-validate.
    function executeApprovedIntent(
        address initiator,
        address destination,
        uint256 amount,
        uint256 policyId
    ) external onlyIntentRegistry {
        require(
            IPolicyEngine(policyEngine).validateIntent(policyId, initiator, destination, amount),
            "Policy rejected"
        );
        bool ok1 = IERC20Minimal(token).transferFrom(initiator, address(this), amount);
        require(ok1, "Pull failed");
        bool ok2 = IERC20Minimal(token).transfer(destination, amount);
        require(ok2, "Push failed");
        emit PolicyExecuted(policyId, initiator, destination, amount, block.timestamp);
    }

    /// @notice Lets a depositor withdraw their own faucet/demo funds.
    ///         Not used in the golden path — only for test USDC refunds.
    function withdraw(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(deposited[msg.sender] >= amount, "Insufficient balance");
        deposited[msg.sender] -= amount;
        bool ok = IERC20Minimal(token).transfer(msg.sender, amount);
        require(ok, "Transfer failed");
        emit Withdraw(msg.sender, amount);
    }

    /// @notice Returns the vault's current token balance (for monitoring).
    function balance() external view returns (uint256) {
        return IERC20Minimal(token).balanceOf(address(this));
    }
}
