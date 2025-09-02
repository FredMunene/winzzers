// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {WinzzersMarket} from "../src/BetFactory.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract BetFactoryTest is Test {
    MockERC20 internal usdc;
    WinzzersMarket internal market;

    address internal platformOwner = address(this);
    address internal alice = address(0xA11CE);
    address internal bob   = address(0xB0B);

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "USDC", 6);
        // Mint funds to participants
        usdc.mint(alice, 1_000_000e6);
        usdc.mint(bob,   1_000_000e6);

        // Deploy market with protocol fee 2%
        market = new WinzzersMarket(address(usdc), 200);
    }

    function _createBasicMarket() internal returns (uint256 marketId) {
        string[] memory outcomes = new string[](2);
        outcomes[0] = "Yes";
        outcomes[1] = "No";
        marketId = market.createMarket(outcomes, 1_000e6, 100, 30 days);
    }

    function test_CreateMarket_IncrementsCounterAndStoresOutcomes() public {
        uint256 beforeCount = market.marketCounter();
        uint256 marketId = _createBasicMarket();
        assertEq(market.marketCounter(), beforeCount + 1);
        ( , , , , uint256 outcomeCount, , , , , , ) = market.getMarketSummary(marketId);
        assertEq(outcomeCount, 2);
        (string memory name0,, ,) = market.getOutcome(marketId, 0);
        (string memory name1,, ,) = market.getOutcome(marketId, 1);
        assertEq(name0, "Yes");
        assertEq(name1, "No");
    }

    function test_PlaceBet_TransfersFundsAndEmits() public {
        uint256 marketId = _createBasicMarket();

        vm.startPrank(alice);
        usdc.approve(address(market), 100e6);
        vm.stopPrank();

        vm.startPrank(alice);
        uint256 minOdds = market.getOutcomeOdds(marketId, 0);
        uint256 ticketId = market.placeBet(marketId, 0, 100e6, minOdds);
        vm.stopPrank();

        assertGt(ticketId, 0);
        // Alice balance decreased
        assertEq(usdc.balanceOf(alice), 1_000_000e6 - 100e6);
        // Contract balance increased
        assertEq(usdc.balanceOf(address(market)), 100e6);
    }

    function test_Lifecycle_LockResolveClaimAndFees() public {
        uint256 marketId = _createBasicMarket();

        // Two bettors place bets on different outcomes
        vm.startPrank(alice);
        usdc.approve(address(market), 500e6);
        uint256 minOddsYes = market.getOutcomeOdds(marketId, 0);
        market.placeBet(marketId, 0, 500e6, minOddsYes);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(market), 300e6);
        uint256 minOddsNo = market.getOutcomeOdds(marketId, 1);
        market.placeBet(marketId, 1, 300e6, minOddsNo);
        vm.stopPrank();

        // Creator locks market
        market.lockMarket(marketId);

        // Platform owner resolves with outcome 0 as winner
        market.setOutcome(marketId, 0);

        // Alice claims payout (she bet on winning outcome)
        // Ticket IDs are 1 then 2 per our sequence
        vm.startPrank(alice);
        market.claim(1);
        vm.stopPrank();

        // Protocol fee 2% of losing pool (300e6 * 2% = 6e6), creator fee 1% (=3e6)
        assertEq(market.protocolFeeBalance(), 6e6);

        // Creator withdraws fees
        uint256 creatorBefore = usdc.balanceOf(address(this));
        market.withdrawCreatorFees(address(this));
        uint256 creatorAfter = usdc.balanceOf(address(this));
        assertEq(creatorAfter - creatorBefore, 3e6);

        // Platform owner withdraws protocol fees
        uint256 ownerBefore = usdc.balanceOf(address(this));
        market.withdrawProtocolFees(address(this));
        uint256 ownerAfter = usdc.balanceOf(address(this));
        assertEq(ownerAfter - ownerBefore, 6e6);
    }
}
