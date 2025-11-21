# Predora - AI-Native Prediction Market Platform

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface and Web3 integration for gasless transactions. Its core purpose is to offer a decentralized and engaging platform for users to predict outcomes. Predora leverages AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution. The project aims to create a dynamic, user-friendly prediction market with a focus on real-time engagement and a robust, transparent resolution mechanism.

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
- **Frontend**: Vanilla JavaScript (`app.html`) integrating Privy SDK, Ethers.js for Web3, and Chart.js.
- **Backend**: Express.js server (`/server`) handling AI proxying, market generation, oracle resolution, jury system endpoints, and Privy token verification. It also serves the frontend and APIs. Includes an automated payout job that finalizes and distributes winnings after the 30-minute dispute window.
- **Data Storage**: Firebase Firestore for real-time data synchronization of markets, pledges, users, and votes.
- **Authentication**: Privy authentication with social logins (Google, X/Twitter) and email OTP. Privy embedded wallets provide self-custodial wallet access with secure iframe postMessage bridge.
- **Web3 Integration**: Ethers.js for wallet interactions, network switching (BSC Testnet and opBNB Testnet), and on-chain balance fetching. Smart contract deployed on BSC Testnet at `0x7AB69aA7543e9ae43b5D01c5622868392252EAAd` handles all on-chain betting and payouts.
- **Smart Contract**: PredictionMarket.sol includes automatic payout distribution with duplicate prevention via `hasReceivedPayout` mapping, platform fee collection, and 30-minute dispute window before finalization.
- **Auto-Payout System**: Backend job (`server/auto-payout-job.js`) monitors resolved markets and automatically calls `autoFinalizeAndPayout()` after 30 minutes, distributing winnings to all winners and collecting platform fees.
- **AI Features**: Google Gemini AI is used for market generation, "Quick Play" generation, and auto-resolution with web search verification, providing rationale and sources. AI guardrails are implemented for duplicate detection, quality filtering, and Sybil detection.
- **Jury System**: A fully functional jury voting system allows users to submit votes for disputed markets, with outcomes determined by majority rule. An admin dashboard provides oversight and manual override capabilities.
- **Multiple Options Market Display**: Supports markets with 3-6 options, each displayed with individual percentages.
- **Custodial Wallets**: Server-side backup wallets created for fallback scenarios using ethers.js v5, with AES-256-GCM encrypted private keys stored in Firebase Firestore.
- **Account Abstraction**: Future enhancement - Biconomy Smart Account integration requires client-side ESM module loading to use Privy embedded wallets as true owners (not custodial keys). Current backend-only implementation violates self-custody model.

### System Design Choices
- **Vanilla JS**: Chosen to preserve the existing codebase, simplify deployment, and avoid a build step.
- **BSC & opBNB Testnets**: Selected for low transaction fees, fast block times, active ecosystems, and alignment with gasless transaction goals.
- **Jury Voting**: Implemented for decentralized dispute resolution, preventing single points of failure and AI oracle manipulation, fostering community-driven governance.

## External Dependencies
- **Privy**: Authentication with social logins (Google, X/Twitter), email OTP, and embedded self-custodial wallets.
- **Firebase**: Firestore for database and Client/Admin SDKs.
- **Google Gemini AI API**: For market generation, resolution, and AI guardrails.
- **Ethers.js**: For Web3 wallet interactions and blockchain communication.
- **Web3Modal & WalletConnect**: Multi-wallet connection support with secure Project ID injection.
- **Tailwind CSS (CDN)**: For styling.
- **Chart.js**: For data visualization.
- **Biconomy SDK**: Backend implementation for gasless transactions (future: client-side integration needed for true self-custody).
- **Custodial Wallet System**: Server-side backup wallets for fallback scenarios.
- **Express.js**: Backend framework.
- **Node.js**: Backend runtime.

## Security & Secrets
- **WALLETCONNECT_PROJECT_ID**: Stored securely in Replit Secrets, dynamically injected into app.html at runtime.
```