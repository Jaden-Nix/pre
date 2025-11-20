# Predora Smart Contract Deployment & Integration

## Overview
Predora integrates with `PredictionMarket.sol` on BSC Testnet (Chain ID: 97) for real on-chain betting with testnet BNB.

## Prerequisites

1. **Get Testnet BNB:**
   - Visit: https://testnet.bnbchain.org/faucet-smart
   - Connect wallet and request testnet BNB

2. **MetaMask Setup:**
   - Switch to BSC Testnet (chainId: 97)
   - RPC URL: `https://data-seed-prebsc-1-s1.binance.org:8545/`
   - Currency: tBNB
   - Explorer: https://testnet.bscscan.com

3. **Get Deployment Private Key:**
   - Export from MetaMask
   - **Never commit this to git!**

## Deployment Steps

### 1. Setup Contract Deployment Environment

```bash
cd contracts
npm install
cp .env.example .env
```

### 2. Add Your Private Key to `.env`

```env
DEPLOY_PRIVATE_KEY=your_exported_metamask_private_key
BSCSCAN_API_KEY=your_bscscan_api_key  # Optional for verification
```

### 3. Deploy Contract to BSC Testnet

```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

**Output will look like:**
```
✅ PredictionMarket deployed to: 0x1234567890abcdef...
📝 Deployment info saved to: deployment-info.json
✅ Contract verified and ready!
```

### 4. Copy Contract Address

The deployment script creates:
- `deployment-info.json` - Contains contract address & deployment details
- `PredictionMarket-ABI.json` - Contract ABI for frontend

### 5. Update Frontend Configuration

In `app.html`, update the contract address in the Web3 initialization section:

```javascript
const PREDICTION_MARKET_CONTRACT_ADDRESS = "0x..."; // From deployment output
```

## Frontend Integration

### Web3 Connection Flow

1. **User connects MetaMask** → App validates BSC Testnet network
2. **Network check passes** → Frontend initializes contract manager
3. **User creates market** → Calls `createMarket()` on-chain
4. **User places bet** → Calls `placeBet()` with BNB amount
5. **Market resolves** → Admin calls `resolveMarket()` on-chain
6. **User claims winnings** → Calls `claimWinnings()` to receive BNB

### Smart Contract Functions

#### Market Creation
```solidity
createMarket(
    string memory title,
    string memory description,
    uint256 resolutionTime
) → returns marketId
```

#### Placing Bets
```solidity
placeBet(
    uint256 marketId,
    bool pick  // true = YES, false = NO
) payable
```

#### Market Resolution (Admin)
```solidity
resolveMarket(
    uint256 marketId,
    bool outcome  // true = YES won, false = NO won
)
```

#### Claiming Winnings
```solidity
claimWinnings(uint256 betId)
```

## Testing Checklist

- [ ] Deploy contract to BSC Testnet
- [ ] Get testnet BNB for deployment account
- [ ] Update contract address in app.html
- [ ] User can connect MetaMask wallet
- [ ] Network validation works (rejects non-BSC networks)
- [ ] User can create markets on-chain
- [ ] User can place bets with real BNB
- [ ] Admin can resolve markets
- [ ] Users can claim winnings

## Contract Features

- ✅ **Real Prediction Markets** - Binary outcome (YES/NO)
- ✅ **Liquidity Pools** - YES and NO pools with automated odds
- ✅ **1% Platform Fee** - Collected on resolutions
- ✅ **Dispute Mechanism** - Markets can be disputed before resolution
- ✅ **Winnings Payout** - Proportional based on pool contribution
- ✅ **Admin Controls** - Resolve markets, manage fees

## Troubleshooting

### "Wrong Network" Error
- Check MetaMask is on BSC Testnet
- Check RPC URL: `https://data-seed-prebsc-1-s1.binance.org:8545/`

### Insufficient Funds for Deployment
- Get more testnet BNB from faucet
- Link: https://testnet.bnbchain.org/faucet-smart

### Contract Call Fails
- Ensure user has testnet BNB for gas
- Check contract address is correct in app.html
- Verify market exists (use BSCScan explorer)

### Transaction Takes Too Long
- BSC Testnet usually confirms in 5-15 seconds
- Check transaction on: https://testnet.bscscan.com

## Security Notes

- Contract has admin controls for emergency pause
- Platform fee is configurable (default 1%)
- Disputes prevent immediate resolutions
- All bets are tracked on-chain (immutable)

## Next Steps

1. Deploy contract to BSC Testnet
2. Test with small amounts first
3. Integrate real wallet balances with on-chain states
4. Add transaction confirmation UI to frontend
5. Display transaction hashes and links to explorer

## Support

For contract issues:
- Check BSCScan: https://testnet.bscscan.com
- Review Solidity code: `contracts/PredictionMarket.sol`
- Check deployment info: `contracts/deployment-info.json`
