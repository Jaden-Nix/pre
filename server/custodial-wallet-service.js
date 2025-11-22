import { ethers } from 'ethers';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'predora-default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

export class CustodialWalletService {
    constructor(db) {
        this.db = db;
        // TODO: BLOCKCHAIN TEMPORARILY DISABLED FOR HACKATHON DEMO
        // this.provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
        this.provider = null; // Disabled for demo mode
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

    async createWallet(userId) {
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
                address: wallet.address,
                encryptedPrivateKey,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.db.collection('custodialWallets').doc(userId).set(walletData);

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

            // TODO: BLOCKCHAIN TEMPORARILY DISABLED FOR HACKATHON DEMO
            // const balance = await this.provider.getBalance(walletInfo.address);
            const balance = ethers.utils.parseEther('0'); // Mock balance for demo mode
            
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

            console.log(`📤 Transaction sent from custodial wallet: ${tx.hash}`);

            const receipt = await tx.wait();

            await this.db.collection('custodialTransactions').add({
                userId,
                from: wallet.address,
                to,
                value: valueInBNB,
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
            console.error('Error sending transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
