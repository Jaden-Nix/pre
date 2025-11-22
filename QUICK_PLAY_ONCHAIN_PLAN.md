# Quick Play On-Chain Integration Plan

## Current Status

Quick Play markets are currently **100% Firestore-based**:
- Questions generated via Gemini AI and stored in `quick_plays` collection
- User votes (YES/NO) create pledges in local "pledge pool"
- When user confirms, pledges are stored in Firestore with mock balances
- No blockchain interaction, no gas fees, instant execution

## Goal

Make Quick Play markets use on-chain transactions with BSC Testnet.

---

## Option 1: Auto-Create Markets On-Chain (Recommended)

### How It Works:
1. When `autoGenerateQuickPlays()` runs, create each Quick Play question as an on-chain market
2. Store `onChainMarketId` in the Firestore `quick_plays` document
3. When users vote YES/NO, use existing on-chain betting flow
4. Auto-resolve markets using the Swarm-Verify Oracle

### Implementation Steps:

#### Backend Changes (`server/index.js`):

```javascript
async function autoGenerateQuickPlays() {
    // ... existing Gemini AI generation code ...
    
    for (const item of data.questions) {
        let onChainMarketId = null;
        
        // Create market on-chain if custodial wallet is available
        if (custodialWalletService && custodialWalletService.createMarket) {
            try {
                const expiryTimestamp = Math.floor(new Date(item.expiresAt).getTime() / 1000);
                const marketData = {
                    title: item.question,
                    question: item.question,
                    expiresAt: item.expiresAt,
                    category: 'QuickPlay',
                    options: ['YES', 'NO'],
                    expiryTimestamp
                };
                
                // Create market on BSC testnet
                onChainMarketId = await custodialWalletService.createMarket(marketData);
                console.log(`✅ Created on-chain market ID: ${onChainMarketId} for Quick Play`);
            } catch (error) {
                console.error('Failed to create on-chain Quick Play market:', error);
                // Continue with Firestore-only market
            }
        }
        
        // Store in Firestore with optional onChainMarketId
        await db.collection(collectionPath).add({
            question: item.question,
            expiresAt: item.expiresAt,
            createdAt: new Date().toISOString(),
            isActive: true,
            onChainMarketId: onChainMarketId || null  // null if on-chain creation failed
        });
    }
}
```

#### Frontend Changes (`app.html`):

**Modify `handleQuickPlay()` function:**

```javascript
async function handleQuickPlay(pick) {
    // ... existing validation code ...
    
    // If Quick Play has onChainMarketId, use on-chain betting
    if (currentQuickPlay.onChainMarketId && !isGuestMode && connectedAddress) {
        try {
            showToast('⛓️ Creating on-chain transaction...', 'info');
            
            // Use existing on-chain betting flow
            const bnbAmount = amount * getMockPrice(selectedAsset) / getMockPrice('BNB');
            const pickBool = pick === 'YES';
            
            const contract = getContractInstance();
            const bnbWei = ethers.utils.parseEther(bnbAmount.toFixed(18));
            
            const tx = await contract.placeBet(
                currentQuickPlay.onChainMarketId,
                pickBool,
                { value: bnbWei }
            );
            
            await tx.wait(1);
            showToast('✅ On-chain bet confirmed!', 'success');
            
            // Also store in Firestore for UI
            // ... existing pledge creation code ...
        } catch (error) {
            console.error('On-chain Quick Play bet failed:', error);
            showToast('Transaction failed: ' + error.message, 'error');
            return;
        }
    } else {
        // Fallback to Firestore-only (existing code)
        // ... existing pledge pool code ...
    }
}
```

### Requirements:
- ✅ PredictionMarket.sol already deployed at `0xdaAf91610e33355c9Cd9258219C6A4822E693f55`
- ⚠️ **WALLET_ENCRYPTION_KEY** must be set (32+ characters) for custodial wallet service
- ⚠️ **DEPLOYER_PRIVATE_KEY** (or dedicated Quick Play creator wallet) for creating markets
- ⚠️ Deployer wallet needs testnet BNB for gas fees

---

## Option 2: User Creates Market On Confirmation

### How It Works:
1. Quick Play questions remain Firestore-only initially
2. When user confirms pledges, create markets on-chain dynamically
3. Place bets immediately after market creation
4. More complex, but doesn't require custodial wallet for market creation

### Pros:
- No need for server-side wallet to create markets
- Markets only created when users actually bet
- Less on-chain spam

### Cons:
- Slower user experience (create market + place bet = 2 transactions)
- Gas fees for market creation passed to users
- Complex UX flow

**NOT RECOMMENDED** - Option 1 is better for UX.

---

## $PRED Token On-Chain Integration

Currently, $PRED is a **Firestore display currency** valued at $600/token. To use it for on-chain betting:

### Step 1: Deploy $PRED ERC20 Token

