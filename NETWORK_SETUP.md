# Network Configuration Guide

## 🌐 **Current Network Setup**

Your Winzers betting app is now configured to work with both Base Sepolia (testnet) and Base Mainnet, with automatic switching based on environment.

## 🔍 **How to Check Current Network**

### 1. **Check Your Contract Deployment**
Your current contract address: `0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956`

**Verify on Block Explorers:**
- **Base Sepolia**: https://sepolia.basescan.org/address/0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956
- **Base Mainnet**: https://basescan.org/address/0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956

### 2. **Check USDC Address**
Your deployment script now uses: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

This is the **official Base Sepolia USDC address**.

## ⚙️ **Network Configuration**

### **Base Sepolia (Testnet) - Development**
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **USDC Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Native Token**: ETH (testnet)

### **Base Mainnet - Production**
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Block Explorer**: https://basescan.org
- **USDC Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Native Token**: ETH

## 🚀 **How to Deploy to Base Sepolia**

### 1. **Update Environment**
Create `.env.local` in the `site/` directory:
```env
NODE_ENV=development
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_WINZZERS_CONTRACT_ADDRESS=0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 2. **Deploy Contract to Base Sepolia**
```bash
cd contracts

# Deploy to Base Sepolia
forge script script/BetFactory.s.sol:CounterScript --rpc-url https://sepolia.base.org --broadcast --verify

# Or if you have it configured in foundry.toml
forge script script/BetFactory.s.sol:CounterScript --rpc-url base_sepolia --broadcast --verify
```

### 3. **Update Contract Address**
After deployment, update your `.env.local` with the new contract address.

## 🔧 **Foundry Configuration**

Add to your `foundry.toml`:
```toml
[rpc_endpoints]
base_sepolia = "https://sepolia.base.org"
base_mainnet = "https://mainnet.base.org"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
```

## 💰 **Getting Test Tokens**

### **Base Sepolia ETH (for gas)**
1. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Connect your wallet
3. Request test ETH

### **Base Sepolia USDC (for betting)**
1. Visit [Circle Faucet](https://faucet.circle.com/)
2. Select Base Sepolia network
3. Enter your wallet address
4. Request test USDC

## 🔄 **Environment Switching**

The app automatically switches networks based on `NODE_ENV`:

### **Development Mode** (Base Sepolia)
```env
NODE_ENV=development
```
- Uses Base Sepolia as primary chain
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Perfect for testing

### **Production Mode** (Base Mainnet)
```env
NODE_ENV=production
```
- Uses Base Mainnet as primary chain
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Real money transactions

## 🛠️ **Wallet Setup for Base Sepolia**

### **MetaMask**
1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Enter Base Sepolia details:
   - **Network Name**: Base Sepolia
   - **RPC URL**: https://sepolia.base.org
   - **Chain ID**: 84532
   - **Currency Symbol**: ETH
   - **Block Explorer**: https://sepolia.basescan.org

### **Coinbase Wallet**
Base Sepolia is automatically supported in Coinbase Wallet.

## 📊 **Monitoring Your Contract**

### **Check Contract Status**
```bash
# Check if contract exists on Base Sepolia
cast code 0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956 --rpc-url https://sepolia.base.org

# Get market counter
cast call 0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956 "marketCounter()" --rpc-url https://sepolia.base.org
```

### **Frontend Network Detection**
The app will automatically:
- Detect user's current network
- Prompt to switch to correct network
- Show network status in UI
- Handle network switching gracefully

## 🚨 **Troubleshooting**

### **Contract Not Found**
- Verify contract address on block explorer
- Check if you're on the correct network
- Ensure contract was deployed successfully

### **Wrong Network**
- Check `NODE_ENV` in your environment
- Verify wallet is connected to correct network
- Clear browser cache and reconnect wallet

### **USDC Issues**
- Ensure you're using correct USDC address for the network
- Check USDC balance on block explorer
- Verify USDC contract is approved for spending

## 📝 **Next Steps**

1. **Deploy to Base Sepolia** using the updated script
2. **Update contract address** in environment variables
3. **Test with Base Sepolia USDC** from faucet
4. **Verify all functionality** works on testnet
5. **Deploy to Base Mainnet** when ready for production

Your app is now properly configured for Base Sepolia development with easy production deployment!