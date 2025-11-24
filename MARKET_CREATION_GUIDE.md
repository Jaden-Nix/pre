# Predora Market Creation Guide

## Quick Summary

Predora has **two market systems**:
1. **Standard Markets** - Binary prediction markets with liquidity pools
2. **No-Loss Markets** - Conceptual feature (not yet implemented on-chain)

---

## 1. STANDARD MARKET CREATION FLOW

### User Journey
```
Frontend (React)
    ↓
User enters: Title, Description, Resolution Date, Liquidity
    ↓
AI Generator (optional) - generates market using Gemini
    ↓
User clicks "Create Market" / "Publish Market"
    ↓
Smart Contract Call (PredictionMarketV2.sol)
    ↓
Market is live on blockchain
```

### Frontend Entry Points

#### A. AI-Generated Markets (CreateMarket.tsx)
```typescript
// Step 1: User enters a prompt like "Will Bitcoin reach $100K?"
const handleGenerate = async () => {
  const marketData = await generateMarket({ userPrompt: prompt });
  // AI returns: title, description, category, resolutionDate, yesOdds, noOdds
}

// Step 2: User clicks "Publish Market"
const handlePublish = async () => {
  createMarket(
    generatedMarket.title,
    generatedMarket.description,
    resolutionTimeInSeconds,
    '0.01',  // Initial YES liquidity in BNB
    '0.01',  // Initial NO liquidity in BNB
    '0',     // Initial YES liquidity in PRED (0 = no PRED)
    '0'      // Initial NO liquidity in PRED
  );
}
```

#### B. Manual Market Creation
Users can also create markets manually with:
- **Title**: Question (max 100 chars)
- **Description**: Details about the market
- **Resolution Date**: When the market resolves (future date only)
- **Currency**: BNB or $PRED
- **Liquidity**: Amount for YES pool and NO pool

### Smart Contract Execution (PredictionMarketV2.sol)

**Function:** `createMarket()`

```solidity
function createMarket(
    string memory _title,              // "Will Bitcoin reach $100K in 2025?"
    string memory _description,        // "Resolves YES if BTC hits $100K by Dec 31..."
    uint256 _resolutionTime,          // Unix timestamp (e.g., 1735689600 = Dec 31, 2025)
    uint256 _initialYesBnb,           // Liquidity for YES side (in wei, e.g., 0.01 BNB)
    uint256 _initialNoBnb,            // Liquidity for NO side (in wei, e.g., 0.01 BNB)
    uint256 _initialYesPred,          // PRED token liquidity for YES
    uint256 _initialNoPred            // PRED token liquidity for NO
) external payable returns (uint256)
```

### What Happens Inside the Contract

**Step 1: Validation**
```solidity
require(_resolutionTime > block.timestamp, "Future time required");
require(bytes(_title).length > 0, "Title required");
require(msg.value == totalBnb, "Incorrect BNB amount");
```

**Step 2: Token Transfers**
```solidity
// If using PRED tokens
if (totalPred > 0) {
    require(predToken.transferFrom(msg.sender, address(this), totalPred), "PRED transfer failed");
}
// BNB is already sent via msg.value
```

**Step 3: Create Market Struct**
```solidity
marketCounter++;  // Get unique ID

markets[marketCounter] = Market({
    id: marketCounter,
    title: _title,
    description: _description,
    creator: msg.sender,              // Who created it
    createdAt: block.timestamp,
    resolutionTime: _resolutionTime,  // When it resolves
    isResolved: false,
    outcome: false,                   // Not resolved yet
    yesPoolBnb: _initialYesBnb,       // YES liquidity
    noPoolBnb: _initialNoBnb,         // NO liquidity
    yesPoolPred: _initialYesPred,
    noPoolPred: _initialNoPred,
    totalVolumeBnb: 0,                // Tracks user bets (not initial liquidity)
    totalVolumePred: 0,
    status: MarketStatus.ACTIVE,
    // ... other fields
});
```

**Step 4: Record Initial Liquidity as Creator's Bets**
```solidity
// Creator's liquidity is stored as bets
// This ensures they can claim winnings if their side wins
if (_initialYesBnb > 0) {
    marketBets[marketCounter].push(Bet({
        user: msg.sender,
        marketId: marketCounter,
        amount: _initialYesBnb,
        pick: true,      // YES
        currency: Currency.BNB,
        timestamp: block.timestamp,
        claimed: false
    }));
}
// Same for NO side and PRED tokens...
```

