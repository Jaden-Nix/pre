# Predora Smart Contract Deployment Guide

## Contract Information

**Contract:** PredictionMarket.sol
**Network:** BSC Testnet
**Chain ID:** 97

## Prerequisites

1. Install dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
```

2. Get BSC Testnet BNB from faucet:
- https://testnet.bnbchain.org/faucet-smart

## Deployment Steps

### 1. Initialize Hardhat (if not already done)

```bash
npx hardhat init
```

Select "Create a JavaScript project"

### 2. Update hardhat.config.js

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY] // Add your private key to .env
    }
  }
};
```

### 3. Create Deployment Script

Create `scripts/deploy.js`:

```javascript
async function main() {
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const contract = await PredictionMarket.deploy();
  
  await contract.deployed();
  
  console.log("PredictionMarket deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. Deploy

```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

### 5. Verify Contract on BSCScan

```bash
npx hardhat verify --network bscTestnet DEPLOYED_CONTRACT_ADDRESS
```

## Contract Interaction

### Frontend Integration

Add the contract address and ABI to your app.html:

```javascript
const CONTRACT_ADDRESS = "0x..."; // Your deployed contract address
const CONTRACT_ABI = [...]; // Generated ABI from compilation
```

### Example Usage

```javascript
// Connect to contract
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

// Create a market
const tx = await contract.createMarket(
  "Will BTC reach $100k by end of 2025?",
  "Bitcoin price prediction",
  Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year from now
);
await tx.wait();

// Place a bet
const betTx = await contract.placeBet(1, true, { value: ethers.utils.parseEther("0.1") });
await betTx.wait();

// Get market info
const market = await contract.getMarket(1);
console.log(market);
```

## Environment Variables

Create `.env` file:

```
PRIVATE_KEY=your_wallet_private_key_here
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

## Testing

Create tests in `test/PredictionMarket.test.js`:

```javascript
const { expect } = require("chai");

describe("PredictionMarket", function () {
  it("Should create a market", async function () {
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const contract = await PredictionMarket.deploy();
    await contract.deployed();
    
    const futureTime = Math.floor(Date.now() / 1000) + 3600;
    await contract.createMarket("Test Market", "Description", futureTime);
    
    const market = await contract.getMarket(1);
    expect(market.title).to.equal("Test Market");
  });
});
```

Run tests:
```bash
npx hardhat test
```

## Important Notes

1. **NEVER** commit your private key to Git
2. Always test on testnet first
3. Use a separate wallet for deployment (not your main wallet)
4. The contract includes a 1% platform fee (adjustable)
5. Markets must be manually resolved by admin
6. Users can dispute market outcomes with a 0.01 BNB stake

## Contract Features

- ✅ Create prediction markets
- ✅ Place bets with testnet BNB
- ✅ Automated odds calculation
- ✅ Winner payouts with fee distribution
- ✅ Market dispute mechanism
- ✅ Admin controls
- ✅ Refund system for cancelled markets

## Next Steps

1. Deploy contract to BSC Testnet
2. Update frontend with contract address
3. Implement ethers.js integration in app.html
4. Test end-to-end flow
5. Add contract interaction UI
