# Code Audit Report - Predora App.html

**Date:** November 21, 2025  
**File:** app.html  
**Total Lines:** 14,412

---

## Executive Summary

- **Total Lines:** 14,412
- **% Real Integration:** ~45%
- **% Mock/Simulated:** ~55%
- **Critical Status:** App is **NOT production-ready** for blockchain functionality

### Critical Gaps:
1. ❌ **NO SMART CONTRACT INTEGRATION** - Contract initialized but never called
2. ❌ **NO ON-CHAIN BETTING** - All bets stored in-memory/Firestore only
3. ❌ **NO ON-CHAIN PAYOUTS** - Simulated balance updates in Firestore
4. ❌ **BICONOMY NOT INTEGRATED** - Only TODO comments, no actual SDK
5. ⚠️ **WALLETCONNECT INCOMPLETE** - Placeholder for project ID not configured
6. ⚠️ **HARDCODED BALANCES** - Default mock balances used in fallback paths

### What Works (Real Integrations):
- ✅ OTP Authentication via SendGrid backend
- ✅ Custodial wallet generation with encryption
- ✅ Firestore for all data persistence (users, markets, pledges, leaderboard)
- ✅ Gemini AI for market generation and resolution
- ✅ Admin panel with backend API
- ✅ Real BNB balance fetching (exists but not always used)

---

## Detailed Findings

### 1. Authentication & Wallets

**Overall Status: MIXED (60% Real, 40% Mock)**

#### ✅ OTP Authentication - **REAL**
- **Lines:** 5173-5213, 5315-5341
- **Implementation:** 
  - `/api/send-otp` (line 5184)
  - `/api/verify-otp` (line 5225)
  - Backend integration with SendGrid
  - Firestore user creation on verification
- **Status:** Production-ready ✅

#### ✅ Custodial Wallet Generation - **REAL**
- **Lines:** 5078-5124
- **Implementation:**
  - `/api/custodial-wallet/create` (line 5106)
  - `/api/custodial-wallet/get` (line 5089)
  - Private keys encrypted with AES on backend
  - Never exposed to client
- **Status:** Production-ready ✅

#### ❌ Biconomy Smart Account - **MOCK/TODO**
- **Lines:** 4316-4342
- **Implementation:**
  ```javascript
  // Line 4317: TODO: This function needs full Biconomy SDK integration
  // Line 4335: TODO: Replace this comment block with actual Biconomy SDK
  smartAccountAddress = null; // Will be set when SDK is integrated
  ```
- **Status:** Not implemented ❌
- **Impact:** No gasless transactions, no account abstraction

#### ⚠️ External Wallet (MetaMask) - **PARTIAL**
- **Lines:** 5427-5660
- **Implementation:**
  - MetaMask: WORKS (lines 5462-5473)
  - WalletConnect: INCOMPLETE (line 31: `WALLETCONNECT_PROJECT_ID_PLACEHOLDER`)
  - Web3Modal initialized (line 5545) but missing config
- **Status:** MetaMask works, WalletConnect broken ⚠️

**Migration Needed:**
1. Integrate Biconomy SDK with API keys
2. Configure WalletConnect Project ID
3. Test gasless transactions end-to-end

---

### 2. Blockchain Data

**Overall Status: MOCK (80% Mock, 20% Real)**

#### ❌ BNB Balance - **MOSTLY MOCK**
- **Mock Data Locations:**
  - Line 3952: `balance: 100, bnbBalance: 0.2, cakeBalance: 150`
  - Line 5871: `balance: 100, bnbBalance: 0.2, cakeBalance: 150` (fallback defaults)
  - Line 5897-5898: Hardcoded in profile creation
- **Real Implementation Exists:**
  - Line 4348: `async function getRealBNBBalance()`
  - Line 4667-4668: Real balance fetching via `ethersProvider.getBalance()`
  - Line 5684: Called in some auth flows
- **Problem:** Real function exists but **NOT consistently used**
- **Status:** Partial implementation, defaults to mock ⚠️

#### ❌ CAKE Balance - **100% MOCK**
- **Mock Data Locations:**
  - Line 3952: `cakeBalance: 150`
  - Line 5871: `cakeBalance: 150`
  - Line 5898: `cakeBalance: 150`
- **Real Implementation:** NONE
- **Status:** Hardcoded mock data ❌

#### ✅ XP/Points System - **REAL**
- **Implementation:** Firestore with `increment()` operations
- **Lines:** 7023, 7609, 8109, 8763 (updateDoc with increment)
- **Status:** Production-ready ✅

