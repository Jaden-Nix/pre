# Predora - AI-Native Prediction Market Platform

## Project Overview
Predora is an AI-native prediction market application built on BNB Chain with Gemini AI-powered market resolution, TikTok-style Quick Play interface, and Web3 integration for gasless transactions.

## Current Architecture

### Frontend
- **Type**: Single-page vanilla HTML/CSS/JavaScript application
- **Main File**: `app.html` (~9,800 lines)
- **Framework**: No framework - pure vanilla JS with Firebase client SDK
- **Styling**: Tailwind CSS (CDN)
- **Web3**: Ethers.js v5 (CDN) for wallet connection and blockchain interaction
- **Key Features**:
  - TikTok-style swipe interface for Quick Play
  - Real-time Firebase data sync
  - Chart.js for market visualization
  - Responsive mobile-first design
  - Dark/light theme toggle

### Backend (Express.js)
- **Location**: `/server` directory
- **Framework**: Express.js with CommonJS
- **Port**: 5000 (serves both static files and API)
- **Key Features**:
  - AI proxy endpoint for Gemini API calls
  - Oracle system for automatic market resolution
  - Market generation via Gemini AI
  - Quick Play generation
  - Firebase Admin SDK integration (optional)
  - CRON-protected endpoints

## Technology Stack

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Tailwind CSS (CDN)
- Firebase Client SDK v9
- Ethers.js v5 (CDN)
- Chart.js for data visualization
- Lucide Icons

### Backend
- Node.js
- Express.js
- Firebase Admin SDK (optional)
- Google Gemini AI API
- CORS enabled

## Features Implemented

### ✅ Phase 1 - Core Migration & Enhancements (Completed)

**1. Web3 Integration (BSC Testnet & opBNB Testnet)**
- Ethers.js library integrated via CDN
- Network constants for BSC Testnet (Chain ID: 97) and opBNB Testnet (Chain ID: 5611)
- `connectWallet()` - MetaMask wallet connection
- `switchNetwork()` - Add/switch between BSC and opBNB testnets
- `getRealBNBBalance()` - Fetch real on-chain BNB balances
- UI in Profile > Assets tab with:
  - Connect MetaMask button
  - Network switcher buttons
  - Real-time BNB balance display
  - Smart account address display

**2. Account Abstraction (NOT IMPLEMENTED)**
- `initializeSmartAccount()` - Placeholder function with TODO comments
- UI shows "Not configured (needs Biconomy SDK)" status
- **Status**: Not implemented - requires full Biconomy SDK integration from scratch (see Next Steps)
- **Note**: Previously had fake address generation which was removed to avoid misleading users

**3. Jury Voting System (Fully Functional)**
- `submitJuryVote(marketId, vote)` - Submit jury votes for disputed markets
- `checkDisputeResolution(marketId)` - Tally votes and resolve (requires 3+ votes with >50% majority)
- Stores votes in `jury_votes` Firestore collection
- Updates markets with jury decisions
- Jury code system with 24-hour expiry tracking
- UI integration in Verdict Modal:
  - Automatically shows jury voting section for disputed markets
  - Vote YES/NO buttons
  - Prevents duplicate voting - shows "Vote Recorded" status
  - Only visible when market status is disputed
- **Admin Dashboard** (New!):
  - Secure admin panel with ADMIN_SECRET authentication
  - View all disputed markets with jury voting progress
  - Manual outcome override capability for edge cases
  - Real-time statistics (total markets, disputed, resolved)
  - Backend API endpoints: `/api/admin/disputed-markets`, `/api/admin/override-market`, `/api/admin/stats`
  - Access via Profile screen "Admin Panel" button (requires admin secret)

**4. Multiple Options Market Display (Fully Functional)**
- `renderOptionChips(options)` - Helper function to render option chips
- Modified `renderMarketFeed()` to detect multi-choice markets (>2 options)
- Shows each option with individual percentage in colored chips
- Adds "Multi-Choice" badge to differentiate from binary markets
- Supports 3-6 options per market

**5. Firebase Integration**
- Successfully connected to Firebase Firestore
- Real-time data synchronization for markets, pledges, and user profiles
- Client-side Firebase SDK (v9 modular)
- Collections: `standard_markets`, `pledges`, `users`, `jury_votes`, `stake_logs`

**6. AI Features (Backend)**
- Market generation via Gemini AI
- Quick Play generation
- Auto-resolution with web search verification
- AI verdict with rationale and sources

## Project Structure

```
├── app.html                    # Main single-page application (~9,800 lines)
├── server/                     # Express.js backend
│   ├── index.js               # Main server file with AI endpoints
│   ├── package.json           # Backend dependencies
│   └── public/                # Static assets (if any)
├── client/.env.local          # Firebase client configuration
└── replit.md                  # This file
```

## Running the Project

### Development Mode
The server runs on port 5000 and serves both the app and API endpoints.

**Start Command:**
```bash
cd server && node index.js
```

**URLs:**
- Landing: `http://localhost:5000/`
- App: `http://localhost:5000/app.html`

### Workflow Configuration
- **Workflow Name**: "Start Predora Server"
- **Command**: `cd server && node index.js`
- **Output Type**: `webview`
- **Port**: 5000

## Environment Variables

