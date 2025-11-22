# 🚀 Blockchain Setup Guide - Real BNB Testnet Transactions

## ✅ What's Been Enabled

Your Predora app now supports **REAL on-chain staking** with actual BNB testnet transactions!

### Recent Changes (November 22, 2025)
- ✅ Re-enabled BSC Testnet provider in `server/custodial-wallet-service.js`
- ✅ Enabled real balance checking (no more mock balances)
- ✅ Biconomy AA service already configured for gasless transactions
- ✅ Created $PRED ERC20 token contract (`contracts/contracts/PredToken.sol`)

---

## 🎯 How It Works Now

### Hybrid System Architecture

**1. On-Chain Markets** (with `onChainMarketId`)
- ✅ Real BNB transactions on BSC Testnet
- ✅ Real transaction hashes visible on BSCScan
- ✅ Gasless betting via Biconomy (if configured)
- ✅ Automatic payouts after 30-minute dispute window

**2. Firestore-Only Markets** (without `onChainMarketId`)
- Mock balances and simulated transactions
- Perfect for testing without spending testnet BNB
- Used for quick demo mode

---

## 📋 Prerequisites

### 1. Get Testnet BNB
Visit the BNB testnet faucet and request free testnet BNB:
- **Faucet**: https://testnet.bnbchain.org/faucet-smart
- **Required**: At least 0.5 BNB for deployment and testing

### 2. Set Up Wallet Private Key
You need a private key for:
- Deploying smart contracts
- Running auto-payout jobs
- Creating custodial wallets

**Option A: Use Existing Wallet**
```bash
# Export private key from MetaMask:
# MetaMask -> Account Details -> Export Private Key

# Set in Replit Secrets:
DEPLOY_PRIVATE_KEY=your_private_key_here
```

**Option B: Generate New Wallet**
```bash
# In Replit shell:
cd contracts
npx hardhat run scripts/generate-wallet.js
# This will output a new address and private key
```

### 3. Configure Biconomy (Optional - for Gasless)
If you want gasless transactions:
1. Visit https://dashboard.biconomy.io
2. Create account and get API key
3. Add to Replit Secrets:
```
BICONOMY_PAYMASTER_API_KEY=your_api_key_here
```

---

## 🪙 Deploy $PRED Token (Optional)

### Step 1: Compile Contract
```bash
cd contracts
npm install
npx hardhat compile
```

### Step 2: Deploy to BSC Testnet
```bash
npx hardhat run scripts/deploy-pred-token.js --network bscTestnet
```

### Step 3: Verify Deployment
After deployment, you'll see:
```
✅ PredToken deployed to: 0x...
   Initial Supply: 1,000,000 PRED
   Owner: 0x...
```

Copy the contract address and add it to your `.env` or Replit Secrets:
```
PRED_TOKEN_ADDRESS=0x...
```

### Step 4: View on BSCScan
Visit: `https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS`

---

## 💰 How Staking Works with Real Transactions

### For Users with MetaMask (External Wallet)
1. User connects MetaMask to BSC Testnet
2. Clicks "Stake YES" or "Stake NO" on a market
3. **IF market has `onChainMarketId`**:
   - Real transaction sent to smart contract
   - User pays gas fees in BNB
   - Transaction confirmed on BSC Testnet
   - Real txHash stored: `0xabc123...`

### For Email Users (Custodial Wallet)
1. User logs in with email OTP
2. System creates encrypted custodial wallet
3. Clicks "Stake YES" or "Stake NO"
4. **IF Biconomy configured**:
   - Gasless transaction via Biconomy
   - No fees for user
   - Real txHash stored
5. **IF Biconomy unavailable**:
   - Custodial wallet pays gas
   - Real txHash stored

---

## 🎮 Creating On-Chain Markets

### Current Behavior
Markets created through the UI are **Firestore-only** by default.

### To Create On-Chain Markets

**Option A: Admin Panel (Recommended)**
```javascript
// Add this to your market creation endpoint in server/index.js
// After creating market in Firestore, call smart contract:

const contractAddress = '0xdaAf91610e33355c9Cd9258219C6A4822E693f55';
const contract = new ethers.Contract(contractAddress, ABI, wallet);

const tx = await contract.createMarket(
  marketTitle,
  marketDescription,
  resolutionTimestamp
);

const receipt = await tx.wait();
const onChainMarketId = receipt.events[0].args.marketId.toString();

// Update Firestore with on-chain ID
await marketRef.update({
  onChainMarketId: onChainMarketId,
  onChainTxHash: tx.hash
});
```

