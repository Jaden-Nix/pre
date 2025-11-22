const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying PredToken to BSC Testnet...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", await deployer.getAddress());
    
    const balance = await hre.ethers.provider.getBalance(deployer);
    console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
    
    // Deploy PredToken
    const PredToken = await hre.ethers.getContractFactory("PredToken");
    const predToken = await PredToken.deploy();
    await predToken.waitForDeployment();
    
    const tokenAddress = await predToken.getAddress();
    console.log("✅ PredToken deployed to:", tokenAddress);
    console.log("   Name:", await predToken.name());
    console.log("   Symbol:", await predToken.symbol());
    console.log("   Total Supply:", hre.ethers.formatEther(await predToken.totalSupply()), "PRED");
    console.log("   Faucet Amount:", hre.ethers.formatEther(await predToken.faucetAmount()), "PRED");
    
    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        predToken: {
            address: tokenAddress,
            deployer: await deployer.getAddress(),
            deployedAt: new Date().toISOString(),
            network: "BSC Testnet",
            chainId: 97
        }
    };
    
    fs.writeFileSync(
        'pred-token-deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📝 Deployment info saved to pred-token-deployment.json");
    console.log("\n🎉 Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
