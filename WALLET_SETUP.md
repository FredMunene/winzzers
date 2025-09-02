# Multi-Wallet Connection Setup

## Overview
The Winzers betting app now supports multiple wallet connections following the Wagmi documentation guidelines, while maintaining MiniKit compatibility for Coinbase Wallet users.

## Supported Wallets

### 🔵 Coinbase Wallet (Recommended)
- **Best for**: Base network users
- **Features**: Smart wallet support, MiniKit integration
- **Setup**: Automatically configured

### 🦊 MetaMask
- **Best for**: General Ethereum users
- **Features**: Popular browser extension wallet
- **Setup**: Install MetaMask browser extension

### 🔗 WalletConnect
- **Best for**: Mobile wallet users
- **Features**: Connect any WalletConnect-compatible wallet
- **Setup**: Requires WalletConnect Project ID

### 💼 Other Wallets
- **Support**: Any injected wallet (browser extensions)
- **Examples**: Rainbow, Trust Wallet, etc.

## Configuration

### Environment Variables
Create a `.env.local` file with:

```env
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Winzers Betting
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Wallet Connect Configuration (Required for WalletConnect)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id_here

# App Assets
NEXT_PUBLIC_ICON_URL=https://your-domain.vercel.app/icon.png

# Contract Addresses
NEXT_PUBLIC_WINZZERS_CONTRACT_ADDRESS=0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956
NEXT_PUBLIC_USDC_ADDRESS=0xE4aB69C077896252FAFBD49EFD26B5D171A32410
```

### Getting API Keys

#### OnchainKit API Key
1. Visit [OnchainKit Dashboard](https://onchainkit.xyz)
2. Create a new project
3. Copy your API key

#### WalletConnect Project ID
1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy your Project ID

## Implementation Details

### Provider Setup
The app uses a layered provider approach:
```
WagmiProvider (wallet connections)
  └── QueryClientProvider (data fetching)
    └── MiniKitProvider (Coinbase Wallet features)
      └── App Components
```

### Wallet Connection Flow
1. User clicks "Connect Wallet"
2. Modal shows available wallet options
3. User selects preferred wallet
4. Connection is established
5. User can interact with betting features

### Features
- **Smart Wallet Priority**: Coinbase Wallet uses smart wallet by default
- **Error Handling**: Connection failures are displayed to users
- **Security Notice**: Users are informed about secure connections
- **Popular Wallets**: Coinbase Wallet and MetaMask are marked as popular
- **Responsive Design**: Modal works on mobile and desktop

## Usage

### For Users
1. Click "Connect Wallet" button
2. Choose from available wallet options:
   - **Coinbase Wallet**: Best for Base network
   - **MetaMask**: Popular browser wallet
   - **WalletConnect**: Connect mobile wallets
   - **Other**: Browser extension wallets
3. Follow wallet-specific connection flow
4. Start betting!

### For Developers
The wallet connection is handled by the `WalletConnection` component:

```tsx
import { WalletConnection } from './components/WalletConnection';

// Use in your app
<WalletConnection />
```

## Network Configuration
- **Primary Network**: Base L2
- **Chain ID**: 8453
- **RPC**: Automatic via Wagmi
- **Native Token**: ETH
- **Betting Token**: USDC

## Troubleshooting

### Common Issues
1. **WalletConnect not working**: Ensure `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set
2. **MetaMask not detected**: User needs to install MetaMask extension
3. **Connection fails**: Check network settings and try again
4. **Wrong network**: App will prompt user to switch to Base

### Support
- Check browser console for detailed error messages
- Ensure wallet is unlocked and has Base network added
- Try refreshing the page if connection seems stuck

## Security
- Private keys never leave the user's wallet
- All connections are encrypted
- Smart contracts are audited
- No sensitive data is stored locally

This multi-wallet setup provides maximum accessibility while maintaining the premium Coinbase Wallet experience for Base users.