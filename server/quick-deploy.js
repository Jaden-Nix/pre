import solc from 'solc';
import fs from 'fs';
import { ethers } from 'ethers';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const PRED_TOKEN_ADDRESS = '0x45C229bF14A36aD14885148E62058C98284B2ae0';

if (!DEPLOYER_PRIVATE_KEY) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

async function compile() {
    console.log('📝 Compiling PredictionMarketV2...');
    
    const source = fs.readFileSync('../contracts/contracts/PredictionMarketV2.sol', 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'PredictionMarketV2.sol': {
                content: source
            }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };
    
    try {
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        
        if (output.errors && output.errors.some(e => e.severity === 'error')) {
            console.error('❌ Compilation errors:');
            output.errors.forEach(e => console.error(e.message));
            process.exit(1);
        }
        
        const contract = output.contracts['PredictionMarketV2.sol']['PredictionMarketV2'];
        return {
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object
        };
    } catch (error) {
        console.error('❌ Compilation failed:', error.message);
        process.exit(1);
    }
}

async function deploy() {
    try {
        console.log('🚀 Deploying PredictionMarketV2 to BSC Testnet...');
        console.log(`📝 Deployer: ${wallet.address}`);
        console.log(`🎫 PRED Token: ${PRED_TOKEN_ADDRESS}`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} BNB`);
        
        // Compile contract
        const { abi, bytecode } = await compile();
        console.log(`✅ Compiled successfully`);
        console.log(`📦 Bytecode length: ${bytecode.length} characters`);
        
        // Deploy
        const factory = new ethers.ContractFactory(abi, '0x' + bytecode, wallet);
        console.log('📤 Deploying contract...');
        const contract = await factory.deploy(PRED_TOKEN_ADDRESS, { 
            gasLimit: 3000000,
            gasPrice: ethers.utils.parseUnits('10', 'gwei')
        });
        
        console.log(`📝 Deployment tx: ${contract.deployTransaction.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await contract.deployTransaction.wait(1);
        console.log(`✅ Contract deployed successfully!`);
        console.log(`🎯 Contract Address: ${contract.address}`);
        console.log(`📌 Update server/index.js line ~1331 with: ${contract.address}`);
        
        return contract.address;
    } catch (error) {
        console.error('❌ Deployment error:', error.message);
        process.exit(1);
    }
}

deploy().then(() => process.exit(0));
