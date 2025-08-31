# Base Sports Betting Mini-App with OnchainKit & MiniKit

## Overview
Building a trustless P2P sports betting platform as a Coinbase Wallet mini-app using Base's OnchainKit and MiniKit for seamless wallet integration and viral distribution.

## Base Mini-App Architecture

### Core Stack
- **Framework**: Next.js 14 with OnchainKit components
- **Mini-App SDK**: MiniKit for Coinbase Wallet integration
- **Blockchain**: Base L2 with USDC for betting
- **Wallet**: Native Coinbase Wallet (no external wallet needed)
- **Distribution**: Coinbase Wallet users + Farcaster social graph

### OnchainKit Integration
```typescript
// app/layout.tsx
import { OnchainKitProvider } from '@coinbase/onchainkit';
import '@coinbase/onchainkit/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        >
          {children}
        </OnchainKitProvider>
      </body>
    </html>
  );
}
```

### MiniKit Wallet Connection
```typescript
// hooks/useMiniKit.ts
import { useMiniKit } from '@coinbase/minikit-react';
import { useAccount, useConnect } from 'wagmi';

export function useBettingWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { isMinikitInstalled, connect } = useMiniKit();

  const connectWallet = async () => {
    if (isMinikitInstalled) {
      // Use MiniKit for Coinbase Wallet users
      await connect();
    } else {
      // Fallback for web users
      await connectAsync();
    }
  };

  return {
    address,
    isConnected,
    connectWallet,
    isMiniApp: isMinikitInstalled
  };
}
```

## Smart Contracts (Base-Optimized)

### Market Contract with OnchainKit Integration
```solidity
// contracts/BettingMarket.sol
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BettingMarket is ReentrancyGuard {
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); // Base USDC
    
    enum MatchState { Open, Locked, Resolved, Voided }
    enum Outcome { Home, Away, Draw }
    
    struct Ticket {
        uint256 id;
        address bettor;
        Outcome outcome;
        uint256 stake;
        uint256 lockedOdds; // odds * 1e18
        uint256 weight; // for payout calculation
        uint256 timestamp;
    }
    
    // CPMM Reserves (virtual liquidity included)
    uint256 public reserveHome = 1000e6; // Start with 1000 USDC virtual liquidity
    uint256 public reserveAway = 1000e6;
    uint256 public reserveDraw = 1000e6;
    
    mapping(uint256 => Ticket) public tickets;
    uint256 public ticketCounter;
    uint256 public totalStaked;
    
    MatchState public state = MatchState.Open;
    Outcome public winner;
    uint16 public constant PROTOCOL_FEE_BPS = 200; // 2%
    
    event BetPlaced(
        uint256 indexed ticketId,
        address indexed bettor,
        Outcome outcome,
        uint256 stake,
        uint256 odds,
        uint256 weight
    );
    
    event OddsUpdated(uint256 homeOdds, uint256 awayOdds, uint256 drawOdds);
    event MatchResolved(Outcome winner);
    event Payout(uint256 indexed ticketId, address indexed bettor, uint256 amount);
    
    function getCurrentOdds() external view returns (uint256 home, uint256 away, uint256 draw) {
        uint256 total = reserveHome + reserveAway + reserveDraw;
        return (
            (total * 1e18) / reserveHome,
            (total * 1e18) / reserveAway,
            (total * 1e18) / reserveDraw
        );
    }
    
    function placeBet(Outcome outcome, uint256 amount, uint256 minOdds) 
        external 
        nonReentrant 
        returns (uint256 ticketId) 
    {
        require(state == MatchState.Open, "Betting closed");
        require(amount >= 1e6, "Minimum 1 USDC"); // $1 minimum
        
        // Get current odds
        (uint256 homeOdds, uint256 awayOdds, uint256 drawOdds) = this.getCurrentOdds();
        uint256 currentOdds = outcome == Outcome.Home ? homeOdds : 
                             outcome == Outcome.Away ? awayOdds : drawOdds;
        
        require(currentOdds >= minOdds, "Odds too low");
        
        // Transfer USDC
        require(USDC.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update CPMM reserves
        _updateReserves(outcome, amount);
        
        // Create ticket
        ticketId = ++ticketCounter;
        uint256 weight = (amount * (currentOdds - 1e18)) / 1e18;
        
        tickets[ticketId] = Ticket({
            id: ticketId,
            bettor: msg.sender,
            outcome: outcome,
            stake: amount,
            lockedOdds: currentOdds,
            weight: weight,
            timestamp: block.timestamp
        });
        
        totalStaked += amount;
        
        emit BetPlaced(ticketId, msg.sender, outcome, amount, currentOdds, weight);
        
        // Emit updated odds
        (uint256 newHome, uint256 newAway, uint256 newDraw) = this.getCurrentOdds();
        emit OddsUpdated(newHome, newAway, newDraw);
        
        return ticketId;
    }
    
    function _updateReserves(Outcome outcome, uint256 stake) internal {
        if (outcome == Outcome.Home) {
            reserveHome += stake;
        } else if (outcome == Outcome.Away) {
            reserveAway += stake;
        } else {
            reserveDraw += stake;
        }
    }
    
    function claim(uint256 ticketId) external nonReentrant {
        require(state == MatchState.Resolved, "Not resolved");
        
        Ticket storage ticket = tickets[ticketId];
        require(ticket.bettor == msg.sender, "Not your ticket");
        require(ticket.outcome == winner, "Losing ticket");
        require(ticket.stake > 0, "Already claimed");
        
        uint256 payout = _calculatePayout(ticketId);
        ticket.stake = 0; // Mark as claimed
        
        require(USDC.transfer(msg.sender, payout), "Transfer failed");
        
        emit Payout(ticketId, msg.sender, payout);
    }
    
    function _calculatePayout(uint256 ticketId) internal view returns (uint256) {
        Ticket memory ticket = tickets[ticketId];
        
        // Calculate losing pool
        uint256 losingPool = _calculateLosingPool();
        uint256 totalWinningWeight = _calculateTotalWinningWeight();
        
        if (totalWinningWeight == 0) return ticket.stake;
        
        // Payout = stake + proportional share of losing pool (minus fees)
        uint256 winnings = (ticket.weight * losingPool * (10000 - PROTOCOL_FEE_BPS)) / 
                          (totalWinningWeight * 10000);
        
        return ticket.stake + winnings;
    }
}
```

