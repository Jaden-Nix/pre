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

### Session 3: Critical Bug Fixes & BSC Testnet Integration (Part 1)
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

### Session 4: Admin Panel & Dispute Fixes
- **Admin Panel Access Fixed**: Removed conflicting onclick handler from desktop logo that prevented 5-tap gesture from working. Single tap now navigates home, 5 rapid taps opens admin login.
- **Better Admin Access Methods**: Added three secure ways to access admin panel:
  - URL Parameter: `?admin=1` or `#admin` (recommended, most secure)
  - Hidden Footer Link: ⚙️ gear icon at bottom of profile screen
  - Improved 5-Tap Gesture: Works on both desktop and mobile logos with toast feedback
- **Dispute Functionality Fixed**: Added Firebase initialization check, comprehensive error logging, and better user error messages to prevent silent failures.
- **Security Enhancements**: All admin access methods use same backend verification with ADMIN_SECRET, fail-closed behavior, and session-based password storage.
- **Documentation**: Created `ADMIN_ACCESS_GUIDE.md` with complete admin access instructions and `FIXES_SUMMARY.md` with detailed fix documentation.

### Session 5: Social Feed & Live Ticker Enhancements
- **Admin Panel Security Enhancement**: Removed insecure gear icon from profile page, added password-based access control with `showScreen` authentication guard.
- **Complete Social Feed System**: Built full social networking features for traders:
  - Post creation with market tagging and content sanitization
  - Reaction system with 4 emoji types (👍 like, ❤️ heart, 🔥 fire, 🚀 rocket) with real-time updates
  - Comments system with threading, replies, and content sanitization to prevent XSS attacks
  - Share to X (Twitter) integration with automatic post URL generation
  - Following/followers system for tracking other traders
  - Feed filtering (All, Following, Trending) with proper navigation
- **Live Ticker Chat Fix**: Enforced stake-to-chat requirement - users must have active stakes in a market to comment on live ticker.
- **Content Security**: Implemented comprehensive `sanitizeHTML()` function to prevent XSS attacks across all user-generated content (posts, comments, display names).
- **Firebase Collections**: Added three new collections for social features:
  - `social_posts` - User posts with market references
  - `post_reactions` - Reactions to posts
  - `post_comments` - Comments and replies
- **Code Quality**: All social features use proper Firestore queries, content sanitization, and backend validation. Stake requirements enforced on both frontend and backend.

### Session 6: UI/UX Polish & Bug Fixes
- **JavaScript Error Fixes**: Removed undefined `validateAndShowOtp` export and fixed `switchSocialTab()` to reference correct `social-fab` element, eliminating console errors during initialization.
- **Smart Tag Feature Enhancement**: Redesigned "Attach Market" button with explicit "📎 Attach Bet" label and prominent styling (`bg-sky-400/10`, border, hover effects) to make market tagging feature immediately discoverable.
- **Create Post Modal Redesign**: Complete visual overhaul for better UX:
  - Larger heading (text-2xl) and close button (w-7 h-7)
  - Bigger textarea (h-36, font-size 16px, line-height 1.6)
  - Enhanced "Post" button (px-8 py-3, text-base, font-bold, rounded-xl, shadow-lg)
  - Improved spacing and visual hierarchy throughout
  - Better attached market display with increased padding and font weights
- **Light Mode Text Visibility**: Added CSS override for `.text-white` class in light mode (`color: #0F172A`) to fix invisible usernames in leaderboard and social feed.
- **Button Styling Consistency**: Unified styling across all major CTAs:
  - Follow button: Enhanced with text-base, font-bold, py-3, rounded-xl, shadow-lg
  - Ticker chat input: Increased font-size to 16px with better styling
  - Ticker Post button: Upgraded to px-6, py-2.5, font-bold, rounded-xl, shadow-lg
- **Code Quality**: All changes architect-reviewed and approved. No regressions in functionality, security, or theme switching.

### Session 7: Critical Bug Fixes & UX Enhancements
- **Social Feed Reply Fix**: Added Reply button to nested replies in social feed comments, enabling users to reply to replies instead of only top-level comments. All replies maintain proper threading and display "@username" tags.
- **Admin Panel Session Persistence**: Implemented automatic admin authentication restoration on page reload:
  - Admin secret now loads from sessionStorage on app initialization
  - Backend verification ensures stored secret is still valid before granting access
  - Invalid/expired secrets are automatically cleared from storage
  - Eliminates need to re-login to admin panel on every page refresh
- **User Profile Rank Display**: Fixed "Rank: N/A" bug by implementing actual rank calculation:
  - Calls `getUserRank()` to query leaderboard and calculate real position
  - Displays "Rank #X" for ranked users or "Unranked" for new users
  - Rank updates dynamically based on XP leaderboard position
- **Smart Chart Enhancements**: Upgraded Chart.js tooltips with contextual information:
  - Date display with emoji (📊 Nov 20)
  - Formatted trading volume ($XXX.XX)
  - Percentage change from previous day with directional arrows (↗/↘)
  - Custom styling with sky-blue theme colors and proper padding
- **Post Creation Button Polish**: Enhanced "Attach Bet" and "Add Image" buttons:
  - Added smooth hover animations (scale, rotate, icon transforms)
  - Improved shadows and borders for depth
  - Better spacing and font weights for readability
  - Character counter now has styled container
  - Active/hover states provide clear visual feedback
- **Code Quality**: All changes architect-reviewed and approved with no security issues or race conditions. Admin session restore includes proper async handling and error recovery.

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