```bash
cd contracts
npx hardhat run scripts/deploy-pred-token.js --network bsc_testnet
```

**Requirements:**
- Set `DEPLOYER_PRIVATE_KEY` in environment variables
- Deployer wallet needs testnet BNB for gas

**Output:**
- Contract address (e.g., `0xABC123...`)
- Save to `pred-token-deployment.json`

### Step 2: Modify PredictionMarket.sol

Add support for ERC20 token bets:

```solidity
// Add at top of contract
IERC20 public predToken;
mapping(uint256 => bool) public marketAcceptsPredToken;

// Modify constructor
constructor(address _predTokenAddress) {
    predToken = IERC20(_predTokenAddress);
    // ... existing code ...
}

// New function: Place bet with $PRED tokens
function placeBetWithToken(
    uint256 marketId,
    bool pickYes,
    uint256 tokenAmount
) external marketExists(marketId) {
    require(marketAcceptsPredToken[marketId], "Market doesn't accept PRED");
    require(!hasOutcome[marketId], "Market resolved");
    
    // Transfer tokens from user to contract
    require(
        predToken.transferFrom(msg.sender, address(this), tokenAmount),
        "Token transfer failed"
    );
    
    // ... existing bet logic ...
    // Store bet amount in token terms
}

// Modify createMarket to accept token flag
function createMarket(
    string memory title,
    string[] memory options,
    uint256 expiryTimestamp,
    bool acceptsPredToken
) external onlyOwner {
    // ... existing code ...
    marketAcceptsPredToken[marketCount] = acceptsPredToken;
}
```

### Step 3: Redeploy PredictionMarket.sol

```bash
# Update deploy script with PredToken address
npx hardhat run scripts/deploy-prediction-market.js --network bsc_testnet
```

### Step 4: Update Frontend for Token Approval

```javascript
// Before placing bet with $PRED
async function placeBetWithPredToken(marketId, pick, amount) {
    const predTokenContract = new ethers.Contract(
        PRED_TOKEN_ADDRESS,
        PRED_TOKEN_ABI,
        signer
    );
    
    // Step 1: Approve PredictionMarket contract to spend tokens
    const tokenAmount = ethers.utils.parseEther(amount.toString());
    const approveTx = await predTokenContract.approve(
        PREDICTION_MARKET_ADDRESS,
        tokenAmount
    );
    await approveTx.wait(1);
    showToast('Token approval confirmed', 'success');
    
    // Step 2: Place bet
    const predictionContract = getContractInstance();
    const tx = await predictionContract.placeBetWithToken(
        marketId,
        pick === 'YES',
        tokenAmount
    );
    await tx.wait(1);
    showToast('Bet placed with $PRED!', 'success');
}
```

---

## Estimated Timeline

| Task | Time | Blocker |
|------|------|---------|
| Fix faucet button visibility | ✅ Done | None |
| Deploy $PRED ERC20 token | 10 min | Need DEPLOYER_PRIVATE_KEY |
| Modify PredictionMarket.sol | 2 hours | Need deployed $PRED address |
| Update frontend for token approval | 1 hour | Need new contract |
| Enable Quick Play on-chain (Option 1) | 3 hours | Need WALLET_ENCRYPTION_KEY |
| Test end-to-end | 1 hour | All above |

**Total: ~7-8 hours** (excluding deployment time)

---

## Quick Start Commands

### 1. Set Required Environment Variables

```bash
# For deploying contracts
DEPLOYER_PRIVATE_KEY=your_private_key_here

# For custodial wallet service (Quick Play auto-creation)
WALLET_ENCRYPTION_KEY=your_32_char_encryption_key_here
```

### 2. Deploy $PRED Token

```bash
cd contracts
npx hardhat run scripts/deploy-pred-token.js --network bsc_testnet
```

### 3. Airdrop $PRED to Test Users

```javascript
// In Hardhat console or script
const PredToken = await ethers.getContractAt("PredToken", PRED_TOKEN_ADDRESS);
await PredToken.airdrop(
    ["0xUserAddress1", "0xUserAddress2"],
    100  // 100 PRED per user
);
```

---

## Security Notes

- **DEPLOYER_PRIVATE_KEY**: Store as Replit Secret, never commit to Git
- **WALLET_ENCRYPTION_KEY**: Must be 32+ characters, used for AES-256-GCM
- Token approval UX: Show clear warnings about spending limits
- Smart contract auditing: Recommend audit before mainnet deployment

---

## Next Steps

1. **Decide on approach:**
   - Option A: Deploy $PRED first, then Quick Play on-chain
   - Option B: Quick Play on-chain first with BNB only
   - Option C: Both simultaneously

2. **Set environment variables** (required for all options)

3. **Test on BSC testnet** before considering mainnet

4. **Update documentation** with new contract addresses