**Option B: Manually via Hardhat**
```bash
cd contracts
npx hardhat console --network bscTestnet

# In console:
const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
const market = await PredictionMarket.attach("0xdaAf91610e33355c9Cd9258219C6A4822E693f55");
const tx = await market.createMarket("Will BTC hit $100k?", "Resolves YES if...", 1700000000);
const receipt = await tx.wait();
console.log("Market ID:", receipt.events[0].args.marketId.toString());
```

---

## 🔍 Verifying Real Transactions

### Check Transaction on BSCScan
1. User places bet
2. System returns txHash: `0xabc123...`
3. View on BSCScan:
   ```
   https://testnet.bscscan.com/tx/0xabc123...
   ```

### Check in App
- **Profile Screen**: Shows real txHash for each bet
- Click txHash → Opens BSCScan in new tab
- See: Block number, gas used, contract interaction

---

## ⚙️ Environment Variables Summary

```bash
# 🔒 CRITICAL SECURITY - Required for Custodial Wallets
WALLET_ENCRYPTION_KEY=your_64_character_hex_string

# Required for On-Chain Features
DEPLOY_PRIVATE_KEY=your_wallet_private_key

# Optional for Gasless Transactions
BICONOMY_PAYMASTER_API_KEY=your_biconomy_key

# Optional for $PRED Token
PRED_TOKEN_ADDRESS=0x...

# Already Configured
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
ADMIN_SECRET=your_password
```

### 🔒 Generating Secure WALLET_ENCRYPTION_KEY

**CRITICAL**: Never use default or weak encryption keys for custodial wallets!

```bash
# Generate a secure 256-bit encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# a1b2c3d4e5f6...  (64 hexadecimal characters)

# Add to Replit Secrets:
# Key: WALLET_ENCRYPTION_KEY
# Value: <paste the 64-character hex string>
```

**Important Security Notes:**
- Without this key, custodial wallet service will be disabled
- Users with external wallets (MetaMask) will still work fine
- Keep this key secret and never commit it to the repository
- If you rotate the key, existing custodial wallets will become inaccessible

---

## 🧪 Testing Guide

### 1. Test Custodial Wallet Creation
```javascript
// In browser console:
const userId = localStorage.getItem('userId');
const response = await fetch('/api/custodial-wallet/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
});
const result = await response.json();
console.log('Wallet created:', result.address);
```

### 2. Test Real Balance Check
```javascript
const balance = await fetch(`/api/custodial-wallet/balance/${userId}`);
const data = await balance.json();
console.log('Real BNB balance:', data.balance);
```

### 3. Test On-Chain Betting
1. Create a market with `onChainMarketId`
2. Place a bet
3. Check console for: `✅ Bet placed on-chain: 0x...`
4. Verify on BSCScan

---

## 🚨 Common Issues

### Issue: "Insufficient BNB for transaction"
**Solution**: Request testnet BNB from faucet

### Issue: "Provider not initialized"
**Solution**: Check `DEPLOY_PRIVATE_KEY` is set in Replit Secrets

### Issue: "Biconomy service not available"
**Solution**: 
- System automatically falls back to custodial wallet (pays gas)
- OR set `BICONOMY_PAYMASTER_API_KEY` for gasless

### Issue: "Market not on-chain"
**Solution**: Market needs `onChainMarketId` field in Firestore

---

## 📊 Current Smart Contracts

### PredictionMarket (Main Contract)
- **Address**: `0xdaAf91610e33355c9Cd9258219C6A4822E693f55`
- **Network**: BSC Testnet (Chain ID: 97)
- **BSCScan**: https://testnet.bscscan.com/address/0xdaAf91610e33355c9Cd9258219C6A4822E693f55
- **Features**: Market creation, betting, resolution, auto-payout

### PredToken (Coming Soon)
- **Contract**: Ready to deploy in `contracts/contracts/PredToken.sol`
- **Supply**: 1,000,000 PRED
- **Decimals**: 18
- **Deploy**: Run `npx hardhat run scripts/deploy-pred-token.js --network bscTestnet`

---

## 🎉 You're Ready!

Your app now supports:
- ✅ Real BNB testnet transactions
- ✅ Real transaction hashes
- ✅ BSCScan verification
- ✅ Hybrid on-chain/firestore mode
- ✅ Gasless transactions (with Biconomy)
- ✅ Auto-payout system

**Next Steps**:
1. Request testnet BNB from faucet
2. Set `DEPLOY_PRIVATE_KEY` in Replit Secrets
3. Create on-chain markets
4. Test staking with real transactions!
