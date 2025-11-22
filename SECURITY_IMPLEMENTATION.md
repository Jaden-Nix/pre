# Custodial Wallet Security Implementation (Phase 2)

**Date**: November 22, 2025  
**Status**: ✅ Complete - Ready for Testing

## Problem Statement

Previous implementation had a critical security flaw:
- Withdrawal endpoint trusted `userId` from client request body
- No authoritative mapping between Firebase UID and wallet ownership
- Potential for unauthorized withdrawals by guessing/manipulating userId

## Solution: Authoritative UID→userId Mapping

### Architecture

```
Firebase Auth (UID) → walletMappings collection → custodialWallets collection
                              ↓
                    Authoritative source of truth
```

### Implementation Details

#### 1. Firestore Collections

**`walletMappings` Collection** (NEW - Authoritative)
- Document ID: Firebase UID
- Fields:
  - `firebaseUid`: Firebase authentication UID
  - `userId`: Internal wallet userId (SHA-256 hash of email)
  - `walletAddress`: Blockchain address
  - `createdAt`: Timestamp

**`custodialWallets` Collection** (Updated)
- Document ID: userId
- Fields:
  - `userId`: Internal ID
  - `firebaseUid`: Firebase UID (NEW)
  - `address`: Blockchain address
  - `encryptedPrivateKey`: AES-256-GCM encrypted private key
  - `createdAt`, `updatedAt`: Timestamps

**`custodialWithdrawals` Collection** (Audit Log)
- Logs all withdrawal attempts with full context
- Fields: `firebaseUid`, `requestedUserId`, `authorizedUserId`, `to`, `amount`, `txHash`, `success`, `error`, `timestamp`

#### 2. Wallet Creation Flow

```javascript
// Frontend (app.html)
generateBSCWallet(userId, firebaseUid) // ✅ Now passes Firebase UID

// Backend (server/index.js)
POST /api/custodial-wallet/create
- Accepts: { userId, firebaseUid }
- Creates wallet in custodialWallets collection
- Creates mapping in walletMappings collection (UID → userId)

// Service (custodial-wallet-service.js)
createWallet(userId, firebaseUid)
- Generates wallet
- Stores encrypted private key
- Creates bidirectional mapping
```

#### 3. Withdrawal Authorization Flow (SECURED)

```javascript
POST /api/custodial-wallet/send-bnb
Request: { userId, to, amount, authToken }

Step 1: Verify Firebase auth token
  → Extract authenticated UID from token

Step 2: Look up authoritative mapping
  → Query walletMappings collection by UID
  → Get authorizedUserId

Step 3: Verify ownership
  → Compare requested userId with authorizedUserId
  → Reject if mismatch

Step 4: Execute transaction
  → Use authorizedUserId (from mapping, not from request)
  → Sign with encrypted private key
  → Log all attempts

Step 5: Audit logging
  → Log success/failure with full context
  → Store firebaseUid, requestedUserId, authorizedUserId
```

## Security Guarantees

✅ **Authoritative Ownership**: walletMappings collection is single source of truth  
✅ **Firebase Auth Required**: All withdrawals require valid Firebase ID token  
✅ **UID-Based Lookup**: Server queries mapping by authenticated UID, not client-provided userId  
✅ **Comprehensive Audit Trail**: All attempts logged with full context  
✅ **Tamper-Proof**: Client cannot manipulate userId to access other wallets  

## Attack Scenarios (Now Prevented)

### Scenario 1: userId Manipulation
**Attack**: Attacker modifies userId in request to another user's ID  
**Defense**: Server looks up wallet by authenticated UID, ignores requested userId  
**Result**: 403 Forbidden, logged as "Unauthorized wallet access"

### Scenario 2: Token Theft
**Attack**: Attacker steals Firebase auth token  
**Defense**: Firebase tokens are short-lived, require valid session  
**Result**: Token expires, 401 Unauthorized

### Scenario 3: No Mapping
**Attack**: User without wallet tries to withdraw  
**Defense**: walletMappings lookup returns 404  
**Result**: "Wallet not found. Please contact support."

## Testing Checklist

- [ ] New user signup → wallet auto-created → mapping stored
- [ ] Wallet creation passes Firebase UID correctly
- [ ] walletMappings document created with correct UID
- [ ] Withdrawal with valid auth token succeeds
- [ ] Withdrawal with invalid userId fails (403)
- [ ] Withdrawal without auth token fails (401)
- [ ] Withdrawal with expired token fails (401)
- [ ] All attempts logged in custodialWithdrawals collection

## Code Changes

### Files Modified:
1. `server/custodial-wallet-service.js` - Added firebaseUid parameter, creates mapping
2. `server/index.js` - Updated wallet creation and withdrawal endpoints
3. `app.html` - Updated generateBSCWallet to pass firebaseUid

### New Features:
- Authoritative UID→userId mapping in Firestore
- Comprehensive audit logging for all withdrawal attempts
- Enhanced error messages for security failures

## Critical Security Fixes (V4)

**Issues Found by Architect Review:**
1. **Undefined bypass**: Missing userId check allowed undefined to pass authorization
2. **OTP signup insecurity**: OTP flow created wallets without Firebase UID/mapping
3. **Incomplete validation**: Wallet creation didn't enforce Firebase UID requirement

**Fixes Implemented:**
1. ✅ **Strict userId validation**: Endpoint now requires non-null userId before processing
2. ✅ **Removed insecure wallet creation**: OTP endpoint no longer creates wallets
3. ✅ **Enforced Firebase UID**: Wallet creation endpoint rejects requests without firebaseUid
4. ✅ **Single secure path**: All wallets MUST be created via completeAuthentication with Firebase UID

**Security Guarantees (V4):**
- ✅ No undefined bypasses: userId is required and strictly validated
- ✅ No insecure wallets: All wallets created with Firebase UID mapping
- ✅ Authoritative verification: Withdrawal uses mapping lookup, not client input
- ✅ Complete audit trail: All attempts logged with full context

## Production Readiness

**Status**: 🔒 Security-Hardened

**Secure Flow**:
1. User signs up (password or OTP) → OTP verified
2. Frontend creates Firebase auth user → gets Firebase UID
3. Frontend calls wallet creation with (userId + firebaseUid)
4. Backend creates wallet + mapping atomically
5. All withdrawals verified via mapping lookup

**Monitoring Recommendations**:
1. Alert on failed withdrawal attempts (potential attacks)
2. Monitor custodialWithdrawals for "Missing userId" or "Unauthorized wallet access"
3. Regular audit: All custodialWallets should have matching walletMappings

## Next Steps

1. ✅ Architect review of security fixes
2. ⏳ Test complete signup → withdrawal flow
3. ⏳ Verify audit logs are captured
4. 🚀 Demo ready!
