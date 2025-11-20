# Predora - AI-Native Prediction Market Platform

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface, and Web3 integration for gasless transactions. It aims to offer a decentralized and engaging platform for users to predict outcomes, leveraging AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution. The project's ambition is to create a dynamic, user-friendly prediction market with a focus on real-time engagement and a robust, transparent resolution mechanism.

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
The frontend is a single-page application (`app.html`) built with Vanilla JavaScript, utilizing Tailwind CSS (CDN) for styling. It features a TikTok-style swipe interface for "Quick Play" markets, a responsive mobile-first design, and dark/light theme toggling. Key UI components include real-time market visualization with Chart.js, account abstraction status display, and jury voting interfaces.

### Technical Implementation
The platform uses a dual-workflow architecture:
- **Frontend**: Vanilla JavaScript (app.html) serving on port 5000 (via Express webview), integrating Firebase Client SDK, Ethers.js for Web3, and Chart.js.
- **Backend**: Express.js server (`/server`) running on port 5000 (webview) which also serves the frontend and APIs. It handles AI proxying, market generation, oracle resolution, and jury system endpoints.
- **Data Storage**: Firebase Firestore for real-time data synchronization of markets, pledges, users, and votes.
- **Web3 Integration**: Ethers.js is used for MetaMask wallet connection, network switching between BSC Testnet and opBNB Testnet, and fetching on-chain balances. Account Abstraction is designed to enable gasless transactions through Biconomy SDK integration.
- **AI Features**: Gemini AI is central for market generation, "Quick Play" generation, and auto-resolution with web search verification, providing rationale and sources. AI guardrails are implemented for duplicate detection, quality filtering, and Sybil detection.
- **Jury System**: A fully functional jury voting system allows users to submit votes for disputed markets, with outcomes determined by majority rule (3+ votes, >50% majority). An admin dashboard provides oversight and manual override capabilities.
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
- **OpenAI API (Optional)**: For source link generation.
- **Express.js**: Backend framework.
- **Node.js**: Backend runtime.