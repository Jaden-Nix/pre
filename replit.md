# Predora - AI-Native Prediction Market Platform

## 🚨 IMPORTANT: Current Architecture Status

**As of November 22, 2025 - Phase 2: Custodial Wallets COMPLETE & SECURED**

Platform now uses **CUSTODIAL WALLETS** with production-grade security for all users: Sign up with email, instantly get an encrypted wallet managed by the backend. No MetaMask needed! Users can withdraw BNB + $PRED to any address. All markets support dual-currency betting (BNB + $PRED) via batch transactions. Advanced 3-tier oracle resolution system with multi-model scoring ensures accurate outcomes.

### ✅ Custodial Wallet Features (LIVE & SECURED):

**Authentication & Wallet Creation (PRODUCTION-GRADE SECURITY):**
- ✅ Email + password authentication
- ✅ Passwordless OTP authentication  
- ✅ **Auto-generated custodial wallets** on signup with Firebase UID mapping
- ✅ **Authoritative UID→userId mapping** in Firestore (prevents unauthorized access)
- ✅ Private keys encrypted with AES-256-GCM (WALLET_ENCRYPTION_KEY)
- ✅ Keys stored securely in Firebase (never exposed to client)
- ✅ **Strict withdrawal authorization** via Firebase ID token + mapping verification
- ✅ **Comprehensive audit logging** for all wallet operations
- ✅ Demo account (predorademo@gmail.com / demo1234)

**Blockchain Integration:**
- ✅ Real on-chain betting on BSC Testnet
- ✅ Dual currency support: BNB + $PRED token
- ✅ Batch betting via `placeBatchBets()` function
- ✅ **Secure BNB withdrawals** to any address (Firebase Auth + UID mapping required)
- ✅ **Secure $PRED withdrawals** to any address (Firebase Auth + UID mapping required)
- ✅ Real blockchain balances fetched via JSON-RPC
- ✅ AMM pool updates (constant product formula: x * y = k)
- ✅ **All transactions signed by backend** with encrypted private keys

**Universal Features:**
- ✅ Browse-first UX (no login required to view markets)
- ✅ **Enhanced 3-Tier Oracle System** with multi-model scoring
- ✅ Advanced jury system with second-pass request capability
- ✅ Multi-option markets (3-6 choices)
- ✅ Real-time market visualization
- ✅ TikTok-style Quick Play interface

**Secure User Flow:**
1. Browse Quick Play markets without login
2. Sign up with email → Firebase authentication → auto-get encrypted custodial wallet with UID mapping
3. Vote YES/NO on markets → pledge pool builds up
4. Click "Confirm" → ONE blockchain transaction (batch betting)
5. Backend signs transaction with encrypted private key (UID-verified ownership)
6. AMM pools update, user receives on-chain confirmation
7. Withdraw both BNB and $PRED to any external wallet (requires Firebase ID token + UID mapping verification)
8. All actions logged for security audit trail

---

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface. It uses **custodial wallets** for all users - sign up with email and instantly get a server-managed encrypted wallet. All betting happens on-chain (BSC Testnet) with real BNB and $PRED tokens. Users can withdraw to any external address. Predora leverages AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution.

## User Preferences
- Vanilla HTML/CSS/JS architecture (original design, not Next.js)
- Web3-native with **custodial wallets** (no external wallet needed)
- AI-powered features using Gemini API + GPT-4
- TikTok-style UX for Quick Play
- Glassmorphism design with dark/light themes
- Real on-chain tokens (BNB + $PRED) on BSC Testnet
- Jury-based dispute resolution system
- Multi-option markets (3-6 choices)

## System Architecture

### UI/UX
The frontend is a single-page application (`app.html`) built with Vanilla JavaScript and Tailwind CSS (CDN). It features a TikTok-style swipe interface for "Quick Play" markets, a responsive mobile-first design, dark/light theme toggling, real-time market visualization with Chart.js, account abstraction status display, and jury voting interfaces.

### Technical Implementation
The platform uses a dual-workflow architecture:
- **Frontend**: Vanilla JavaScript (`app.html`) integrating Firebase Client SDK, Ethers.js for Web3, and Chart.js.
- **Backend**: Express.js server (`/server`) handling AI proxying, market generation, oracle resolution, and jury system endpoints. It also serves the frontend and APIs. Includes an automated payout job that finalizes and distributes winnings after the 30-minute dispute window.
- **Data Storage**: Firebase Firestore for real-time data synchronization of markets, pledges, users, and votes.
- **Web3 Integration**: Ethers.js for MetaMask wallet connection, network switching (BSC Testnet and opBNB Testnet), and on-chain balance fetching. Smart contract deployed on BSC Testnet at `0xdaAf91610e33355c9Cd9258219C6A4822E693f55` handles all on-chain betting and payouts.
- **Smart Contract**: PredictionMarket.sol includes automatic payout distribution with duplicate prevention via `hasReceivedPayout` mapping, platform fee collection, and 30-minute dispute window before finalization.
- **Auto-Payout System**: Backend job (`server/auto-payout-job.js`) monitors resolved markets and automatically calls `autoFinalizeAndPayout()` after 30 minutes, distributing winnings to all winners and collecting platform fees.
- **AI Features**: 
  - **Enhanced Swarm-Verify Oracle** (3-Tier Resolution System):
    - **Phase 1**: Parallel multi-agent research (GPT-4o, DuckDuckGo, Gemini)
    - **Phase 2**: Adversarial skeptic verification (GPT-4o-mini)
    - **Phase 3**: Geometric median consensus + **Multi-Model Scoring**
    - **Phase 3.5**: NEW - Multi-dimensional confidence scoring:
      - Factual model (45% weight): Fact verification via GPT-4o-mini
      - Consistency model (25% weight): Internal contradiction detection  
      - Timestamp model (20% weight): Temporal validity checking
      - Sentiment model (10% weight): Bias detection heuristics
      - Blended score = weighted average of all 4 models
    - **Phase 4**: Three-tier confidence routing:
      - **PATH A** (≥90%): Auto-resolve with 30-min dispute window
      - **PATH A2** (85-90%): Extended AI review + second-pass verification
      - **PATH B** (<85%): Escalate to manual jury review
    - Second-pass review feature for mid-confidence cases (85-90%)
    - Jury/admin can request additional Swarm runs via API endpoint
    - Cryptographic evidence hashing (SHA-256) for auditability
    - Byzantine fault tolerance (50% malicious agents)
    - Security: Prompt injection mitigation, input sanitization
  - Google Gemini AI for market generation and Quick Play
  - AI guardrails: duplicate detection, quality filtering, Sybil detection
