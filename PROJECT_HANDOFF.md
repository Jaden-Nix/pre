# 🚀 Predora Project Handoff Guide

**Last Updated:** November 21, 2025  
**Status:** Production Ready (Demo Mode - Blockchain Temporarily Disabled)

---

## 📋 Quick Start for New Developer

### Step 1: Fork/Clone This Project
1. Create a new Replit account or use existing one
2. Clone this repository (or import from GitHub)
3. The project is a full stack app: Frontend (`app.html`) + Backend (`server/index.js`)

### Step 2: Set Up Secrets in Replit
Add these secrets (🔒 icon → New Secret):

**CRITICAL (Must Have):**
```
GEMINI_API_KEY=<your_gemini_key_from_makersuite.google.com/app/apikey>
OPENAI_API_KEY=<your_openai_key_from_platform.openai.com/api-keys>
ADMIN_SECRET=<any_secure_password>
```

**Firebase Integration (Optional - Uses Existing Project):**
```
GOOGLE_APPLICATION_CREDENTIALS=<json_from_firebase_console>
```

**Email Service:**
```
SENDGRID_API_KEY=<from_app.sendgrid.com>
SENDGRID_FROM_EMAIL=<your_verified_sender>
```

**Web3/Blockchain (For Re-enabling BSC):**
```
WALLETCONNECT_PROJECT_ID=<from_cloud.walletconnect.com>
BICONOMY_PAYMASTER_API_KEY=<from_dashboard.biconomy.io>
```

### Step 3: Start the Server
The workflow `Start Predora Backend` automatically runs when you save. It:
- Installs npm dependencies
- Compiles viem for blockchain
- Starts backend on port 5000
- Serves frontend at `/` and `/app.html`

### Step 4: Access the App
- **Landing Page:** http://localhost:5000/
- **Main App:** http://localhost:5000/app.html
- **Admin Panel:** http://localhost:5000/app.html?admin=1 (use your `ADMIN_SECRET` password)

---

## 🎯 What's Completed

### Backend (server/index.js - 2500+ lines)
✅ Express.js server with full REST API
✅ Firebase Admin SDK integration
✅ Swarm-Verify Oracle (multi-agent AI resolution)
✅ AI Guardrails (duplicate, quality, sybil detection)
✅ Email OTP authentication
✅ Admin endpoints for manual market resolution
✅ Jury system backend
✅ Auto-payout job for finalized markets
✅ Custodial wallet generation
✅ Biconomy AA service initialization
✅ Market creation/validation endpoints
✅ Real-time market data endpoints

### Frontend (app.html - 800+ lines)
✅ Browse-first UX (no login required)
✅ Mobile-responsive design
✅ TikTok-style "Quick Play" interface
✅ Market detail screens with charts
✅ User authentication (Email OTP, Web3)
✅ Wallet connection UI (MetaMask)
✅ Demo account login
✅ Betting interface
✅ Profile/Account screens
✅ Admin panel UI

### Data & Infrastructure
✅ Firebase Firestore integration
✅ Mock balance system (Firestore-only)
✅ 45 demo markets pre-loaded
✅ Demo user accounts (Bob, Alice, Judge)
✅ Smart contract deployed (BSC Testnet: 0xdaAf91610e33355c9Cd9258219C6A4822E693f55)

---

## 🔧 What Needs to Be Implemented

### Phase 1: BSC + Mock BUSD Integration ⚠️ NEXT PRIORITY
**Current State:** Blockchain code is commented out with markers `// TODO: BLOCKCHAIN TEMPORARILY DISABLED FOR HACKATHON DEMO`

**Files to Modify:**
1. `app.html` - Lines with wallet connection, balance fetchers
2. `server/custodial-wallet-service.js` - Uncomment provider initialization
3. `server/index.js` - Uncomment `/api/wallet/*` and `/api/aa/*` endpoints

**What to Do:**
- [ ] Uncomment all `// TODO: BLOCKCHAIN TEMPORARILY DISABLED` sections
- [ ] Restore Web3Modal and WalletConnect script tags
- [ ] Re-enable `connectWallet()` function in app.html
- [ ] Test MetaMask connection on BSC Testnet (Chain ID: 97)
- [ ] Verify testnet BNB balance fetching
- [ ] Create mock BUSD token contract or use existing test token
- [ ] Add BUSD balance display in UI
- [ ] Test on-chain betting (currently disabled)