#### ❌ Transaction History - **NOT IMPLEMENTED**
- **Search Result:** No matches for transaction history patterns
- **Status:** Missing feature ❌

**Migration Needed:**
1. **HIGH PRIORITY:** Replace all hardcoded balances with real blockchain reads
2. Implement CAKE balance fetching from BEP-20 contract (0x... address needed)
3. Add transaction history via The Graph or Moralis API
4. Remove fallback mock balances from lines 3952, 5871

---

### 3. Market Data

**Overall Status: REAL (90% Real, 10% Mock)**

#### ✅ Market Creation - **REAL**
- **Lines:** 8763, 9459, 11223 (addDoc, collection)
- **Implementation:** Firestore `addDoc()` to markets collection
- **Backend:** `/api/gemini` for AI-generated market ideas (line 8417)
- **Status:** Production-ready ✅

#### ✅ Market Fetching - **REAL**
- **Lines:** 6285, 6663, 6704, 6765, 7256, 7400, 9643
- **Implementation:** 
  - Real-time listeners with `onSnapshot()`
  - Query filters (where, orderBy, limit)
  - Firestore collections
- **Status:** Production-ready ✅

#### ✅ Market Resolution (AI Oracle) - **REAL**
- **Lines:** 8417, 8955-9026 (callGemini function), 9950 (admin resolve)
- **Implementation:**
  - `/api/gemini` with Gemini 2.5 Flash model
  - Admin API: `/api/admin/resolve-quick-play` (line 9950)
  - AI rationale generation (line 10457-10470)
- **Status:** Production-ready ✅

#### ⚠️ Pledge Pool Tracking - **IN-MEMORY (NOT BLOCKCHAIN)**
- **Lines:** 
  - Line 4048: `let pledgePoolItems = [];` (in-memory array)
  - Line 4743: `localStorage.getItem('pledgePool')` (persisted to localStorage)
  - Line 7989, 8000, 8288: `localStorage.setItem('pledgePool', ...)`
- **Real Persistence:** Also saved to Firestore (lines 7609, 8109, 8763)
- **Problem:** NOT saved to smart contract
- **Status:** Centralized, not on-chain ⚠️

**Migration Needed:**
1. Store pledge pool on smart contract instead of Firestore
2. Remove localStorage persistence for pledge pool
3. Event listening for on-chain market updates

---

### 4. Betting/Staking

**Overall Status: MOCK (100% Simulated)**

#### ❌ Place Bet Function - **NO CONTRACT INTERACTION**
- **Contract Defined:** Line 4016: `PREDORA_CONTRACT_ADDRESS = "0xdaAf91610e33355c9Cd9258219C6A4822E693f55"`
- **Contract Instance Created:** Line 4243: `new ethers.Contract(PREDORA_CONTRACT_ADDRESS, ...)`
- **Contract Function Calls:** **NONE FOUND** ❌
  - Searched for: `contract.placeBet`, `contract.createMarket`, `contract.resolvePrediction`
  - Result: No matches
- **What Actually Happens:**
  - Line 7609-7766: Bets saved to Firestore only
  - Line 8109-8206: Pledge data stored in Firestore
  - Line 8763: Market creation via Firestore (not contract)
- **Status:** Smart contract exists but **NEVER CALLED** ❌

#### ❌ Payout Distribution - **SIMULATED**
- **Lines:** 10054-10122
- **Implementation:**
  - Line 10055: `const payoutUsd = isWinner ? (pledge.amountUsd / (winningOddsForPayout / 100)) : 0;`
  - Line 10077: `const payoutAmount = totalReturnUsd / getMockPrice(pledge.asset);`
  - Line 10122: `[getBalanceField(pledge.asset)]: increment(payoutAmount)` (Firestore update)
- **Problem:** Payouts calculated and distributed in Firestore, **NOT on-chain**
- **Status:** Centralized simulation ❌

#### ❌ Fee Collection - **MOCK**
- **Lines:** 10271-10282 (getMockPrice function)
- **Implementation:** Uses mock prices for USD conversion
- **Status:** Mock calculation ❌

#### ❌ Balance Updates - **LOCAL (Firestore)**
- **Lines:** 
  - Line 5792: `updateDoc(doc(...)` for balance updates
  - Line 5840: Balance updates in Firestore
  - Line 7029-7030: Mock faucet (adds BNB/CAKE to Firestore balance)
- **Status:** Not on-chain ❌

**Migration Needed:**
1. **CRITICAL:** Implement smart contract betting functions:
   - `contract.placeBet(marketId, outcome, amount)`
   - `contract.resolvePrediction(marketId, winningOutcome)`
   - `contract.claimPayout(marketId)`