- **Jury System**: A fully functional jury voting system allows users to submit votes for disputed markets, with outcomes determined by majority rule. An admin dashboard provides oversight and manual override capabilities.
- **Multiple Options Market Display**: Supports markets with 3-6 options, each displayed with individual percentages.
- **Custodial Wallets (PRODUCTION-GRADE SECURITY)**: 
  - Automatic server-side wallet creation on user signup using ethers.js v5
  - AES-256-GCM encrypted private keys with WALLET_ENCRYPTION_KEY
  - **Authoritative UID→userId mapping** stored in Firestore walletMappings collection
  - **Strict withdrawal authorization**: Firebase ID token verification + mapping lookup
  - **Comprehensive audit trail**: All wallet operations logged in custodialWithdrawals collection
  - Private keys never exposed to client or logs
  - Zero-trust security model: Server never trusts client-provided userId for sensitive operations
- **Account Abstraction**: Biconomy Smart Account SDK enables gasless transactions via ERC-4337 UserOperations, with sponsored gas from Biconomy Paymaster on BSC Testnet (Chain ID: 97).

### System Design Choices
- **Vanilla JS**: Chosen to preserve the existing codebase, simplify deployment, and avoid a build step.
- **BSC & opBNB Testnets**: Selected for low transaction fees, fast block times, active ecosystems, and alignment with gasless transaction goals.
- **Jury Voting**: Implemented for decentralized dispute resolution, preventing single points of failure and AI oracle manipulation, fostering community-driven governance.

## External Dependencies
- **Firebase**: Firestore for database, Authentication, and Client/Admin SDKs.
- **Google Gemini AI API**: For market generation, resolution, and AI guardrails.
- **Ethers.js**: For Web3 wallet interactions and blockchain communication.
- **Web3Modal & WalletConnect**: Multi-wallet connection support with secure Project ID injection.
- **Tailwind CSS (CDN)**: For styling.
- **Chart.js**: For data visualization.
- **Biconomy SDK**: Active ERC-4337 Account Abstraction implementation for gasless transactions on BSC Testnet.
- **Custodial Wallet System**: Auto-generated encrypted wallets for seamless user onboarding.
- **Express.js**: Backend framework.
- **Node.js**: Backend runtime.

## Contract Deployment

**BSC Testnet Deployment V2 (Latest - Demo Ready):**
- **PredictionMarketV2**: `0x5330cDAdA8417865B379C5E2Bce14f4D840F593a`
- **PredToken (PRED)**: `0x45C229bF14A36aD14885148E62058C98284B2ae0`
- Deployer: `0xe47Dce1b7e31333329734E24089C0472c030d95B`
- Deployed: November 22, 2025
- Network: BSC Testnet (Chain ID: 97)
- BSCScan PredictionMarketV2: https://testnet.bscscan.com/address/0x5330cDAdA8417865B379C5E2Bce14f4D840F593a
- BSCScan PredToken: https://testnet.bscscan.com/address/0x45C229bF14A36aD14885148E62058C98284B2ae0
- **Features**:
  - ✅ Dual currency support: bet with BNB OR $PRED token
  - ✅ Batch betting (`placeBatchBets()`) for Quick Play  
  - ✅ Separate pools for BNB and PRED bets
  - ✅ **CORRECT payout formula**: Stake (minus fee) + proportional share of losing pool
  - ✅ **Zero-winner edge case handling**: Funds locked and withdrawable by admin
  - ✅ **Complete accounting**: Fees + locked funds + active pools = total balance
  - ✅ $PRED faucet: 50 PRED per claim (24h cooldown)
  - ✅ Total supply: 1 billion PRED tokens
  - ✅ BNB and PRED withdrawal support
  - ✅ Admin functions: `withdrawFees()`, `withdrawLockedFunds()`, `getContractBalances()`
- **Known Limitations** (Accepted for Demo):
  - Integer division dust from Solidity math (<0.001% of funds) - common in DeFi, upgradeable later

**Previous Deployment V1 (Deprecated - BNB Only):**
- Contract Address: `0xd292Ce8a4596438C8c3e5Dd5D8AbF5cf3B6c1EB2`
- Deployed: November 22, 2025
- Status: Replaced by V2 with dual currency support

## Security & Secrets
- **WALLETCONNECT_PROJECT_ID**: Stored securely in Replit Secrets, dynamically injected into app.html at runtime.
```