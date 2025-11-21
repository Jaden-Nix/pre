# Custodial Wallet & Account Abstraction Integration Guide

## 🎉 What's Been Implemented

### Backend Services (✅ Complete)

1. **Custodial Wallet Service** (`server/custodial-wallet-service.js`)
   - Auto-generates encrypted wallets on user signup
   - AES-256-GCM encryption for private keys
   - Stores in Firebase Firestore (never exposed to client)
   - BSC Testnet provider configured

2. **Biconomy Account Abstraction Service** (`server/biconomy-aa-service.js`)
   - ERC-4337 compliant UserOperations
   - Sponsored gasless transactions via Biconomy Paymaster
   - BSC Testnet (Chain ID: 97)
   - Smart Account creation and management

### API Endpoints (✅ Live)

#### User Signup & Wallet Creation
- **POST** `/api/send-otp` - Send email verification code
- **POST** `/api/verify-otp` - Verify code & **auto-create custodial wallet**

#### Custodial Wallet Management
- **POST** `/api/custodial-wallet/create` - Manually create wallet
  ```json
  { "userId": "abc123" }
  ```
  
- **POST** `/api/custodial-wallet/info` - Get wallet address
  ```json
  { "userId": "abc123" }
  ```
  Response:
  ```json
  {
    "success": true,
    "address": "0x...",
    "createdAt": "2024-11-21T..."
  }
  ```

- **POST** `/api/custodial-wallet/balance` - Get BNB balance
  ```json
  { "userId": "abc123" }
  ```
  Response:
  ```json
  {
    "success": true,
    "address": "0x...",
    "balance": "0.5",
    "balanceWei": "500000000000000000"
  }
  ```

#### Account Abstraction (Gasless Transactions)
- **POST** `/api/aa/place-bet` - Place bet with gasless AA
  ```json
  {
    "userId": "abc123",
    "marketId": "1",
    "pick": true,
    "amount": "0.01"
  }
  ```
  Response:
  ```json
  {
    "success": true,
    "txHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "150000",
    "sponsored": true
  }
  ```

- **POST** `/api/aa/smart-account-address` - Get user's smart account address
  ```json
  { "userId": "abc123" }
  ```
  Response:
  ```json
  {
    "success": true,
    "address": "0x..."
  }
  ```

---

## 🔧 Frontend Integration TODO

### 1. Update Login Flow in `app.html`

After successful OTP verification, fetch the custodial wallet info:

```javascript
// After /api/verify-otp success
const verifyResponse = await fetch('/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
});

const { success, userId, email } = await verifyResponse.json();

if (success) {
    // Store user session
    localStorage.setItem('userId', userId);
    localStorage.setItem('userEmail', email);
    
    // Fetch custodial wallet info
    const walletResponse = await fetch('/api/custodial-wallet/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    
    const walletInfo = await walletResponse.json();
    
    if (walletInfo.success) {
        // Store wallet address
        localStorage.setItem('custodialWalletAddress', walletInfo.address);
        
        // Show user they have a custodial wallet
        console.log('Custodial wallet:', walletInfo.address);
        
        // Update UI to show wallet connected
        updateWalletUI(walletInfo.address);
    }
}
```

### 2. Add Wallet Type Selection

Give users choice between:
- **Custodial Wallet** (gasless, auto-created)
- **External Wallet** (MetaMask/WalletConnect, user pays gas)

```javascript
// Add to UI
<div class="wallet-type-selector">
  <button onclick="useCustodialWallet()">
    Use Custodial Wallet (Gasless)
  </button>
  <button onclick="connectExternalWallet()">
    Connect MetaMask/WalletConnect
  </button>
</div>

function useCustodialWallet() {
    const userId = localStorage.getItem('userId');
    const address = localStorage.getItem('custodialWalletAddress');
    
    // Set active wallet mode
    localStorage.setItem('walletMode', 'custodial');
    localStorage.setItem('activeWalletAddress', address);
    
    // Update UI
    showWalletConnected(address, 'custodial');
}

function connectExternalWallet() {
    // Existing WalletConnect/MetaMask logic
    localStorage.setItem('walletMode', 'external');
    // ... existing connect logic
}
```

### 3. Update Betting Function

Detect wallet mode and route to appropriate endpoint:

```javascript
async function placeBet(marketId, pick, amount) {
    const walletMode = localStorage.getItem('walletMode');
    
    if (walletMode === 'custodial') {
        // Use gasless AA endpoint
        return await placeCustodialBet(marketId, pick, amount);
    } else {
        // Use existing direct smart contract call
        return await placeExternalWalletBet(marketId, pick, amount);
    }
}

async function placeCustodialBet(marketId, pick, amount) {
    const userId = localStorage.getItem('userId');
    
    const response = await fetch('/api/aa/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            marketId,
            pick,
            amount: amount.toString() // e.g., "0.01"
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        console.log('Gasless bet placed!', result.txHash);
        // Update UI, show success
        return result;
    } else {
        console.error('Bet failed:', result.error);
        throw new Error(result.error);
    }
}

async function placeExternalWalletBet(marketId, pick, amount) {
    // Existing logic using ethers.js + MetaMask
    // ... (keep current implementation)
}
```