**Key Files:**
- `app.html` - Lines 40-80 (Web3 setup), 800-900 (wallet connection functions)
- `server/custodial-wallet-service.js` - Initialize ethers.js provider
- `server/index.js` - Lines 30-100 (Biconomy AA init)

---

### Phase 2: Activity Alerts System 📢 AFTER BSC
**Current State:** No alerts system implemented

**Features to Add:**
- [ ] Real-time notifications for replies to your posts
- [ ] Alerts when people you follow post new markets
- [ ] Alerts when jury votes are available
- [ ] Push/email notifications for disputed markets

**Implementation:**
1. **Backend** (`server/index.js`):
   - Create `/api/alerts` endpoint (GET - fetch user alerts)
   - Create `/api/alerts/preferences` endpoint (POST - user alert settings)
   - Create notification system in `/api/post-reply` and `/api/create-market`

2. **Frontend** (`app.html`):
   - Add notification bell icon in navbar
   - Create alerts screen showing all notifications
   - Add alert preferences modal

3. **Database** (Firestore):
   - Create `alerts` collection
   - Schema: `{ userId, type, message, marketId, fromUserId, read, timestamp }`

**Key Firebase Collections:**
- `artifacts/predora-app/public/data/alerts` - Alert records
- `artifacts/predora-app/public/data/alert_preferences` - User preferences

---

### Phase 3: Jury Selection & Voting 👨‍⚖️ AFTER ALERTS
**Current State:** Jury endpoints exist but UI needs completion

**Features to Add:**
- [ ] Automatic jury member selection for disputed markets
- [ ] Jury invitation/notification system
- [ ] Jury voting interface
- [ ] Vote aggregation and dispute resolution

**Implementation:**
1. **Backend** - Already mostly done:
   - `/api/admin/disputed-markets` - Fetch disputed markets (LINE 1394)
   - `/api/jury/invite` - Invite jury members
   - `/api/jury/vote` - Submit jury vote

2. **Frontend** - Needs UI:
   - Create jury panel in admin interface
   - Jury voting modal in market detail
   - Jury leaderboard showing top jurors

**Key Firebase Collections:**
- `artifacts/predora-app/public/data/jury_votes` - Vote records
- `artifacts/predora-app/public/data/jury_members` - Jury roster

---

### Phase 4: Social Features (Optional)
- [ ] User follow system
- [ ] Community posts/comments
- [ ] Market creator profiles
- [ ] Leaderboards

---

## 🔑 All Required Secrets

```bash
# AI & APIs
GEMINI_API_KEY=<Required>
OPENAI_API_KEY=<Required>
ADMIN_SECRET=<Required>

# Email (for OTP login)
SENDGRID_API_KEY=<Optional>
SENDGRID_FROM_EMAIL=<Optional>

# Firebase (Admin SDK - optional, app works client-side only)
GOOGLE_APPLICATION_CREDENTIALS=<Optional>

# Web3/Blockchain (To re-enable blockchain)
WALLETCONNECT_PROJECT_ID=<Optional>
BICONOMY_PAYMASTER_API_KEY=<Optional>

# Replit Internal (Auto-generated)
SESSION_SECRET
REPLIT_DOMAINS
REPLIT_DEV_DOMAIN
REPL_ID
```

---

## 🏗️ Architecture Overview

```
predora/
├── app.html              # Frontend (single-page app, 800+ lines)
├── index.html            # Landing page
├── server/
│   ├── index.js          # Main backend (2500+ lines)
│   ├── swarm-verify-oracle.js    # Multi-agent resolution system
│   ├── auto-payout-job.js        # Automatic market finalization
│   ├── custodial-wallet-service.js # Wallet generation
│   ├── biconomy-aa-service.js    # Account abstraction
│   └── package.json
├── contracts/
│   ├── contracts/PredictionMarket.sol
│   └── deployment-info.json
└── replit.md, PROJECT_HANDOFF.md
```

### Data Flow
```
User → app.html → Firebase Auth
               → Backend (Express.js) → Firebase Firestore
               → Smart Contract (BSC Testnet) → On-chain betting
               → Swarm Oracle → Resolution & Payouts
```