**Step 5: Emit Event**
```solidity
emit MarketCreated(marketCounter, _title, msg.sender, _initialYesBnb, _initialNoBnb, _initialYesPred, _initialNoPred);
return marketCounter;  // Return the new market ID
```

### Data Stored

After creation, the contract has:
```solidity
markets[1] = {
    id: 1,
    title: "Will Bitcoin reach $100K in 2025?",
    creator: "0xABC123...",
    yesPoolBnb: 0.01 BNB,
    noPoolBnb: 0.01 BNB,
    yesPoolPred: 0,
    noPoolPred: 0,
    status: ACTIVE,
    resolutionTime: 1735689600,
    // ... other fields
}

// Markets can also be seeded with liquidity on BOTH sides
// Example: 10 BNB for YES, 5 BNB for NO
// This creates an implied odds ratio of 5:10 (33% YES, 67% NO)
```

---

## 2. MARKET POOLS & LIQUIDITY

### How Liquidity Works

**Initial Liquidity = Market Maker Liquidity**

- Creator deposits equal or unequal amounts on both YES and NO sides
- This creates the initial odds
- More on NO side = NO is more likely (in creator's view)

**Example:**
```
Market: "Will Bitcoin reach $100K?"

Initial Liquidity:
- YES pool: 1 BNB
- NO pool: 9 BNB

Implied Odds:
- YES: 9/10 = 90% probability (good bet if you think it will happen)
- NO: 1/10 = 10% probability

Users can now place bets on either side, and the pools adjust.
```

### What Happens When Users Bet

```solidity
function placeBet(
    uint256 _marketId,
    bool _pick,           // true = YES, false = NO
    Currency _currency,   // BNB or PRED
    uint256 _amount
) external payable nonReentrant {
    Market storage market = markets[_marketId];
    
    // Validate
    require(market.status == MarketStatus.ACTIVE);
    require(block.timestamp < market.resolutionTime);  // Market not expired
    
    // Record the bet
    marketBets[_marketId].push(Bet({
        user: msg.sender,
        marketId: _marketId,
        amount: _amount,
        pick: _pick,
        currency: _currency,
        timestamp: block.timestamp,
        claimed: false
    }));
    
    // Update pools
    if (_pick) {
        market.yesPoolBnb += _amount;
    } else {
        market.noPoolBnb += _amount;
    }
    market.totalVolumeBnb += _amount;
}
```

---

## 3. NO-LOSS MARKETS (CONCEPTUAL)

### What Are No-Loss Markets?

No-loss markets are designed so **users never lose their principal**. They only earn/lose interest.

### How They Would Work

```
1. USER DEPOSITS USDC INTO YIELD PROTOCOL
   User: 1000 USDC
   ↓
   → Aave/Lido/Compound: Generates 5% annual yield
   ↓
   Receives: aUSDC (yield-bearing token)

2. USER PLACES PREDICTION BETS
   Bet amount: Uses ONLY the interest generated
   Principal: Stays locked in Aave
   
   Scenario A: User wins
   → Keeps principal (1000 USDC)
   → Keeps their share of interest
   → Wins portion of loser's interest pool
   
   Scenario B: User loses
   → Keeps principal (1000 USDC)
   → Loses their interest earnings
   → No loss of original money!

3. OUTCOME RESOLUTION
   Market: "Will Bitcoin reach $100K?"
   
   Winners: 60 people who bet YES
   Losers: 40 people who bet NO
   
   NO pool interest ($400 from losers)
   ↓
   Split among 60 winners
   ↓
   Each winner gets: Their interest + share of losing pool
```

### Why It's Powerful

| Aspect | Traditional Market | No-Loss Market |
|--------|-------------------|-----------------|
| **Risk** | Lose your bet | Can't lose principal |
| **Barrier to entry** | Risky for casual users | Low risk, fun to try |
| **Adoption** | Lower | Higher (more user-friendly) |
| **TVL potential** | Limited | Massive (entire USDC ecosystem) |

### Current Status in Predora

**Implementation Status:** ❌ Not yet implemented

What exists:
- UI mockup in `FeatureCard.tsx` describing the concept
- Conceptual design documented

What's needed:
- Smart contract integration with Aave/Lido/Compound
- Yield harvesting logic
- Principal custody solution
- Separate payout calculations for principal + interest

---

## 4. MARKET RESOLUTION & PAYOUTS

### Resolution Process

```solidity
// Step 1: Admin resolves market with outcome
function resolveMarketWithEvidence(
    uint256 _marketId,
    bool _outcome,           // true = YES won, false = NO won
    string memory _evidenceHash  // IPFS hash of evidence
) public onlyAdmin {
    Market storage market = markets[_marketId];
    market.isResolved = true;
    market.outcome = _outcome;
    market.status = MarketStatus.RESOLVED;
    market.resolutionSubmittedAt = block.timestamp;
    market.evidenceHash = _evidenceHash;  // Verifiable oracle proof
}
```

### Finalization (30-minute dispute window)

```solidity
function finalizeMarket(uint256 _marketId) external onlyAdmin {
    Market storage market = markets[_marketId];
    require(block.timestamp >= market.resolutionSubmittedAt + 30 minutes);
    market.status = MarketStatus.FINALIZED;
    
    // Calculate fees
    uint256 winningPoolBnb = market.outcome ? market.yesPoolBnb : market.noPoolBnb;
    uint256 losingPoolBnb = market.outcome ? market.noPoolBnb : market.yesPoolBnb;
    
    // Fee = 1% of winning pool
    uint256 feeBnb = (winningPoolBnb * 100) / 10000;  // 1%
    accumulatedFeesBnb += feeBnb;
}
```

### User Claims Winnings

```solidity
function claimWinnings(uint256 _marketId) external nonReentrant {
    Market storage market = markets[_marketId];
    require(market.status == MarketStatus.FINALIZED);
    
    (uint256 bnbPayout, uint256 predPayout) = calculateUserPayout(_marketId, msg.sender);
    
    // User gets: Their stake - fee + proportional share of losing pool
    // Formula: payout = (stake - fee) + (stake * losingPool / winningPool)
}
```

**Example Payout:**
```
Market resolved: YES wins
User bet: 1 BNB on YES

YES pool total: 10 BNB
NO pool total: 8 BNB

Fee: 1% of YES pool = 0.1 BNB

User payout:
= (1 - 0.01) + (1 * 8 / 10)
= 0.99 + 0.8
= 1.79 BNB
(Profit: 0.79 BNB)
```

---

## 5. BACKEND SERVER FLOW

When a market is created, the server:

1. **Receives API call from frontend** (via wagmi/web3 library)
2. **Listens to blockchain events** (MarketCreated event)
3. **Mirrors data to Firestore** (off-chain storage for fast queries)
   ```javascript
   // Firebase stores:
   // - Market metadata
   // - User bet history
   // - Real-time market data
   ```
4. **Triggers XP rewards**
   ```javascript
   // User gets 25 XP for creating market with liquidity
   addXpToUser(userId, 25, "CREATE_MARKET");
   ```

---

## 6. CURRENT ERRORS IN THE LOGS

Looking at browser logs, I see:
```
❌ Failed to fetch wallet address from Firestore
❌ On-chain market creation failed
```

These indicate:
1. User wallet address not properly synced to Firestore
2. On-chain transaction likely failed due to wallet/gas issues

---

## SUMMARY TABLE

| Feature | Status | Details |
|---------|--------|---------|
| Standard Markets | ✅ Production Ready | V2 contract with BNB + PRED support |
| Manual Creation | ✅ Ready | Full form with date/amount inputs |
| AI Generation | ✅ Ready | Uses Gemini 2.5 to auto-generate markets |
| No-Loss Markets | ❌ Roadmap | Conceptual, needs Aave integration |
| Batch Betting | ✅ Ready | Place up to 50 bets in one transaction |
| Dispute Window | ✅ Ready | 30-minute resolution challenge window |
| XP System | ✅ Ready | 25 XP for market creation |

---

## KEY CONTRACT ADDRESSES

- **PredictionMarketV2**: `0x[contract-address]`
- **PRED Token**: BSC Testnet
- **Network**: BNB Smart Chain Testnet

All markets are currently on BSC Testnet (not mainnet) for testing.