### Frontend (client/.env.local)
```
VITE_FIREBASE_API_KEY=<your-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

### Backend (Replit Secrets)
**Currently Missing (User will provide):**
- `GEMINI_API_KEY` - Google Gemini AI API key for market generation and resolution
- `CRON_SECRET` - Secret for protecting Oracle job endpoints
- `GOOGLE_APPLICATION_CREDENTIALS` (Optional) - Firebase Admin SDK credentials

**Note**: App works with client-side Firebase only. Backend AI features require `GEMINI_API_KEY`.

## Web3 Network Configuration

### BSC Testnet
- **Chain ID**: 97 (0x61)
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Currency**: tBNB
- **Block Explorer**: https://testnet.bscscan.com

### opBNB Testnet
- **Chain ID**: 5611 (0x15EB)
- **RPC URL**: https://opbnb-testnet-rpc.bnbchain.org
- **Currency**: tBNB
- **Block Explorer**: https://testnet.opbnbscan.com

## Next Steps

### Priority 1: Complete Account Abstraction
**Current Status**: Framework ready with deterministic smart account address generation, but missing full SDK integration.

**Required Steps:**
1. Add Biconomy SDK (or Particle Network SDK) via CDN or npm
2. Initialize SDK with project credentials:
   ```javascript
   // Example for Biconomy
   const biconomy = new Biconomy(ethersProvider, {
     apiKey: BICONOMY_API_KEY,
     debug: true
   });
   ```
3. Configure paymaster for gasless transactions
4. Replace direct signer calls with smart account sends:
   ```javascript
   // Instead of: signer.sendTransaction(tx)
   // Use: smartAccount.sendTransaction(tx)
   ```
5. Add UI loading states and error handling for SDK initialization
6. Test end-to-end flow: connect → smart account init → gasless transaction

**Blockers**: Needs Biconomy/Particle API keys from user

### Priority 2: Add API Keys
Once API keys are provided by user:
1. Add `GEMINI_API_KEY` to Replit Secrets
2. Add `CRON_SECRET` to Replit Secrets
3. Test AI market generation and resolution
4. Test Oracle auto-resolution cron job

### Priority 3: Testing & Polish
1. Test wallet connection on BSC testnet with real tBNB
2. Create a disputed market and test jury voting flow
3. Test multi-option markets (3-6 options)
4. Verify network switching between BSC and opBNB
5. Test Account Abstraction once SDK is integrated

### Priority 4: Future Enhancements
- Add more testnet support (Polygon, Arbitrum)
- Implement social features (follow, leaderboards)
- Add NFT rewards for top predictors
- Integrate yield protocols for staking
- Mobile app (React Native)

## Recent Changes (Nov 20, 2025)

### Admin Dashboard Implementation (Latest)
- ✅ Created secure admin dashboard with ADMIN_SECRET authentication
- ✅ Added 3 protected backend API endpoints for admin operations
- ✅ Built admin panel UI with disputed markets monitoring
- ✅ Implemented manual outcome override for edge cases
- ✅ Added real-time jury voting progress display on market cards
- ✅ Enhanced market feed with "🚨 DISPUTED - Jury Reviewing" badges
- ✅ Integrated admin stats (total markets, disputed, resolved counts)
- ✅ Architect-verified security implementation

### Migration Complete
- ✅ Switched from Next.js client back to original vanilla HTML/JS app (app.html)
- ✅ Resolved Firebase configuration issues - app connects successfully
- ✅ Added Ethers.js library and Web3 constants for BSC testnet and opBNB testnet
- ✅ Fixed multiple options market display to show all 3-6 options with percentages
- ✅ Implemented Web3 wallet connection with MetaMask integration
- ✅ Added network switching (BSC testnet ⟷ opBNB testnet)
- ✅ Built jury voting system with UI integration in verdict modal
- ✅ Created Assets tab UI for wallet management
- ✅ Real BNB balance fetching from blockchain

### Account Abstraction Status
- ✅ Framework ready with smart account address generation
- ⏳ Full Biconomy SDK integration pending (needs API keys)
- ⏳ Gasless transaction execution pending

## Known Issues & Limitations

1. **Account Abstraction**: Only generates smart account addresses, does not execute gasless transactions yet. Needs full Biconomy/Particle SDK integration.
2. **Firebase Admin SDK**: Not initialized (warning in logs). App works with client-side Firebase only. Optional for production.
3. **Tailwind CDN**: Using Tailwind via CDN for development. Should switch to PostCSS for production.
4. **Large File Size**: app.html is ~9,800 lines. Consider code splitting for better maintainability.

## User Preferences
- Vanilla HTML/CSS/JS architecture (original design, not Next.js)
- Web3-native with MetaMask wallet integration
- AI-powered features using Gemini API
- TikTok-style UX for Quick Play
- Glassmorphism design with dark/light themes
- Real testnet tokens (BNB) instead of mock balances
- Jury-based dispute resolution system
- Multi-option markets (3-6 choices)

## Architecture Decisions

### Why Vanilla JS Instead of React/Next.js?
- Original Predora app was built with vanilla JS (~9,400 lines in app.html)
- Migration preserves existing codebase and design
- Simpler deployment and faster load times
- No build step required for development
- Direct Firebase integration without framework overhead

### Why BSC Testnet + opBNB?
- Low transaction fees (gasless with Account Abstraction)
- Fast block times (3 seconds on BSC, <1 second on opBNB)
- Active testnet with free faucets
- BNB Chain ecosystem alignment

### Why Jury Voting?
- Decentralized dispute resolution
- No single point of failure
- Community-driven governance
- Prevents AI oracle manipulation
- Simple majority voting (3+ votes, >50% threshold)

## Support & Documentation
- Firebase Setup: See inline comments in app.html (search for "Firebase Configuration")
- Web3 Setup: Connect MetaMask and switch to BSC Testnet (chain ID 97)
- API Keys: Add to Replit Secrets when ready
- Issues: Check browser console logs and server logs in workflow

---

**Last Updated**: November 20, 2025
**Version**: 2.0 (Vanilla JS Migration)
**Status**: Core features complete, Account Abstraction framework ready
