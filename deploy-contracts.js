import { ethers } from 'ethers';
import fs from 'fs';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

if (!DEPLOYER_PRIVATE_KEY) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

async function deployPredToken() {
    console.log('🚀 Deploying PredToken to BSC Testnet...');
    console.log(`📝 Deployer: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB\n`);
    
    if (parseFloat(ethers.formatEther(balance)) < 0.1) {
        console.error('❌ Insufficient BNB balance. Need at least 0.1 BNB for gas.');
        console.log('Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart');
        process.exit(1);
    }
    
    // Read compiled artifact
    const artifact = JSON.parse(fs.readFileSync('contracts/artifacts/contracts/PredToken.sol/PredToken.json', 'utf8'));
    
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log('📤 Deploying PredToken...');
    const contract = await factory.deploy();
    
    console.log(`📝 Deployment tx: ${contract.deploymentTransaction().hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`✅ PredToken deployed to: ${address}`);
    console.log(`   Name: ${await contract.name()}`);
    console.log(`   Symbol: ${await contract.symbol()}`);
    console.log(`   Total Supply: ${ethers.formatEther(await contract.totalSupply())} PRED\n`);
    
    return address;
}

async function deployPredictionMarket(predTokenAddress) {
    console.log('🚀 Deploying PredictionMarketV2 to BSC Testnet...');
    console.log(`📝 PRED Token: ${predTokenAddress}\n`);
    
    // Read compiled artifact
    const artifact = JSON.parse(fs.readFileSync('contracts/artifacts/contracts/PredictionMarketV2.sol/PredictionMarketV2.json', 'utf8'));
    
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log('📤 Deploying PredictionMarketV2...');
    const contract = await factory.deploy(predTokenAddress);
    
    console.log(`📝 Deployment tx: ${contract.deploymentTransaction().hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`✅ PredictionMarketV2 deployed to: ${address}\n`);
    
    return address;
}

async function main() {
    try {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  PREDORA SMART CONTRACT DEPLOYMENT - BSC TESTNET');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        const predTokenAddress = await deployPredToken();
        const marketAddress = await deployPredictionMarket(predTokenAddress);
        
        // Save deployment info
        const deploymentInfo = {
            network: 'BSC Testnet',
            chainId: 97,
            deployer: wallet.address,
            deployedAt: new Date().toISOString(),
            contracts: {
                PredToken: predTokenAddress,
                PredictionMarketV2: marketAddress
            }
        };
        
        fs.writeFileSync('deployment-addresses.json', JSON.stringify(deploymentInfo, null, 2));
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  DEPLOYMENT COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log(`PredToken Address:          ${predTokenAddress}`);
        console.log(`PredictionMarketV2 Address: ${marketAddress}\n`);
        console.log('📝 Deployment info saved to deployment-addresses.json');
        console.log('\n📌 NEXT STEPS:');
        console.log(`   1. Update server/index.js line 1331-1332 with these addresses`);
        console.log(`   2. Restart the backend server`);
        console.log(`   3. Test betting with real on-chain transactions\n`);
        
    } catch (error) {
        console.error('❌ Deployment error:', error.message);
        process.exit(1);
    }
}

main().then(() => process.exit(0));
