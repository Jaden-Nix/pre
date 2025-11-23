/**
 * Auto-Payout Job for Predora
 * Automatically calls autoFinalizeAndPayout() on resolved markets after 30-minute dispute window
 */

import { ethers } from 'ethers';
import admin from 'firebase-admin';

const CONTRACT_ADDRESS = '0xda27eAd38F3D4A656Cc64C2D70b6166A7061AD48';
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

const CONTRACT_ABI = [
    "function autoFinalizeAndPayout(uint256 _marketId) external",
    "function getMarket(uint256 _marketId) external view returns (tuple(uint256 id, string title, string description, address creator, uint256 createdAt, uint256 resolutionTime, bool isResolved, bool outcome, uint256 yesPool, uint256 noPool, uint256 totalVolume, uint8 status, uint256 resolutionSubmittedAt, bool autoPayoutTriggered))",
    "event AutoPayoutTriggered(uint256 indexed marketId)",
    "event MarketFinalized(uint256 indexed marketId)"
];

const DISPUTE_WINDOW_SECONDS = 30 * 60; // 30 minutes

export class AutoPayoutJob {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_RPC);
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
        this.wallet = null;
        this.contractWithSigner = null;
        this.db = null;
        this.isRunning = false;
        this.intervalId = null;
    }

    /**
     * Initialize the job with private key and Firestore
     */
    initialize(privateKey, firestoreDb) {
        if (!privateKey) {
            console.warn('⚠️  Auto-payout job: No private key provided, job will run in read-only mode');
            return false;
        }

        try {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contractWithSigner = this.contract.connect(this.wallet);
            this.db = firestoreDb;
            console.log('✅ Auto-payout job initialized with wallet:', this.wallet.address);
            return true;
        } catch (error) {
            console.error('❌ Auto-payout job initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Check and process eligible markets for auto-payout
     */
    async processMarkets() {
        if (!this.contractWithSigner || !this.db) {
            console.log('⏭️  Auto-payout job: Skipping (not fully initialized)');
            return;
        }

        try {
            const now = Math.floor(Date.now() / 1000);
            
            // Query Firestore for resolved markets that haven't been finalized
            const marketsSnapshot = await this.db.collection('standard_markets')
                .where('isResolved', '==', true)
                .where('status', '==', 'RESOLVED')
                .get();

            if (marketsSnapshot.empty) {
                console.log('✓ Auto-payout job: No markets pending finalization');
                return;
            }

            console.log(`🔍 Auto-payout job: Found ${marketsSnapshot.size} resolved markets to check`);

            for (const doc of marketsSnapshot.docs) {
                const market = doc.data();
                
                // Skip if market doesn't have on-chain ID
                if (!market.onChainId) {
                    continue;
                }

                try {
                    // Get market details from contract
                    const onChainMarket = await this.contract.getMarket(market.onChainId);
                    
                    // Check if already finalized or payout triggered
                    if (onChainMarket.autoPayoutTriggered) {
                        console.log(`✓ Market ${market.onChainId}: Already processed`);
                        // Update Firestore to match
                        await doc.ref.update({ status: 'FINALIZED' });
                        continue;
                    }

                    // Check if 30 minutes have passed since resolution
                    const resolutionTime = onChainMarket.resolutionSubmittedAt.toNumber();
                    const timeSinceResolution = now - resolutionTime;

                    if (timeSinceResolution >= DISPUTE_WINDOW_SECONDS) {
                        console.log(`💰 Processing auto-payout for market ${market.onChainId} (${market.title})`);
                        
                        // Call autoFinalizeAndPayout on contract
                        const tx = await this.contractWithSigner.autoFinalizeAndPayout(market.onChainId);
                        console.log(`📝 Transaction sent: ${tx.hash}`);
                        
                        const receipt = await tx.wait();
                        console.log(`✅ Market ${market.onChainId} finalized and paid out! Gas used: ${receipt.gasUsed.toString()}`);
                        
                        // Update Firestore
                        await doc.ref.update({
                            status: 'FINALIZED',
                            autoPayoutTriggered: true,
                            payoutTxHash: tx.hash,
                            finalizedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        const remainingMinutes = Math.ceil((DISPUTE_WINDOW_SECONDS - timeSinceResolution) / 60);
                        console.log(`⏰ Market ${market.onChainId}: ${remainingMinutes} minutes remaining in dispute window`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing market ${market.onChainId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Auto-payout job error:', error.message);
        }
    }

    /**
     * Start the auto-payout job (runs every 5 minutes)
     */
    start(intervalMinutes = 5) {
        if (this.isRunning) {
            console.log('⚠️  Auto-payout job already running');
            return;
        }

        console.log(`🚀 Starting auto-payout job (checking every ${intervalMinutes} minutes)`);
        
        // Run immediately
        this.processMarkets();
        
        // Then run on interval
        this.intervalId = setInterval(() => {
            this.processMarkets();
        }, intervalMinutes * 60 * 1000);
        
        this.isRunning = true;
    }

    /**
     * Stop the auto-payout job
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏹️  Auto-payout job stopped');
        }
    }
}

export default AutoPayoutJob;
