// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {WinzzersMarket} from "../src/BetFactory.sol";

contract CounterTest is Test {
    WinzzersMarket   public counter;

    function setUp() public {
        counter = new  WinzzersMarket(0xE4aB69C077896252FAFBD49EFD26B5D171A32410,200);
        
    }
}
