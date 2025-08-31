// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {WinzzersMarket}from "../src/BetFactory.sol";

contract CounterScript is Script {
    WinzzersMarket public counter;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        counter = new  WinzzersMarket(0xE4aB69C077896252FAFBD49EFD26B5D171A32410,200);

        vm.stopBroadcast();
    }
}
