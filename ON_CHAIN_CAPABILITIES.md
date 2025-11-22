# Predora On-Chain vs Firestore Capabilities

## Current Architecture: Hybrid Model

Predora uses a **hybrid architecture** that supports both on-chain (BSC Testnet) and Firestore-only betting, depending on the market type and user preferences.

---

## 🔗 On-Chain Staking (BSC Testnet)

### What Works On-Chain:
- ✅ **Market Creation**: Markets can be created on-chain via smart contract
- ✅ **Betting with BNB**: Users with MetaMask can place bets using real testnet BNB
- ✅ **Real Transactions**: All on-chain actions generate actual blockchain transactions
- ✅ **Contract Integration**: Smart contract deployed at `0xdaAf91610e33355c9Cd9258219C6A4822E693f55`

### Requirements for On-Chain Betting:
1. **Market must have `onChainMarketId`** - This field links Firestore market to blockchain
2. **User must connect MetaMask wallet** - External wallet required for signing transactions
3. **User must have testnet BNB** - Available from [BNB Chain Faucet](https://www.bnbchain.org/en/testnet-faucet)
4. **Market must not be marked as `isMock`** - Mock markets stay in Firestore only

### How On-Chain Betting Works:
```javascript
// When user stakes on a market with onChainMarketId:
if (currentMarket.onChainMarketId && !currentMarket.isMock) {
    // 1. Convert asset to BNB equivalent
    const bnbAmount = amount * getMockPrice(selectedAsset) / getMockPrice('BNB');
    
    // 2. Call smart contract placeBet function
    const tx = await contract.placeBet(onChainMarketId, pickBool, { value: bnbWei });
    
    // 3. Wait for transaction confirmation
    await tx.wait(1);
    
    // 4. Store transaction hash in Firestore for reference
}
```

---

## 💾 Firestore-Only Staking

### What Uses Firestore:
- ✅ **Quick Play Markets**: All Quick Play bets stored in Firestore
- ✅ **Mock Markets**: Markets marked with `isMock: true`
- ✅ **Email-Authenticated Users**: Users without MetaMask wallets
- ✅ **$PRED Token Betting**: $PRED is a Firestore-only currency

### Firestore Balance System:
Users have three platform balances stored in Firestore:
- **predBalance**: $PRED tokens (valued at $600 each)
- **bnbBalance**: Mock BNB balance (not connected to blockchain)
- **cakeBalance**: Mock CAKE balance

### Firestore Betting Flow:
```javascript
// User stakes with $PRED, BNB, or CAKE (Firestore balances)
// 1. Deduct from user's Firestore balance
transaction.update(profileRef, { 
    predBalance: increment(-amount)
});

// 2. Create pledge record in Firestore
transaction.set(pledgeRef, {
    userId, marketId, pick, amount,
    asset: 'PRED', // or 'BNB', 'CAKE'
    isQuickPlay: true
});

// 3. Update market AMM pools (if applicable)
transaction.update(marketRef, {
    yesPool: newYesPool,
    noPool: newNoPool
});
```

---

## 🪙 $PRED Token Status

### Current Status: **Firestore Display Currency Only**

**What $PRED IS:**
- ✅ A platform token valued at $600 per token
- ✅ Used for Firestore-only betting
- ✅ Can be claimed from faucet (50 $PRED every 24 hours)
- ✅ Default balance for new users: 100 $PRED

**What $PRED IS NOT:**
- ❌ **NOT integrated with on-chain betting** - On-chain betting only accepts BNB
- ❌ **NOT an ERC20 being used** - The PredToken.sol contract exists but is NOT connected to betting
- ❌ **NOT tradeable on-chain** - It's purely a Firestore balance field

### $PRED ERC20 Contract:
A `PredToken.sol` ERC20 contract has been created and deployed:
- **Contract**: `contracts/contracts/PredToken.sol`
- **Deployment Script**: `contracts/scripts/deploy-pred-token.js`
- **Status**: Deployed but NOT integrated into betting system

**To Integrate $PRED for On-Chain Betting (Future):**
1. Deploy PredToken.sol to BSC Testnet
2. Modify PredictionMarket.sol to accept ERC20 token bets
3. Update frontend to handle token approval + transfer
4. Add token price oracle for conversions

---

## 🎮 Quick Play On-Chain Status

### Current Status: **Firestore-Only**

Quick Play markets are currently **100% Firestore-based**:
- ❌ Quick Play bets do NOT go on-chain
- ✅ Bets are added to local "pledge pool"
- ✅ User confirms all pledges at once
- ✅ All pledge data stored in Firestore

**Why Quick Play is Firestore-Only:**
- Optimized for fast, low-friction betting experience
- No transaction fees or wallet signatures required
- Suitable for casual predictions with $PRED tokens

**To Enable On-Chain Quick Play (Future):**
Create Quick Play markets with `onChainMarketId` field set, then the existing on-chain betting flow will work automatically.

---

## 🔄 Hybrid Flow Decision Tree

```
User wants to stake on a market
    │
    ├─ Does market have `onChainMarketId`? ─── NO ──> Firestore-only betting
    │                                                  Use predBalance/bnbBalance/cakeBalance
    │
    └─ YES: Is market marked `isMock`?
             │
             ├─ YES ──> Firestore-only betting (ignore onChainMarketId)
             │
             └─ NO: Is user's wallet connected?
                      │
                      ├─ NO ──> Firestore-only betting with platform balances
                      │
                      └─ YES ──> ON-CHAIN BETTING! 
                                 Use real BNB from MetaMask
                                 Generate blockchain transaction
                                 Wait for confirmation
```

---

## 📊 Summary Table

| Feature | On-Chain (BSC Testnet) | Firestore-Only |
|---------|----------------------|----------------|
| **Betting Currency** | BNB only | $PRED, BNB, CAKE (mock) |
| **Wallet Required** | MetaMask/WalletConnect | Email auth only |
| **Transaction Fees** | Gas fees (can be gasless via Biconomy) | None |
| **Market Type** | Markets with `onChainMarketId` | All markets, especially Quick Play |
| **Transaction Speed** | 3-5 seconds (blockchain) | Instant (database) |
| **User Experience** | More secure, transparent | Faster, easier |
| **$PRED Token** | ❌ Not supported | ✅ Primary currency |

---

## 🚀 Next Steps for Full On-Chain Integration

To make MORE of Predora on-chain:

1. **Create Markets On-Chain by Default**
   - Modify market creation to always call smart contract
   - Auto-assign `onChainMarketId` to all new markets

2. **Integrate $PRED ERC20 Token**
   - Update PredictionMarket.sol to accept ERC20 bets
   - Deploy $PRED token contract
   - Add token approval UI flow

3. **Enable Quick Play On-Chain**
   - Create Quick Play markets with smart contract calls
   - Batch pledge confirmations into single transaction

4. **Gasless Transactions via Biconomy**
   - Set `BICONOMY_PAYMASTER_API_KEY` environment variable
   - Enable ERC-4337 Account Abstraction
   - Users get free transactions (no gas fees)

---

## 🔒 Security Notes

**Current Setup:**
- On-chain betting is SECURE (uses user's own MetaMask wallet)
- Firestore betting is CENTRALIZED (balances controlled by platform)
- Custodial wallets are DISABLED until `WALLET_ENCRYPTION_KEY` is set

**For Production:**
- Set `WALLET_ENCRYPTION_KEY` for custodial wallet security
- Consider migrating all betting to on-chain for transparency
- Implement proper key management for deployer wallet