## Mini-App Frontend Components

### Betting Interface with OnchainKit
```tsx
// components/BettingInterface.tsx
import { Transaction, TransactionButton, TransactionStatus } from '@coinbase/onchainkit/transaction';
import { Address, Avatar, Name } from '@coinbase/onchainkit/identity';
import { Wallet, WalletDropdown, WalletDropdownLink } from '@coinbase/onchainkit/wallet';

export function BettingInterface({ marketAddress }: { marketAddress: Address }) {
  const [selectedOutcome, setSelectedOutcome] = useState<'home' | 'away' | 'draw'>('home');
  const [betAmount, setBetAmount] = useState('');
  const { address } = useAccount();
  
  // Real-time odds from contract
  const { data: odds } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: 'getCurrentOdds',
    query: { refetchInterval: 2000 }
  });

  const contracts = [
    {
      address: marketAddress,
      abi: marketAbi,
      functionName: 'placeBet',
      args: [
        selectedOutcome === 'home' ? 0 : selectedOutcome === 'away' ? 1 : 2,
        parseUnits(betAmount, 6), // USDC has 6 decimals
        parseUnits('1', 18) // Min odds (1.0)
      ],
    },
  ];

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      {/* User Profile */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Avatar address={address} className="h-10 w-10" />
          <Name address={address} />
        </div>
        <Wallet>
          <WalletDropdown>
            <WalletDropdownLink icon="wallet" href="/wallet">
              Wallet
            </WalletDropdownLink>
          </WalletDropdown>
        </Wallet>
      </div>

      {/* Match Info */}
      <MatchHeader />
      
      {/* Odds Display */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { key: 'home', label: 'Home Win', odds: odds?.[0] },
          { key: 'away', label: 'Away Win', odds: odds?.[1] },
          { key: 'draw', label: 'Draw', odds: odds?.[2] }
        ].map(({ key, label, odds: currentOdds }) => (
          <button
            key={key}
            onClick={() => setSelectedOutcome(key as any)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedOutcome === key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm text-gray-600">{label}</div>
            <div className="text-xl font-bold">
              {currentOdds ? formatUnits(currentOdds, 18) : '--'}
            </div>
          </button>
        ))}
      </div>

      {/* Bet Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bet Amount (USDC)
        </label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Enter amount"
          min="1"
          step="0.01"
        />
      </div>

      {/* Place Bet Button */}
      <Transaction
        contracts={contracts}
        onSuccess={() => {
          setBetAmount('');
          // Show success notification
        }}
      >
        <TransactionButton
          disabled={!betAmount || parseFloat(betAmount) < 1}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
        >
          Place Bet: ${betAmount} on {selectedOutcome}
        </TransactionButton>
        <TransactionStatus>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Processing your bet...</span>
          </div>
        </TransactionStatus>
      </Transaction>
    </div>
  );
}
```

