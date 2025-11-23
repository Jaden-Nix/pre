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
✅ Jury system backend with notification routing
✅ Auto-payout job for finalized markets
✅ Custodial wallet generation
✅ Biconomy AA service initialization
✅ Market creation/validation endpoints
✅ Real-time market data endpoints
✅ $PRED token integration ($600 per token valuation)
✅ Notifications endpoint for alerts/disputes

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

### Phase 1: $PRED Token Integration ✅ COMPLETED (November 22, 2025)
**Current State:** Fully implemented with $PRED token valued at $600 per token

**Completed Features:**
- ✅ Replaced all "mock BUSD" references with "$PRED" token
- ✅ Updated token valuation: $PRED = $600 (alongside BNB = $500, CAKE = $3.5)
- ✅ Migrated all balance fields from 'balance' to 'predBalance'
- ✅ Updated default user balance: 100 $PRED tokens per new user
- ✅ Fixed all balance display calculations throughout UI

**Key Implementation Details:**
- `getMockPrice()` in `server/index.js` (line ~1118): Returns $600 for $PRED, $500 for BNB, $3.5 for CAKE
- `getBalanceField()` in `server/index.js` (line ~1122): Maps 'PRED' asset to 'predBalance' field
- `app.html` balance displays (lines 7789, 9033, 11922): All updated to use `predBalance` with proper formatting

**Files Modified:**
- `app.html` - Updated all balance references and displays
- `server/index.js` - Updated price mapping and balance field resolution

---

### Phase 2: Jury Notification System ✅ COMPLETED (November 22, 2025)
**Current State:** Fully implemented with direct jury links for top leaderboard users

**Completed Features:**
- ✅ Enhanced dispute notification system with juryLink field
- ✅ Created `/api/notifications` endpoint for fetching user alerts
- ✅ Implemented jury selection: top 10 leaderboard users, 5 randomly selected as jurors
- ✅ Updated dispute cost to 0.02 $PRED (~$12 USD equivalent)
- ✅ Direct jury invitation links sent to selected jurors
- ✅ Notification system supports market updates, replies, and disputes

**Implementation Details:**
- Dispute cost: 0.02 $PRED (equivalent to original 10 BUSD cost)
- Jury selection mechanism: Fetch top 10 leaderboard users, randomly select 5 for invitation
- Each jury member receives notification with `juryLink` for direct dispute access
- Notifications stored in Firestore with timestamps for persistence

**Key Files:**
- `server/index.js` - `/api/disputes` endpoint (line ~1400) creates disputes with jury notifications
- `app.html` - Jury dispute interface updated with $PRED balance validation
- Firestore collections: `artifacts/predora-app/public/data/notifications` for alert storage

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

## 🐛 Critical Bugs & Security Issues (November 23, 2025)

### CRITICAL - Must Fix Before Production

#### 1. **Contract Deployment Missing** ❌
- **Issue:** PredictionMarketV2 contract not deployed on BSC Testnet. Address in `server/index.js` line 1331 is incorrect.
- **Impact:** PRED balance resets to 100 on every login; 24-hour faucet cooldown doesn't enforce; all on-chain transactions fail silently.
- **Status:** CREATE deployment script ready (`server/quick-deploy.js`) - needs `viaIR: true` compiler flag
- **Fix Required:** Deploy contract via Remix IDE or enable `viaIR` flag in `server/quick-deploy.js` and run

#### 2. **Private Key Exposure Points** 🔑
**Code locations that hold private keys:**
- `server/custodial-wallet-service.js` line 4: `WALLET_ENCRYPTION_KEY` (must be 32+ chars)
- `server/custodial-wallet-service.js` line 129: `DEPLOYER_PRIVATE_KEY` used for gas-sponsored transactions
- `server/index.js` line 910, 920: `DEPLOYER_PRIVATE_KEY` for faucet claims
- `server/index.js` line 1331: Contract address reference (currently wrong/not deployed)
- `server/deploy-contract.js` line 5: `DEPLOYER_PRIVATE_KEY` for contract deployment

**REQUIRED SECRETS (set in Replit):**
```
WALLET_ENCRYPTION_KEY = <secure_32+_char_key>  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DEPLOYER_PRIVATE_KEY = <bsc_testnet_account>   # Private key of account with ~0.3+ BNB for gas
GOOGLE_APPLICATION_CREDENTIALS = <firebase_json> # For Firestore access
```

**⚠️ Security:** Never log these keys. Currently console.log statements are safe but logs should never be exposed publicly.

#### 3. **PRED Balance Reset on Login** 🔄
- **Root Cause:** Contract not deployed, so real on-chain balance can't be fetched. Frontend/backend falls back to mock 100 PRED.
- **Affected Files:** `server/index.js` line 956-962 (faucet balance update), `app.html` balance initialization
- **Fix:** Deploy contract first, then update address in `server/index.js` line 1331

