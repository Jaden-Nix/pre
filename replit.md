# Predora - AI-Native Prediction Market Platform

## 🚨 IMPORTANT: Current Architecture Status (Technical Screening Mode)

**As of November 21, 2025 - Hybrid Blockchain + Enhanced Oracle**

Platform operates in **HYBRID MODE** for technical screening: Wallet-connected users get real BSC Testnet transactions, email users use Firestore betting. Browse-first UX allows market exploration without login. Advanced 3-tier oracle resolution system with multi-model scoring ensures accurate outcomes.

### Hybrid Mode Features:

**Wallet-Connected Users (BSC Testnet):**
- ✅ Real MetaMask wallet connection (Web3Modal)
- ✅ On-chain betting via smart contract (0xdaAf91610e33355c9Cd9258219C6A4822E693f55)
- ✅ Real BNB transactions on BSC Testnet
- ✅ Blockchain balance fetching
- ✅ Contract event listeners

**Email-Authenticated Users:**
- ✅ Password + email authentication
- ✅ Passwordless OTP authentication  
- ✅ Firestore-only betting with mock balances
- ✅ Demo account (predorademo@gmail.com / demo1234)

**Universal Features:**
- ✅ Browse-first UX (no login required to view markets)
- ✅ **Enhanced 3-Tier Oracle System** with multi-model scoring
- ✅ Advanced jury system with second-pass request capability
- ✅ Multi-option markets (3-6 choices)
- ✅ Real-time market visualization
- ✅ TikTok-style Quick Play interface

### Where Blockchain Code is Preserved:
All blockchain code is commented out with `// TODO: BLOCKCHAIN TEMPORARILY DISABLED FOR HACKATHON DEMO` markers in:
- `app.html`: Lines with wallet connection, smart contract interactions, balance fetchers
- `server/index.js`: Biconomy AA service initialization and `/api/aa/*` endpoints
- `server/custodial-wallet-service.js`: Blockchain provider and RPC calls

### Mock Balance System (Firestore-Only):
- New users get default balances: `bnbBalance: 0.2`, `cakeBalance: 150`
- All betting deducts from Firestore balance fields
- All payouts add to Firestore balance fields
- Mock wallet addresses generated for display: `0x{userId-hash}...`
- No blockchain RPCs or ethers.js calls during normal operation

### Re-enabling Blockchain (Post-Hackathon):
To re-enable blockchain features, simply uncomment all `// TODO: BLOCKCHAIN TEMPORARILY DISABLED` sections and:
1. Restore Web3Modal/WalletConnect script tags in app.html
2. Uncomment Biconomy AA service initialization in server/index.js
3. Restore blockchain provider in custodial-wallet-service.js
4. Re-enable on-chain paths in `stakeMarket()` and `createMarket()`
5. Restore balance fetchers and event listeners

---

## Overview
Predora is an AI-native prediction market platform originally built on BNB Chain, featuring a TikTok-style "Quick Play" interface. Currently running in Firestore-only demo mode (blockchain temporarily disabled). Its core purpose is to offer a decentralized and engaging platform for users to predict outcomes. Predora leverages AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution.

## User Preferences
- Vanilla HTML/CSS/JS architecture (original design, not Next.js)
- Web3-native with MetaMask wallet integration
- AI-powered features using Gemini API
- TikTok-style UX for Quick Play
- Glassmorphism design with dark/light themes
- Real testnet tokens (BNB) instead of mock balances
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
- **Custodial Wallets**: Automatic server-side wallet creation on user signup using ethers.js v5, with AES-256-GCM encrypted private keys stored in Firebase Firestore. Keys never exposed to client.
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

**BSC Testnet Deployment:**
- Contract Address: `0xdaAf91610e33355c9Cd9258219C6A4822E693f55`
- Deployer: `0xe47Dce1b7e31333329734E24089C0472c030d95B`
- Deployed: November 21, 2025
- Network: BSC Testnet (Chain ID: 97)
- BSCScan: https://testnet.bscscan.com/address/0xdaAf91610e33355c9Cd9258219C6A4822E693f55

## Security & Secrets
- **WALLETCONNECT_PROJECT_ID**: Stored securely in Replit Secrets, dynamically injected into app.html at runtime.
```