# Predora - AI-Native Prediction Market Platform

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface, and Web3 integration for gasless transactions. It aims to offer a decentralized and engaging platform for users to predict outcomes, leveraging AI for market generation, resolution, and content moderation, alongside a community-driven jury system for dispute resolution. The project's ambition is to create a dynamic, user-friendly prediction market with a focus on real-time engagement and a robust, transparent resolution mechanism.

## Recent Changes (November 20, 2025)

### Session 1: Core Authentication & UI
- **Email OTP Authentication**: Implemented real email-based OTP login system using SendGrid integration, replacing mock authentication.
- **User ID Security Fix**: Changed user ID generation from email prefix to SHA-256 hash of email to prevent account collisions and enhance security.
- **Demo Account Login**: Added "Try Demo" button on login screen for quick guest access without email verification. Demo accounts persist across sessions.
- **Onboarding Flow**: Added onboarding screen with display name picker and emoji avatar selection that appears after successful login.
- **Edit Profile**: Implemented edit profile functionality allowing users to update their display name and avatar.
- **UI Cleanup**: Removed admin dashboard button from profile page for regular users.

### Session 2: Admin Panel & Data API Enhancements
- **Admin Search Functionality**: Added search bars to Normal Markets and Quick Play admin resolution panels for filtering markets by title/description.
- **Comprehensive Market Data API**: Built 6 production-ready REST endpoints:
  - `GET /api/data/markets` - List markets with filtering (category, status, pagination)
  - `GET /api/data/market/:marketId` - Detailed market data with stats and pledges
  - `GET /api/data/market/:marketId/history` - Historical odds and volume tracking
  - `GET /api/data/leaderboard` - User rankings (by XP, earnings, win rate)
  - `GET /api/data/user/:userId/activity` - User profile and recent activity
  - `GET /api/data/stats` - Platform-wide statistics dashboard
- **Account Abstraction Panel Enhancement**: Added backend endpoints for configuration persistence and real-time stats display.
- **API Documentation**: Created comprehensive API documentation in `API_DOCUMENTATION.md` with examples and use cases.
- **Code Quality**: All changes passed architect review with proper error handling, Firestore guards, and React best practices.

### Session 3: Critical Bug Fixes & BSC Testnet Integration
- **Admin Panel Security**: Verified secure backend authentication using ADMIN_SECRET environment variable. Admin access properly validates against server-side secret with fail-closed behavior when not configured.
- **User Ranking Fix**: Implemented `fetchUserRank()` function that queries actual leaderboard data and calculates real rank position based on XP sorting. Replaced hardcoded rank logic.
- **Dispute UI Enhancement**: Updated history stakes display to show "FROZEN" status in orange for disputed markets instead of WON/LOST, providing clear visual feedback during jury review.
- **Market Data Indexer API**: Built production-ready indexer with 5 REST endpoints:
  - `GET /api/indexer/markets` - Advanced market queries with cursor-based pagination, filtering (category, status, isResolved, createdBy), sorting, and text search
  - `GET /api/indexer/markets/:marketId/history` - Historical odds tracking with timestamps
  - `GET /api/indexer/markets/:marketId/volume` - Volume analysis and participant metrics
  - `GET /api/indexer/user/:userId/complete-activity` - Comprehensive user stats (pledges, win rate, earnings, net profit)
  - `POST /api/indexer/markets/:marketId/odds-snapshot` - Admin-authenticated odds recording for historical tracking
- **BSC Testnet Smart Contract**: Created complete smart contract infrastructure:
  - `PredictionMarket.sol` - Solidity contract with market creation, betting, resolution, disputes, and payouts
  - Hardhat deployment configuration for BSC Testnet (chainId: 97)
  - Automated deployment script with ABI export and deployment info recording
  - Comprehensive deployment documentation and instructions
  - Contract features: On-chain markets, real BNB betting, automated odds calculation, 1% platform fee, dispute mechanism, admin controls
- **Code Quality**: All implementations use Firestore-safe queries (cursor pagination, single filters), proper authentication, and fail-safe error handling. Architect-reviewed and approved.

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