#### 4. **Faucet 24-Hour Cooldown Not Enforcing** ⏰
- **Root Cause:** Smart contract checks `canClaimFaucet()` (line 923) but contract doesn't exist on-chain.
- **Current Behavior:** Users can claim unlimited times despite cooldown check in code.
- **Status:** Code is correct; contract deployment will fix this automatically
- **Affected:** `server/index.js` lines 839-990 (`/api/faucet/claim-pred` endpoint)

#### 5. **Smart Contract Critical Vulnerabilities** (in contracts/contracts/PredictionMarketV2.sol)
- **Unbounded Loops (Gas Limit Attack):** `_distributeWinnings()`, `claimWinnings()`, `cancelMarket()` iterate through ALL bets without limit → Can fail on high-volume markets
- **Missing Minimum Bet Validation:** No check for dust bets → Could cause payout calculation issues
- **Dispute Mechanism Broken:** Stakes accepted but never refunded/tracked → Funds locked in contract
- **Reentrancy Risk:** Fee transfers occur before payout (LINE 347-354) → Vulnerable to reentrancy if fee recipient is malicious contract
- **Fix Required:** Add pagination to payout loops, validate minimum bet (1 wei minimum), track dispute stakes, use checks-effects-interactions pattern

#### 6. **Admin Authentication Gaps** 🔐
- **Issue:** Some endpoints check `ADMIN_SECRET` (e.g., `/api/admin/verify` at line 2685) but not all admin operations require it
- **Risk:** Anyone knowing marketId could potentially trigger admin functions
- **Affected Endpoints:** 
  - `/api/admin/override-market` (line 2611) - Has `requireAdmin` middleware ✅
  - `/api/admin/stats` (line 2650) - Has `requireAdmin` middleware ✅
  - Market resolution endpoints need UID verification (mostly done)

#### 7. **Firebase Credentials Exposure Risk** 🔐
- **Issue:** `GOOGLE_APPLICATION_CREDENTIALS` is stored as environment variable
- **File:** `server/index.js` lines 72-82 writes credentials to `/tmp/firebase-service-account.json`
- **Risk:** Temp file accessible if someone compromises server
- **Note:** Current approach is acceptable for Replit; use `admin.credential.cert()` directly if possible

### HIGH PRIORITY

#### 8. **Inconsistent On-Chain vs Off-Chain Logic** 💾
- **Issue:** Bets stored in Firestore (off-chain) but contract expects on-chain storage
- **Locations:** 
  - `server/index.js` line 1312-1390: Bet placement checks balances in Firestore, not contract
  - Market resolution: Uses Swarm Oracle output, not on-chain voting
  - Payouts: Simulated in Firestore, not sent from contract
- **Fix:** Complete on-chain integration for all bet/payout operations or document off-chain design clearly

#### 9. **Missing Input Validation**
- **Bet Amount:** No minimum bet check in `app.html` betting UI
- **Market Title:** No length/character restrictions
- **Outcome:** No validation that outcome is boolean for binary markets
- **Recommendation:** Add frontend validation + backend validation for security

#### 10. **Auto-Payout Job Requires Configuration**
- **File:** `server/auto-payout-job.js` line 33
- **Status:** Disabled - requires DEPLOYER_PRIVATE_KEY to function
- **Fix:** Once contract deployed, enable with: `new AutoPayoutJob(db, DEPLOYER_PRIVATE_KEY).start()`

### MEDIUM PRIORITY

#### 11. **Logging Sensitive Data** 📝
- **Safe:** Console logs of wallet addresses, transaction hashes, PRED amounts (public data)
- **Careful:** Ensure error logs don't expose full error traces to clients

#### 12. **Hardhat Compilation Failed** 
- **Issue:** `server/quick-deploy.js` needs `viaIR: true` flag (currently disabled)
- **File:** `server/quick-deploy.js` line 23
- **Fix:** Enable `viaIR: true` in compiler settings
- **Workaround:** Use Remix IDE to deploy instead

---

## ✅ What Works Correctly

✅ Custodial wallets encrypted with WALLET_ENCRYPTION_KEY  
✅ Firebase UID-based authorization (wallet access denied if UID mismatch)  
✅ Admin endpoints protected with requireAdmin middleware  
✅ Withdrawal logging for audit trail  
✅ Email OTP authentication secure  
✅ AI Guardrails (duplicate detection, quality checks, sybil detection)  

---

## 🐛 Known Issues & TODOs (LEGACY)

1. ✅ **RESOLVED:** Mock BUSD Replaced - Now uses $PRED token ($600 per token valuation)
2. ✅ **RESOLVED:** Notification System - Jury alerts with direct links implemented
3. **Contract Not Deployed** ❌ - See "CRITICAL - Must Fix Before Production" above
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