---

## 🚀 Next Steps to Complete

### Immediate (This Week)
1. **Re-enable blockchain** - Uncomment BSC integration code
2. **Test wallet connection** - Verify MetaMask on BSC Testnet
3. **Mock BUSD token** - Set up test token or use existing
4. **Alert system backend** - Create Firebase alert collection & endpoints

### Short Term (Next Week)
1. **Alert UI** - Add notification bell and alerts screen
2. **Jury selection logic** - Implement random jury picker
3. **Jury voting UI** - Create voting modal in market detail

### Medium Term (Following Week)
1. **Social features** - User follows, posts, comments
2. **Leaderboards** - Top traders, top jurors
3. **Analytics dashboard** - Market trends, user stats

---

## 🧪 Testing Checklist

- [ ] Backend starts without errors: `npm start` in `/server`
- [ ] App loads at `/app.html`
- [ ] Admin panel accessible with correct password
- [ ] Email OTP login works (requires verified SendGrid sender)
- [ ] Create market successfully
- [ ] Oracle runs on past-due markets (check logs)
- [ ] AI Guardrails catches duplicates
- [ ] Markets resolve automatically (if confidence >= 90%)
- [ ] Wallet connection works (after re-enabling blockchain)
- [ ] On-chain betting functional
- [ ] Mock balance system works for email users

---

## 📞 Key Endpoints

**Market Management:**
- POST `/api/create-market` - Create new market
- GET `/api/data/markets` - Fetch all markets
- GET `/api/data/market/:id` - Fetch market details
- POST `/api/validate-market` - Check for duplicates/quality/sybil

**Oracle & Resolution:**
- POST `/api/admin/override-market` - Manually resolve market
- POST `/api/admin/request-second-swarm` - Run oracle again
- GET `/api/admin/disputed-markets` - Fetch disputed markets

**User & Auth:**
- POST `/api/send-otp` - Send OTP email
- POST `/api/verify-otp` - Verify OTP
- GET `/api/user/:id/profile` - Get user profile

**Jury:**
- POST `/api/jury/invite` - Invite jury members
- POST `/api/jury/vote` - Submit jury vote

**Blockchain (Disabled Currently):**
- POST `/api/wallet/create` - Create custodial wallet
- GET `/api/wallet/:id/balance` - Get wallet balance
- POST `/api/stake-market` - Place bet on market

---

## 🐛 Known Issues & TODOs

1. **Blockchain Disabled** - All Web3 code commented out (search for `// TODO: BLOCKCHAIN TEMPORARILY DISABLED`)
2. **No Email Alerts** - Notification system not yet implemented
3. **Mock Balances Only** - No real on-chain betting (by design for demo)
4. **Limited Jury UI** - Backend ready, frontend needs work
5. **Auto-payout Disabled** - Requires database/private key configuration

---

## 💡 Quick Tips for New Dev

1. **Read before editing:** `replit.md` has full architecture
2. **Search for TODOs:** `grep -n "TODO" server/index.js app.html` finds all work items
3. **Check Firebase Console:** See live data at https://console.firebase.google.com
4. **View Smart Contract:** BSCScan link in `replit.md`
5. **Enable debug logs:** Search for `console.log` in server/index.js for existing logging

---

## 🎓 Learning Resources

- **Prediction Markets:** https://en.wikipedia.org/wiki/Prediction_market
- **Swarm Oracle (Our Tech):** See `server/swarm-verify-oracle.js` (1000+ lines with detailed comments)
- **BSC Testnet:** https://testnet.bscscan.com/
- **Firebase Firestore:** https://firebase.google.com/docs/firestore
- **Express.js:** https://expressjs.com/
- **Web3Modal:** https://web3modal.com/

---

## ✅ Handoff Checklist

Before handing off to new dev:
- [ ] All secrets configured in Replit
- [ ] Server starts without errors
- [ ] App loads and shows markets
- [ ] Admin panel accessible
- [ ] Read `replit.md` (full architecture)
- [ ] Read this `PROJECT_HANDOFF.md` (implementation roadmap)
- [ ] Reviewed `server/index.js` (key logic)
- [ ] Understood Firestore schema (search for `artifacts/predora-app`)

Good luck! 🚀
