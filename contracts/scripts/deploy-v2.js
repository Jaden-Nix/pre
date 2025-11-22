const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying PredictionMarketV2 with dual currency support...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", await deployer.getAddress());
    
    const balance = await hre.ethers.provider.getBalance(deployer);
    console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
    
    const predTokenAddress = "0x45C229bF14A36aD14885148E62058C98284B2ae0";
    console.log("Using PRED Token at:", predTokenAddress);
    
    const PredictionMarketV2 = await hre.ethers.getContractFactory("PredictionMarketV2");
    const market = await PredictionMarketV2.deploy(predTokenAddress);
    await market.waitForDeployment();
    
    const marketAddress = await market.getAddress();
    console.log("✅ PredictionMarketV2 deployed to:", marketAddress);
    
    const fs = require('fs');
    const deploymentInfo = {
        predictionMarketV2: {
            address: marketAddress,
            predToken: predTokenAddress,
            deployer: await deployer.getAddress(),
            deployedAt: new Date().toISOString(),
            network: "BSC Testnet",
            chainId: 97
        }
    };
    
    fs.writeFileSync(
        'v2-deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📝 Deployment info saved to v2-deployment.json");
    console.log("\n🎉 Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
