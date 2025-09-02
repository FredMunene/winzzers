# Winzers Betting MVP Architecture

## Overview
Simple MVP architecture to transform the demo components into a functional P2P betting interface using the WinzzersMarket contract.

## Core MVP Features
1. **View Markets** - Display active betting markets
2. **Place Bets** - Bet on market outcomes
3. **Create Markets** - Simple market creation
4. **View My Bets** - User's betting history

## Contract Integration

### Key Contract Functions
```solidity
// Read Functions
getMarketSummary(marketId) → market details
getMarketOdds(marketId) → current odds
marketCounter() → total markets
tickets(ticketId) → bet details

// Write Functions  
createMarket(outcomes[], virtualLiquidity, creatorFee) → marketId
placeBet(marketId, outcomeId, amount, minOdds) → ticketId
claim(ticketId) → payout
```

### Data Models
```typescript
interface Market {
  id: number;
  creator: string;
  state: 0 | 1 | 2 | 3; // Open | Locked | Resolved | Voided
  outcomeNames: string[];
  totalStaked: bigint;
}

interface Bet {
  ticketId: number;
  marketId: number;
  outcomeId: number;
  stake: bigint;
  lockedOdds: bigint;
  bettor: string;
}
```

## Component Structure

### Replace DemoComponents.tsx with:

```
BettingApp/
├── MarketsList          // Shows all markets
├── CreateMarketForm     // Simple market creation
├── BetCard             // Individual market betting
└── UserBets            // User's bet history
```

### Component Responsibilities

**MarketsList**
- Fetch markets using `marketCounter()` and `getMarketSummary()`
- Display market cards with basic info
- Filter by state (Open markets only for MVP)

**BetCard** 
- Show market outcomes with current odds
- Stake input with USDC balance check
- Place bet button using OnchainKit Transaction
- Real-time odds from `getMarketOdds()`

**CreateMarketForm**
- Simple form: question + 2-4 outcomes
- Fixed virtual liquidity (e.g., 1000 USDC)
- Fixed creator fee (e.g., 1%)
- Submit via `createMarket()`

**UserBets**
- Query user's tickets by filtering events
- Show bet status and claim buttons
- Claim winnings for resolved markets

## Technical Stack

### Contract Integration
- **wagmi** for contract reads/writes
- **viem** for type-safe contract calls
- Direct contract calls (no backend for MVP)

### State Management
- React useState for local state
- wagmi hooks for contract state
- No complex state management needed

### UI Components
- Reuse existing Button, Card, Icon components
- Add simple BetInput, OddsDisplay components
- Keep existing styling system

## User Flow

```
1. Connect Wallet → 2. View Markets → 3. Select Market → 4. Place Bet
                  ↓
5. Create Market → 6. Set Outcomes → 7. Submit Transaction
                  ↓  
8. View My Bets → 9. Claim Winnings (if won)
```

## MVP Limitations (Acceptable for now)
- No real-time updates (manual refresh)
- Basic error handling only
- No market categories/filtering
- No advanced betting features
- Simple mobile responsive (not optimized)

## File Changes Required

### New Files
- `site/app/hooks/useWinzzersContract.ts` - Contract integration
- `site/app/types/betting.ts` - Type definitions

### Modified Files
- `site/app/components/DemoComponents.tsx` - Replace with betting components
- `site/app/page.tsx` - Update to use betting components

## Implementation Priority
1. **Phase 1**: Market display + bet placement (core functionality)
2. **Phase 2**: Market creation 
3. **Phase 3**: User bet history and claims

## Contract Configuration
- Contract Address: TBD (from deployment)
- USDC Token: Base mainnet USDC
- Network: Base L2

This MVP focuses on core betting functionality with minimal complexity, perfect for initial user testing and validation.