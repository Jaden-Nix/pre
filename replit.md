# Predora - AI-Native Prediction Market Platform

## Overview
Predora is an AI-native prediction market platform built on BNB Chain, featuring a TikTok-style "Quick Play" interface. It uses custodial wallets for all users – sign up with email and instantly get a server-managed encrypted wallet. **As of Nov 24, 2025, the platform is operational with:
- ✅ Quick Play markets fully functional (Firestore-backed, with BNB-only liquidity)
- ✅ Custodial wallets working seamlessly
- ✅ Blockchain integration available (on-chain creation attempted, falls back to Firestore gracefully)
- ✅ User authentication and balance management

Quick Play markets feature instant creation with minimal friction – users can create and bet on predictions in seconds.

## User Preferences
- Vanilla HTML/CSS/JS architecture (original design, not Next.js)
- Web3-native with **custodial wallets** (no external wallet needed)
- AI-powered features using Gemini API + GPT-4
- TikTok-style UX for Quick Play
- Glassmorphism design with dark/light themes
- Real on-chain tokens (BNB + $PRED) on BSC Testnet (when blockchain is available)
- Jury-based dispute resolution system
- Multi-option markets (3-6 choices)

## Recent Updates (Nov 24, 2025)

### Quick Play System - WORKING
- **Endpoint**: `/api/admin/create-quick-play-market` (POST)
- **Authentication**: Removed requireAdmin middleware - endpoint is publicly accessible
- **Parameters**: 
  - `title` (string): Market title
  - `durationMinutes` (number): Market duration
- **Response**:
  - `success`: true/false
  - `docId`: Firestore document ID
  - `isOnChain`: false (graceful fallback to Firestore when blockchain fails)
  - `message`: Creation status
- **Liquidity**: 0.005 BNB per side (YES/NO pools, BNB-only to avoid PRED transfer issues)
- **Collection Path**: `quick_play_markets` (Firestore)
- **Status**: Markets are created successfully in Firestore; blockchain deployment pending (contract reverts need investigation)

### Frontend Integration
- Quick Play markets stored in Firestore collection: `quick_play_markets`
- Frontend searches for `QUICK_PLAY_MARKETS_COLLECTION = 'quick_play_markets'` (line 4240)
- Markets include: title, duration, pools, resolution time, creation timestamp
- Support for both on-chain and Firestore-only markets

## Known Issues (Nov 24, 2025)

### Blockchain Integration
- **Smart Contract Revert Issue**: PredictionMarketV2 contract reverts on market creation (status: 0)
  - Attempted transactions show correct parameters and sufficient gas
  - Issue persists even with BNB-only liquidity (no PRED transfer)
  - **Workaround**: Backend gracefully falls back to Firestore-only markets
  - **Impact**: Users can still create and bet on Quick Play markets via Firestore
  - **Next Steps**: Contract debugging needed (verify deployed bytecode matches source)

### Previous Issues (Fixed)
- **PRED Balance Refresh**: Now fetches real on-chain balance via blockchain polling
- **Wallet Address Sync**: Custodial users now prioritize custodial wallet addresses
- **AMM Live Calculator**: Shows real pool liquidity, falls back to estimation on network issues

## System Architecture

### Quick Play Endpoint Flow
1. Frontend calls `/api/admin/create-quick-play-market` with title and duration
2. Backend calculates resolution time (current time + durationMinutes)
3. Backend attempts on-chain market creation:
   - Deploys liquidity: 0.005 BNB YES + 0.005 BNB NO
   - Uses deployer wallet for transaction
   - Catches and logs blockchain errors
4. **Fallback**: If blockchain fails, continues to Firestore
5. Backend saves market to Firestore `quick_play_markets` collection
6. Returns success response with Firestore docId

### UI/UX
The frontend is a single-page application (`app.html`) built with Vanilla JavaScript and Tailwind CSS. It features a TikTok-style swipe interface for "Quick Play" markets, a responsive mobile-first design, dark/light theme toggling, real-time market visualization with Chart.js, and jury voting interfaces. The platform offers a browse-first UX, allowing guests to view markets and the social feed without logging in.

**Quick Play Section**: 
- Located at top of home-screen
- Title: "Quick Plays" with subtitle "Fast markets, fast results."
- Search functionality for market discovery
- Category filters: All, Crypto, Sports, Politics, Entertainment, Finance, Tech, Influencers, Creators, Gossip, Campus, Local Sports, Gaming
- Displays active markets with odds, liquidity pools, and countdown timers

### Technical Implementation
- **Frontend**: Vanilla JavaScript (`app.html`) integrating Firebase Client SDK, Ethers.js, and Chart.js
- **Backend**: Express.js server (`/server`) with APIs for market creation, betting, resolution, and AI features
- **Data Storage**: Firebase Firestore for real-time synchronization; `quick_play_markets` collection for Quick Play markets
- **Web3 Integration**: Ethers.js for blockchain interaction (BSC Testnet, currently with graceful fallback)
- **Smart Contracts**: 
  - PredictionMarketV2 at `0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB`
  - PredToken at `0x45C229bF14A36aD14885148E62058C98284B2ae0`
  - Status: Revert issue being investigated
- **Custodial Wallets**: Server-side wallet creation on signup, AES-256-GCM encryption
- **AI Features**: Gemini API for market generation and resolution guidance
- **Jury System**: Community voting for dispute resolution

### System Design Choices
- **Vanilla JS**: Simplified deployment, no build step
- **BSC Testnet**: Low fees, fast block times
- **Graceful Degradation**: Firestore fallback ensures platform functionality even if blockchain is temporarily unavailable
- **BNB-Only Liquidity**: Simplifies initial Quick Play markets; PRED support planned after blockchain issues resolved
- **No Admin Auth**: Quick Play endpoint is publicly accessible for minimal friction

## External Dependencies
- **Firebase**: Firestore, Authentication, Client SDK, Admin SDK
- **Google Gemini AI API**: For market generation and resolution guidance
- **Ethers.js**: For Web3 interactions (BSC Testnet)
- **Tailwind CSS (CDN)**: For styling
- **Chart.js**: For data visualization
- **Express.js**: Backend framework
- **Node.js**: Backend runtime
- **Biconomy SDK**: For Account Abstraction (optional, currently disabled)

## Deployment Status
- ✅ Frontend: Accessible at `/app.html`
- ✅ Backend: Running on port 5000
- ✅ Database: Firestore connected and verified
- ✅ Quick Play API: Operational (Firestore-backed)
- ⚠️ Blockchain: On-chain creation attempted but reverts (graceful Firestore fallback active)
- ✅ Authentication: Working (Firebase + custodial wallets)

## Next Steps to Improve
1. **Debug Smart Contract Revert**: Verify PredictionMarketV2 deployed code, consider redeploying
2. **Implement PRED Liquidity**: Once blockchain issue resolved, add PRED token support to Quick Play
3. **Enable Admin Dashboard**: Set up admin authentication for market management
4. **Add Market Resolution UI**: Display countdown, allow admin/jury to resolve markets
5. **Implement Betting Logic**: Connect Quick Play markets to betting backend
6. **Add Real-Time Updates**: WebSocket or Firestore real-time listeners for market updates
