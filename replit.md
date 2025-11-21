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
- **Frontend**: Vanilla JavaScript (`app.html`) integrating Firebase Client SDK, Ethers.js for Web3, and Chart.js.
- **Backend**: Express.js server (`/server`) handling AI proxying, market generation, oracle resolution, and jury system endpoints. It also serves the frontend and APIs. Includes an automated payout job that finalizes and distributes winnings after the 30-minute dispute window.
- **Data Storage**: Firebase Firestore for real-time data synchronization of markets, pledges, users, and votes.
- **Web3 Integration**: Ethers.js for MetaMask wallet connection, network switching (BSC Testnet and opBNB Testnet), and on-chain balance fetching. Smart contract deployed on BSC Testnet at `0x7AB69aA7543e9ae43b5D01c5622868392252EAAd` handles all on-chain betting and payouts.
- **Smart Contract**: PredictionMarket.sol includes automatic payout distribution with duplicate prevention via `hasReceivedPayout` mapping, platform fee collection, and 30-minute dispute window before finalization.
- **Auto-Payout System**: Backend job (`server/auto-payout-job.js`) monitors resolved markets and automatically calls `autoFinalizeAndPayout()` after 30 minutes, distributing winnings to all winners and collecting platform fees.
- **AI Features**: Google Gemini AI is used for market generation, "Quick Play" generation, and auto-resolution with web search verification, providing rationale and sources. AI guardrails are implemented for duplicate detection, quality filtering, and Sybil detection.
- **Jury System**: A fully functional jury voting system allows users to submit votes for disputed markets, with outcomes determined by majority rule. An admin dashboard provides oversight and manual override capabilities.
- **Multiple Options Market Display**: Supports markets with 3-6 options, each displayed with individual percentages.

### System Design Choices
- **Vanilla JS**: Chosen to preserve the existing codebase, simplify deployment, and avoid a build step.
- **BSC & opBNB Testnets**: Selected for low transaction fees, fast block times, active ecosystems, and alignment with gasless transaction goals.
- **Jury Voting**: Implemented for decentralized dispute resolution, preventing single points of failure and AI oracle manipulation, fostering community-driven governance.

## External Dependencies
- **Firebase**: Firestore for database, Authentication, and Client/Admin SDKs.
- **Google Gemini AI API**: For market generation, resolution, and AI guardrails.
- **Ethers.js**: For Web3 wallet interactions and blockchain communication.
- **Tailwind CSS (CDN)**: For styling.
- **Chart.js**: For data visualization.
- **Biconomy SDK / Particle Network SDK (Planned)**: For Account Abstraction and gasless transactions.
- **Express.js**: Backend framework.
- **Node.js**: Backend runtime.
```