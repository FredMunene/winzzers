// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {WinzzersMarket}from "../src/BetFactory.sol";

contract CounterScript is Script {
    WinzzersMarket public counter;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
        // Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        // Protocol fee: 200 = 2%
        counter = new WinzzersMarket(0x036CbD53842c5426634e7929541eC2318f3dCF7e, 200);

        vm.stopBroadcast();
    }
}

