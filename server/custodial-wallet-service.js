import { ethers } from 'ethers';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

export class CustodialWalletService {
    constructor(db) {
        // 🔒 SECURITY CHECK: Validate encryption key before allowing any wallet operations
        if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
            console.error('🚨 SECURITY ERROR: WALLET_ENCRYPTION_KEY must be set and at least 32 characters long.');
            console.error('   Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
            console.error('   Set it in Replit Secrets as WALLET_ENCRYPTION_KEY');
            throw new Error('Custodial wallet service requires secure WALLET_ENCRYPTION_KEY');
        }
        
        this.db = db;
        // ✅ BLOCKCHAIN RE-ENABLED FOR BSC TESTNET
        this.provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
        console.log('🔒 Custodial wallet service initialized with secure encryption');
    }

    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
            authTag: authTag.toString('hex')
        };
    }

    decrypt(encryptedObj) {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
            Buffer.from(encryptedObj.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    async createWallet(userId, firebaseUid = null) {
        try {
            if (!this.db) {
                throw new Error('Firebase not initialized');
            }

            const existingWallet = await this.db.collection('custodialWallets').doc(userId).get();
            if (existingWallet.exists) {
                return {
                    success: false,
                    error: 'Wallet already exists for this user'
                };
            }

            const wallet = ethers.Wallet.createRandom();

            const encryptedPrivateKey = this.encrypt(wallet.privateKey);

            const walletData = {
                userId,
                firebaseUid,  // ✅ Store Firebase UID for ownership verification
                address: wallet.address,
                encryptedPrivateKey,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.db.collection('custodialWallets').doc(userId).set(walletData);

            // ✅ SECURITY: Store authoritative UID→userId mapping
            if (firebaseUid) {
                await this.db.collection('walletMappings').doc(firebaseUid).set({
                    firebaseUid,
                    userId,
                    walletAddress: wallet.address,
                    createdAt: new Date().toISOString()
                });
                console.log(`✅ Wallet mapping created: ${firebaseUid} → ${userId}`);
            }

            console.log(`✅ Custodial wallet created for user ${userId}: ${wallet.address}`);

            return {
                success: true,
                address: wallet.address
            };
        } catch (error) {
            console.error('Error creating custodial wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getWallet(userId) {
        try {
            if (!this.db) {
                throw new Error('Firebase not initialized');
            }

            const walletDoc = await this.db.collection('custodialWallets').doc(userId).get();
            
            if (!walletDoc.exists) {
                return {
                    success: false,
                    error: 'Wallet not found'
                };
            }

            const walletData = walletDoc.data();
            
            return {
                success: true,
                address: walletData.address,
                createdAt: walletData.createdAt
            };
        } catch (error) {
            console.error('Error getting wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async loadWalletSigner(userId) {
        try {
            if (!this.db) {
                throw new Error('Firebase not initialized');
            }

            const walletDoc = await this.db.collection('custodialWallets').doc(userId).get();
            
            if (!walletDoc.exists) {
                throw new Error('Wallet not found');
            }

            const walletData = walletDoc.data();
            const privateKey = this.decrypt(walletData.encryptedPrivateKey);
            
            const wallet = new ethers.Wallet(privateKey, this.provider);
            
            return wallet;
        } catch (error) {
            console.error('Error loading wallet signer:', error);
            throw error;
        }
    }

    async getBalance(userId) {
        try {
            const walletInfo = await this.getWallet(userId);
            
            if (!walletInfo.success) {
                return walletInfo;
            }

            // ✅ BLOCKCHAIN RE-ENABLED FOR BSC TESTNET
            const balance = await this.provider.getBalance(walletInfo.address);
            
            return {
                success: true,
                address: walletInfo.address,
                balance: ethers.utils.formatEther(balance),
                balanceWei: balance.toString()
            };
        } catch (error) {
            console.error('Error getting balance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendTransaction(userId, to, valueInBNB) {
        try {
            const wallet = await this.loadWalletSigner(userId);
            
            const tx = await wallet.sendTransaction({
                to,
                value: ethers.utils.parseEther(valueInBNB.toString())
            });

            console.log(`📤 BNB transaction sent from custodial wallet: ${tx.hash}`);

            const receipt = await tx.wait();

            await this.db.collection('custodialTransactions').add({
                userId,
                from: wallet.address,
                to,
                value: valueInBNB,
                currency: 'BNB',
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            });

            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Error sending BNB transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendERC20Token(userId, tokenAddress, to, amount) {
        try {
            const wallet = await this.loadWalletSigner(userId);
            
            // ERC20 ABI for transfer function
            const erc20Abi = [
                "function transfer(address to, uint256 amount) returns (bool)",
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ];
            
            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
            
            // Get token decimals
            const decimals = await tokenContract.decimals();
            
            // Parse amount with correct decimals
            const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);
            
            // Check balance
            const balance = await tokenContract.balanceOf(wallet.address);
            if (balance.lt(amountWei)) {
                return {
                    success: false,
                    error: 'Insufficient token balance'
                };
            }
            
            // Send transfer transaction
            const tx = await tokenContract.transfer(to, amountWei);
            
            console.log(`🪙 PRED token transfer sent from custodial wallet: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            await this.db.collection('custodialTransactions').add({
                userId,
                from: wallet.address,
                to,
                value: amount,
                currency: 'PRED',
                tokenAddress,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            });
            
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Error sending ERC20 token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
