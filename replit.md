# Predora - AI-Native Prediction Market Platform

## Status: ✅ QUICK PLAY SYSTEM OPERATIONAL

Predora is a TikTok-style prediction market platform with instant Quick Play markets and custodial wallets. Users can create and bet on predictions in seconds.

## Recent Fixes (Nov 24, 2025 - Latest)

### 🔧 Critical Fixes Applied
1. **Fixed QuickPlay.tsx Firestore Query**
   - Removed `orderBy` clause that was causing document fetch failures
   - Implemented client-side sorting for market chronological order
   - Markets now load reliably from Firestore

2. **Fixed Quick Play Market Creation**
   - Markets now initialize with required BUSD liquidity pools:
     - `yesPoolBusd: 50` (YES side liquidity)
     - `noPoolBusd: 50` (NO side liquidity)
   - All fields properly set: `yesVotes`, `noVotes`, `totalVolumeBusd`, `yesPercent`, `noPercent`
   - `createdAt` now uses Firestore Timestamp instead of ISO string

3. **Enhanced ROI Display**
   - ROI prominently displayed in Quick Play payout cards (yellow, bold)
   - Recent Activity tab shows betting history with payout calculations
   - Format: "Profit: +X.XX BUSD | ROI: XX%"

## Current Working Features (Nov 24, 2025)

### ✅ Quick Play Markets
- **Endpoint**: `POST /api/admin/create-quick-play-market`
- **Status**: Fully operational (Firestore-backed with AMM)
- **Market Creation**: 
  - Title + Duration → Creates instantly
  - Liquidity: 50 BUSD YES + 50 BUSD NO (mock BUSD pools)
  - No auth required (public endpoint)
  - Auto-generates via Gemini AI
- **Frontend Display**: 
  - React QuickPlay component with swipeable cards
  - Real-time market data fetching
  - YES/NO/SKIP buttons for interaction
- **Data Storage**: Firestore collection `artifacts/predora-hackathon/public/data/quick_plays`

### ✅ AMM Payout Formula
- **Formula**: `Payout = Bet + (Opposite Pool × Bet / (Your Pool + Bet))`
- **Example**: Bet 10 BUSD on YES when pools are YES=50, NO=50
  - Payout = 10 + (50 × 10 / (50 + 10)) = 10 + 8.33 = **18.33 BUSD**
  - ROI = (18.33 - 10) / 10 × 100 = **83.3%**

### ✅ Custodial Wallets
- Server-side wallet creation on signup
- AES-256-GCM encryption for private keys
- Automatic balance syncing (25 BUSD starting)
- No external wallet needed

### ✅ User Authentication
- Firebase Authentication
- Guest mode for browsing
- Session persistence

### ⚠️ Blockchain Integration
- On-chain creation attempted (gracefully falls back to Firestore)
- Smart contract reverts (debugging needed)
- Users unaffected - markets still work via Firestore

## Quick Play Flow

```
1. User navigates to Quick Play screen
   ↓
2. Frontend calls attachQuickPlayListener()
   ↓
3. Listens to Firestore: artifacts/predora-hackathon/public/data/quick_plays
   ↓
4. Removes orderBy constraint, loads all unresolved markets
   ↓
5. Sorts client-side by creation time
   ↓
6. Displays as swipeable card interface with payout predictions
```

## API Reference

### Create Quick Play Market
```
POST /api/admin/create-quick-play-market
Content-Type: application/json

{
  "title": "Will BTC hit 100k?",
  "durationMinutes": 30
}

Response:
{
  "success": true,
  "docId": "string",
  "isOnChain": false,
  "message": "✅ Quick Play market created (Firestore)..."
}
```

### Market Data Structure
```json
{
  "title": "Market question",
  "question": "Market question",
  "yesPoolBusd": 50,
  "noPoolBusd": 50,
  "yesVotes": 0,
  "noVotes": 0,
  "yesPercent": 50,
  "noPercent": 50,
  "createdAt": Timestamp,
  "expiresAt": Timestamp,
  "isActive": true,
  "status": "active"
}
```

## Architecture

**Frontend** → React + Firebase SDK + Ethers.js
- Real-time Firestore listeners for markets (no orderBy constraints)
- Swipeable card UI with payout preview
- TikTok-style interaction
- ROI display in payout cards

**Backend** → Express.js + Gemini AI
- Quick Play creation endpoint
- Firestore writes with blockchain fallback
- Auto-payout job management
- Custodial wallet service
- AI-powered market generation via autoGenerateQuickPlays

**Database** → Firestore
- Collections: `artifacts/{APP_ID}/public/data/quick_plays`
- Real-time syncing with client-side sorting
- Guest-accessible reads

**Blockchain** → BSC Testnet (graceful fallback)
- PredictionMarketV2: 0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB
- PredToken: 0x45C229bF14A36aD14885148E62058C98284B2ae0
- Status: Firestore works independently

## Testing

**To see Quick Play markets working:**
1. Open React app and navigate to Quick Play screen
2. Markets display as swipeable cards with:
   - YES/NO/SKIP buttons
   - Live payout calculations
   - ROI percentages
3. User Profile → Recent Activity shows betting history with ROI

**To create a test market:**
```bash
curl -X POST http://localhost:5000/api/admin/create-quick-play-market \
  -H "Content-Type: application/json" \
  -d '{"title":"Your market title","durationMinutes":15}'
```

## Next Steps to Enhance

1. **Betting UI Integration**: Connect payout preview to actual betting action
2. **Market Resolution**: Add admin/jury resolution UI
3. **Real-time Balance Updates**: Show balance changes during betting
4. **Market Categories**: Add category tags to Quick Play markets
5. **Blockchain Debug**: Investigate smart contract revert (status 0)
6. **PRED Integration**: Add PRED token liquidity (once blockchain fixed)
7. **Auto-market Generation**: Schedule hourly Gemini API calls for new markets

## Deployment Status
- Backend: ✅ Running on port 5000
- Frontend: ✅ React app with Quick Play component
- Firestore: ✅ Connected with proper market fields
- Authentication: ✅ Working (guest mode enabled)
- Quick Play API: ✅ Operational with BUSD pools
- Quick Play UI: ✅ Ready with AMM payout display
- ROI Display: ✅ Visible in payout cards and Recent Activity

## Key Technical Notes
- Market creation: `server/index.js` lines 3078-3103 (autoGenerateQuickPlays function)
- Frontend component: `client/components/QuickPlay.tsx`
- ROI calculation: `calculatePayoutBUSD` function in QuickPlay.tsx
- Recent Activity: `UserProfile.tsx` shows betting history with ROI
- Firestore query: No orderBy constraints to avoid failures
