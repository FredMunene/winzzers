// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

contract WinzzersMarket is ReentrancyGuard {
    IERC20 public immutable STAKE_TOKEN;     // global staking token (e.g., USDC)
    IERC20Permit public immutable STAKE_TOKEN_PERMIT; // permit interface for the same token
    address public immutable PLATFORM_OWNER; // deployer collects protocol fees
    uint16  public immutable PROTOCOL_FEE_BPS; // e.g., 200 = 2%

    enum MarketState { Open, Locked, Resolved, Voided }

    struct Outcome {
        string name;
        uint256 reserve;     // includes virtual liquidity + real stakes (for pricing)
        uint256 totalStaked; // real stakes only (used for payouts)
        bool exists;
    }

    struct Market {
        address creator;                // market (bet) creator
        MarketState state;
        uint16 creatorFeeBps;           // percent in bps taken from losing pool, goes to creator
        uint256 virtualLiquidityPerOutcome;
        uint256 outcomeCount;
        string[] outcomeNames;
        uint256 totalStaked;            // sum of totalStaked for outcomes (real)
        uint256 winningOutcome;         // set at resolution
        uint256 distributable;          // losingPool - fees, set at resolution
        bool exists;
    }

    struct Ticket {
        uint256 id;
        uint256 marketId;
        address bettor;
        uint256 outcomeId;
        uint256 stake;
        uint256 lockedOdds; // 1e18 scale
        uint256 weight;     // stake * (lockedOdds - 1e18) / 1e18
        uint256 timestamp;
    }

    // storage
    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(uint256 => Outcome)) public marketOutcomes; // marketId => outcomeId => Outcome

    uint256 public ticketCounter;
    mapping(uint256 => Ticket) public tickets;

    // fee balances
    uint256 public protocolFeeBalance; // denominated in token units
    mapping(address => uint256) public creatorFeeBalance; // market creator => amount

    // events
    event MarketCreated(uint256 indexed marketId, address indexed creator, string[] outcomeNames);
    event OutcomeAdded(uint256 indexed marketId, uint256 indexed outcomeId, string name, uint256 initialReserve);
    event BetPlaced(uint256 indexed ticketId, uint256 indexed marketId, address indexed bettor, uint256 outcomeId, uint256 stake, uint256 odds, uint256 weight);
    event MarketLocked(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, uint256 indexed winningOutcome, uint256 distributable, uint256 protocolFee, uint256 creatorFee);
    event MarketVoided(uint256 indexed marketId);
    event Payout(uint256 indexed ticketId, uint256 indexed marketId, address indexed bettor, uint256 amount);
    event ProtocolFeesWithdrawn(address indexed to, uint256 amount);
    event CreatorFeesWithdrawn(address indexed creator, address indexed to, uint256 amount);
    event OddsUpdated(uint256[] odds, uint256 timestamp);
    
    modifier onlyPlatformOwner() {
        require(msg.sender == PLATFORM_OWNER, "Not platform owner");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(markets[marketId].exists, "Market not found");
        _;
    }

    constructor(address stakingToken, uint16 protocolFeeBps) {
        require(stakingToken != address(0), "Invalid token");
        require(protocolFeeBps <= 2000, "protocol fee too high");

        STAKE_TOKEN = IERC20(stakingToken);
        STAKE_TOKEN_PERMIT = IERC20Permit(stakingToken);
        PLATFORM_OWNER = msg.sender;
        PROTOCOL_FEE_BPS = protocolFeeBps;
    }

    // ---------------------------
    // Market creation (any user)
    // ---------------------------
    /// @notice Create a new market (bet). Caller becomes market.creator.
    /// @param _outcomeNames array of outcome names (2..20)
    /// @param virtualLiquidityPerOutcome virtual liquidity seed per outcome (token units)
    /// @param creatorFeeBps fee in bps taken from losing pool and given to market creator
    function createMarket(
        string[] calldata _outcomeNames,
        uint256 virtualLiquidityPerOutcome,
        uint16 creatorFeeBps
    ) external returns (uint256 marketId) {
        marketId = _createMarket(_outcomeNames, virtualLiquidityPerOutcome, creatorFeeBps);
    }

    function _createMarket(
        string[] calldata _outcomeNames,
        uint256 virtualLiquidityPerOutcome,
        uint16 creatorFeeBps
    ) internal returns (uint256 marketId) {
        require(_outcomeNames.length >= 2, "Need at least 2 outcomes");
        require(_outcomeNames.length <= 20, "Max 20 outcomes");
        require(virtualLiquidityPerOutcome > 0, "Invalid virtual liquidity");
        // ensure combined fee is sensible (protocol + creator <= 30% for example)
        require(uint256(PROTOCOL_FEE_BPS) + uint256(creatorFeeBps) <= 3000, "Fees too high");

        marketId = ++marketCounter;
        Market storage m = markets[marketId];
        m.creator = msg.sender;
        m.state = MarketState.Open;
        m.creatorFeeBps = creatorFeeBps;
        m.virtualLiquidityPerOutcome = virtualLiquidityPerOutcome;
        m.outcomeCount = _outcomeNames.length;
        m.totalStaked = 0;
        m.exists = true;

        for (uint256 i = 0; i < _outcomeNames.length; i++) {
            m.outcomeNames.push(_outcomeNames[i]);
            marketOutcomes[marketId][i] = Outcome({
                name: _outcomeNames[i],
                reserve: virtualLiquidityPerOutcome,
                totalStaked: 0,
                exists: true
            });
            emit OutcomeAdded(marketId, i, _outcomeNames[i], virtualLiquidityPerOutcome);
        }

        emit MarketCreated(marketId, msg.sender, _outcomeNames);
    }

    /// @dev Create market with initial stake using permit (ERC20Permit)
    /// @param _outcomeNames array of outcome names (2..20)
    /// @param virtualLiquidityPerOutcome virtual liquidity seed per outcome (token units)
    /// @param creatorFeeBps fee in bps taken from losing pool and given to market creator
    /// @param initialStakeAmount amount to stake on initial outcome (requires permit)
    /// @param initialOutcomeId outcome to place initial stake on
    /// @param minOdds minimum odds for initial bet (slippage protection)
    /// @param deadline permit deadline
    /// @param v permit signature v
    /// @param r permit signature r
    /// @param s permit signature s
    function createMarketWithStake(
        string[] calldata _outcomeNames,
        uint256 virtualLiquidityPerOutcome,
        uint16 creatorFeeBps,
        uint256 initialStakeAmount,
        uint256 initialOutcomeId,
        uint256 minOdds,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256 marketId, uint256 ticketId) {
        require(initialStakeAmount > 0, "Initial stake required");
        
        // Create the market first
        marketId = _createMarket(_outcomeNames, virtualLiquidityPerOutcome, creatorFeeBps);
        require(initialOutcomeId < _outcomeNames.length, "Invalid initial outcome");
        
        // Use permit to approve and transfer tokens
        STAKE_TOKEN_PERMIT.permit(msg.sender, address(this), initialStakeAmount, deadline, v, r, s);
        
        // Place the initial bet
        ticketId = _placeBetInternal(marketId, initialOutcomeId, initialStakeAmount, minOdds);
    }

    // ---------------------------
    // Views / odds
    // ---------------------------
    /// @notice Return odds (1e18) and names for a market
    function getMarketOdds(uint256 marketId) public view marketExists(marketId) returns (uint256[] memory odds, string[] memory names) {
        Market storage m = markets[marketId];
        odds = new uint256[](m.outcomeCount);
        names = new string[](m.outcomeCount);

        uint256 totalReserves = 0;
        for (uint256 i = 0; i < m.outcomeCount; i++) {
            totalReserves += marketOutcomes[marketId][i].reserve;
        }

        for (uint256 i = 0; i < m.outcomeCount; i++) {
            odds[i] = (totalReserves * 1e18) / marketOutcomes[marketId][i].reserve;
            names[i] = m.outcomeNames[i];
        }
    }

    /// @notice Get single outcome odds (1e18)
    function getOutcomeOdds(uint256 marketId, uint256 outcomeId) public view marketExists(marketId) returns (uint256) {
        require(marketOutcomes[marketId][outcomeId].exists, "Outcome missing");
        uint256 totalReserves = 0;
        for (uint256 i = 0; i < markets[marketId].outcomeCount; i++) {
            totalReserves += marketOutcomes[marketId][i].reserve;
        }
        return (totalReserves * 1e18) / marketOutcomes[marketId][outcomeId].reserve;
    }

    // ---------------------------
    // Place bets
    // ---------------------------
    /// @notice Place a bet on marketId/outcomeId using the global STAKE_TOKEN
    /// @param marketId id of the market
    /// @param outcomeId id of the chosen outcome
    /// @param amount token units to stake (ensure approval)
    /// @param minOdds slippage: require current odds >= minOdds (1e18)
    function placeBet(uint256 marketId, uint256 outcomeId, uint256 amount, uint256 minOdds)
        external
        nonReentrant
        returns (uint256 ticketId)
    {
        return _placeBetInternal(marketId, outcomeId, amount, minOdds);
    }

    /// @dev Place bet using permit (ERC20Permit) - no pre-approval needed
    /// @param marketId id of the market
    /// @param outcomeId id of the chosen outcome
    /// @param amount token units to stake
    /// @param minOdds slippage: require current odds >= minOdds (1e18)
    /// @param deadline permit deadline
    /// @param v permit signature v
    /// @param r permit signature r
    /// @param s permit signature s
    function placeBetWithPermit(
        uint256 marketId,
        uint256 outcomeId,
        uint256 amount,
        uint256 minOdds,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256 ticketId) {
        // Use permit to approve the transfer
        STAKE_TOKEN_PERMIT.permit(msg.sender, address(this), amount, deadline, v, r, s);
        
        // Place the bet
        return _placeBetInternal(marketId, outcomeId, amount, minOdds);
    }

    /// @dev Internal function to place a bet (used by both placeBet and placeBetWithPermit)
    function _placeBetInternal(uint256 marketId, uint256 outcomeId, uint256 amount, uint256 minOdds)
        internal
        marketExists(marketId)
        returns (uint256 ticketId)
    {
        Market storage m = markets[marketId];
        require(m.state == MarketState.Open, "Market not open");
        require(outcomeId < m.outcomeCount, "Invalid outcome");
        require(amount > 0, "Zero amount");

        uint256 currentOdds = getOutcomeOdds(marketId, outcomeId);
        require(currentOdds >= minOdds, "Odds moved");

        // transfer tokens from bettor
        require(STAKE_TOKEN.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // update reserves/pricing
        marketOutcomes[marketId][outcomeId].reserve += amount;

        // create ticket
        ticketId = ++ticketCounter;
        uint256 weight = (amount * (currentOdds - 1e18)) / 1e18; // stake * (odds-1)
        tickets[ticketId] = Ticket({
            id: ticketId,
            marketId: marketId,
            bettor: msg.sender,
            outcomeId: outcomeId,
            stake: amount,
            lockedOdds: currentOdds,
            weight: weight,
            timestamp: block.timestamp
        });

        // bookkeeping
        marketOutcomes[marketId][outcomeId].totalStaked += amount;
        m.totalStaked += amount;

        emit BetPlaced(ticketId, marketId, msg.sender, outcomeId, amount, currentOdds, weight);

        // emit odds snapshot (helpful for frontend)
        (uint256[] memory allOdds, ) = getMarketOdds(marketId);
        emit OddsUpdated(allOdds, block.timestamp);
    }

    // ---------------------------
    // Lifecycle: lock, resolve, void
    // ---------------------------
    /// @notice Market creator locks the market (prevent further bets)
    function lockMarket(uint256 marketId) external marketExists(marketId) {
        Market storage m = markets[marketId];
        require(msg.sender == m.creator, "Only market creator can lock");
        require(m.state == MarketState.Open, "Not open");
        m.state = MarketState.Locked;
        emit MarketLocked(marketId);
    }

    /// @notice Platform owner resolves the market (sets the winning outcome). Fees computed from losingPool.
    /// @dev Only platformOwner can call this (owner -> oracle later).
    function setOutcome(uint256 marketId, uint256 winningOutcome) external marketExists(marketId) onlyPlatformOwner {
        Market storage m = markets[marketId];
        require(m.state == MarketState.Locked, "Market must be locked");
        require(winningOutcome < m.outcomeCount, "Invalid outcome");

        // compute losing pool (real stakes on non-winning outcomes)
        uint256 losingPool = 0;
        for (uint256 i = 0; i < m.outcomeCount; i++) {
            if (i != winningOutcome) {
                losingPool += marketOutcomes[marketId][i].totalStaked;
            }
        }

        // compute fees from losing pool
        uint256 protocolFee = (losingPool * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee  = (losingPool * m.creatorFeeBps) / 10000;

        // record fee balances
        protocolFeeBalance += protocolFee;
        creatorFeeBalance[m.creator] += creatorFee;

        // distributable pool for winners
        uint256 distributable = 0;
        if (losingPool > protocolFee + creatorFee) {
            distributable = losingPool - protocolFee - creatorFee;
        } else {
            distributable = 0;
        }

        m.winningOutcome = winningOutcome;
        m.distributable = distributable;
        m.state = MarketState.Resolved;

        emit MarketResolved(marketId, winningOutcome, distributable, protocolFee, creatorFee);
    }

    /// @notice Void a market (refunds should be handled by claim/refund flow or admin). Only platform owner can void.
    function voidMarket(uint256 marketId) external marketExists(marketId) onlyPlatformOwner {
        Market storage m = markets[marketId];
        require(m.state == MarketState.Open || m.state == MarketState.Locked, "Already final");
        m.state = MarketState.Voided;
        emit MarketVoided(marketId);
    }

    // ---------------------------
    // Claim payouts (pull model)
    // ---------------------------
    /// @notice Claim payout for a winning ticket (only after resolution).
    function claim(uint256 ticketId) external nonReentrant {
        Ticket storage t = tickets[ticketId];
        require(t.id != 0, "Ticket not found");

        Market storage m = markets[t.marketId];
        require(m.exists, "Market missing");
        require(m.state == MarketState.Resolved, "Market not resolved");

        require(t.bettor == msg.sender, "Not ticket owner");
        require(t.stake > 0, "Already claimed or zero stake");
        require(t.outcomeId == m.winningOutcome, "Losing ticket");

        // compute total winning weight for this market (only unclaimed tickets counted)
        uint256 totalWinningWeight = 0;
        for (uint256 i = 1; i <= ticketCounter; i++) {
            Ticket memory w = tickets[i];
            if (w.marketId == t.marketId && w.outcomeId == m.winningOutcome && w.stake > 0) {
                totalWinningWeight += w.weight;
            }
        }

        // if no winning weight (edge), return original stake only
        if (totalWinningWeight == 0) {
            uint256 stakeOnly = t.stake;
            t.stake = 0;
            require(STAKE_TOKEN.transfer(msg.sender, stakeOnly), "Transfer failed");
            emit Payout(ticketId, t.marketId, msg.sender, stakeOnly);
            return;
        }

        // compute share of distributable pool
        uint256 grossWinnings = 0;
        if (m.distributable > 0) {
            grossWinnings = (t.weight * m.distributable) / totalWinningWeight;
        }

        uint256 payout = t.stake + grossWinnings;

        // mark claimed
        t.stake = 0;

        require(STAKE_TOKEN.transfer(msg.sender, payout), "Transfer failed");
        emit Payout(ticketId, t.marketId, msg.sender, payout);
    }

    // ---------------------------
    // Fee withdrawals
    // ---------------------------
    /// @notice Platform owner withdraws collected protocol fees
    function withdrawProtocolFees(address to) external onlyPlatformOwner nonReentrant {
        require(to != address(0), "Invalid to");
        uint256 amount = protocolFeeBalance;
        require(amount > 0, "No fees");
        protocolFeeBalance = 0;
        require(STAKE_TOKEN.transfer(to, amount), "Transfer failed");
        emit ProtocolFeesWithdrawn(to, amount);
    }

    /// @notice Market creator withdraws their accumulated creator fees
    function withdrawCreatorFees(address to) external nonReentrant {
        require(to != address(0), "Invalid to");
        uint256 amount = creatorFeeBalance[msg.sender];
        require(amount > 0, "No fees");
        creatorFeeBalance[msg.sender] = 0;
        require(STAKE_TOKEN.transfer(to, amount), "Transfer failed");
        emit CreatorFeesWithdrawn(msg.sender, to, amount);
    }

    // ---------------------------
    // Helpers & getters
    // ---------------------------
    /// @notice Get outcome details for a market
    function getOutcome(uint256 marketId, uint256 outcomeId) external view marketExists(marketId) returns (string memory name, uint256 reserve, uint256 totalStaked, bool exists) {
        Outcome storage o = marketOutcomes[marketId][outcomeId];
        return (o.name, o.reserve, o.totalStaked, o.exists);
    }

    /// @notice Get basic market info
    function getMarketSummary(uint256 marketId) external view marketExists(marketId) returns (
        address creator,
        MarketState state,
        uint16 creatorFee,
        uint256 virtualLiquidity,
        uint256 outcomeCount_,
        string[] memory outcomeNames_,
        uint256 totalStaked_,
        uint256 winningOutcome_,
        uint256 distributable_
    ) {
        Market storage m = markets[marketId];
        creator = m.creator;
        state = m.state;
        creatorFee = m.creatorFeeBps;
        virtualLiquidity = m.virtualLiquidityPerOutcome;
        outcomeCount_ = m.outcomeCount;
        outcomeNames_ = m.outcomeNames;
        totalStaked_ = m.totalStaked;
        winningOutcome_ = m.winningOutcome;
        distributable_ = m.distributable;
    }
}