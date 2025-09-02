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

```

### MiniKit Wallet Connection


## Smart Contracts (Base-Optimized)

### Market Contract with OnchainKit Integration


## Mini-App Frontend Components

### Betting Interface with OnchainKit
```tsx


### Real-time Odds Component


## Mini-App Configuration

### Package.json Setup


### Farcaster Integration

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


### Performance Optimizations
- **Base L2**: Sub-second transactions, ~$0.01 fees
- **USDC Native**: No token swaps needed
- **OnchainKit Caching**: Optimistic updates
- **MiniKit APIs**: Hardware wallet integration

This implementation leverages Base's full mini-app ecosystem for maximum distribution and user engagement while maintaining the trustless P2P betting mechanics you designed.