2. Remove Firestore balance tracking (use blockchain as source of truth)
3. Remove getMockPrice(), fetch real prices from Chainlink or DEX
4. Event listening for bet placements and payouts

---

### 5. Quick Play

**Overall Status: REAL (80% Real, 20% Mock)**

#### ✅ Quick Play Generation - **REAL (Gemini AI)**
- **Lines:** 8417, 8955-9026 (callGemini), 9056, 9108, 9178, 9219, 9401, 9434, 9901
- **Implementation:**
  - `/api/gemini` backend endpoint
  - Gemini 2.5 Flash model
  - Structured output with JSON schema
  - Function calling tools for Google Search integration
- **Status:** Production-ready ✅

#### ✅ Quick Play Data Persistence - **REAL (Firestore)**
- **Lines:** 9459 (addDoc, collection, serverTimestamp)
- **Implementation:** Real-time Firestore storage
- **Status:** Production-ready ✅

#### ❌ Quick Play Betting - **SAME AS REGULAR MARKETS (MOCK)**
- **Implementation:** Uses same pledge system as regular markets
- **Problem:** Not on-chain (same issue as category 4)
- **Status:** Centralized, not blockchain-based ❌

**Migration Needed:**
1. Integrate Quick Play betting with smart contract
2. Same migration as regular betting (see category 4)

---

### 6. Leaderboard

**Overall Status: REAL (100% Real)**

#### ✅ Leaderboard Data Source - **REAL (Firestore)**
- **Lines:** 
  - Line 4035: `const PUBLIC_LEADERBOARD_COLLECTION = 'leaderboard';`
  - Line 5928, 5950-5960: Sync to public leaderboard collection
  - Line 11317, 11622, 12583: Query and fetch leaderboard data
- **Implementation:** Firestore collection with real-time updates
- **Status:** Production-ready ✅

#### ✅ XP Calculation - **REAL**
- **Lines:** 7023, 7609, 8109 (increment operations)
- **Implementation:** Firestore `increment()` for atomic updates
- **Status:** Production-ready ✅

#### ✅ User Rankings - **DYNAMIC (Firestore Queries)**
- **Lines:** 11622 (orderBy, limit, getDocs)
- **Implementation:** Real-time ranking via Firestore queries
- **Status:** Production-ready ✅

**Migration Needed:** None - fully functional ✅

---

### 7. Jury System

**Overall Status: REAL (100% Real)**

#### ✅ Jury Voting - **REAL (Firestore)**
- **Lines:** 10325-10439 (runTransaction, arrayUnion)
- **Implementation:** 
  - Transaction-based voting to prevent double-voting
  - Jury codes stored in Firestore
  - Vote counting with increment
- **Status:** Production-ready ✅

#### ✅ Dispute Resolution - **REAL (Firestore)**
- **Lines:** 10784-10902 (writeBatch, dispute handling)
- **Implementation:**
  - Batch updates for market freezing
  - Dispute flags and jury assignment
- **Status:** Production-ready ✅

#### ✅ Reputation System - **REAL (Firestore)**
- **Lines:** Integrated with XP system
- **Implementation:** Firestore-based reputation tracking
- **Status:** Production-ready ✅

**Migration Needed:** None - fully functional ✅

---

### 8. Admin Panel

**Overall Status: REAL (100% Real)**

#### ✅ Admin Authentication - **REAL**
- **Lines:** 
  - Line 3990: `const ADMIN_PASSWORD = "predora-admin";`
  - Line 4450: `let isAdminAuthenticated = false;`
  - Line 4825: `fetch('/api/admin/verify', ...)`
- **Implementation:** Backend authentication via `/api/admin/verify`
- **Security:** Password validated server-side
- **Status:** Production-ready ✅

#### ✅ Market Override - **REAL (Firestore)**
- **Lines:** 4641 (`/api/admin/override-market`)
- **Implementation:** Admin can override AI resolution
- **Status:** Production-ready ✅

#### ✅ Analytics - **REAL**
- **Lines:** 
  - Line 4465: `/api/admin/stats`
  - Line 4512: Admin stats fetching
  - Line 4539: Disputed markets tracking
- **Implementation:** Real-time analytics from Firestore
- **Status:** Production-ready ✅

**Migration Needed:** None - fully functional ✅

---

## Migration Priority Checklist

### 🔴 CRITICAL PRIORITY (Block Production Launch)

**These MUST be fixed before any real money/mainnet deployment:**

