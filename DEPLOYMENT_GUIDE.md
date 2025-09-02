# Base Sepolia Deployment Guide

## 🚀 **Quick Deployment Steps**

### 1. **Check Current Network**
Your contract address `0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956` can be verified on:
- **Base Sepolia**: https://sepolia.basescan.org/address/0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956
- **Base Mainnet**: https://basescan.org/address/0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956

### 2. **Deploy to Base Sepolia**

#### **Option A: Using Forge (Recommended)**
```bash
cd contracts

# Deploy to Base Sepolia with verification
forge script script/BetFactory.s.sol:CounterScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key YOUR_BASESCAN_API_KEY

# Or if you have foundry.toml configured
forge script script/BetFactory.s.sol:CounterScript \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

#### **Option B: Using Cast**
```bash
# Deploy manually
cast send --rpc-url https://sepolia.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --create \
  $(cat out/BetFactory.sol/WinzzersMarket.json | jq -r .bytecode.object)$(cast abi-encode "constructor(address,uint16)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 200)
```

### 3. **Update Environment Variables**
After deployment, update your `.env.local`:
```env
NODE_ENV=development
NEXT_PUBLIC_WINZZERS_CONTRACT_ADDRESS=YOUR_NEW_CONTRACT_ADDRESS
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 4. **Get Test Tokens**

#### **Base Sepolia ETH (for gas)**
- Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Connect wallet and request ETH

#### **Base Sepolia USDC (for betting)**
- Visit: https://faucet.circle.com/
- Select Base Sepolia
- Request test USDC

### 5. **Test Your Deployment**
```bash
# Check if contract exists
cast code YOUR_CONTRACT_ADDRESS --rpc-url https://sepolia.base.org

# Get market counter (should return 0 for new deployment)
cast call YOUR_CONTRACT_ADDRESS "marketCounter()" --rpc-url https://sepolia.base.org

# Check USDC address in contract
cast call YOUR_CONTRACT_ADDRESS "STAKE_TOKEN()" --rpc-url https://sepolia.base.org
```

## 🔧 **Foundry Configuration**

Add to your `contracts/foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
base_sepolia = "https://sepolia.base.org"
base_mainnet = "https://mainnet.base.org"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
```

## 📋 **Environment Setup**

### **Required Environment Variables**
```bash
# For contract deployment
export PRIVATE_KEY="your_private_key_here"
export BASESCAN_API_KEY="your_basescan_api_key"

# For frontend
export NEXT_PUBLIC_ONCHAINKIT_API_KEY="your_onchainkit_api_key"
export NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your_walletconnect_project_id"
```

### **Get API Keys**
- **BaseScan API Key**: https://basescan.org/apis
- **OnchainKit API Key**: https://onchainkit.xyz
- **WalletConnect Project ID**: https://cloud.walletconnect.com

## 🧪 **Testing Your Deployment**

### 1. **Frontend Testing**
```bash
cd site
npm run dev
```

### 2. **Contract Testing**
```bash
cd contracts
forge test --rpc-url https://sepolia.base.org --fork-url https://sepolia.base.org
```

### 3. **Integration Testing**
1. Connect wallet to Base Sepolia
2. Get test USDC from faucet
3. Create a test market
4. Place a test bet
5. Verify transactions on BaseScan

## 🔍 **Verification Commands**

### **Verify Contract on BaseScan**
```bash
forge verify-contract \
  --chain-id 84532 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(address,uint16)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 200) \
  --etherscan-api-key YOUR_BASESCAN_API_KEY \
  YOUR_CONTRACT_ADDRESS \
  src/BetFactory.sol:WinzzersMarket
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Insufficient funds for gas"**
- Get Base Sepolia ETH from faucet
- Check your wallet balance

#### **"Contract not found"**
- Verify deployment was successful
- Check contract address is correct
- Ensure you're on Base Sepolia network

#### **"USDC transfer failed"**
- Get test USDC from Circle faucet
- Approve USDC spending for contract
- Check USDC balance

#### **"Wrong network"**
- App will show network switcher
- Click "Switch Network" button
- Confirm in wallet

### **Debug Commands**
```bash
# Check your wallet balance
cast balance YOUR_ADDRESS --rpc-url https://sepolia.base.org

# Check USDC balance
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e "balanceOf(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org

# Check contract deployment
cast code YOUR_CONTRACT_ADDRESS --rpc-url https://sepolia.base.org
```

## ✅ **Success Checklist**

- [ ] Contract deployed to Base Sepolia
- [ ] Contract verified on BaseScan
- [ ] Environment variables updated
- [ ] Test ETH obtained from faucet
- [ ] Test USDC obtained from faucet
- [ ] Frontend connects to Base Sepolia
- [ ] Can create test market
- [ ] Can place test bet
- [ ] Transactions appear on BaseScan

Your Winzers betting app is now ready for Base Sepolia testing! 🎉