import { ethers } from 'ethers';
import { Bundler } from '@biconomy/bundler';
import { BiconomyPaymaster } from '@biconomy/paymaster';
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from '@biconomy/account';
import { ECDSAOwnershipValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE } from '@biconomy/modules';

const BSC_TESTNET_RPC = 'https://bsc-testnet-dataseed.bnbchain.org';
const BSC_TESTNET_CHAIN_ID = 97;
const BUNDLER_URL = 'https://bundler.biconomy.io/api/v2/97/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44';

export class BiconomyAAService {
    constructor(paymasterApiKey) {
        this.paymasterApiKey = paymasterApiKey;
        this.provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_RPC);
        this.bundler = null;
        this.paymaster = null;
        this.smartAccounts = new Map();
        
        this.initializeServices();
    }

    initializeServices() {
        this.bundler = new Bundler({
            bundlerUrl: BUNDLER_URL,
            chainId: BSC_TESTNET_CHAIN_ID,
            entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        });

        this.paymaster = new BiconomyPaymaster({
            paymasterUrl: `https://paymaster.biconomy.io/api/v1/${BSC_TESTNET_CHAIN_ID}/${this.paymasterApiKey}`,
        });

        console.log('✅ Biconomy AA Service initialized');
    }

    async createSmartAccount(privateKey) {
        try {
            const signer = new ethers.Wallet(privateKey, this.provider);

            const module = await ECDSAOwnershipValidationModule.create({
                signer: signer,
                moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
            });

            const smartAccount = await BiconomySmartAccountV2.create({
                signer: signer,
                chainId: BSC_TESTNET_CHAIN_ID,
                bundler: this.bundler,
                paymaster: this.paymaster,
                entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
                defaultValidationModule: module,
                activeValidationModule: module,
            });

            const address = await smartAccount.getAccountAddress();
            
            return {
                success: true,
                smartAccount,
                address
            };
        } catch (error) {
            console.error('Error creating smart account:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendSponsoredTransaction(privateKey, to, data, value = '0') {
        try {
            let smartAccount = this.smartAccounts.get(privateKey);
            
            if (!smartAccount) {
                const result = await this.createSmartAccount(privateKey);
                if (!result.success) {
                    return result;
                }
                smartAccount = result.smartAccount;
                this.smartAccounts.set(privateKey, smartAccount);
            }

            const transaction = {
                to,
                data,
                value: ethers.utils.parseEther(value.toString()),
            };

            const userOp = await smartAccount.buildUserOp([transaction], {
                paymasterServiceData: {
                    mode: 'SPONSORED',
                },
            });

            const userOpResponse = await smartAccount.sendUserOp(userOp);
            
            const { transactionHash } = await userOpResponse.waitForTxHash();
            console.log(`📤 Transaction hash: ${transactionHash}`);
            
            const userOpReceipt = await userOpResponse.wait();
            
            if (!userOpReceipt.success) {
                throw new Error(`Transaction failed: ${userOpReceipt.reason || 'Unknown error'}`);
            }

            console.log(`✅ Sponsored transaction confirmed: ${transactionHash}`);

            return {
                success: true,
                txHash: transactionHash,
                blockNumber: userOpReceipt.receipt.blockNumber,
                gasUsed: userOpReceipt.actualGasUsed?.toString(),
                sponsored: true
            };
        } catch (error) {
            console.error('Error sending sponsored transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getSmartAccountAddress(privateKey) {
        try {
            let smartAccount = this.smartAccounts.get(privateKey);
            
            if (!smartAccount) {
                const result = await this.createSmartAccount(privateKey);
                if (!result.success) {
                    return result;
                }
                smartAccount = result.smartAccount;
                this.smartAccounts.set(privateKey, smartAccount);
            }

            const address = await smartAccount.getAccountAddress();
            
            return {
                success: true,
                address
            };
        } catch (error) {
            console.error('Error getting smart account address:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async buildContractTransaction(privateKey, contractAddress, abi, methodName, params, value = '0') {
        try {
            const iface = new ethers.utils.Interface(abi);
            const data = iface.encodeFunctionData(methodName, params);

            return await this.sendSponsoredTransaction(privateKey, contractAddress, data, value);
        } catch (error) {
            console.error('Error building contract transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
