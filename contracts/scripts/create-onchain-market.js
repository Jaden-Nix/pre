const hre = require("hardhat");

/**
 * Script to create an on-chain market on BSC Testnet
 * Usage: npx hardhat run scripts/create-onchain-market.js --network bscTestnet
 */

async function main() {
  console.log("🚀 Creating on-chain market on BSC Testnet...");

  // Contract address (update if you redeploy)
  const CONTRACT_ADDRESS = "0xdaAf91610e33355c9Cd9258219C6A4822E693f55";

  // Market details - CUSTOMIZE THESE
  const marketTitle = "Will BTC break $100k in December 2025?";
  const marketDescription = "Resolves YES if Bitcoin (BTC) reaches or exceeds $100,000 USD on any exchange by Dec 31, 2025, 11:59 PM UTC. Source: CoinGecko/CoinMarketCap.";
  
  // Resolution time (Unix timestamp) - Dec 31, 2025, 11:59 PM UTC
  const resolutionTime = Math.floor(new Date("2025-12-31T23:59:59Z").getTime() / 1000);

  console.log("\n📝 Market Details:");
  console.log("Title:", marketTitle);
  console.log("Description:", marketDescription);
  console.log("Resolution Time:", new Date(resolutionTime * 1000).toISOString());

  // Get the deployed contract
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const contract = PredictionMarket.attach(CONTRACT_ADDRESS);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("\n👤 Creating market with address:", signer.address);

  // Check signer balance
  const balance = await signer.getBalance();
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "BNB");

  if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
    console.error("❌ Insufficient BNB! Get testnet BNB from https://testnet.bnbchain.org/faucet-smart");
    return;
  }

  // Create market
  console.log("\n📤 Sending transaction...");
  const tx = await contract.createMarket(
    marketTitle,
    marketDescription,
    resolutionTime,
    {
      gasLimit: 500000 // Set explicit gas limit
    }
  );

  console.log("Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await tx.wait();

  console.log("✅ Transaction confirmed!");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Extract market ID from event
  const event = receipt.events.find(e => e.event === 'MarketCreated');
  const marketId = event.args.marketId.toString();

  console.log("\n🎉 Market created successfully!");
  console.log("Market ID:", marketId);
  console.log("\n📋 Next Steps:");
  console.log("1. Add this to your Firestore market:");
  console.log("   onChainMarketId:", marketId);
  console.log("   onChainTxHash:", tx.hash);
  console.log("\n2. View on BSCScan:");
  console.log("   https://testnet.bscscan.com/tx/" + tx.hash);
  console.log("\n3. Users can now place REAL bets with BNB on this market!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
