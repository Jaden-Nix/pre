# Frontend Smart Contract Integration Plan

## Current Status
- ✅ Contract deployed and tested on BSC Testnet
- ✅ Contract utilities created in `server/contract-utils.js`
- ⏳ Frontend integration in progress

## Integration Points

### 1. Web3 Wallet Connection
**Location:** `app.html` - `connectWeb3Wallet()` function

**Changes Needed:**
- Validate user is on BSC Testnet
- Initialize ContractManager with contract address
- Store contract instance in global scope

```javascript
window.contractManager = new ContractManager(PREDICTION_MARKET_CONTRACT_ADDRESS);
```

### 2. Create Market
**Location:** `app.html` - Market creation screen

**Change Flow:**
- Before: Save to Firebase only
- After: 
  1. Create on-chain via `contractManager.createMarket()`
  2. Wait for blockchain confirmation
  3. Save to Firebase with on-chain transaction hash
  4. Display explorer link to user

### 3. Place Bets
**Location:** `app.html` - Betting/pledge confirmation

**Change Flow:**
- Before: Update Firebase balance (mock)
- After:
  1. Send transaction via `contractManager.placeBet()`
  2. Wait for confirmation
  3. Update Firebase with on-chain bet data
  4. Show transaction confirmation to user

### 4. Resolve Markets
**Location:** `app.html` - Admin panel

**Change Flow:**
- Before: Manual resolution in Firebase
- After:
  1. Call `contractManager.resolveMarket()` on-chain
  2. Validate admin signature
  3. Update Firebase after on-chain resolution
  4. Show explorer link to confirmation

### 5. Claim Winnings
**Location:** `app.html` - Leaderboard/Profile

**Change Flow:**
- Before: Award points (mock)
- After:
  1. Call `contractManager.claimWinnings()`
  2. Send real BNB to user wallet
  3. Update user's on-chain balance
  4. Show settlement transaction

## Network Configuration (Frontend)

```javascript
const BSC_TESTNET = {
    chainId: '0x61',  // 97 in hex
    chainName: 'BSC Testnet',
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    nativeCurrency: {
        name: 'BNB',
        symbol: 'tBNB',
        decimals: 18
    },
    blockExplorerUrls: ['https://testnet.bscscan.com']
};
```

## Error Handling

Add catch blocks for:
- ❌ Wrong network (prompt to switch)
- ❌ Insufficient balance (show required BNB)
- ❌ Transaction failed (show error message)
- ❌ Contract not initialized (reconnect wallet)

## Testing Strategy

1. **Unit Tests:**
   - Mock wallet connection
   - Test contract calls with fake provider
   - Verify error handling

2. **Integration Tests:**
   - Connect real MetaMask wallet
   - Create market on-chain
   - Place bets with real testnet BNB
   - Verify Firebase sync

3. **Manual Testing:**
   - Create 3-5 markets
   - Place bets as different users
   - Resolve markets
   - Claim winnings
   - Check explorer transactions

## Remaining Tasks (Next Session)

- [ ] Wire up market creation to on-chain calls
- [ ] Wire up betting to on-chain transactions
- [ ] Add transaction confirmation UI
- [ ] Add error handling for network/wallet issues
- [ ] Display explorer links for transactions
- [ ] Sync on-chain states with Firebase
- [ ] Add gas estimation before transactions
- [ ] Handle wallet disconnection gracefully
- [ ] Create transaction history view
- [ ] Test with multiple users on testnet

## Contract Address (After Deployment)

Once deployed, add to `app.html`:
```javascript
const PREDICTION_MARKET_CONTRACT_ADDRESS = "0x...";  // Fill in after deployment
const PREDICTION_MARKET_ABI = [...];  // From PredictionMarket-ABI.json
```

## Key Files

- **Contract:** `contracts/PredictionMarket.sol`
- **Deployment Script:** `contracts/scripts/deploy.js`
- **Frontend Utils:** `server/contract-utils.js`
- **Frontend Integration:** `app.html` (Web3 section)
- **Hardhat Config:** `contracts/hardhat.config.js`

## Deployment Output Files

After running deployment script, these files are created:
- `contracts/deployment-info.json` - Contract address & details
- `contracts/PredictionMarket-ABI.json` - Contract ABI for calls

## Current Limitations (Mock Phase)

While contract is being integrated:
- Users can still use demo accounts without Web3
- Mock betting still works in Firebase
- Admin panel can resolve markets manually
- Real BNB transactions only work after frontend integration complete

## Success Criteria

✅ Users with MetaMask can connect BSC Testnet wallet
✅ Creating markets writes to blockchain
✅ Placing bets sends real BNB transactions
✅ Market resolutions confirm on-chain
✅ Users claim real BNB winnings
✅ All transactions visible on BSCScan
✅ Firebase stays in sync with blockchain

## Emergency Procedures

If something goes wrong:
1. Check contract on BSCScan: https://testnet.bscscan.com
2. Verify user's wallet has testnet BNB
3. Check network is set to BSC Testnet (chainId: 97)
4. Admin can manually resolve disputed markets
5. Users can always claim funds if contract state is valid
