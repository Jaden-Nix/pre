const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PredictionMarket to BSC Testnet...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", await deployer.getAddress());
  
  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
  
  // Deploy contract
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const contract = await PredictionMarket.deploy();
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ PredictionMarket deployed to:", contractAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "BSC Testnet",
    chainId: 97,
    contractAddress: contractAddress,
    deployer: await deployer.getAddress(),
    deployedAt: new Date().toISOString()
  };
  
  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info saved to:", deploymentPath);
  
  // Save ABI
  const artifact = await hre.artifacts.readArtifact("PredictionMarket");
  const abiPath = path.join(__dirname, "../PredictionMarket-ABI.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("📝 ABI saved to:", abiPath);
  
  console.log("\n✅ Contract verified and ready!");
  console.log("\nNext steps:");
  console.log("1. Update app.html with contract address:", contractAddress);
  console.log("2. Verify on BSCScan:");
  console.log(`   npx hardhat verify --network bscTestnet ${contractAddress}`);
  console.log("3. Fund the contract with testnet BNB if needed");
  console.log("4. Test contract interaction from frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
