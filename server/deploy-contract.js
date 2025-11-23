import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const PRED_TOKEN_ADDRESS = '0x45C229bF14A36aD14885148E62058C98284B2ae0';

if (!DEPLOYER_PRIVATE_KEY) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

// PredictionMarketV2 contract bytecode and ABI
const contractABI = [
    'constructor(address _predTokenAddress)',
    'function createMarket(string _title, string _description, uint256 _resolutionTime, uint256 _initialYesBnb, uint256 _initialNoBnb, uint256 _initialYesPred, uint256 _initialNoPred) external payable',
    'function placeBet(uint256 _marketId, bool _pick, uint8 _currency, uint256 _amount) external payable',
    'function placeBatchBets(uint256[] _marketIds, bool[] _picks, uint256[] _amounts, uint8[] _currencies) external payable',
    'function resolveMarket(uint256 _marketId, bool _outcome, string _evidenceHash) external',
    'function claimWinnings(uint256 _marketId) external nonReentrant'
];

const contractCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PredictionMarketV2 {
    enum Currency { BNB, PRED }
    
    struct Market {
        uint256 id;
        string title;
        string description;
        address creator;
        uint256 createdAt;
        uint256 resolutionTime;
        bool isResolved;
        bool outcome;
        uint256 yesPoolBnb;
        uint256 noPoolBnb;
        uint256 yesPoolPred;
        uint256 noPoolPred;
        uint256 totalVolumeBnb;
        uint256 totalVolumePred;
        MarketStatus status;
    }
    
    enum MarketStatus { ACTIVE, DISPUTED, RESOLVED, FINALIZED, CANCELLED }
    
    struct Bet {
        address user;
        uint256 marketId;
        uint256 amount;
        bool pick;
        Currency currency;
        uint256 timestamp;
        bool claimed;
    }
    
    IERC20 public predToken;
    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;
    mapping(address => uint256[]) public userBets;
    mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;
    
    address public admin;
    
    event MarketCreated(uint256 indexed marketId, string title, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint256 amount, bool pick, Currency currency);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    
    constructor(address _predTokenAddress) {
        admin = msg.sender;
        predToken = IERC20(_predTokenAddress);
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    function createMarket(
        string memory _title,
        string memory _description,
        uint256 _resolutionTime
    ) external payable returns (uint256) {
        uint256 marketId = marketCounter++;
        markets[marketId] = Market({
            id: marketId,
            title: _title,
            description: _description,
            creator: msg.sender,
            createdAt: block.timestamp,
            resolutionTime: _resolutionTime,
            isResolved: false,
            outcome: false,
            yesPoolBnb: msg.value,
            noPoolBnb: msg.value,
            yesPoolPred: 0,
            noPoolPred: 0,
            totalVolumeBnb: 0,
            totalVolumePred: 0,
            status: MarketStatus.ACTIVE
        });
        
        emit MarketCreated(marketId, _title, msg.sender);
        return marketId;
    }
    
    function placeBet(
        uint256 _marketId,
        bool _pick,
        uint8 _currency,
        uint256 _amount
    ) external payable {
        require(_marketId < marketCounter, "Invalid market");
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.ACTIVE, "Market not active");
        
        if (_currency == 0) {
            require(msg.value == _amount, "BNB amount mismatch");
            if (_pick) {
                market.yesPoolBnb += _amount;
            } else {
                market.noPoolBnb += _amount;
            }
            market.totalVolumeBnb += _amount;
        } else {
            require(predToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
            if (_pick) {
                market.yesPoolPred += _amount;
            } else {
                market.noPoolPred += _amount;
            }
            market.totalVolumePred += _amount;
        }
        
        marketBets[_marketId].push(Bet({
            user: msg.sender,
            marketId: _marketId,
            amount: _amount,
            pick: _pick,
            currency: Currency(_currency),
            timestamp: block.timestamp,
            claimed: false
        }));
        
        userBets[msg.sender].push(_marketId);
        emit BetPlaced(_marketId, msg.sender, _amount, _pick, Currency(_currency));
    }
    
    function placeBatchBets(
        uint256[] memory _marketIds,
        bool[] memory _picks,
        uint256[] memory _amounts,
        uint8[] memory _currencies
    ) external payable {
        require(_marketIds.length == _picks.length && _picks.length == _amounts.length && _amounts.length == _currencies.length, "Array length mismatch");
        
        uint256 totalBnb = 0;
        for (uint i = 0; i < _marketIds.length; i++) {
            if (_currencies[i] == 0) totalBnb += _amounts[i];
        }
        
        require(msg.value == totalBnb, "BNB amount mismatch");
        
        for (uint i = 0; i < _marketIds.length; i++) {
            placeBet(_marketIds[i], _picks[i], _currencies[i], _amounts[i]);
        }
    }
    
    function resolveMarket(uint256 _marketId, bool _outcome) external onlyAdmin {
        require(_marketId < marketCounter, "Invalid market");
        Market storage market = markets[_marketId];
        market.isResolved = true;
        market.outcome = _outcome;
        market.status = MarketStatus.RESOLVED;
        emit MarketResolved(_marketId, _outcome);
    }
    
    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }
}
`;

async function deploy() {
    try {
        console.log('🚀 Deploying PredictionMarketV2 to BSC Testnet...');
        console.log(`📝 Deployer: ${wallet.address}`);
        console.log(`🎫 PRED Token: ${PRED_TOKEN_ADDRESS}`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} BNB`);
        
        // Compile and deploy using ethers ContractFactory
        const Factory = ethers.ContractFactory;
        const bytecode = '0x60806040'; // Minimal bytecode - we'll use ethers to compile
        
        // Use ethers to create contract from ABI and deploy
        const Contract = new ethers.ContractFactory(
            [
                'constructor(address _predTokenAddress)',
                'function createMarket(string memory _title, string memory _description, uint256 _resolutionTime, uint256 _initialYesBnb, uint256 _initialNoBnb, uint256 _initialYesPred, uint256 _initialNoPred) external payable returns (uint256)',
                'function placeBet(uint256 _marketId, bool _pick, uint8 _currency, uint256 _amount) external payable',
                'function placeBatchBets(uint256[] memory _marketIds, bool[] memory _picks, uint256[] memory _amounts, uint8[] memory _currencies) external payable',
                'event MarketCreated(uint256 indexed marketId, string title, address indexed creator, uint256 initialYesBnb, uint256 initialNoBnb, uint256 initialYesPred, uint256 initialNoPred)',
                'event BetPlaced(uint256 indexed marketId, address indexed user, uint256 amount, bool pick, uint8 currency)'
            ],
            bytecode,
            wallet
        );
        
        // We can't compile from source in ethers directly, so let's use the precompiled bytecode
        // For now, log the deployment info we need
        console.log('⚠️  Note: Using hardhat-compiled bytecode');
        console.log('📦 To complete deployment, compile with hardhat:');
        console.log('   npx hardhat compile');
        console.log('   npx hardhat run scripts/deploy.js --network bsc-testnet');
        
        // Check if we have compiled artifacts
        const artifactPath = path.join(process.cwd(), 'artifacts/contracts/PredictionMarketV2.sol/PredictionMarketV2.json');
        if (fs.existsSync(artifactPath)) {
            console.log('✅ Found compiled artifact, deploying...');
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
            const contract = await factory.deploy(PRED_TOKEN_ADDRESS, { gasLimit: 3000000 });
            console.log(`📝 Deployment tx: ${contract.deployTransaction.hash}`);
            await contract.deployed();
            console.log(`✅ Contract deployed at: ${contract.address}`);
            return contract.address;
        } else {
            console.log('❌ No compiled artifact found');
            console.log('📌 Please compile contracts with hardhat first');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Deployment error:', error.message);
        process.exit(1);
    }
}

deploy().then(() => process.exit(0));
