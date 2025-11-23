# Predora - AI-Native Prediction Market Platform

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface. It uses custodial wallets for all users – sign up with email and instantly get a server-managed encrypted wallet. **As of Nov 23, 2025, the platform is ~70-80% on-chain** with ALL Quick Play markets and Standard Markets fully on-chain using real BNB and $PRED tokens on BSC Testnet. Predora leverages AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution. The project aims to provide a seamless, secure, and engaging prediction market experience with advanced AI integration and robust blockchain capabilities.

## User Preferences
- Vanilla HTML/CSS/JS architecture (original design, not Next.js)
- Web3-native with **custodial wallets** (no external wallet needed)
- AI-powered features using Gemini API + GPT-4
- TikTok-style UX for Quick Play
- Glassmorphism design with dark/light themes
- Real on-chain tokens (BNB + $PRED) on BSC Testnet
- Jury-based dispute resolution system
- Multi-option markets (3-6 choices)

## Known Issues (Nov 23, 2025)
- **PRED Balance Refresh**: Previously stuck at 250 due to fetching from Firestore instead of blockchain. Fixed in current build - now fetches real on-chain balance.
- **AMM Live Calculator**: Falls back to estimation when contract pool reads fail. May show approximate payouts during network issues.
- **Wallet Address Sync Issue (IN PROGRESS)**: After placing a bet, balance may not update if user's profile stores the wrong wallet address (external wallet instead of custodial wallet). Root cause identified: during signup/login flow, some users end up with an external wallet address in their profile instead of their custodial wallet address. Backend correctly processes bets from custodial wallets, but frontend fetches balances from the wrong address. 
  - **Partial Fix Applied (Nov 23, 2025)**: Updated `refreshAllBalances()` function (line 5547-5636 in app.html) to prioritize custodial wallet addresses for custodial users. Function now:
    - Checks `localStorage.getItem('isCustodial')` to identify custodial users
    - For custodial users: fetches wallet address from Firestore profile instead of using potentially wrong address
    - For external users: uses connected wallet address
  - **Still Needed**: Backend endpoint to manually sync profile wallet addresses - users with incorrect addresses need `userProfile.walletAddress` updated to their actual custodial wallet address (stored in custodialWallets collection). This requires:
    1. New `/api/profile/sync-wallet-address` endpoint in server/index.js
    2. Frontend call to this endpoint on login/authentication
    3. Endpoint logic: query custodialWallets collection by userId, update user profile with correct wallet address

## System Architecture

### UI/UX
The frontend is a single-page application (`app.html`) built with Vanilla JavaScript and Tailwind CSS. It features a TikTok-style swipe interface for "Quick Play" markets, a responsive mobile-first design, dark/light theme toggling, real-time market visualization with Chart.js, and jury voting interfaces. The platform offers a browse-first UX, allowing guests to view markets and the social feed without logging in.

**AMM Visualization (Nov 23, 2025):** Added comprehensive AMM transparency features to make the automated market maker mechanics visible to users. Binary markets now display:
- Real-time price impact preview showing how bet amounts affect odds before confirmation
- Current pool liquidity ($X YES pool, $Y NO pool) on market cards displayed with token amounts (not USD)
- Visual indicators displaying odds changes from initial values (arrows showing shifts)
- AMM calculation panel (lines 2354-2437) using constant product formula (x * y = k) matching the Firestore backend implementation (lines 10075-10102)

**Balance Refresh Logic (Nov 23, 2025):** Implemented intelligent balance fetching that correctly handles both custodial and external wallets:
- `refreshAllBalances()` function now prioritizes custodial wallet addresses for custodial users
- Fetches real BNB and PRED balances from blockchain every 5 seconds via polling
- Syncs balances to Firestore after each update
- Backend auto-syncs balances after successful on-chain bets

