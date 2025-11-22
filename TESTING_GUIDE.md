# On-Chain Betting Flow - Manual Testing Guide

## Prerequisites
- Access to Predora app at http://localhost:5000/app.html
- Test account credentials (or create new account)
- BSC Testnet access
- Firebase authentication working

## Test Flow

### 1. Authentication & Wallet Setup
1. Open http://localhost:5000/app.html
2. Click "Sign In" and log in with your test account
3. If new account, verify you receive 100 PRED welcome bonus
4. Check your wallet balances in Profile → Assets tab:
   - BNB balance (should show real blockchain balance)
   - PRED balance (should show 100 if new account, or real balance from blockchain)

### 2. Create On-Chain Market
Since there's no UI button yet for creating on-chain markets, use curl:

```bash
# First, get your Firebase ID token (check browser console after login, or use Firebase Auth)
# Then create a market:

curl -X POST http://localhost:5000/api/market/create-onchain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "title": "Will BTC reach $100k by end of 2025?",
    "description": "Test on-chain market for betting flow",
    "category": "Crypto",
    "endDate": "2025-12-31T23:59:59Z",
    "liquidityBNB": "0.01"
  }'
```

Expected response:
```json
{
  "success": true,
  "marketId": "firestore-doc-id",
  "onChainMarketId": 0,
  "txHash": "0x..."
}
```

### 3. Verify Market Creation
1. Refresh the app
2. Find the newly created market in the feed
3. Open it - should display normally
4. Verify it has `onChainMarketId` field set (check console logs)

### 4. Test BNB Betting (Custodial Wallet)
1. Open the on-chain market you created
2. Select "BNB" as currency (top tabs)
3. Enter bet amount: 0.001 to 100 BNB
4. Choose YES or NO
5. Click "Place Bet"
6. Should see loading overlay
7. Backend will sign and submit transaction
8. Wait for success toast with transaction hash
9. Check Profile → Assets: BNB balance should decrease

### 5. Test PRED Betting (Custodial Wallet)
1. Open the same on-chain market
2. Select "PRED" as currency
3. Enter bet amount: 10 to 100000 PRED
4. Choose opposite side from BNB bet
5. Click "Place Bet"
6. Backend automatically handles token approval and betting
7. Wait for success toast
8. Check Profile → Assets: PRED balance should decrease

### 6. Test External Wallet (Optional)
1. Click "Connect Wallet" in top nav
2. Connect MetaMask to BSC Testnet
3. Open an on-chain market
4. Try to bet with PRED → should show warning "External wallets can only bet with BNB"
5. Switch to BNB currency
6. Place bet → MetaMask popup for approval
7. Confirm transaction
8. Wait for success

### 7. Verify On-Chain Data
1. Check BSCScan for your transactions:
   - PredictionMarketV2: https://testnet.bscscan.com/address/0x5330cDAdA8417865B379C5E2Bce14f4D840F593a
   - PredToken: https://testnet.bscscan.com/address/0x45C229bF14A36aD14885148E62058C98284B2ae0
2. Verify `BetPlaced` events emitted
3. Check market pools updated correctly

### 8. Test Quick Play (Firestore)
1. Go to Quick Play section
2. Place bets on Quick Play markets
3. Should use old Firestore flow (no blockchain transactions)
4. Instant confirmation without blockchain delays

## Expected Behaviors

### ✅ Success Indicators
- On-chain markets show transaction hashes after betting
- Balances update correctly after bets
- Firestore stores metadata with correct currency and amount
- External wallets blocked from PRED betting
- Quick Play markets work as before (Firestore-only)

### ❌ Error Cases to Test
- Insufficient balance → should show error toast
- Invalid bet amount (too low/high) → should show validation error
- External wallet disconnected → should prompt to connect
- Network errors → should show error toast with details

## Console Logs to Monitor
- `💰 Using custodial wallet API for on-chain bet...` (custodial path)
- `💰 Using regular transaction (user pays gas)...` (external wallet path)
- `✅ Bet placed on-chain:` (success)
- `❌ On-chain betting failed:` (errors)

## Backend Logs to Monitor
- `🎯 Placing custodial bet on-chain...` 
- `✅ Bet placed successfully`
- `❌ Error placing custodial bet:`

## Troubleshooting
- **"Please connect your wallet"**: External wallet users must connect MetaMask
- **"Insufficient DEPLOYER_PRIVATE_KEY_V2 balance"**: Backend wallet needs BNB for gas
- **"Invalid onChainMarketId"**: Market doesn't exist on contract
- **Transaction timeout**: BSC Testnet might be slow, wait longer or check BSCScan

## Next Steps After Testing
Once all tests pass:
1. Implement on-chain resolution (market settlement)
2. Implement payout distribution
3. Add UI button for creating on-chain markets
4. Add transaction history view
5. Add market statistics (total pool, odds, etc.)
