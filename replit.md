# Predora - AI-Native Prediction Market Platform

## Status: ✅ QUICK PLAY SYSTEM OPERATIONAL

Predora is a TikTok-style prediction market platform with instant Quick Play markets and custodial wallets. Users can create and bet on predictions in seconds.

## Current Working Features (Nov 24, 2025)

### ✅ Quick Play Markets
- **Endpoint**: `POST /api/admin/create-quick-play-market`
- **Status**: Fully operational (Firestore-backed)
- **Market Creation**: 
  - Title + Duration → Creates instantly
  - Liquidity: 0.005 BNB YES + 0.005 BNB NO pools
  - No auth required (public endpoint)
- **Frontend Display**: 
  - Navigate to Quick Play screen (click "Quick Plays" card on home)
  - Markets display as swipeable cards
  - YES/NO/SKIP buttons for interaction
- **Data Storage**: Firestore collection `artifacts/predora-hackathon/public/data/quick_play_markets`

### ✅ Custodial Wallets
- Server-side wallet creation on signup
- AES-256-GCM encryption for private keys
- Automatic balance syncing
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
3. Listens to Firestore: artifacts/predora-hackathon/public/data/quick_play_markets
   ↓
4. Filters unresolved markets (isResolved: false)
   ↓
5. Combines with mock markets for display
   ↓
6. Displays as swipeable card interface
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

## Architecture

**Frontend** → Vanilla JavaScript + Firebase SDK + Ethers.js
- Real-time Firestore listeners for markets
- Swipeable card UI
- TikTok-style interaction

**Backend** → Express.js
- Quick Play creation endpoint
- Firestore writes with blockchain fallback
- Auto-payout job management
- Custodial wallet service

**Database** → Firestore
- Collections: `artifacts/{APP_ID}/public/data/quick_play_markets`
- Real-time syncing
- Guest-accessible reads

**Blockchain** → BSC Testnet (graceful fallback)
- PredictionMarketV2: 0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB
- PredToken: 0x45C229bF14A36aD14885148E62058C98284B2ae0
- Status: Firestore works independently

## Testing

**To see Quick Play markets working:**
1. Open http://localhost:5000/app.html
2. Scroll to "Quick Plays" card (blue with lightning bolt)
3. Click to navigate to Quick Play screen
4. Markets load and display as cards
5. Use YES/NO/SKIP buttons

**To create a test market:**
```bash
curl -X POST http://localhost:5000/api/admin/create-quick-play-market \
  -H "Content-Type: application/json" \
  -d '{"title":"Your market title","durationMinutes":15}'
```

## Next Steps to Enhance

1. **Betting Logic**: Connect Quick Play cards to actual betting backend
2. **Market Resolution**: Add admin/jury resolution UI
3. **Balance Updates**: Real-time balance display during betting
4. **Categories**: Add category tags to Quick Play markets
5. **Blockchain Debug**: Investigate smart contract revert (status 0)
6. **PRED Integration**: Add PRED token liquidity (once blockchain fixed)

## Deployment Status
- Backend: ✅ Running on port 5000
- Frontend: ✅ Accessible at `/app.html`
- Firestore: ✅ Connected
- Authentication: ✅ Working
- Quick Play API: ✅ Operational
- Quick Play UI: ✅ Ready
