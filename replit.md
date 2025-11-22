# Predora - AI-Native Prediction Market Platform

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface. It uses custodial wallets for all users – sign up with email and instantly get a server-managed encrypted wallet. **As of Nov 22, 2025, the platform is ~70-80% on-chain** with ALL Quick Play markets and Standard Markets fully on-chain using real BNB and $PRED tokens on BSC Testnet. Predora leverages AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution. The project aims to provide a seamless, secure, and engaging prediction market experience with advanced AI integration and robust blockchain capabilities.

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
The frontend is a single-page application (`app.html`) built with Vanilla JavaScript and Tailwind CSS. It features a TikTok-style swipe interface for "Quick Play" markets, a responsive mobile-first design, dark/light theme toggling, real-time market visualization with Chart.js, and jury voting interfaces. The platform offers a browse-first UX, allowing guests to view markets and the social feed without logging in.

### Technical Implementation
Predora employs a hybrid architecture where markets can be either fully on-chain or Firestore-based.
- **Frontend**: Vanilla JavaScript (`app.html`) integrating Firebase Client SDK, Ethers.js, and Chart.js.
- **Backend**: Express.js server (`/server`) handles AI proxying, market generation, oracle resolution, jury system endpoints, and serves the frontend. It includes an automated payout job.
- **Data Storage**: Firebase Firestore for real-time data synchronization of markets, pledges, users, and votes.
- **Web3 Integration**: Ethers.js for blockchain interaction, supporting BSC Testnet. The PredictionMarketV2 smart contract (deployed at `0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB` - **✅ V4 DEPLOYED** on Nov 22, 2025) handles on-chain betting and payouts, including dual currency support (BNB and $PRED), initial liquidity provisioning, and oracle evidence hash storage for verifiable AI resolution data.
- **Custodial Wallets**: Automatic server-side wallet creation on user signup, with private keys encrypted using AES-256-GCM. Firebase handles authentication, and a strict UID-to-userId mapping ensures secure transactions and withdrawals. All transactions are signed by the backend.
- **AI Features**: An enhanced 3-Tier Swarm-Verify Oracle system (GPT-4o, DuckDuckGo, Gemini) with multi-model scoring (factual, consistency, timestamp, sentiment) is used for market resolution. It routes resolutions based on confidence levels: auto-resolve, extended AI review, or escalation to manual jury review. Cryptographic evidence hashing (SHA-256) is used for auditability. Google Gemini AI also powers market generation and Quick Play content.
- **Jury System**: A community-driven jury voting system resolves disputed markets, complemented by an admin dashboard for oversight.
- **Account Abstraction**: Biconomy Smart Account SDK enables gasless transactions via ERC-4337 UserOperations, with sponsored gas on BSC Testnet.

### System Design Choices
- **Vanilla JS**: Selected for codebase preservation, simplified deployment, and no build step.
- **BSC Testnet**: Chosen for low transaction fees, fast block times, and active ecosystem.
- **On-Chain First**: ~70-80% of platform operations on BSC Testnet. Quick Play markets (0.01 BNB + 6 PRED liquidity) and Standard Markets (0.1+ BNB + proportional PRED) fully on-chain.
- **Custodial Wallets**: Simplifies user onboarding by abstracting away complex Web3 wallet management.
- **Jury Voting**: Ensures decentralized dispute resolution and mitigates risks associated with AI oracle manipulation.

## External Dependencies
- **Firebase**: Firestore (database), Authentication, Client SDK, Admin SDK.
- **Google Gemini AI API**: For market generation, resolution, and AI guardrails.
- **Ethers.js**: For Web3 interactions and blockchain communication.
- **Tailwind CSS (CDN)**: For styling.
- **Chart.js**: For data visualization.
- **Biconomy SDK**: For ERC-4337 Account Abstraction and gasless transactions.
- **Express.js**: Backend framework.
- **Node.js**: Backend runtime.