### Technical Implementation
Predora employs a hybrid architecture where markets can be either fully on-chain or Firestore-based.
- **Frontend**: Vanilla JavaScript (`app.html`) integrating Firebase Client SDK, Ethers.js, and Chart.js.
- **Backend**: Express.js server (`/server`) handles AI proxying, market generation, oracle resolution, jury system endpoints, and serves the frontend. It includes an automated payout job and custodial wallet management.
- **Data Storage**: Firebase Firestore for real-time data synchronization of markets, pledges, users, and votes. Custodial wallet addresses stored in separate `custodialWallets` collection with encrypted private keys.
- **Web3 Integration**: Ethers.js for blockchain interaction, supporting BSC Testnet. The PredictionMarketV2 smart contract (deployed at `0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB`) and PredToken (deployed at `0x45C229bF14A36aD14885148E62058C98284B2ae0`) were deployed on Nov 23, 2025. The contracts handle on-chain betting and payouts, including dual currency support (BNB and $PRED), initial liquidity provisioning, and oracle evidence hash storage for verifiable AI resolution data.
- **Custodial Wallets**: Automatic server-side wallet creation on user signup, with private keys encrypted using AES-256-GCM. Firebase handles authentication, and a strict UID-to-userId mapping ensures secure transactions and withdrawals. All transactions are signed by the backend. User profile stores custodial wallet address for balance fetching.
- **AI Features**: An enhanced 3-Tier Swarm-Verify Oracle system (GPT-4o, DuckDuckGo, Gemini) with multi-model scoring (factual, consistency, timestamp, sentiment) is used for market resolution. It routes resolutions based on confidence levels: auto-resolve, extended AI review, or escalation to manual jury review. Cryptographic evidence hashing (SHA-256) is used for auditability. Google Gemini AI also powers market generation and Quick Play content.
- **Jury System**: A community-driven jury voting system resolves disputed markets, complemented by an admin dashboard for oversight.
- **Account Abstraction**: Biconomy Smart Account SDK enables gasless transactions via ERC-4337 UserOperations, with sponsored gas on BSC Testnet.

### System Design Choices
- **Vanilla JS**: Selected for codebase preservation, simplified deployment, and no build step.
- **BSC Testnet**: Chosen for low transaction fees, fast block times, and active ecosystem.
- **On-Chain First**: ~70-80% of platform operations on BSC Testnet. Quick Play markets (0.01 BNB + 6 PRED liquidity) and Standard Markets (0.1+ BNB + proportional PRED) fully on-chain.
- **Custodial Wallets**: Simplifies user onboarding by abstracting away complex Web3 wallet management. Centralized wallet address storage ensures correct balance fetching.
- **Jury Voting**: Ensures decentralized dispute resolution and mitigates risks associated with AI oracle manipulation.

## Bug Fixes (Nov 23, 2025)

### 1. Balance Not Updating After On-Chain Bets
**Problem**: User balance remained unchanged after successfully placing a bet on-chain
**Root Cause**: No `refreshAllBalances()` call after bet confirmation; balance was being deducted twice (once on-chain, once in Firestore)
**Fix**: 
- Added `refreshAllBalances()` call in bet confirmation handler
- Removed duplicate Firestore balance deduction in bet transaction
- Backend now syncs real on-chain balances to Firestore after bets via `syncBnbBalanceFromBlockchain()` and `syncPredBalanceFromBlockchain()`

### 2. Faucet Cooldown Not Enforcing
**Problem**: Faucet button re-enabled immediately after claiming, allowing spam claims
**Root Cause**: Frontend didn't check smart contract cooldown status; backend time calculation was incorrect
**Fix**:
- Created `/api/faucet/check-cooldown` backend endpoint that queries PredToken contract's cooldown functions
- Added `checkFaucetCooldown()` function called from `updateProfileUI()` on profile load
- Fixed time display: changed from `ceil()` to `floor()` for accurate hours/minutes countdown
- Faucet button now stays disabled for full 24-hour cooldown period

### 3. AMM Pool Display Showing Wrong Currency
**Problem**: Liquidity pools displayed as USD prices instead of token amounts
**Root Cause**: Pool values formatted as USD with `$` symbol
**Fix**:
- Changed pool display from `$${pool.toFixed(2)}` to `${pool.toFixed(4)} ${currency}`
- Pools now correctly show "0.5000 BNB" or "16 PRED" instead of fake USD values

## External Dependencies
- **Firebase**: Firestore (database), Authentication, Client SDK, Admin SDK.
- **Google Gemini AI API**: For market generation, resolution, and AI guardrails.
- **Ethers.js**: For Web3 interactions and blockchain communication.
- **Tailwind CSS (CDN)**: For styling.
- **Chart.js**: For data visualization.
- **Biconomy SDK**: For ERC-4337 Account Abstraction and gasless transactions.
- **Express.js**: Backend framework.
- **Node.js**: Backend runtime.
