const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying PredToken to BSC Testnet...");

  // Initial supply: 1,000,000 PRED tokens
  const initialSupply = 1_000_000;

  const PredToken = await hre.ethers.getContractFactory("PredToken");
  const predToken = await PredToken.deploy(initialSupply);

  await predToken.deployed();

  console.log("✅ PredToken deployed to:", predToken.address);
  console.log(`   Initial Supply: ${initialSupply.toLocaleString()} PRED`);
  console.log(`   Decimals: 18`);
  console.log(`   Owner: ${(await hre.ethers.getSigners())[0].address}`);

  // Save deployment info
  const deploymentInfo = {
    contractName: "PredToken",
    contractAddress: predToken.address,
    network: "BSC Testnet",
    chainId: 97,
    deployedAt: new Date().toISOString(),
    initialSupply: initialSupply,
    decimals: 18,
    symbol: "PRED",
    deployer: (await hre.ethers.getSigners())[0].address,
    blockNumber: predToken.deployTransaction.blockNumber,
    transactionHash: predToken.deployTransaction.hash,
    bscscanUrl: `https://testnet.bscscan.com/address/${predToken.address}`
  };

  fs.writeFileSync(
    "./pred-token-deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📝 Deployment info saved to pred-token-deployment.json");
  console.log(`\n🔍 View on BSCScan: ${deploymentInfo.bscscanUrl}`);
  
  // Export ABI
  const artifact = await hre.artifacts.readArtifact("PredToken");
  fs.writeFileSync("./PredToken-ABI.json", JSON.stringify(artifact.abi, null, 2));
  console.log("📄 ABI saved to PredToken-ABI.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
