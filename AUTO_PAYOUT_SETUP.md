# Auto-Payout System Setup Guide

## Overview
The auto-payout system automatically distributes winnings to all winners 30 minutes after a market is resolved, preventing the need for manual payouts.

## Current Status
✅ Smart contract deployed with auto-payout functionality  
✅ Contract address: `0x7AB69aA7543e9ae43b5D01c5622868392252EAAd`  
✅ Backend auto-payout job implemented  
⚠️ Requires Firebase Admin SDK to be configured

## Setup Requirements

### 1. Firebase Admin SDK Configuration

The auto-payout job needs Firebase Admin SDK to:
- Query resolved markets from Firestore
- Update market status after payout
- Track payout transactions

**To enable the auto-payout job:**

1. Get your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. Add the service account JSON as a secret:
   - In Replit, go to Secrets (Tools → Secrets)
   - Add a new secret named `GOOGLE_APPLICATION_CREDENTIALS`
   - Paste the entire JSON content as the value

3. Restart the server:
   - The auto-payout job will automatically start
   - You'll see: "✅ Auto-payout job started (checks every 5 minutes)"

### 2. Verify Setup

Once Firebase is configured, check the server logs for:
```
✅ Firebase Admin SDK initialized successfully.
✅ Auto-payout job initialized with wallet: 0xe47Dce1b7e31333329734E24089C0472c030d95B
✅ Auto-payout job started (checks every 5 minutes)
```

## How It Works

1. **Market Resolution**: When a market is resolved on-chain, it enters a 30-minute dispute window
2. **Auto-Detection**: The backend job checks every 5 minutes for resolved markets
3. **Automatic Payout**: After 30 minutes, the job calls `autoFinalizeAndPayout()` on the smart contract
4. **Distribution**: The contract:
   - Transfers platform fee to the platform recipient
   - Distributes winnings proportionally to all winners
   - Prevents duplicate payouts using `hasReceivedPayout` mapping
   - Updates market status to FINALIZED

## Manual Alternative

If you prefer to trigger payouts manually instead of using the automated system, you can:
- Call `autoFinalizeAndPayout(marketId)` directly from the admin interface
- Ensure 30 minutes have passed since market resolution

## Troubleshooting

**Job not starting?**
- Check that `GOOGLE_APPLICATION_CREDENTIALS` secret is set
- Verify `DEPLOY_PRIVATE_KEY` secret is set
- Check server logs for error messages

**Job running but not processing markets?**
- Verify markets exist in Firestore with `status: 'RESOLVED'`
- Check that markets have `onChainId` field
- Ensure 30 minutes have passed since `resolutionSubmittedAt`

## Network Configuration

- **Network**: BSC Testnet (Chain ID: 97)
- **RPC**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Contract**: 0x7AB69aA7543e9ae43b5D01c5622868392252EAAd
- **Native Token**: BNB (testnet)

Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart
