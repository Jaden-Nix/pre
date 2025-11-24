/**
 * Smart Contract Utilities for Predora
 * Handles interaction with PredictionMarket.sol on BSC Testnet
 */

const ethers = require('ethers');

// Contract ABI (will be auto-generated after deployment)
const PREDICTION_MARKET_ABI = [
    "function createMarket(string memory _title, string memory _description, uint256 _resolutionTime) external returns (uint256)",
    "function placeBet(uint256 _marketId, bool _pick) external payable",
    "function resolveMarket(uint256 _marketId, bool _outcome) external",
    "function claimWinnings(uint256 _betId) external",
    "function getMarket(uint256 _marketId) external view returns (tuple(uint256,string,string,address,uint256,uint256,bool,bool,uint256,uint256,uint256,uint8))",
    "function getUserBets(address _user) external view returns (uint256[])",
    "function marketBets(uint256 _marketId, uint256 _index) external view returns (tuple(address,uint256,uint256,bool,uint256,bool))"
];

// Configuration
const BSC_TESTNET_CONFIG = {
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    networkName: 'BSC Testnet',
    explorerUrl: 'https://testnet.bscscan.com'
};

class ContractManager {
    constructor(contractAddress) {
        this.contractAddress = contractAddress;
        this.provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_CONFIG.rpcUrl);
        this.contract = null;
        this.signer = null;
    }

    /**
     * Initialize contract with signer (from frontend wallet connection)
     */
    setSignerFromWeb3(web3Provider) {
        const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
        this.signer = ethersProvider.getSigner();
        this.contract = new ethers.Contract(this.contractAddress, PREDICTION_MARKET_ABI, this.signer);
        return this.signer;
    }

    /**
     * Create a new prediction market on-chain
     */
    async createMarket(title, description, resolutionTime) {
        if (!this.contract) throw new Error('Contract not initialized. Connect wallet first.');
        
        try {
            const tx = await this.contract.createMarket(title, description, resolutionTime);
            const receipt = await tx.wait(1);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                logs: receipt.logs
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Place a bet on a market (YES or NO)
     */
    async placeBet(marketId, pick, amountInBNB) {
        if (!this.contract) throw new Error('Contract not initialized. Connect wallet first.');
        
        try {
            const amountWei = ethers.utils.parseEther(amountInBNB.toString());
            const tx = await this.contract.placeBet(marketId, pick, { value: amountWei });
            const receipt = await tx.wait(1);
            
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: amountInBNB
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resolve a market (admin only)
     */
    async resolveMarket(marketId, outcome) {
        if (!this.contract) throw new Error('Contract not initialized. Connect wallet first.');
        
        try {
            const tx = await this.contract.resolveMarket(marketId, outcome);
            const receipt = await tx.wait(1);
            
            return {
                success: true,
                transactionHash: tx.hash,
                outcome: outcome ? 'YES' : 'NO'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Claim winnings from a resolved bet
     */
    async claimWinnings(betId) {
        if (!this.contract) throw new Error('Contract not initialized. Connect wallet first.');
        
        try {
            const tx = await this.contract.claimWinnings(betId);
            const receipt = await tx.wait(1);
            
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get market details from contract
     */
    async getMarket(marketId) {
        try {
            const market = await this.contract.getMarket(marketId);
            return {
                success: true,
                id: market[0].toNumber(),
                title: market[1],
                description: market[2],
                creator: market[3],
                createdAt: market[4].toNumber(),
                resolutionTime: market[5].toNumber(),
                isResolved: market[6],
                outcome: market[7],
                yesPool: ethers.utils.formatEther(market[8]),
                noPool: ethers.utils.formatEther(market[9]),
                totalVolume: ethers.utils.formatEther(market[10]),
                status: ['ACTIVE', 'DISPUTED', 'RESOLVED', 'CANCELLED'][market[11]]
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's bets
     */
    async getUserBets(userAddress) {
        try {
            const betIds = await this.contract.getUserBets(userAddress);
            return {
                success: true,
                bets: betIds.map(id => id.toNumber())
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate network is BSC Testnet
     */
    static async validateNetwork(web3Provider) {
        try {
            const network = await new ethers.providers.Web3Provider(web3Provider).getNetwork();
            if (network.chainId !== BSC_TESTNET_CONFIG.chainId) {
                return {
                    valid: false,
                    error: `Wrong network. Please switch to BSC Testnet (chainId: ${BSC_TESTNET_CONFIG.chainId})`,
                    currentChainId: network.chainId
                };
            }
            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Get explorer URL for transaction
     */
    static getTxExplorerUrl(txHash) {
        return `${BSC_TESTNET_CONFIG.explorerUrl}/tx/${txHash}`;
    }

    /**
     * Get explorer URL for address
     */
    static getAddressExplorerUrl(address) {
        return `${BSC_TESTNET_CONFIG.explorerUrl}/address/${address}`;
    }
}

module.exports = {
    ContractManager,
    BSC_TESTNET_CONFIG,
    PREDICTION_MARKET_ABI
};