1. ❌ **Implement Smart Contract Betting**
   - Write `placeBet()`, `resolvePrediction()`, `claimPayout()` contract functions
   - Replace Firestore balance updates with on-chain transactions
   - **Lines to modify:** 7609-7766, 8109-8263, 10054-10122
   - **Estimated effort:** 2-3 weeks

2. ❌ **Implement Smart Contract Payout Distribution**
   - On-chain payout calculation and distribution
   - Remove centralized payout simulation
   - **Lines to modify:** 10054-10122
   - **Estimated effort:** 1-2 weeks

3. ❌ **Remove Mock Balance Fallbacks**
   - Delete hardcoded `bnbBalance: 0.2` and `cakeBalance: 150`
   - Force real blockchain reads
   - **Lines to modify:** 3952, 5871, 5897-5898
   - **Estimated effort:** 1 day

4. ❌ **Implement Real CAKE Balance Fetching**
   - Fetch from BEP-20 CAKE contract
   - Similar to `getRealBNBBalance()` at line 4348
   - **New function needed:** `getRealCAKEBalance()`
   - **Estimated effort:** 2 days

### 🟠 HIGH PRIORITY (Week 1-2)

5. ⚠️ **Integrate Biconomy SDK**
   - Replace TODO comments with actual Biconomy SDK
   - Enable gasless transactions
   - **Lines to modify:** 4316-4342
   - **Estimated effort:** 1 week

6. ⚠️ **Configure WalletConnect**
   - Replace `WALLETCONNECT_PROJECT_ID_PLACEHOLDER` (line 31)
   - Get WalletConnect Cloud project ID
   - **Estimated effort:** 1 day

7. ⚠️ **Event Listening for On-Chain Updates**
   - Listen to contract events (BetPlaced, MarketResolved, PayoutClaimed)
   - Update Firestore from blockchain events
   - **New implementation needed**
   - **Estimated effort:** 3-5 days

8. ⚠️ **Real Price Oracle Integration**
   - Replace `getMockPrice()` (line 10271) with Chainlink or PancakeSwap price feeds
   - **Estimated effort:** 3 days

### 🟡 MEDIUM PRIORITY (Week 3-4)

9. ⚠️ **Transaction History**
   - Implement transaction history fetching
   - Use The Graph or Moralis API
   - **New feature**
   - **Estimated effort:** 1 week

10. ⚠️ **Migrate Pledge Pool to Smart Contract**
    - Store pledge pool on-chain instead of Firestore
    - Remove `pledgePoolItems` array (line 4048)
    - Remove localStorage persistence (lines 7989, 8000, 8288)
    - **Estimated effort:** 1 week

11. ⚠️ **Replace Mock Faucet**
    - Remove mock faucet at lines 7029-7030
    - Integrate real BSC testnet faucet API
    - **Estimated effort:** 2 days

### 🟢 LOW PRIORITY (Post-Launch Enhancements)

12. ✅ **Social Features** - Already functional (Firestore-based)
13. ✅ **Leaderboard** - Already functional (no changes needed)
14. ✅ **Admin Panel** - Already functional (no changes needed)
15. ✅ **AI Oracle** - Already functional (Gemini integration working)

---

## Code Locations Reference

### Mock Data Locations (MUST FIX)

| Line | Code | Issue |
|------|------|-------|
| 31 | `WALLETCONNECT_PROJECT_ID_PLACEHOLDER` | WalletConnect not configured |
| 3952 | `balance: 100, bnbBalance: 0.2, cakeBalance: 150` | Hardcoded mock balances |
| 4048 | `let pledgePoolItems = [];` | In-memory pledge pool (not on-chain) |
| 4316-4342 | `// TODO: Biconomy SDK integration` | Account abstraction not implemented |
| 5871 | `balance: 100, bnbBalance: 0.2, cakeBalance: 150` | Hardcoded mock balances (fallback) |
| 5897-5898 | `bnbBalance: 0.2, cakeBalance: 150` | Hardcoded defaults in profile |
| 7029-7030 | Mock faucet adding BNB/CAKE | Simulated faucet (not real testnet faucet) |
| 10271-10282 | `function getMockPrice(asset)` | Mock price oracle |

### Real Integration Locations (Working Well)

