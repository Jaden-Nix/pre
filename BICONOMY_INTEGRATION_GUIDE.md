# Biconomy Integration Guide - Gasless Transactions for Predora

## What is Biconomy?

**Biconomy** is a service that enables **gasless transactions** on blockchain networks. 

### Simple Explanation:
- **Normal Crypto**: Every transaction costs gas fees (BNB) - user pays directly
- **Biconomy (Gasless)**: Transactions are sponsored - user doesn't pay gas fees
- **How**: Biconomy relays transactions on behalf of users, and someone else (dApp owner or sponsors) pays the gas

### For Predora Users:
Instead of each bet requiring gas fees, users just click and bet. No gas fees needed.

---

## How Predora Currently Works

**Today (Without Biconomy):**
```
User clicks "Place Bet" 
→ MetaMask asks for transaction fee (gas)
→ User pays 0.001 BNB in gas
→ Bet is placed on blockchain
```

**With Biconomy:**
```
User clicks "Place Bet"
→ MetaMask signs transaction (NO gas fee asked)
→ Biconomy relays it to blockchain
→ Predora pays the gas (or sponsor does)
→ Bet is placed
```

---

## Integration Steps

### Step 1: Create Biconomy Account
1. Go to https://dashboard.biconomy.io
2. Sign up with email
3. Create a new project
4. Select **BNB Smart Chain → BSC Testnet** (chainId: 97)
5. Copy your **API Key**

### Step 2: Add API Key to Replit
1. Go to your Replit project
2. Click "Secrets" tab on left sidebar
3. Add new secret:
   ```
   Key: BICONOMY_API_KEY
   Value: [paste from dashboard]
   ```

### Step 3: Install Biconomy SDK
```bash
npm install @biconomy/sdk
```

### Step 4: Enable in Frontend (app.html)

**Find this section** (around line 4150):
```javascript
// Account Abstraction Status
const aaStatusEl = document.getElementById("aa-status");
aaStatusEl.textContent = "Not configured (needs Biconomy SDK)";
```

**Uncomment and update these lines** (around 4158-4159):
```javascript
// UNCOMMENT THIS:
const smartAccount = await biconomy.getSmartAccountAPI();
const smartAccountAddress = await smartAccount.getAccountAddress();
```

**Add this initialization** (in wallet connection section):
```javascript
const BiconomySDK = require('@biconomy/sdk');

async function initBiconomy() {
    const biconomy = new BiconomySDK({
        apiKey: process.env.BICONOMY_API_KEY,
        bundlerUrl: "https://bundler.biconomy.io/api/v3/97/nft",
        network: {
            chainId: 97,  // BSC Testnet
            name: "BSC Testnet"
        }
    });
    
    const smartAccount = await biconomy.getSmartAccountAPI();
    return await smartAccount.getAccountAddress();
}
```

### Step 5: Redeploy
```bash
npm start
```

---

## Wallet Address & Testnet Tokens in Profile

### ✅ Already Working:

Your profile ALREADY shows your wallet address! Here's where to find it:

**In app.html** (line 4100+):
```javascript
// User profile object contains:
{
    walletAddress: "0x8973bc5cf0469b24c4ff916256105779abcb06d6",
    bnbBalance: 0.5,      // Real testnet BNB balance
    balance: 300.44,      // Platform USD balance
    cakeBalance: 349.5    // Cake tokens (if using BSC)
}
```

**Profile Display:**
- **Wallet Address**: Shows your MetaMask connected address
- **BNB Balance**: Real testnet tokens fetched from blockchain
- **Platform Balance**: Virtual platform currency for trading

### How Testnet Tokens Work:

1. **Connect MetaMask** → Links your wallet
2. **Get Testnet BNB** → https://www.bnbchain.org/en/testnet-faucet
3. **Balance Updates** → Automatically fetches from blockchain every few seconds
4. **Place Bets** → Uses real BNB from your wallet

---

## Current Account Abstraction Status

**Code Status**: ✅ Ready but commented out
**Location**: `app.html` lines 4150-4159

To see if it's enabled:
1. Open profile
2. Look for "Account Abstraction Status"
3. Currently says: "Not configured (needs Biconomy SDK)"
4. After integration: Will show your smart account address

---

## Step-by-Step Example: First Gasless Bet

```
1. Install Biconomy SDK
2. Add API key to secrets
3. Uncomment integration code
4. User connects MetaMask
5. User clicks "Place Bet"
6. Biconomy creates smart account (first time only)
7. User signs with MetaMask (NO gas fee popup)
8. Biconomy relays transaction
9. Bet is placed on blockchain
```

---

## FAQ

**Q: Do users need to install anything?**
A: No, just MetaMask. Everything happens in browser.

**Q: What if Biconomy costs more than gas?**
A: Predora (or a sponsor) covers the cost - users pay nothing.

**Q: Can users still use regular MetaMask transactions?**
A: Yes, both work. Smart accounts are optional.

**Q: Is there a fee limit?**
A: Biconomy can set daily/monthly limits per user.

---

## Files That Need Updates

- ✅ `app.html` - Uncomment lines 4158-4159
- ✅ `server/index.js` - Add Biconomy SDK initialization (optional, for relayer setup)
- ✅ `replit.md` - Already documented this plan

---

## Next Steps

1. Create Biconomy account
2. Get API key
3. Add to Replit secrets
4. Uncomment the code
5. Test with small bet on testnet
6. Deploy to production with sponsored relayer

---

## Additional Resources

- Biconomy Docs: https://docs.biconomy.io
- Smart Accounts Tutorial: https://docs.biconomy.io/docs/category/smart-contract-wallets
- BSC Testnet Faucet: https://www.bnbchain.org/en/testnet-faucet
