const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PredictionMarket to BSC Testnet...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "BNB");
  
  // Deploy contract
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const contract = await PredictionMarket.deploy();
  
  await contract.deployed();
  
  console.log("✅ PredictionMarket deployed to:", contract.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: "BSC Testnet",
    chainId: 97,
    contractAddress: contract.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: contract.deployTransaction.blockNumber,
    transactionHash: contract.deployTransaction.hash
  };
  
  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info saved to:", deploymentPath);
  
  // Save ABI
  const artifact = await hre.artifacts.readArtifact("PredictionMarket");
  const abiPath = path.join(__dirname, "../PredictionMarket-ABI.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("📝 ABI saved to:", abiPath);
  
  console.log("\n⏳ Waiting for block confirmations...");
  await contract.deployTransaction.wait(5);
  
  console.log("\n✅ Contract verified and ready!");
  console.log("\nNext steps:");
  console.log("1. Update app.html with contract address:", contract.address);
  console.log("2. Verify on BSCScan:");
  console.log(`   npx hardhat verify --network bscTestnet ${contract.address}`);
  console.log("3. Fund the contract with testnet BNB if needed");
  console.log("4. Test contract interaction from frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