| Line | Code | Status |
|------|------|--------|
| 4348 | `async function getRealBNBBalance()` | ✅ Real BNB balance fetching |
| 4667-4668 | `parseFloat(balance)` from blockchain | ✅ Real balance used (sometimes) |
| 5173-5213 | OTP request/verify functions | ✅ Real SendGrid integration |
| 5106 | `/api/custodial-wallet/create` | ✅ Real wallet generation |
| 8417 | `/api/gemini` | ✅ Real AI integration |
| 8955-9026 | `callGemini()` function | ✅ Real Gemini API wrapper |
| 6285-7400 | Firestore market queries | ✅ Real market data fetching |
| 11622 | Leaderboard queries | ✅ Real leaderboard system |
| 10325-10439 | Jury voting system | ✅ Real jury voting (Firestore) |
| 4465-4641 | Admin API endpoints | ✅ Real admin panel |

### Smart Contract (Initialized but NEVER CALLED)

| Line | Code | Problem |
|------|------|---------|
| 4016 | `PREDORA_CONTRACT_ADDRESS = "0xdaAf91610e33355c9Cd9258219C6A4822E693f55"` | Contract address defined ✅ |
| 4243 | `new ethers.Contract(PREDORA_CONTRACT_ADDRESS, PREDORA_CONTRACT_ABI, signer)` | Contract instance created ✅ |
| N/A | `contract.placeBet(...)` | **NOT FOUND** ❌ |
| N/A | `contract.resolvePrediction(...)` | **NOT FOUND** ❌ |
| N/A | `contract.claimPayout(...)` | **NOT FOUND** ❌ |

**Critical Finding:** The smart contract is initialized but **NEVER USED**. All betting, resolution, and payouts are simulated in Firestore.

---

## Risk Assessment

### 🔴 CRITICAL RISKS (Production Blockers)

1. **Centralization Risk:** All bets and payouts happen off-chain in Firestore
   - **Impact:** Not truly decentralized, users must trust the operator
   - **Mitigation:** Implement smart contract integration (Priority 1-2)

2. **Financial Risk:** Mock balance fallbacks could lead to inconsistent state
   - **Impact:** Users might see wrong balances, double-spending possible
   - **Mitigation:** Remove all mock fallbacks (Priority 3-4)

3. **Security Risk:** Hardcoded admin password visible in frontend code
   - **Impact:** Anyone can find `ADMIN_PASSWORD = "predora-admin"` (line 3990)
   - **Mitigation:** Move admin auth entirely to backend (Priority 1)

### 🟠 HIGH RISKS

4. **Account Abstraction Incomplete:** Biconomy not integrated
   - **Impact:** No gasless transactions, poor UX for non-crypto users
   - **Mitigation:** Integrate Biconomy SDK (Priority 5)

5. **WalletConnect Broken:** Missing project ID
   - **Impact:** External wallet users can't connect (except MetaMask)
   - **Mitigation:** Configure WalletConnect (Priority 6)

### 🟡 MEDIUM RISKS

6. **No Transaction History:** Users can't see their betting history from blockchain
   - **Impact:** Reduced transparency, harder to debug issues
   - **Mitigation:** Add transaction history (Priority 9)

7. **Mock Price Oracle:** Using hardcoded prices instead of real oracle
   - **Impact:** Incorrect USD conversions, potential arbitrage issues
   - **Mitigation:** Integrate Chainlink (Priority 8)

---

## Conclusion

### Overall Assessment: **NOT PRODUCTION-READY FOR MAINNET**

The app has **excellent infrastructure** (Firestore, Gemini AI, OTP auth, admin panel) but **lacks critical blockchain integration**. Currently, it functions as a **centralized prediction market** using Firestore as the source of truth, with blockchain features being **decorative rather than functional**.

### What's Working:
- ✅ User authentication and management
- ✅ Market creation and AI-powered content generation
- ✅ Leaderboard and social features
- ✅ Admin panel and analytics
- ✅ Jury/dispute system
- ✅ Custodial wallet generation

### What's Broken:
- ❌ Smart contract integration (0% complete)
- ❌ On-chain betting and payouts
- ❌ Biconomy account abstraction
- ❌ Real token balance tracking
- ❌ Price oracle integration

### Recommended Path Forward:

**Phase 1 (Testnet MVP - 4 weeks):**
- Implement smart contract betting functions
- Fix all mock balance issues
- Integrate Biconomy for gasless transactions
- Add event listening for blockchain updates

**Phase 2 (Testnet Beta - 2 weeks):**
- Add transaction history
- Integrate real price oracles
- Configure WalletConnect
- Security audit of smart contract

**Phase 3 (Mainnet Preparation - 2 weeks):**
- Professional security audit
- Load testing
- Bug bounty program
- Legal compliance review

**Estimated Time to Production:** 8-10 weeks minimum

---

**Generated:** November 21, 2025  
**Audit Tool:** Replit Agent Code Analysis  
**Methodology:** Static code analysis via grep + manual review
