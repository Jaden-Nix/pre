# Your Wallet Address & Testnet Tokens - Complete Explanation

## 🎯 Your Wallet Address in Profile

### How It Works:
```
1. You open Predora and click "Connect Wallet"
2. MetaMask pops up asking for permission
3. You approve → Your wallet address is linked
4. Profile shows your address (e.g., 0x8973bc5cf0469b24c4ff916256105779abcb06d6)
5. Your balance updates automatically
```

### Where to See It:
- **Profile Screen** → Click your avatar/name
- **Top bar** → Shows "0x897...06d6" (shortened version)
- **Account Status** → Full address displayed

### This Is:
- ✅ **Real**: Actual blockchain address from MetaMask
- ✅ **Unique**: Only you control this wallet
- ✅ **Permanent**: Same address across all sessions
- ✅ **Public**: Anyone can see this (blockchain is public)

---

## 💰 Testnet Tokens Explained

### What Are Testnet Tokens?

Think of them like video game coins:
- **Real BNB**: The actual currency on BNB Chain mainnet (worth real money)
- **Testnet BNB**: Fake coins for testing (worth $0, used for development)

### Why Use Testnet?

```
Without testnet (risky):
❌ Every bug costs real money
❌ Users would lose actual funds during testing
❌ Expensive to develop

With testnet (safe):
✅ Test features for free
✅ No real money involved
✅ Practice before mainnet launch
```

### How to Get Testnet BNB:

1. **Visit Faucet**: https://www.bnbchain.org/en/testnet-faucet
2. **Connect Wallet**: Click "Connect Wallet" → MetaMask
3. **Get Tokens**: Click "Claim BNB" button
4. **Wait**: Takes 30 seconds to a few minutes
5. **Check**: Your Predora profile updates automatically

### How Much You Get:

Each faucet request gives about **0.5 - 1 BNB testnet**

You can:
- Place multiple bets
- Test different markets
- Reset and get more (usually every 24 hours)

---

## 📊 Understanding Your Balance in Predora

### Three Types of Balance:

```javascript
{
    walletAddress: "0x8973bc5cf0469b24c4ff916256105779abcb06d6",
    
    // 1. TESTNET BNB (Blockchain)
    bnbBalance: 0.5,
    // Real testnet BNB from MetaMask wallet
    // Used for placing bets
    
    // 2. PLATFORM CURRENCY (Firebase)
    balance: 300.44,
    // Virtual USD-like currency from Predora
    // Used for some platform features
    
    // 3. CAKE TOKENS (Optional BSC feature)
    cakeBalance: 349.5
    // Alternative token on BSC
}
```

### Which Balance Matters?

For betting: **bnbBalance** (testnet BNB)
- This is what you use when you click "Place Bet"
- Comes from your MetaMask wallet
- Updates in real-time

---

## 🔄 How Betting With Your Wallet Works

### Step-by-Step:

```
1. User views market: "Will Bitcoin hit $100k?"
   
2. User clicks "Bet 0.1 BNB on YES"
   
3. MetaMask popup appears:
   - From: [Your wallet address]
   - To: [Predora contract]
   - Amount: 0.1 BNB
   - Gas fee: 0.001 BNB
   
4. User clicks "Confirm"
   
5. Transaction sent to blockchain
   
6. Your balance: 0.5 → 0.399 BNB
   (0.1 BNB bet + 0.001 BNB gas)
   
7. Bet recorded in market
   
8. If you win: Get paid back to same wallet
```

---

## ⚡ What Biconomy Changes

### Without Biconomy:
```
MetaMask shows: "Gas fee: 0.001 BNB"
→ You pay 0.001 BNB
→ Your balance: 0.5 → 0.399 BNB
```

### With Biconomy (Gasless):
```
MetaMask shows: "Gas fee: SPONSORED"
→ You pay 0.000 BNB
→ Your balance: 0.5 → 0.4 BNB
→ Predora pays the gas instead
```

**Result**: Users keep more of their balance!

---

## 🚀 Your Profile Fields Explained

### Wallet Section:
- **Wallet Address**: Your MetaMask address
- **BNB Balance**: Real testnet coins you own
- **Network**: Shows "BSC Testnet" (chainId: 97)

### Account Status:
- **MetaMask Connected**: ✅ Yes/No
- **Network**: Which blockchain you're on
- **Account Abstraction**: Biconomy status (coming soon)

### Experience Section:
- **XP**: Your experience points from betting
- **Streak**: Consecutive successful predictions
- **Betting History**: All your past bets

---

## ❓ Common Questions

**Q: Is my wallet address public?**
A: Yes, everyone can see it. That's how blockchain works. But only you can spend from it (with MetaMask).

**Q: Can I use the same wallet on different apps?**
A: Yes! Your MetaMask wallet works everywhere.

**Q: What if I lose my seed phrase?**
A: You lose access to everything. Save it in a safe place.

**Q: Can testnet BNB be converted to real BNB?**
A: No, it's only for testing. Worth $0.

**Q: How often does my balance update?**
A: Every few seconds. It's real-time from blockchain.

**Q: What if I run out of testnet BNB?**
A: Go to faucet again and get more (usually daily).

---

## 🔒 Your Wallet Security

**Safe:**
- ✅ MetaMask has your seed phrase (you control it)
- ✅ We never see your private key
- ✅ You approve each transaction

**Not Safe:**
- ❌ Sharing seed phrase with anyone
- ❌ Using public WiFi for large transactions
- ❌ Clicking suspicious links

---

## Summary

```
✅ Your wallet is real and permanent
✅ Testnet BNB is free and unlimited (daily)
✅ Balance updates automatically
✅ Biconomy makes betting cheaper (coming soon)
✅ You maintain 100% control
```

**Next**: Get testnet BNB from faucet and place your first bet!