### Real-time Odds Component
```tsx
// components/OddsDisplay.tsx
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

export function OddsDisplay({ marketAddress }: { marketAddress: Address }) {
  const { data: odds, isLoading } = useReadContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: 'getCurrentOdds',
    query: {
      refetchInterval: 1000, // Update every second
    },
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading odds...</div>;
  }

  const [homeOdds, awayOdds, drawOdds] = odds || [];

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
      <OddsCard 
        label="Home Win" 
        odds={homeOdds ? parseFloat(formatUnits(homeOdds, 18)).toFixed(2) : '--'}
        trend="up"
      />
      <OddsCard 
        label="Draw" 
        odds={drawOdds ? parseFloat(formatUnits(drawOdds, 18)).toFixed(2) : '--'}
        trend="stable"
      />
      <OddsCard 
        label="Away Win" 
        odds={awayOdds ? parseFloat(formatUnits(awayOdds, 18)).toFixed(2) : '--'}
        trend="down"
      />
    </div>
  );
}

function OddsCard({ label, odds, trend }: { label: string; odds: string; trend: 'up' | 'down' | 'stable' }) {
  const trendColors = {
    up: 'text-green-300',
    down: 'text-red-300',
    stable: 'text-gray-300'
  };

  return (
    <div className="text-center">
      <div className="text-xs opacity-75">{label}</div>
      <div className={`text-2xl font-bold ${trendColors[trend]}`}>
        {odds}
      </div>
    </div>
  );
}
```

## Mini-App Configuration

### Package.json Setup
```json
{
  "name": "base-betting-miniapp",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "onchainkit": "onchainkit"
  },
  "dependencies": {
    "@coinbase/onchainkit": "latest",
    "@coinbase/minikit-react": "latest",
    "next": "14.0.0",
    "react": "18.2.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0"
  }
}
```

### Farcaster Integration
```typescript
// utils/farcaster.ts
export function createShareFrame(matchResult: string, winnings?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  return {
    version: "next",
    image: `${baseUrl}/api/og/result?match=${encodeURIComponent(matchResult)}&winnings=${winnings}`,
    buttons: [
      {
        label: winnings ? "🎉 I won!" : "Place your bet",
        action: "link",
        target: `${baseUrl}/markets`
      }
    ],
    input: {
      text: "Share your prediction!"
    }
  };
}
```

### Mini-App Manifest (farcaster.json)
```json
{
  "name": "Base Sports Betting",
  "version": "1.0.0",
  "description": "P2P sports betting with locked odds on Base",
  "homeUrl": "https://your-domain.vercel.app",
  "iconUrl": "https://your-domain.vercel.app/icon.png",
  "splashImageUrl": "https://your-domain.vercel.app/splash.png",
  "webhookUrl": "https://your-domain.vercel.app/api/webhook"
}
```

## Deployment & Distribution

### Vercel Deployment
```bash
# Install OnchainKit CLI
npm install -g @coinbase/onchainkit

# Create new mini-app
npm create onchain@latest betting-miniapp
cd betting-miniapp

# Deploy to Vercel
vercel --prod

# Generate Farcaster manifest
onchainkit farcaster

# Update environment variables in Vercel dashboard
```

### Environment Variables
```env
# Base Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Contract Addresses (Base Mainnet)
NEXT_PUBLIC_MARKET_FACTORY=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Oracle Configuration
SPORTS_API_KEY=your_sports_api_key
ORACLE_PRIVATE_KEY=your_oracle_private_key
```

## Mini-App Advantages

### Viral Distribution
- **Coinbase Wallet Users**: Direct access to 100M+ users
- **Farcaster Social**: Share wins/bets as frames
- **No Downloads**: Instant access, zero friction
- **Native USDC**: Seamless payments

### Enhanced UX Features
```tsx
// Coinbase Wallet Mini-App specific features
import { useMiniKit } from '@coinbase/minikit-react';

export function EnhancedBettingFeatures() {
  const { 
    sendTransaction,
    requestPayment,
    shareToSocial,
    biometricAuth 
  } = useMiniKit();

  const shareBigWin = async (amount: string) => {
    await shareToSocial({
      text: `Just won $${amount} on Base Sports Betting! 🎉`,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/share`,
      image: `/api/og/win?amount=${amount}`
    });
  };

  return (
    <div className="space-y-4">
      {/* Biometric confirmation for large bets */}
      <BiometricBetButton />
      
      {/* One-tap USDC payments */}
      <InstantPayButton />
      
      {/* Social sharing */}
      <ShareWinButton onClick={shareBigWin} />
    </div>
  );
}
```

### Performance Optimizations
- **Base L2**: Sub-second transactions, ~$0.01 fees
- **USDC Native**: No token swaps needed
- **OnchainKit Caching**: Optimistic updates
- **MiniKit APIs**: Hardware wallet integration

This implementation leverages Base's full mini-app ecosystem for maximum distribution and user engagement while maintaining the trustless P2P betting mechanics you designed.