### 4. Display Balance

Show custodial wallet balance in UI:

```javascript
async function updateCustodialBalance() {
    const userId = localStorage.getItem('userId');
    
    const response = await fetch('/api/custodial-wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    
    const { success, balance, address } = await response.json();
    
    if (success) {
        // Update UI
        document.getElementById('walletBalance').textContent = 
            `${parseFloat(balance).toFixed(4)} BNB`;
    }
}

// Call on page load and after each transaction
setInterval(updateCustodialBalance, 10000); // Update every 10s
```

### 5. Add Funding Instructions

Since custodial wallets need BNB for betting:

```javascript
function showFundingInstructions() {
    const address = localStorage.getItem('custodialWalletAddress');
    
    // Show modal/alert
    alert(`
        To place bets, send testnet BNB to your custodial wallet:
        
        Address: ${address}
        
        Get free testnet BNB from:
        https://testnet.bnbchain.org/faucet-smart
        
        Note: Transactions are gasless! You only need BNB for betting amounts.
    `);
}
```

---

## 🔐 Security Notes

1. **Private keys NEVER exposed to client**
   - Keys stored encrypted in Firebase
   - Only decrypted in-memory on server for signing
   - Client only receives wallet addresses

2. **User Authentication Required**
   - All endpoints check userId
   - OTP verification before wallet creation
   - Session management via localStorage (consider upgrading to httpOnly cookies)

3. **Environment Variables**
   - `GOOGLE_APPLICATION_CREDENTIALS` - Firebase service account ✅
   - `BICONOMY_PAYMASTER_API_KEY` - For gasless transactions ✅
   - `WALLETCONNECT_PROJECT_ID` - For external wallets ✅
   - `WALLET_ENCRYPTION_KEY` - (Optional) Custom encryption key

---

## 📊 Database Schema

### Firebase Firestore Collections

**custodialWallets** (1 per user)
```javascript
{
  userId: "abc123",
  address: "0x...",
  encryptedPrivateKey: {
    iv: "...",
    encryptedData: "...",
    authTag: "..."
  },
  createdAt: "2024-11-21T...",
  updatedAt: "2024-11-21T..."
}
```

**custodialTransactions** (logged on each AA transaction)
```javascript
{
  userId: "abc123",
  type: "bet",
  marketId: "1",
  pick: true,
  amount: "0.01",
  txHash: "0x...",
  blockNumber: 12345,
  sponsored: true,
  createdAt: "2024-11-21T..."
}
```

---

## 🎯 Current Status

✅ Backend fully functional
✅ API endpoints tested
✅ Biconomy AA configured for BSC Testnet
✅ Auto-wallet creation on signup
✅ Gasless transactions ready

⏳ Frontend integration needed
⏳ User flow design (custodial vs external wallet choice)
⏳ Balance display
⏳ Funding instructions

---

## 🚀 Next Steps

1. **Integrate custodial wallet display** in app.html after login
2. **Add wallet mode toggle** (custodial vs external)
3. **Update placeBet function** to route based on wallet mode
4. **Test end-to-end flow**: signup → wallet created → fund wallet → place gasless bet
5. **Add balance refresh** on transaction completion
6. **Consider adding**: 
   - Wallet export (encrypted backup)
   - Transaction history view
   - Funding modal with QR code

---

## 🔗 Contract Details

**PredictionMarket.sol**
- Address: `0x7AB69aA7543e9ae43b5D01c5622868392252EAAd`
- Network: BSC Testnet (Chain ID: 97)
- Functions: `placeBet(uint256 marketId, bool pick) payable`

**Biconomy Configuration**
- Bundler: `https://bundler.biconomy.io/api/v2/97/...`
- Paymaster: Configured with API key
- EntryPoint: `DEFAULT_ENTRYPOINT_ADDRESS` (ERC-4337 standard)

---

## 💡 User Experience Flow

1. User signs up with email
2. OTP sent to email
3. User verifies OTP
4. **Custodial wallet auto-created** ✨
5. User sees: "Wallet created! Fund it to start betting"
6. User gets testnet BNB from faucet
7. User places bet → **Gasless transaction!** No MetaMask popup
8. Bet confirmed on-chain, balance updates

**Alternatively:**
1. User clicks "Connect External Wallet"
2. WalletConnect/MetaMask flow (existing)
3. User pays gas fees themselves
