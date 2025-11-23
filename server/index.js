

// --- ESM Imports ---
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import OpenAI from 'openai';
import sgMail from '@sendgrid/mail';
import * as ethers from 'ethers';
import { AutoPayoutJob } from './auto-payout-job.js';
import { CustodialWalletService } from './custodial-wallet-service.js';
import { BiconomyAAService } from './biconomy-aa-service.js';
import { swarmVerifyResolution } from './swarm-verify-oracle.js';

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const APP_ID = process.env.APP_ID || 'predora-hackathon';

// --- XP System Constants ---
const XP_VALUES = {
    PLACE_BET: 10,           // Base XP for placing any bet
    CREATE_MARKET: 25,       // XP for creating a market with liquidity
    WIN_BET: 5,             // Bonus XP for winning a bet
    DAILY_LOGIN: 15         // XP for daily login (future feature)
};

// Helper function to add XP to user
async function addXpToUser(userId, amount, reason) {
    if (!db || !userId || amount <= 0) return false;
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            xp: admin.firestore.FieldValue.increment(amount),
            lastXpUpdate: Date.now(),
            xpHistory: admin.firestore.FieldValue.arrayUnion({
                amount,
                reason,
                timestamp: Date.now()
            })
        }, { merge: true });
        console.log(`✅ XP: Added ${amount} XP to ${userId} (${reason})`);
        return true;
    } catch (error) {
        console.warn(`⚠️  Could not add XP: ${error.message}`);
        return false;
    }
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai = null;
if (OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    console.log("✅ OpenAI initialized successfully.");
} else {
    console.warn("⚠️  OpenAI not initialized (missing OPENAI_API_KEY).");
    console.log("   Some features may be limited.");
}

// --- Firebase Admin SDK Initialization ---
let db = null;
try {
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountString) {
        // Parse JSON to verify it's valid
        const serviceAccount = JSON.parse(serviceAccountString);
        
        // Write service account JSON to a temp file for Application Default Credentials
        // This is needed because some Google Cloud SDKs expect a file path
        const tmpDir = '/tmp';
        const credFilePath = path.join(tmpDir, 'firebase-service-account.json');
        
        fs.writeFileSync(credFilePath, serviceAccountString);
        console.log(`📁 Service account credentials written to ${credFilePath}`);
        
        // Set the environment variable to point to the file
        // This ensures Application Default Credentials work correctly
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credFilePath;
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log("✅ Firebase Admin SDK initialized successfully.");
        console.log(`   Project ID: ${serviceAccount.project_id}`);
        db = admin.firestore();
        
        // Test connection asynchronously
        db.collection('_test').limit(1).get()
            .then(() => console.log("✅ Firestore connection verified"))
            .catch(testError => console.error("⚠️  Firestore connection warning:", testError.message));
    } else {
        console.warn("⚠️  Firebase Admin SDK not initialized (missing GOOGLE_APPLICATION_CREDENTIALS).");
        console.log("   App will work with client-side Firebase only.");
    }
} catch (e) {
    console.error("❌ Firebase Admin initialization failed:", e.message);
    // The private key might be malformed - let's try to work without Firebase
    console.warn("⚠️  Continuing without Firebase Admin SDK");
    console.warn("   Custodial wallet features will be unavailable");
    db = null;  // Ensure db is null on failure
}

// --- SendGrid Initialization ---
let sendGridClient = null;
let fromEmail = null;

async function getSendGridClient() {
    if (sendGridClient && fromEmail) {
        return { client: sendGridClient, fromEmail };
    }

    // First try direct environment variables
    const directApiKey = process.env.SENDGRID_API_KEY;
    const directFromEmail = process.env.SENDGRID_FROM_EMAIL;
    
    if (directApiKey && directFromEmail) {
        try {
            sgMail.setApiKey(directApiKey);
            sendGridClient = sgMail;
            fromEmail = directFromEmail;
            console.log("✅ SendGrid initialized successfully (direct env vars).");
            return { client: sendGridClient, fromEmail };
        } catch (error) {
            console.error("❌ SendGrid initialization failed:", error.message);
            return null;
        }
    }

    // Try Replit integration as fallback
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
        ? 'repl ' + process.env.REPL_IDENTITY 
        : process.env.WEB_REPL_RENEWAL 
        ? 'depl ' + process.env.WEB_REPL_RENEWAL 
        : null;

    if (!hostname || !xReplitToken) {
        console.warn("⚠️  SendGrid not initialized (set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL env vars).");
        return null;
    }

    try {
        const response = await fetch(
            'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
            {
                headers: {
                    'Accept': 'application/json',
                    'X_REPLIT_TOKEN': xReplitToken
                }
            }
        );

        const data = await response.json();
        const connectionSettings = data.items?.[0];

        if (!connectionSettings || !connectionSettings.settings.api_key || !connectionSettings.settings.from_email) {
            console.warn("⚠️  SendGrid not connected via Replit integration.");
            return null;
        }

        sgMail.setApiKey(connectionSettings.settings.api_key);
        sendGridClient = sgMail;
        fromEmail = connectionSettings.settings.from_email;

        console.log("✅ SendGrid initialized successfully (Replit integration).");
        return { client: sendGridClient, fromEmail };
    } catch (error) {
        console.error("❌ SendGrid initialization failed:", error.message);
        return null;
    }
}

// OTP storage (in-memory for simplicity, could use Redis or Firebase)
const otpStore = new Map();

// Initialize custodial wallet service with security validation
let custodialWalletService = null;
if (db) {
    try {
        custodialWalletService = new CustodialWalletService(db);
        console.log("✅ Custodial Wallet Service initialized with secure encryption");
    } catch (error) {
        console.warn("⚠️  Custodial Wallet Service not available:", error.message);
        console.warn("   Custodial wallets will be disabled. Users can still use external wallets (MetaMask).");
    }
} else {
    console.warn("⚠️  Custodial Wallet Service not available (Firebase required)");
}

// Re-enabled Biconomy AA service for hybrid mode
let biconomyAAService = null;
const BICONOMY_PAYMASTER_API_KEY = process.env.BICONOMY_PAYMASTER_API_KEY;
if (BICONOMY_PAYMASTER_API_KEY) {
    biconomyAAService = new BiconomyAAService(BICONOMY_PAYMASTER_API_KEY);
    console.log("✅ Biconomy AA Service initialized");
} else {
    console.warn("⚠️  Biconomy AA Service not available (missing BICONOMY_PAYMASTER_API_KEY)");
    console.log("   Wallet users will pay gas fees directly");
}

const app = express();

// Serve static files from parent directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// app.html routes MUST come before static middleware to enable Project ID injection
app.get('/app.html', (req, res) => {
    const appHtmlPath = path.join(__dirname, '..', 'app.html');
    fs.readFile(appHtmlPath, 'utf8', (err, html) => {
        if (err) {
            console.error('Error reading app.html:', err);
            return res.status(500).send('Error loading app');
        }
        // Inject WalletConnect Project ID
        const projectId = process.env.WALLETCONNECT_PROJECT_ID || '';
        const placeholder = '<!-- WALLETCONNECT_PROJECT_ID_PLACEHOLDER -->';
        const replacement = `<script>window.WALLETCONNECT_PROJECT_ID = '${projectId}';</script>`;
        const injectedHtml = html.replace(placeholder, replacement);
        res.set('Cache-Control', 'no-store');
        res.send(injectedHtml);
    });
});

app.get('/app', (req, res) => {
    const appHtmlPath = path.join(__dirname, '..', 'app.html');
    fs.readFile(appHtmlPath, 'utf8', (err, html) => {
        if (err) {
            console.error('Error reading app.html:', err);
            return res.status(500).send('Error loading app');
        }
        // Inject WalletConnect Project ID
        const projectId = process.env.WALLETCONNECT_PROJECT_ID || '';
        const placeholder = '<!-- WALLETCONNECT_PROJECT_ID_PLACEHOLDER -->';
        const replacement = `<script>window.WALLETCONNECT_PROJECT_ID = '${projectId}';</script>`;
        const injectedHtml = html.replace(placeholder, replacement);
        res.set('Cache-Control', 'no-store');
        res.send(injectedHtml);
    });
});

app.use(express.static(path.join(__dirname, '..')));

// --- AI GUARDRAILS ---
async function checkDuplicateMarket(title, existingMarkets) {
    if (!GEMINI_API_KEY || !existingMarkets || existingMarkets.length === 0) {
        return { isDuplicate: false, score: 0 };
    }
    
    try {
        const payload = {
            systemInstruction: {
                parts: [{
                    text: "You are a duplicate detection system. Compare the new market title with existing markets and determine if it's a duplicate. Return a similarity score from 0 to 1, where 1 means identical and 0 means completely different."
                }]
            },
            contents: [{
                parts: [{
                    text: `New market: "${title}"\n\nExisting markets:\n${existingMarkets.slice(0, 50).map((m, i) => `${i + 1}. ${m.title}`).join('\n')}\n\nAnalyze if this is a duplicate. Return JSON with: { "isDuplicate": boolean, "score": number (0-1), "similarTo": "title of most similar market or null" }`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        isDuplicate: { type: "boolean" },
                        score: { type: "number" },
                        similarTo: { type: ["string", "null"] }
                    }
                }
            }
        };
        
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text);
        return result;
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false, score: 0 };
    }
}

async function checkMarketQuality(title, description) {
    if (!GEMINI_API_KEY) {
        return { isLowQuality: false, score: 1, reason: '' };
    }
    
    try {
        const payload = {
            systemInstruction: {
                parts: [{
                    text: "You are a content quality analyzer. Evaluate if a prediction market is high quality, clear, verifiable, and interesting. Low quality includes: spam, unclear questions, unverifiable outcomes, offensive content, or extremely trivial topics."
                }]
            },
            contents: [{
                parts: [{
                    text: `Market title: "${title}"\nDescription: "${description || 'None'}"\n\nEvaluate quality. Return JSON with: { "isLowQuality": boolean, "score": number (0-1, where 1 is high quality), "reason": "explanation if low quality" }`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        isLowQuality: { type: "boolean" },
                        score: { type: "number" },
                        reason: { type: "string" }
                    }
                }
            }
        };
        
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text);
        return result;
    } catch (error) {
        console.error('Error checking quality:', error);
        return { isLowQuality: false, score: 1, reason: '' };
    }
}

async function checkSybilBehavior(userId, userMarkets, timeWindow = 3600000) {
    if (!userMarkets || userMarkets.length === 0) {
        return { isSybil: false, score: 0, reason: '' };
    }
    
    const recentMarkets = userMarkets.filter(m => {
        const createdAt = new Date(m.createdAt).getTime();
        return Date.now() - createdAt < timeWindow;
    });
    
    const isSybil = recentMarkets.length >= 10;
    const score = Math.min(recentMarkets.length / 10, 1);
    
    return {
        isSybil,
        score,
        reason: isSybil ? `User created ${recentMarkets.length} markets in the last hour` : ''
    };
}

// --- ROUTES ---
app.get('/', (req, res) => {
    // Serve the landing page
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/pitch-deck', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'pitch-deck', 'index.html'));
});

// --- EMAIL OTP AUTHENTICATION ENDPOINTS ---
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email address is required' });
    }
    
    const sendGrid = await getSendGridClient();
    if (!sendGrid) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore.set(email, {
            code: otp,
            expiresAt: Date.now() + 10 * 60 * 1000
        });
        
        const msg = {
            to: email,
            from: sendGrid.fromEmail,
            subject: 'Your Predora Login Code',
            text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #38BDF8;">Welcome to Predora!</h2>
                    <p style="font-size: 16px; color: #333;">Your verification code is:</p>
                    <div style="background: linear-gradient(to right, #38BDF8, #6366F1); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
                    <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
                </div>
            `
        };
        
        await sendGrid.client.send(msg);
        
        console.log(`✉️ OTP sent to ${email}`);
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
        
    } catch (error) {
        console.error('Error sending OTP:', error);
        if (error.response && error.response.body && error.response.body.errors) {
            console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
        }
        res.status(500).json({ error: 'Failed to send OTP email' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    const storedData = otpStore.get(email);
    
    if (!storedData) {
        return res.status(400).json({ error: 'No OTP found for this email' });
    }
    
    if (Date.now() > storedData.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }
    
    if (storedData.code !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    otpStore.delete(email);
    
    const crypto = await import('crypto');
    const userId = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
    
    // ✅ SECURITY: DO NOT create wallet here - no Firebase UID yet!
    // Wallet will be created securely after Firebase auth in completeAuthentication
    // when we have a Firebase UID for proper mapping
    
    res.status(200).json({ 
        success: true, 
        userId: userId,
        email: email
    });
});

app.post('/api/custodial-wallet/create', async (req, res) => {
    const { userId, firebaseUid } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    // ✅ CRITICAL SECURITY: Require Firebase UID for all wallet creation
    if (!firebaseUid) {
        console.warn(`🚨 Wallet creation attempted without Firebase UID for userId: ${userId}`);
        return res.status(400).json({ 
            error: 'Firebase UID is required for secure wallet creation' 
        });
    }
    
    if (!custodialWalletService) {
        return res.status(503).json({ error: 'Custodial wallet service unavailable' });
    }
    
    // ✅ Create wallet with Firebase UID for mapping
    const result = await custodialWalletService.createWallet(userId, firebaseUid);
    
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(400).json(result);
    }
});

app.post('/api/custodial-wallet/info', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!custodialWalletService) {
        return res.status(503).json({ error: 'Custodial wallet service unavailable' });
    }
    
    const result = await custodialWalletService.getWallet(userId);
    
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(404).json(result);
    }
});

// 🎯 On-Chain Market Creation - Creates markets on PredictionMarketV2 contract + Firestore
app.post('/api/market/create-onchain', async (req, res) => {
    const { title, description, category, endDate, liquidityBNB, marketStructure, initialOdds, options } = req.body;
    
    if (!title || !description || !category || !endDate || !liquidityBNB) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get idToken from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Convert endDate to Unix timestamp
        const resolutionTime = Math.floor(new Date(endDate).getTime() / 1000);
        
        // Get deployer wallet to create market
        const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY_V2;
        if (!DEPLOYER_PRIVATE_KEY) {
            return res.status(503).json({ error: 'Market creation service unavailable - missing deployer key' });
        }
        
        const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
        const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
        
        // Initialize contract with updated ABI including initial liquidity support
        const contractAddress = '0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB';
        const contractABI = [
            'function createMarket(string memory _title, string memory _description, uint256 _resolutionTime, uint256 _initialYesBnb, uint256 _initialNoBnb, uint256 _initialYesPred, uint256 _initialNoPred) external payable returns (uint256)',
            'event MarketCreated(uint256 indexed marketId, string title, address indexed creator, uint256 initialYesBnb, uint256 initialNoBnb, uint256 initialYesPred, uint256 initialNoPred)'
        ];
        const predictionMarketContract = new ethers.Contract(contractAddress, contractABI, deployerWallet);
        
        // Calculate initial liquidity split (50/50 YES/NO for balanced market)
        // Dual currency support: BNB + PRED initial liquidity
        const liquidityBnbWei = ethers.utils.parseEther(liquidityBNB.toString());
        const halfLiquidityBnb = liquidityBnbWei.div(2);
        
        // Add PRED liquidity (10x the BNB amount for testing)
        // Example: 0.1 BNB = $60 → 600 PRED tokens
        const predLiquidityAmount = ethers.utils.parseEther((liquidityBNB * 600).toString());
        const halfLiquidityPred = predLiquidityAmount.div(2);
        
        // Approve PRED token spending if we're adding PRED liquidity
        const predTokenAddress = '0x45C229bF14A36aD14885148E62058C98284B2ae0';
        if (predLiquidityAmount.gt(0)) {
            const predTokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
            const predToken = new ethers.Contract(predTokenAddress, predTokenAbi, deployerWallet);
            const approveTx = await predToken.approve(contractAddress, predLiquidityAmount, { gasLimit: 100000 });
            await approveTx.wait();
            console.log(`✅ PRED approved for market creation: ${approveTx.hash}`);
        }
        
        // Create market on-chain with dual currency initial liquidity
        console.log(`🎯 Creating on-chain market: "${title}"`);
        console.log(`   💰 BNB liquidity: ${liquidityBNB} BNB (${halfLiquidityBnb.toString()} per side)`);
        console.log(`   🪙 PRED liquidity: ${predLiquidityAmount.toString()} PRED (${halfLiquidityPred.toString()} per side)`);
        
        const tx = await predictionMarketContract.createMarket(
            title, 
            description, 
            resolutionTime,
            halfLiquidityBnb,   // _initialYesBnb
            halfLiquidityBnb,   // _initialNoBnb
            halfLiquidityPred,  // _initialYesPred (dual currency support!)
            halfLiquidityPred,  // _initialNoPred (dual currency support!)
            {
                value: liquidityBnbWei,
                gasLimit: 500000
            }
        );
        const receipt = await tx.wait();
        
        // Extract market ID from MarketCreated event
        const marketCreatedEvent = receipt.events?.find(e => e.event === 'MarketCreated');
        const onChainMarketId = marketCreatedEvent?.args?.marketId?.toNumber();
        
        if (onChainMarketId === undefined && onChainMarketId !== 0) {
            console.error('❌ Failed to extract market ID from transaction receipt');
            return res.status(500).json({ error: 'Failed to extract market ID from blockchain transaction' });
        }
        
        console.log(`✅ On-chain market created: ID ${onChainMarketId}, TX: ${tx.hash}`);
        
        // NOTE: In this simplified flow, deployer wallet provides liquidity (not user)
        // This allows gasless market creation for demo purposes
        // TODO: For production, deduct liquidityBNB from user's balance and use their custodial wallet
        
        // Create Firestore document with market data + award XP to creator
        const firestore = admin.firestore();
        
        // Use Firestore transaction to atomically create market + award XP
        const marketId = await firestore.runTransaction(async (transaction) => {
            // Get user profile for XP update
            const profileRef = firestore
                .collection('artifacts')
                .doc(APP_ID)
                .collection('public')
                .doc('data')
                .collection('user_profiles')
                .doc(userId);
            
            const publicProfileRef = firestore
                .collection('artifacts')
                .doc(APP_ID)
                .collection('public')
                .doc('data')
                .collection('public_leaderboard')
                .doc(userId);
            
            // Read profile to get displayName
            const profileSnap = await transaction.get(profileRef);
            const displayName = profileSnap.exists ? (profileSnap.data().displayName || 'Anonymous') : 'Anonymous';
            
            // Create market document
            const marketRef = firestore
                .collection('artifacts')
                .doc(APP_ID)
                .collection('public')
                .doc('data')
                .collection('standard_markets')
                .doc(); // Generate new doc ID
            
            // Markets now start with dual currency initial liquidity (BNB + PRED)
            const initialLiquidityBnbUsd = liquidityBNB * 600; // Mock BNB price at $600
            const initialLiquidityPredTokens = liquidityBNB * 600; // PRED tokens (1 PRED ≈ $1)
            const totalInitialLiquidityUsd = initialLiquidityBnbUsd + initialLiquidityPredTokens;
            const halfLiquidityUsd = totalInitialLiquidityUsd / 2;
            
            const marketData = {
                title,
                insight: description,
                category,
                marketStructure: marketStructure || 'binary',
                resolutionDate: endDate,
                stakingDeadline: endDate, // Same as resolution for on-chain markets
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: userId,
                createdByDisplayName: displayName,
                isResolved: false,
                winningOutcome: null,
                onChainMarketId: onChainMarketId,
                onChainTxHash: tx.hash,
                onChainCreatedAt: Date.now(),
                // Volume fields - track only user bets (initial liquidity is separate)
                totalStakeVolume: 0,
                totalVolume: 0,
                uniqueStakerCount: 0,
                // Initial liquidity tracking (protocol-owned, separate from user volume)
                // Dual currency: BNB + PRED
                initialLiquidityBnb: liquidityBNB,
                initialLiquidityBnbUsd: initialLiquidityBnbUsd,
                initialLiquidityPred: initialLiquidityPredTokens,
                initialLiquidityPredUsd: initialLiquidityPredTokens, // 1 PRED ≈ $1
                initialLiquidityTotalUsd: totalInitialLiquidityUsd,
                // Market type fields
                isFixedPot: false, // On-chain markets use AMM pools
                yieldProtocol: null,
                protocolApy: 0,
                totalPrincipalUsd: 0,
                lastAccrualAt: admin.firestore.FieldValue.serverTimestamp(),
                accruedYieldUsd: 0,
                // Dispute and admin fields
                disputes: [],
                resolutionSource: null,
                adminEvents: [],
                // Pool management
                refundVolumeGoal: 100,
                refundStakerGoal: 10
            };
            
            // Add structure-specific fields
            if (marketStructure === 'binary') {
                const yesPercent = (initialOdds && initialOdds.yesPercent) || 50;
                const noPercent = (initialOdds && initialOdds.noPercent) || 50;
                marketData.yesPercent = yesPercent;
                marketData.noPercent = noPercent;
                // Pools display includes initial liquidity for AMM calculations
                // But volume tracking excludes it (see totalVolume = 0 above)
                marketData.yesPool = halfLiquidityUsd;
                marketData.noPool = halfLiquidityUsd;
            } else if (marketStructure === 'multi-option' && options) {
                // Multi-option market - distribute liquidity equally across options
                const liquidityPerOption = initialLiquidityUsd / options.length;
                marketData.options = options.map(opt => ({
                    ...opt,
                    pool: liquidityPerOption
                }));
            } else {
                // Default binary with 50/50 initial odds and liquidity
                marketData.yesPercent = 50;
                marketData.noPercent = 50;
                marketData.yesPool = halfLiquidityUsd;
                marketData.noPool = halfLiquidityUsd;
            }
            
            // Write market
            transaction.set(marketRef, marketData);
            
            return marketRef.id;
        });
        
        console.log(`✅ Firestore market created: ${marketId}`);
        
        // Award XP for creating market with liquidity
        await addXpToUser(userId, XP_VALUES.CREATE_MARKET, `Created market: ${title}`);
        
        res.status(200).json({
            success: true,
            marketId: marketId,
            onChainMarketId: onChainMarketId,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        });
    } catch (error) {
        console.error('❌ Error creating on-chain market:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🪙 SIMPLE $PRED Token Faucet - Direct to Wallet Address (No Firestore Required)
app.post('/api/faucet/claim-simple', async (req, res) => {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Validate wallet address format
    if (!ethers.utils.isAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    try {
        // PredToken contract ABI
        const predTokenAbi = [
            'function mint(address to, uint256 amount) external',
            'function canClaimFaucet(address user) external view returns (bool)',
            'function timeUntilNextClaim(address user) external view returns (uint256)',
            'function balanceOf(address account) external view returns (uint256)',
            'function faucetAmount() external view returns (uint256)'
        ];
        
        // Use deployer wallet to pay for gas
        const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
        if (!DEPLOYER_PRIVATE_KEY) {
            return res.status(503).json({ 
                error: 'Faucet unavailable', 
                message: 'Faucet service is temporarily unavailable' 
            });
        }
        
        const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
        const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
        const predToken = new ethers.Contract('0x45C229bF14A36aD14885148E62058C98284B2ae0', predTokenAbi, deployerWallet);
        
        // Check if user can claim
        const canClaim = await predToken.canClaimFaucet(walletAddress);
        
        if (!canClaim) {
            const timeLeft = await predToken.timeUntilNextClaim(walletAddress);
            const hoursLeft = Math.ceil(Number(timeLeft) / 3600);
            return res.status(429).json({ 
                error: 'Faucet on cooldown',
                message: `You can claim again in ${hoursLeft} hours`,
                timeLeft: hoursLeft
            });
        }
        
        // Get faucet amount
        const faucetAmountWei = await predToken.faucetAmount();
        const faucetAmount = Number(ethers.utils.formatEther(faucetAmountWei));
        
        // Mint tokens
        console.log(`🪙 Minting ${faucetAmount} $PRED to ${walletAddress}...`);
        const tx = await predToken.mint(walletAddress, faucetAmountWei, { gasLimit: 200000 });
        const receipt = await tx.wait();
        
        // Get new balance
        const balanceWei = await predToken.balanceOf(walletAddress);
        const balance = Number(ethers.utils.formatEther(balanceWei));
        
        console.log(`✅ Faucet: Minted ${faucetAmount} $PRED to ${walletAddress}`);
        console.log(`   Tx: ${tx.hash}, New balance: ${balance} $PRED`);
        
        res.status(200).json({ 
            success: true, 
            amount: faucetAmount,
            newBalance: balance,
            message: `Successfully claimed ${faucetAmount} $PRED tokens!`,
            txHash: tx.hash,
            onChain: true
        });
    } catch (error) {
        console.error('Error claiming from faucet:', error);
        
        if (error.message && error.message.includes('Faucet cooldown not expired')) {
            return res.status(429).json({ 
                error: 'Faucet on cooldown',
                message: 'You can claim again in 24 hours'
            });
        }
        
        res.status(500).json({ error: error.message });
    }
});

// 🪙 $PRED Token Faucet - NOW MINTS REAL ERC20 TOKENS ON-CHAIN
app.post('/api/faucet/claim-pred', async (req, res) => {
    const { userId, idToken } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!idToken) {
        return res.status(401).json({ error: 'Authentication token is required' });
    }
    
    if (!custodialWalletService) {
        return res.status(503).json({ error: 'Custodial wallet service unavailable' });
    }
    
    try {
        // ✅ SECURITY: Verify Firebase ID token to authenticate the caller
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (tokenError) {
            console.warn('🚨 Invalid Firebase token:', tokenError.message);
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }
        
        const authenticatedUid = decodedToken.uid;
        
        // ✅ SECURITY: Verify the wallet belongs to the authenticated user
        let walletMapping = await admin.firestore()
            .collection('custodialWallets')
            .doc(userId)
            .get();
        
        // If wallet doesn't exist, create it
        if (!walletMapping.exists) {
            console.log(`📱 Creating custodial wallet for ${userId}...`);
            const createResult = await custodialWalletService.createWallet(userId, authenticatedUid);
            if (!createResult.success) {
                console.error(`❌ Failed to create wallet: ${createResult.error}`);
                return res.status(400).json({ error: 'Could not create wallet: ' + createResult.error });
            }
            // Fetch the mapping again
            walletMapping = await admin.firestore()
                .collection('custodialWallets')
                .doc(userId)
                .get();
        }
        
        const mappingData = walletMapping.data();
        if (mappingData.firebaseUid !== authenticatedUid) {
            console.warn(`🚨 Authorization failed: User ${authenticatedUid} attempted to claim for wallet owned by ${mappingData.firebaseUid}`);
            return res.status(403).json({ error: 'Not authorized to claim for this wallet' });
        }
        
        // Get user's custodial wallet address (we'll use deployer to pay gas)
        const walletInfo = await custodialWalletService.getWallet(userId);
        if (!walletInfo.success) {
            return res.status(400).json({ error: 'Could not get wallet: ' + walletInfo.error });
        }
        const walletAddress = walletInfo.address;
        
        // PredToken contract ABI (faucet and mint functions)
        const predTokenAbi = [
            'function mint(address to, uint256 amount) external',
            'function canClaimFaucet(address user) external view returns (bool)',
            'function timeUntilNextClaim(address user) external view returns (uint256)',
            'function balanceOf(address account) external view returns (uint256)',
            'function faucetAmount() external view returns (uint256)'
        ];
        
        // Use deployer wallet to pay for gas (gas-sponsored faucet claim)
        const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
        if (!DEPLOYER_PRIVATE_KEY) {
            return res.status(503).json({ 
                error: 'Faucet unavailable', 
                message: 'Faucet service is temporarily unavailable' 
            });
        }
        
        const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
        const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
        const predToken = new ethers.Contract(PRED_TOKEN_ADDRESS, predTokenAbi, deployerWallet);
        
        // Check if user can claim
        const canClaim = await predToken.canClaimFaucet(walletAddress);
        
        if (!canClaim) {
            const timeLeft = await predToken.timeUntilNextClaim(walletAddress);
            const hoursLeft = Math.ceil(Number(timeLeft) / 3600);
            return res.status(429).json({ 
                error: 'Faucet on cooldown',
                message: `You can claim again in ${hoursLeft} hours`,
                timeLeft: hoursLeft
            });
        }
        
        // Get faucet amount from contract
        const faucetAmountWei = await predToken.faucetAmount();
        const faucetAmount = Number(ethers.utils.formatEther(faucetAmountWei));
        
        // Mint tokens directly to user (deployer pays gas)
        // This is gas-sponsored - user doesn't need BNB
        console.log(`🪙 Minting ${faucetAmount} $PRED tokens for ${userId} (${walletAddress})...`);
        const tx = await predToken.mint(walletAddress, faucetAmountWei, { gasLimit: 200000 });
        const receipt = await tx.wait();
        
        // Get new balance
        const balanceWei = await predToken.balanceOf(walletAddress);
        const balance = Number(ethers.utils.formatEther(balanceWei));
        
        console.log(`✅ Faucet: Minted ${faucetAmount} $PRED tokens on-chain to ${walletAddress}`);
        console.log(`   Transaction: ${tx.hash}`);
        console.log(`   New balance: ${balance} $PRED`);
        
        // Update Firebase profile with new balance and claim timestamp
        try {
            if (db) {
                await db.collection('users').doc(userId).set({
                    predBalance: balance,
                    lastPredClaim: Date.now(),
                    lastBalanceUpdate: Date.now(),
                    walletAddress: walletAddress
                }, { merge: true });
                console.log(`✅ Updated Firebase profile for ${userId}: predBalance=${balance}`);
            }
        } catch (dbError) {
            console.warn(`⚠️  Could not update Firebase profile: ${dbError.message}`);
            // Continue anyway - the balance is still on-chain
        }
        
        res.status(200).json({ 
            success: true, 
            amount: faucetAmount,
            newBalance: balance,
            message: `Successfully claimed ${faucetAmount} $PRED tokens!`,
            txHash: tx.hash,
            onChain: true
        });
    } catch (error) {
        console.error('Error claiming from faucet:', error);
        
        // Check for specific error messages
        if (error.message && error.message.includes('Faucet cooldown not expired')) {
            return res.status(429).json({ 
                error: 'Faucet on cooldown',
                message: 'You can claim again in 24 hours'
            });
        }
        
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/custodial-wallet/balance', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!custodialWalletService) {
        return res.status(503).json({ error: 'Custodial wallet service unavailable' });
    }
    
    const result = await custodialWalletService.getBalance(userId);
    
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(400).json(result);
    }
});

// ✅ PRED Token Address (BSC Testnet)
const PRED_TOKEN_ADDRESS = '0x45C229bF14A36aD14885148E62058C98284B2ae0';

// ✅ Send BNB from custodial wallet (SECURED V4 - Fixed Authorization Bypass)
app.post('/api/custodial-wallet/send-bnb', async (req, res) => {
    const { userId, to, amount, authToken } = req.body;
    
    // ✅ Log all withdrawal attempts for audit
    const attemptLog = {
        requestedUserId: userId,
        to,
        amount,
        timestamp: new Date().toISOString(),
        success: false
    };
    
    // ✅ CRITICAL: Require userId to prevent undefined bypass
    if (!userId) {
        console.warn('🚨 Withdrawal attempt without userId');
        attemptLog.error = 'Missing userId';
        if (db) await db.collection('custodialWithdrawals').add(attemptLog);
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!to || !amount) {
        return res.status(400).json({ error: 'Recipient address and amount are required' });
    }
    
    if (!authToken) {
        console.warn('🚨 Withdrawal attempt without auth token');
        attemptLog.error = 'No auth token';
        if (db) await db.collection('custodialWithdrawals').add(attemptLog);
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!custodialWalletService || !db) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    
    try {
        // ✅ SECURITY: Verify Firebase auth token
        const decodedToken = await admin.auth().verifyIdToken(authToken);
        const authenticatedUid = decodedToken.uid;
        attemptLog.firebaseUid = authenticatedUid;
        
        console.log(`🔐 Withdrawal request from UID: ${authenticatedUid} for userId: ${userId}`);
        
        // ✅ SECURITY: Look up authoritative wallet mapping by Firebase UID
        const mappingDoc = await db.collection('walletMappings').doc(authenticatedUid).get();
        
        if (!mappingDoc.exists) {
            console.warn(`🚨 No wallet mapping found for UID: ${authenticatedUid}`);
            attemptLog.error = 'No wallet mapping - wallet may be insecure';
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(404).json({ error: 'Wallet not found. Please contact support.' });
        }
        
        const mapping = mappingDoc.data();
        const authorizedUserId = mapping.userId;
        
        // ✅ CRITICAL SECURITY: Strict comparison - requested userId MUST match mapping
        if (userId !== authorizedUserId) {
            console.warn(`🚨 Authorization failed: UID ${authenticatedUid} tried to access ${userId} but owns ${authorizedUserId}`);
            attemptLog.error = 'Unauthorized wallet access';
            attemptLog.authorizedUserId = authorizedUserId;
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(403).json({ error: 'Unauthorized: Cannot access another user\'s wallet' });
        }
        
        // ✅ Use the authoritative userId (verified to match request)
        const walletUserId = authorizedUserId;
        attemptLog.authorizedUserId = walletUserId;
        
        // ✅ Validate recipient address and amount
        if (!ethers.utils.isAddress(to)) {
            attemptLog.error = 'Invalid recipient address';
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(400).json({ error: 'Invalid recipient address' });
        }
        
        if (parseFloat(amount) <= 0) {
            attemptLog.error = 'Invalid amount';
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(400).json({ error: 'Amount must be positive' });
        }
        
        // ✅ Execute withdrawal using authoritative userId
        console.log(`💸 Authorized withdrawal: ${amount} BNB from ${walletUserId} to ${to}`);
        const result = await custodialWalletService.sendTransaction(walletUserId, to, amount);
        
        if (result.success) {
            // ✅ Log successful withdrawal
            attemptLog.success = true;
            attemptLog.txHash = result.txHash;
            attemptLog.blockNumber = result.blockNumber;
            await db.collection('custodialWithdrawals').add(attemptLog);
            
            res.status(200).json(result);
        } else {
            // ✅ Log failed transaction
            attemptLog.error = result.error;
            await db.collection('custodialWithdrawals').add(attemptLog);
            
            res.status(400).json(result);
        }
    } catch (error) {
        // ✅ Log all failures
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
            console.warn(`🚨 Invalid auth token for withdrawal attempt`);
            attemptLog.error = 'Invalid or expired auth token';
            if (db) await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }
        
        console.error('Error sending BNB:', error);
        attemptLog.error = error.message;
        if (db) await db.collection('custodialWithdrawals').add(attemptLog);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Send PRED tokens from custodial wallet (SECURED V4)
app.post('/api/custodial-wallet/send-pred', async (req, res) => {
    const { userId, to, amount, authToken } = req.body;
    
    // ✅ Log all withdrawal attempts for audit
    const attemptLog = {
        requestedUserId: userId,
        to,
        amount,
        currency: 'PRED',
        timestamp: new Date().toISOString(),
        success: false
    };
    
    // ✅ CRITICAL: Require userId to prevent undefined bypass
    if (!userId) {
        console.warn('🚨 PRED withdrawal attempt without userId');
        attemptLog.error = 'Missing userId';
        if (db) await db.collection('custodialWithdrawals').add(attemptLog);
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!to || !amount) {
        return res.status(400).json({ error: 'Recipient address and amount are required' });
    }
    
    if (!authToken) {
        console.warn('🚨 PRED withdrawal attempt without auth token');
        attemptLog.error = 'No auth token';
        if (db) await db.collection('custodialWithdrawals').add(attemptLog);
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!custodialWalletService || !db) {
        return res.status(503).json({ error: 'Service unavailable' });
    }
    
    try {
        // ✅ SECURITY: Verify Firebase auth token
        const decodedToken = await admin.auth().verifyIdToken(authToken);
        const authenticatedUid = decodedToken.uid;
        attemptLog.firebaseUid = authenticatedUid;
        
        console.log(`🔐 PRED withdrawal request from UID: ${authenticatedUid} for userId: ${userId}`);
        
        // ✅ SECURITY: Look up authoritative wallet mapping by Firebase UID
        const mappingDoc = await db.collection('walletMappings').doc(authenticatedUid).get();
        
        if (!mappingDoc.exists) {
            console.warn(`🚨 No wallet mapping found for UID: ${authenticatedUid}`);
            attemptLog.error = 'No wallet mapping - wallet may be insecure';
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(404).json({ error: 'Wallet not found. Please contact support.' });
        }
        
        const mapping = mappingDoc.data();
        const authorizedUserId = mapping.userId;
        
        // ✅ CRITICAL SECURITY: Strict comparison - requested userId MUST match mapping
        if (userId !== authorizedUserId) {
            console.warn(`🚨 Authorization failed: UID ${authenticatedUid} tried to access ${userId} but owns ${authorizedUserId}`);
            attemptLog.error = 'Unauthorized wallet access';
            attemptLog.authorizedUserId = authorizedUserId;
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(403).json({ error: 'Unauthorized: Cannot access another user\'s wallet' });
        }
        
        // ✅ Use the authoritative userId (verified to match request)
        const walletUserId = authorizedUserId;
        attemptLog.authorizedUserId = walletUserId;
        
        // ✅ Validate recipient address and amount
        if (!ethers.utils.isAddress(to)) {
            attemptLog.error = 'Invalid recipient address';
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(400).json({ error: 'Invalid recipient address' });
        }
        
        if (parseFloat(amount) <= 0) {
            attemptLog.error = 'Invalid amount';
            await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(400).json({ error: 'Amount must be positive' });
        }
        
        // ✅ Execute PRED token withdrawal using authoritative userId
        console.log(`🪙 Authorized PRED withdrawal: ${amount} PRED from ${walletUserId} to ${to}`);
        const result = await custodialWalletService.sendERC20Token(walletUserId, PRED_TOKEN_ADDRESS, to, amount);
        
        if (result.success) {
            // ✅ Log successful withdrawal
            attemptLog.success = true;
            attemptLog.txHash = result.txHash;
            attemptLog.blockNumber = result.blockNumber;
            await db.collection('custodialWithdrawals').add(attemptLog);
            
            res.status(200).json(result);
        } else {
            // ✅ Log failed transaction
            attemptLog.error = result.error;
            await db.collection('custodialWithdrawals').add(attemptLog);
            
            res.status(400).json(result);
        }
    } catch (error) {
        // ✅ Log all failures
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
            console.warn(`🚨 Invalid auth token for PRED withdrawal attempt`);
            attemptLog.error = 'Invalid or expired auth token';
            if (db) await db.collection('custodialWithdrawals').add(attemptLog);
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }
        
        console.error('Error sending PRED:', error);
        attemptLog.error = error.message;
        if (db) await db.collection('custodialWithdrawals').add(attemptLog);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/custodial-wallet/execute-transaction', async (req, res) => {
    try {
        const { userId, to, data, value } = req.body;
        
        if (!userId || !to || !data) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        if (!custodialWalletService) {
            return res.status(503).json({ 
                success: false, 
                error: 'Custodial wallet service unavailable' 
            });
        }
        
        const wallet = await custodialWalletService.getWallet(userId);
        if (!wallet.success) {
            return res.status(404).json({ 
                success: false, 
                error: 'Custodial wallet not found' 
            });
        }
        
        const provider = new ethers.providers.JsonRpcProvider('https://bsc-testnet-dataseed.bnbchain.org');
        const signer = new ethers.Wallet(wallet.privateKey, provider);
        
        const tx = await signer.sendTransaction({
            to,
            data,
            value: ethers.BigNumber.from(value || '0'),
            gasLimit: 300000
        });
        
        console.log(`📤 Custodial transaction hash: ${tx.hash}`);
        
        const receipt = await tx.wait();
        
        console.log(`✅ Custodial transaction confirmed: ${tx.hash}`);
        
        res.json({
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            sponsored: false
        });
        
    } catch (error) {
        console.error('Custodial transaction error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✅ ON-CHAIN BETTING: Places real bets on PredictionMarketV2 contract
app.post('/api/custodial/place-bet', async (req, res) => {
    try {
        const { userId, marketId, pick, amount, currency } = req.body;
        
        // Validation
        if (!userId || !marketId || pick === undefined || !amount || !currency) {
            return res.status(400).json({ 
                error: 'Missing required fields: userId, marketId, pick, amount, currency' 
            });
        }
        
        if (!custodialWalletService) {
            return res.status(503).json({ error: 'Custodial wallet service unavailable' });
        }
        
        // ✅ FIX: Use loadWalletSigner() which returns decrypted signer
        const signer = await custodialWalletService.loadWalletSigner(userId);
        
        // PredictionMarketV2 contract (V4 with initial liquidity + oracle evidence hash)
        const contractAddress = '0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB';
        const predTokenAddress = '0x45C229bF14A36aD14885148E62058C98284B2ae0';
        
        // ✅ FIX: Add 'payable' keyword to ABI so BNB bets don't revert
        const abi = [
            'function placeBet(uint256 _marketId, bool _pick, uint8 _currency, uint256 _amount) external payable'
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, signer);
        
        let tx;
        
        if (currency === 'BNB') {
            // Place BNB bet (Currency.BNB = 0)
            const value = ethers.utils.parseEther(amount.toString());
            tx = await contract.placeBet(marketId, pick, 0, value, { value, gasLimit: 300000 });
            console.log(`📤 BNB bet placed: ${tx.hash}`);
        } else if (currency === 'PRED') {
            // Place PRED bet (Currency.PRED = 1)
            const predAmount = ethers.utils.parseEther(amount.toString());
            
            // First approve PRED token spending
            const predTokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
            const predToken = new ethers.Contract(predTokenAddress, predTokenAbi, signer);
            
            const approveTx = await predToken.approve(contractAddress, predAmount, { gasLimit: 100000 });
            await approveTx.wait();
            console.log(`✅ PRED approved: ${approveTx.hash}`);
            
            // Then place bet
            tx = await contract.placeBet(marketId, pick, 1, predAmount, { gasLimit: 300000 });
            console.log(`📤 PRED bet placed: ${tx.hash}`);
        } else {
            return res.status(400).json({ error: 'Invalid currency. Use BNB or PRED' });
        }
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Bet confirmed in block ${receipt.blockNumber}`);
        
        // Verify transaction hash is valid before returning
        if (!receipt.transactionHash) {
            console.error('❌ WARNING: Receipt missing transactionHash!');
            return res.status(500).json({ 
                error: 'Transaction confirmed but missing blockchain hash' 
            });
        }
        
        console.log(`✅ Real BSC Testnet TX: https://testnet.bscscan.com/tx/${receipt.transactionHash}`);
        
        // Award XP for placing bet
        await addXpToUser(userId, XP_VALUES.PLACE_BET, `Placed a bet on market ${marketId}`);
        
        res.json({
            success: true,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            onChain: true
        });
        
    } catch (error) {
        console.error('On-chain bet error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ON-CHAIN BATCH BETTING: For Quick Play (multiple bets in one transaction)
app.post('/api/custodial/place-batch-bets', async (req, res) => {
    try {
        const { userId, bets } = req.body;
        
        // Validation
        if (!userId || !Array.isArray(bets) || bets.length === 0) {
            return res.status(400).json({ error: 'Missing userId or bets array' });
        }
        
        if (!custodialWalletService) {
            return res.status(503).json({ error: 'Custodial wallet service unavailable' });
        }
        
        // ✅ FIX: Use loadWalletSigner() which returns decrypted signer
        const signer = await custodialWalletService.loadWalletSigner(userId);
        
        // PredictionMarketV2 contract (V4 with initial liquidity + oracle evidence hash)
        const contractAddress = '0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB';
        const predTokenAddress = '0x45C229bF14A36aD14885148E62058C98284B2ae0';
        
        // ✅ FIX: Correct ABI signature - parameter order is: marketIds, picks, amounts, currencies (not currencies, amounts!)
        const abi = [
            'function placeBatchBets(uint256[] memory _marketIds, bool[] memory _picks, uint256[] memory _amounts, uint8[] memory _currencies) external payable'
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, signer);
        
        // ✅ FIX: Parse amounts once and use them consistently
        const marketIds = bets.map(b => b.marketId);
        const picks = bets.map(b => b.pick);
        const amounts = bets.map(b => ethers.utils.parseEther(b.amount.toString()));
        const currencies = bets.map(b => b.currency === 'BNB' ? 0 : 1);
        
        // Calculate total BNB and PRED needed (already parsed)
        const totalBnb = amounts.reduce((sum, amount, i) => {
            return bets[i].currency === 'BNB' ? sum.add(amount) : sum;
        }, ethers.BigNumber.from(0));
        
        const totalPred = amounts.reduce((sum, amount, i) => {
            return bets[i].currency === 'PRED' ? sum.add(amount) : sum;
        }, ethers.BigNumber.from(0));
        
        if (totalPred.gt(0)) {
            const predTokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
            const predToken = new ethers.Contract(predTokenAddress, predTokenAbi, signer);
            const approveTx = await predToken.approve(contractAddress, totalPred, { gasLimit: 100000 });
            await approveTx.wait();
            console.log(`✅ PRED approved for batch: ${approveTx.hash}`);
        }
        
        // ✅ FIX: Call with correct parameter order: marketIds, picks, amounts, currencies
        const tx = await contract.placeBatchBets(marketIds, picks, amounts, currencies, {
            value: totalBnb,
            gasLimit: 500000
        });
        
        console.log(`📤 Batch bet placed: ${tx.hash} (${bets.length} bets)`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Batch bet confirmed in block ${receipt.blockNumber}`);
        
        res.json({
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            betCount: bets.length,
            onChain: true
        });
        
    } catch (error) {
        console.error('Batch bet error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Re-enabled for hybrid mode - wallet users get blockchain, email users get Firestore
app.post('/api/aa/place-bet', async (req, res) => {
    const { userId, marketId, pick, amount } = req.body;
    
    if (!userId || !marketId || pick === undefined || !amount) {
        return res.status(400).json({ error: 'Missing required fields: userId, marketId, pick, amount' });
    }
    
    if (!custodialWalletService || !biconomyAAService) {
        // If blockchain services not available, fall back to Firestore-only betting
        console.log('⚠️ Blockchain services unavailable, using Firestore fallback');
        return res.status(503).json({ 
            error: 'Biconomy service not available. Please configure BICONOMY_PAYMASTER_API_KEY or use external wallet.',
            fallbackAvailable: true 
        });
    }
    
    try {
        const wallet = await custodialWalletService.loadWalletSigner(userId);
        
        // Updated contract address for BSC Testnet deployment
        const contractAddress = '0xdaAf91610e33355c9Cd9258219C6A4822E693f55';
        const abi = [
            'function placeBet(uint256 _marketId, bool _pick) external payable'
        ];
        
        const result = await biconomyAAService.buildContractTransaction(
            wallet.privateKey,
            contractAddress,
            abi,
            'placeBet',
            [marketId, pick],
            amount
        );
        
        if (result.success) {
            await db.collection('custodialTransactions').add({
                userId,
                type: 'bet',
                marketId,
                pick,
                amount,
                txHash: result.txHash,
                blockNumber: result.blockNumber,
                sponsored: true,
                createdAt: new Date().toISOString()
            });
        }
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error placing AA bet:', error);
        res.status(500).json({ error: error.message });
    }
});

// Re-enabled for hybrid mode
app.post('/api/aa/smart-account-address', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!custodialWalletService || !biconomyAAService) {
        return res.status(503).json({ error: 'Required services unavailable' });
    }
    
    try {
        const wallet = await custodialWalletService.loadWalletSigner(userId);
        const result = await biconomyAAService.getSmartAccountAddress(wallet.privateKey);
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Error getting smart account address:', error);
        res.status(500).json({ error: error.message });
    }
});

// Biconomy gasless transaction endpoint for custodial wallets
app.post('/api/biconomy/execute-transaction', async (req, res) => {
    try {
        const { userId, to, data, value } = req.body;
        
        if (!userId || !to || !data) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: userId, to, data' 
            });
        }
        
        // CHECK IF BICONOMY SERVICE IS AVAILABLE
        if (!biconomyAAService) {
            return res.status(503).json({ 
                success: false, 
                error: 'Biconomy service not available. Please configure BICONOMY_PAYMASTER_API_KEY or use external wallet.',
                fallbackRequired: true
            });
        }
        
        if (!custodialWalletService) {
            return res.status(503).json({ 
                success: false, 
                error: 'Custodial wallet service unavailable',
                fallbackRequired: true
            });
        }
        
        // Get custodial wallet private key
        const wallet = await custodialWalletService.getWallet(userId);
        if (!wallet.success) {
            return res.status(404).json({ 
                success: false, 
                error: 'Custodial wallet not found' 
            });
        }
        
        // Execute gasless transaction via Biconomy
        const result = await biconomyAAService.sendSponsoredTransaction(
            wallet.privateKey,
            to,
            data,
            value || '0'
        );
        
        if (!result.success) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            txHash: result.txHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            sponsored: true
        });
        
    } catch (error) {
        console.error('Biconomy transaction error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/biconomy/get-smart-account', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        // CHECK IF BICONOMY SERVICE IS AVAILABLE
        if (!biconomyAAService) {
            return res.status(503).json({ 
                success: false, 
                error: 'Biconomy service not available',
                fallbackRequired: true
            });
        }
        
        if (!custodialWalletService) {
            return res.status(503).json({ 
                success: false, 
                error: 'Custodial wallet service unavailable',
                fallbackRequired: true
            });
        }
        
        const wallet = await custodialWalletService.getWallet(userId);
        if (!wallet.success) {
            return res.status(404).json({ 
                success: false, 
                error: 'Custodial wallet not found' 
            });
        }
        
        const result = await biconomyAAService.getSmartAccountAddress(wallet.privateKey);
        
        if (!result.success) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            address: result.address
        });
        
    } catch (error) {
        console.error('Error getting smart account:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- NEW HELPER: Retry Logic for 503 Errors ---
async function fetchWithRetry(url, options, retries = 3, backoff = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            // If Google says "I'm busy" (503), wait and try again
            if (response.status === 503) {
                console.warn(`⚠️ Google API Overloaded (503). Retrying in ${backoff}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, backoff));
                backoff *= 1.5; // Wait longer next time
                continue;
            }

            return response;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`⚠️ Network error. Retrying...`);
            await new Promise(r => setTimeout(r, backoff));
        }
    }
    throw new Error('Max retries reached. Google is too busy right now.');
}

// --- API Endpoint 1: Secure AI Proxy (Updated with Retry) ---
app.post('/api/gemini', async (req, res) => {
    console.log("Server: /api/gemini endpoint hit");

    const { systemPrompt, userPrompt, tools, jsonSchema } = req.body;

    if (!GEMINI_API_KEY) return res.status(500).json({ error: "API Key missing." });
    if (!systemPrompt || !userPrompt) return res.status(400).json({ error: "Missing prompts." });

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }]
    };

    if (jsonSchema) {
        payload.generationConfig = { responseMimeType: "application/json", responseSchema: jsonSchema };
    } else {
        payload.tools = tools; 
    }

    try {
        // USE THE RETRY FUNCTION HERE
        const googleResponse = await fetchWithRetry(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok) {
            console.error("Google API Error:", data);
            return res.status(googleResponse.status).json(data);
        }
        res.status(200).json(data);

    } catch (error) {
        console.error("Error in /api/gemini:", error);
        res.status(503).json({ error: "AI Service Overloaded. Please try again in a moment." });
    }
});

// --- Internal Helper (Updated with Retry) ---
async function callGoogleApi(payload) {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");

    // USE THE RETRY FUNCTION HERE TOO
    const googleResponse = await fetchWithRetry(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
        console.error("Oracle Google API Error:", data);
        throw new Error(`Google API Error: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
}

// --- ORACLE JOBS (Same logic as before, but using the robust callGoogleApi) ---

async function autoResolveMarkets() {
    if (!db) return console.log("ORACLE: Skipping autoResolveMarkets - Firebase Admin not initialized");
    console.log("ORACLE: Running autoResolveMarkets...");
    const today = new Date().toISOString().split('T')[0];
    const collectionPath = `artifacts/${APP_ID}/public/data/standard_markets`;
    const snapshot = await db.collection(collectionPath).where('isResolved', '==', false).get();

    if (snapshot.empty) return console.log("ORACLE: No unresolved markets.");

    const marketsToResolve = snapshot.docs.filter(doc => doc.data().resolutionDate <= today);
    console.log(`ORACLE: Resolving ${marketsToResolve.length} markets...`);

    for (const doc of marketsToResolve) {
        const market = doc.data();
        const marketId = doc.id;

        try {
            // Try Swarm-Verify multi-agent oracle first (NO API KEYS NEEDED!)
            let resolution;
            let useSwarmVerify = true; // Always use Swarm-Verify (uses OpenAI via Replit + DuckDuckGo)
            
            if (useSwarmVerify) {
                console.log(`🐝 SWARM-VERIFY: Attempting multi-agent resolution for "${market.title}"`);
                try {
                    resolution = await swarmVerifyResolution(market, {
                        geminiApiKey: GEMINI_API_KEY,
                        geminiUrl: GEMINI_URL
                    });
                    
                    console.log(`✅ SWARM-VERIFY: Complete for "${market.title}" - ${resolution.consensus.outcome} (${resolution.consensus.confidence}%)`);
                    
                    // PATH A: High Confidence (>= 90%) - Auto-resolve with 30-min dispute window
                    if (resolution.success && !resolution.requiresManualReview) {
                        const evidenceRef = doc.ref.collection('resolutionEvidence').doc('swarm-verify');
                        await evidenceRef.set({
                            ...resolution,
                            createdAt: new Date().toISOString()
                        });
                        
                        // Update market with consensus - auto-resolve with 30-min dispute window
                        const updateData = {
                            isResolved: true,
                            winningOutcome: resolution.consensus.outcome,
                            resolutionRationale: resolution.consensus.rationale,
                            resolutionSource: resolution.consensus.sources[0] || null,
                            resolutionSources: resolution.consensus.sources,
                            resolutionConfidence: resolution.consensus.confidence,
                            resolutionMethod: 'swarm-verify-auto',
                            resolvedAt: new Date().toISOString(),
                            evidenceHash: resolution.evidence.hash,
                            resolutionPath: 'A',
                            disputeWindowEndsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
                        };
                        
                        await doc.ref.update(updateData);
                        console.log(`ORACLE: ✅ PATH A - Auto-resolved "${market.title}" as ${resolution.consensus.outcome} (confidence: ${resolution.consensus.confidence}%)`);
                        console.log(`ORACLE: 30-minute dispute window started`);
                        continue; // Success - move to next market
                    } 
                    
                    // PATH B: Low Confidence (< 90%) - Flag for manual human review
                    else if (resolution.requiresManualReview) {
                        console.log(`⚠️  PATH B - SWARM-VERIFY: Confidence ${resolution.consensus.confidence}% below auto-resolve threshold (${resolution.consensus.autoResolveThreshold}%)`);
                        
                        // Store evidence and oracle recommendation
                        const evidenceRef = doc.ref.collection('resolutionEvidence').doc('swarm-verify-uncertain');
                        await evidenceRef.set({
                            ...resolution,
                            status: 'PENDING_UNCERTAIN',
                            uncertaintyReason: resolution.uncertaintyReason,
                            createdAt: new Date().toISOString()
                        });
                        
                        // Mark market for manual review - DO NOT auto-resolve
                        await doc.ref.update({
                            resolutionStatus: 'PENDING_UNCERTAIN',
                            resolutionAttemptedAt: new Date().toISOString(),
                            resolutionMethod: 'swarm-verify-uncertain',
                            resolutionConfidence: resolution.consensus.confidence,
                            requiresManualReview: true,
                            uncertaintyReason: resolution.uncertaintyReason,
                            oracleRecommendation: resolution.consensus.outcome, // Store AI recommendation for admin
                            resolutionPath: 'B',
                            flaggedForReview: true
                        });
                        
                        console.log(`ORACLE: ⏸️  PATH B - Market "${market.title}" flagged for manual human review`);
                        console.log(`ORACLE: Oracle recommendation: ${resolution.consensus.outcome} (confidence: ${resolution.consensus.confidence}%)`);
                        console.log(`ORACLE: Reason: ${resolution.uncertaintyReason}`);
                        continue;
                    }
                } catch (swarmError) {
                    console.error(`❌ SWARM-VERIFY failed for ${marketId}:`, swarmError.message);
                    console.log(`🔄 Falling back to legacy Gemini oracle...`);
                }
            }
            
            // Fallback to legacy single-agent Gemini oracle
            console.log(`🤖 Using legacy Gemini oracle for "${market.title}"`);
            const systemPrompt = `As of ${today}, verify the outcome of: "${market.title}". First, search for credible sources. Then respond in this format:
OUTCOME: YES or NO or AMBIGUOUS
RATIONALE: Brief explanation of why this outcome is correct
SOURCE: URL of the most credible source you found (if available)`;
            
            const payload = {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: `Market: "${market.title}"` }] }],
                tools: [{ "google_search": {} }]
            };

            const response = await callGoogleApi(payload);
            const responseText = response.candidates[0].content.parts[0].text.trim();
            
            const outcomeMatch = responseText.match(/OUTCOME:\s*(YES|NO|AMBIGUOUS)/i);
            const rationaleMatch = responseText.match(/RATIONALE:\s*(.+?)(?=SOURCE:|$)/is);
            const sourceMatch = responseText.match(/SOURCE:\s*(https?:\/\/[^\s]+)/i);
            
            const outcome = outcomeMatch ? outcomeMatch[1].toUpperCase() : null;
            const rationale = rationaleMatch ? rationaleMatch[1].trim() : `Market "${market.title}" was resolved by AI Oracle.`;
            const source = sourceMatch ? sourceMatch[1].trim() : null;
            
            const groundingMetadata = response.candidates[0].groundingMetadata;
            let verifiedSource = source;
            
            if (!verifiedSource && groundingMetadata && groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
                const searchQuery = groundingMetadata.webSearchQueries[0];
                verifiedSource = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            }

            if (outcome === 'YES' || outcome === 'NO') {
                const updateData = { 
                    isResolved: true, 
                    winningOutcome: outcome,
                    resolutionRationale: rationale,
                    resolutionMethod: 'gemini-legacy',
                    resolvedAt: new Date().toISOString()
                };
                
                if (verifiedSource) {
                    updateData.resolutionSource = verifiedSource;
                }
                
                await doc.ref.update(updateData);
                console.log(`ORACLE: Resolved ${market.title} as ${outcome} (Gemini Legacy)`);
                if (verifiedSource) console.log(`ORACLE: Source: ${verifiedSource}`);
            }
        } catch (e) {
            console.error(`ORACLE: Failed market ${marketId}:`, e.message);
        }
    }
}

async function createDailyMarkets() {
    if (!db) return console.log("ORACLE: Skipping createDailyMarkets - Firebase Admin not initialized");
    console.log("ORACLE: Running createDailyMarkets...");
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const systemPrompt = `You are a prediction market question generator for Predora. Today's date is ${today}.

CRITICAL RULES:
1. ONLY create markets about FUTURE events (events that will happen AFTER today)
2. NEVER create markets about past events or historical questions
3. AVOID obvious outcomes - no markets about pre-scheduled events like "Will X conference happen on date Y?"
4. Focus on UNCERTAIN outcomes with genuine debate potential
5. Questions should have real uncertainty - avoid 90%+ probability outcomes
6. Good examples: "Will Bitcoin reach $100K by end of month?", "Will OpenAI release GPT-6 this quarter?"
7. Bad examples: "Will scheduled Apple event happen tomorrow?", "Did Bitcoin crash yesterday?"

Create 3 interesting, verifiable prediction market questions. Focus on technology, crypto, AI, business, or current events. Each question should be answerable with YES/NO in 7 days and have genuine uncertainty.`;
        
        const jsonSchema = {
            type: "object",
            properties: {
                markets: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            category: { type: "string", enum: ["CRYPTO", "AI", "TECH", "BUSINESS", "POLITICS"] },
                            resolutionDate: { type: "string" }
                        },
                        required: ["title", "description", "category", "resolutionDate"]
                    }
                }
            },
            required: ["markets"]
        };

        const payload = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: "Generate 3 prediction markets for the next 7 days" }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema }
        };

        const response = await callGoogleApi(payload);
        const data = JSON.parse(response.candidates[0].content.parts[0].text);
        
        // Create all AI-generated markets as on-chain markets
        for (const market of data.markets) {
            try {
                // Create market on PredictionMarketV2 contract
                const resolutionTimestamp = Math.floor(new Date(market.resolutionDate).getTime() / 1000);
                const liquidityBNB = '0.01'; // Small liquidity for AI-generated markets
                
                const tx = await predictionMarketContract.createMarket(
                    market.title,
                    market.description,
                    resolutionTimestamp,
                    {
                        value: ethers.utils.parseEther(liquidityBNB),
                        gasLimit: 500000
                    }
                );
                
                const receipt = await tx.wait();
                console.log(`ORACLE: Created on-chain market TX: ${receipt.transactionHash}`);
                
                // Parse MarketCreated event to get on-chain market ID
                const marketCreatedEvent = receipt.events?.find(e => e.event === 'MarketCreated');
                const onChainMarketId = marketCreatedEvent?.args?.marketId?.toNumber();
                
                if (onChainMarketId !== undefined) {
                    // Link to Firestore with onChainMarketId
                    const collectionPath = `artifacts/${APP_ID}/public/data/standard_markets`;
                    const firestoreDoc = await db.collection(collectionPath).add({
                        title: market.title,
                        description: market.description,
                        category: market.category,
                        resolutionDate: market.resolutionDate,
                        createdAt: new Date().toISOString(),
                        createdBy: 'AI',
                        isResolved: false,
                        onChainMarketId: onChainMarketId,
                        onChainTxHash: receipt.transactionHash,
                        yesPool: 0,
                        noPool: 0,
                        totalVolume: 0
                    });
                    
                    console.log(`ORACLE: Linked market to Firestore - ID: ${firestoreDoc.id}, On-chain ID: ${onChainMarketId}`);
                } else {
                    console.error('ORACLE: Failed to extract on-chain market ID from event');
                }
            } catch (error) {
                console.error(`ORACLE: Error creating on-chain market "${market.title}":`, error.message);
            }
        }
    } catch (error) {
        console.error("ORACLE: Error in createDailyMarkets:", error);
    }
}

async function autoGenerateQuickPlays() {
    if (!db) return console.log("ORACLE: Skipping autoGenerateQuickPlays - Firebase Admin not initialized");
    console.log("ORACLE: Running autoGenerateQuickPlays...");
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const systemPrompt = `You are generating Quick Play prediction questions for Predora. Today's date is ${today}.

CRITICAL RULES:
1. ONLY questions about FUTURE events in the next 24 hours
2. AVOID obvious outcomes or pre-scheduled events
3. Focus on UNCERTAIN, exciting events with genuine debate
4. NO past events, NO historical questions
5. Good: "Will Bitcoin break $95K in next 24h?", "Will a major tech company announce layoffs today?"
6. Bad: "Will scheduled earnings call happen?", "Did stock market close yesterday?"

Generate 5 quick, fun YES/NO prediction questions about uncertain events in the next 24 hours. Make them engaging, fast-paced, and genuinely debatable.`;
        
        const jsonSchema = {
            type: "object",
            properties: {
                questions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            question: { type: "string" },
                            expiresAt: { type: "string" }
                        },
                        required: ["question", "expiresAt"]
                    }
                }
            },
            required: ["questions"]
        };

        const payload = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: "Generate 5 quick play questions" }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema }
        };

        const response = await callGoogleApi(payload);
        const data = JSON.parse(response.candidates[0].content.parts[0].text);
        
        const collectionPath = `artifacts/${APP_ID}/public/data/quick_plays`;
        
        // ⛓️ ON-CHAIN QUICK PLAY: Create markets on-chain for 100% on-chain functionality
        const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
        if (!DEPLOYER_PRIVATE_KEY) {
            console.warn("ORACLE: DEPLOYER_PRIVATE_KEY not set - Quick Plays will be Firestore-only");
        }
        
        for (const item of data.questions) {
            let onChainMarketId = null;
            let onChainTxHash = null;
            
            // Create on-chain market if deployer key available
            if (DEPLOYER_PRIVATE_KEY) {
                try {
                    const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
                    const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
                    
                    const contractAddress = '0xc0c9F3ff25517E7fF83d8be747F544c8595ADEDB';
                    const predTokenAddress = '0x45C229bF14A36aD14885148E62058C98284B2ae0';
                    
                    // Small initial liquidity for Quick Play (0.01 BNB + 6 PRED = ~$12)
                    const liquidityBNB = 0.01;
                    const liquidityBnbWei = ethers.utils.parseEther(liquidityBNB.toString());
                    const halfLiquidityBnb = liquidityBnbWei.div(2);
                    const predLiquidityAmount = ethers.utils.parseEther((liquidityBNB * 600).toString());
                    const halfLiquidityPred = predLiquidityAmount.div(2);
                    
                    // Approve PRED token spending
                    if (predLiquidityAmount.gt(0)) {
                        const predTokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
                        const predToken = new ethers.Contract(predTokenAddress, predTokenAbi, deployerWallet);
                        const approveTx = await predToken.approve(contractAddress, predLiquidityAmount, { gasLimit: 100000 });
                        await approveTx.wait();
                        console.log(`✅ PRED approved for Quick Play: ${approveTx.hash}`);
                    }
                    
                    const contractABI = [
                        'function createMarket(string memory _title, string memory _description, uint256 _resolutionTime, uint256 _initialYesBnb, uint256 _initialNoBnb, uint256 _initialYesPred, uint256 _initialNoPred) external payable returns (uint256)',
                        'event MarketCreated(uint256 indexed marketId, string title, address indexed creator, uint256 initialYesBnb, uint256 initialNoBnb, uint256 initialYesPred, uint256 initialNoPred)'
                    ];
                    const contract = new ethers.Contract(contractAddress, contractABI, deployerWallet);
                    
                    const resolutionTime = Math.floor(new Date(item.expiresAt).getTime() / 1000);
                    
                    console.log(`🎮 Creating Quick Play on-chain: "${item.question}"`);
                    const tx = await contract.createMarket(
                        item.question,
                        "Quick Play market - fast resolution",
                        resolutionTime,
                        halfLiquidityBnb,
                        halfLiquidityBnb,
                        halfLiquidityPred,
                        halfLiquidityPred,
                        { value: liquidityBnbWei, gasLimit: 500000 }
                    );
                    
                    const receipt = await tx.wait();
                    onChainTxHash = receipt.transactionHash;
                    console.log(`⛓️ Quick Play created on-chain: ${onChainTxHash}`);
                    
                    // Extract market ID from event
                    const event = receipt.events?.find(e => e.event === 'MarketCreated');
                    if (event && event.args) {
                        onChainMarketId = event.args.marketId.toNumber();
                        console.log(`📊 Quick Play on-chain market ID: ${onChainMarketId}`);
                    }
                } catch (error) {
                    console.error(`ORACLE: Error creating Quick Play on-chain:`, error.message);
                }
            }
            
            // Store in Firestore with onChainMarketId (if available)
            const quickPlayData = {
                question: item.question,
                expiresAt: item.expiresAt,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            // Add on-chain fields if market was created
            if (onChainMarketId !== null) {
                quickPlayData.onChainMarketId = onChainMarketId;
                quickPlayData.onChainTxHash = onChainTxHash;
                quickPlayData.yesPool = 0; // User bets only, initial liquidity tracked separately on-chain
                quickPlayData.noPool = 0;
                quickPlayData.totalVolume = 0;
            }
            
            await db.collection(collectionPath).add(quickPlayData);
            console.log(`ORACLE: ✅ Quick Play created: ${item.question} ${onChainMarketId ? `(on-chain ID: ${onChainMarketId})` : '(Firestore only)'}`);
        }
    } catch (error) {
        console.error("ORACLE: Error in autoGenerateQuickPlays:", error);
    }
}

app.post('/api/run-jobs', async (req, res) => {
    const { key } = req.body;
    if (!CRON_SECRET || key !== CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        await autoResolveMarkets();
        await createDailyMarkets();
        await autoGenerateQuickPlays();
        res.status(200).json({ success: true });
    } catch (e) {
        console.error("ORACLE: Job failed", e);
        res.status(500).json({ error: "Job failed" });
    }
});

// --- HELPER FUNCTIONS ---
function getMockPrice(asset) { 
    return asset === 'BNB' ? 500 : asset === 'CAKE' ? 3.5 : asset === 'PRED' ? 600 : 1; 
}
function getBalanceField(asset) { 
    return asset === 'BNB' ? 'bnbBalance' : asset === 'CAKE' ? 'cakeBalance' : asset === 'PRED' ? 'predBalance' : 'balance'; 
}

// --- JURY SYSTEM ENDPOINTS ---

function generateJuryCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

app.post('/api/dispute-market', async (req, res) => {
    const { marketId, marketTitle, authToken } = req.body;
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        let callerUserId;
        if (authToken) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(authToken);
                callerUserId = decodedToken.uid;
            } catch (authError) {
                console.warn('Auth token verification failed, allowing for client-side flow:', authError.message);
            }
        }
        
        const marketRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(marketId);
        const marketSnap = await marketRef.get();
        
        if (!marketSnap.exists) {
            return res.status(404).json({ error: 'Market not found' });
        }
        
        const marketData = marketSnap.data();
        
        if (marketData.status === 'disputed') {
            return res.status(400).json({ error: 'Market is already disputed' });
        }
        
        await marketRef.update({
            status: 'disputed',
            disputedAt: new Date().toISOString()
        });
        
        const leaderboardRef = db.collection(`artifacts/${APP_ID}/public/data/leaderboard`);
        const snapshot = await leaderboardRef.orderBy('xp', 'desc').limit(10).get();
        
        if (snapshot.empty) {
            await marketRef.update({ status: marketData.status || null });
            return res.status(404).json({ error: 'No users found for jury' });
        }
        
        const selectedJurors = [];
        const numJurors = Math.min(5, snapshot.docs.length);
        
        const shuffled = snapshot.docs.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, numJurors);
        
        const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        for (const doc of selected) {
            const jurorData = doc.data();
            const code = generateJuryCode();
            
            const codeData = {
                code: code,
                userId: doc.id,
                marketId: marketId,
                marketTitle: marketTitle,
                createdAt: new Date().toISOString(),
                expiresAt: expiryTime.toISOString(),
                used: false,
                usedAt: null
            };
            
            await db.collection(`artifacts/${APP_ID}/public/data/jury_codes`).doc(code).set(codeData);
            
            const juryLink = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/app.html?jury=${code}`;
            
            const notificationData = {
                userId: doc.id,
                type: 'jury_invite',
                marketId: marketId,
                marketTitle: marketTitle,
                juryCode: code,
                juryLink: juryLink,
                message: `You've been selected as a juror for: "${marketTitle}". Click the link to vote: ${juryLink}`,
                createdAt: new Date().toISOString(),
                read: false,
                expiresAt: expiryTime.toISOString()
            };
            
            await db.collection(`artifacts/${APP_ID}/public/data/notifications`).add(notificationData);
            
            selectedJurors.push({
                userId: doc.id,
                displayName: jurorData.displayName || 'Anonymous',
                code: code
            });
        }
        
        res.status(200).json({ 
            success: true, 
            jurors: selectedJurors,
            message: `${selectedJurors.length} jurors have been notified`
        });
        
    } catch (error) {
        console.error('Error creating jury invites:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verify-jury-code', async (req, res) => {
    const { code, authToken } = req.body;
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        let userId;
        if (authToken) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(authToken);
                userId = decodedToken.uid;
            } catch (authError) {
                return res.status(401).json({ error: 'Invalid or expired auth token', valid: false });
            }
        } else {
            return res.status(401).json({ error: 'Authentication required', valid: false });
        }
        
        const codeRef = db.collection(`artifacts/${APP_ID}/public/data/jury_codes`).doc(code);
        const codeSnap = await codeRef.get();
        
        if (!codeSnap.exists) {
            return res.status(404).json({ error: 'Invalid code', valid: false });
        }
        
        const codeData = codeSnap.data();
        
        if (codeData.used) {
            return res.status(400).json({ error: 'Code already used', valid: false });
        }
        
        if (new Date(codeData.expiresAt) < new Date()) {
            return res.status(400).json({ error: 'Code expired', valid: false });
        }
        
        if (codeData.userId !== userId) {
            return res.status(403).json({ error: 'Code not assigned to you', valid: false });
        }
        
        res.status(200).json({ 
            valid: true, 
            marketId: codeData.marketId,
            marketTitle: codeData.marketTitle
        });
        
    } catch (error) {
        console.error('Error verifying jury code:', error);
        res.status(500).json({ error: error.message, valid: false });
    }
});

app.post('/api/use-jury-code', async (req, res) => {
    const { code, authToken } = req.body;
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        let userId;
        if (authToken) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(authToken);
                userId = decodedToken.uid;
            } catch (authError) {
                return res.status(401).json({ error: 'Invalid or expired auth token' });
            }
        } else {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const codeRef = db.collection(`artifacts/${APP_ID}/public/data/jury_codes`).doc(code);
        const codeSnap = await codeRef.get();
        
        if (!codeSnap.exists) {
            return res.status(404).json({ error: 'Invalid code' });
        }
        
        const codeData = codeSnap.data();
        
        if (codeData.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (codeData.used) {
            return res.status(400).json({ error: 'Code already used' });
        }
        
        await codeRef.update({
            used: true,
            usedAt: new Date().toISOString()
        });
        
        res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('Error marking code as used:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/notifications', async (req, res) => {
    const { authToken } = req.query;
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        let userId;
        if (authToken) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(authToken);
                userId = decodedToken.uid;
            } catch (authError) {
                return res.status(401).json({ error: 'Invalid or expired auth token' });
            }
        } else {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const notificationsRef = db.collection(`artifacts/${APP_ID}/public/data/notifications`);
        const snapshot = await notificationsRef
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const notifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                ...data
            });
        });
        
        res.status(200).json({ notifications });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/mark-read', async (req, res) => {
    const { authToken, notificationId } = req.body;
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        let userId;
        if (authToken) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(authToken);
                userId = decodedToken.uid;
            } catch (authError) {
                return res.status(401).json({ error: 'Invalid or expired auth token' });
            }
        } else {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const notificationRef = db.collection(`artifacts/${APP_ID}/public/data/notifications`).doc(notificationId);
        const notificationSnap = await notificationRef.get();
        
        if (!notificationSnap.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        const notificationData = notificationSnap.data();
        if (notificationData.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await notificationRef.update({ read: true });
        
        res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/get-source-link', async (req, res) => {
    const { marketTitle } = req.body;
    
    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-5',
            messages: [
                {
                    role: 'system',
                    content: 'You are a fact-checker. Given a prediction market question, provide a credible news source URL that could verify the outcome. Return only a valid URL from a reputable news source (Reuters, Bloomberg, AP News, BBC, etc.). If you cannot find a specific source, return a search URL for the topic.'
                },
                {
                    role: 'user',
                    content: `Find a verifiable source link for this prediction market: "${marketTitle}"`
                }
            ]
        });
        
        const sourceLink = response.choices[0].message.content.trim();
        
        res.status(200).json({ 
            sourceLink: sourceLink,
            success: true
        });
        
    } catch (error) {
        console.error('Error getting source link:', error);
        res.status(500).json({ error: error.message });
    }
});

// === ADMIN ENDPOINTS ===

function isAdmin(req) {
    const adminSecret = req.headers['x-admin-secret'];
    const configuredAdminSecret = process.env.ADMIN_SECRET;
    
    if (!configuredAdminSecret) {
        console.warn('⚠️ ADMIN_SECRET not configured - admin endpoints disabled');
        return false;
    }
    
    return adminSecret === configuredAdminSecret;
}

function requireAdmin(req, res, next) {
    if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

app.post('/api/admin/disputed-markets', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const marketsRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        const snapshot = await marketsRef.where('status', '==', 'disputed').get();
        
        const disputedMarkets = [];
        
        for (const doc of snapshot.docs) {
            const marketData = doc.data();
            
            const votesRef = db.collection(`artifacts/${APP_ID}/public/data/jury_votes`);
            const votesSnapshot = await votesRef.get();
            
            let yesVotes = 0, noVotes = 0, totalVotes = 0;
            const votes = [];
            
            votesSnapshot.forEach(voteDoc => {
                const voteData = voteDoc.data();
                if (voteData.marketId === doc.id) {
                    totalVotes++;
                    if (voteData.vote === 'YES') yesVotes++;
                    else if (voteData.vote === 'NO') noVotes++;
                    votes.push({
                        userId: voteData.userId,
                        userName: voteData.userName,
                        vote: voteData.vote,
                        timestamp: voteData.timestamp
                    });
                }
            });
            
            const juryCodesRef = db.collection(`artifacts/${APP_ID}/public/data/jury_codes`);
            const juryCodesSnapshot = await juryCodesRef.where('marketId', '==', doc.id).get();
            const totalJurors = juryCodesSnapshot.size;
            
            disputedMarkets.push({
                id: doc.id,
                title: marketData.title,
                description: marketData.description,
                disputedAt: marketData.disputedAt,
                winningOutcome: marketData.winningOutcome,
                yesPool: marketData.yesPool,
                noPool: marketData.noPool,
                juryStats: {
                    yesVotes,
                    noVotes,
                    totalVotes,
                    totalJurors,
                    votes
                }
            });
        }
        
        res.status(200).json({ markets: disputedMarkets });
        
    } catch (error) {
        console.error('Error fetching disputed markets:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/override-market', requireAdmin, async (req, res) => {
    const { marketId, outcome, reason } = req.body;
    
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    if (!marketId || !outcome) {
        return res.status(400).json({ error: 'Missing marketId or outcome' });
    }
    
    try {
        const marketRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(marketId);
        const marketSnap = await marketRef.get();
        
        if (!marketSnap.exists) {
            return res.status(404).json({ error: 'Market not found' });
        }
        
        await marketRef.update({
            isResolved: true,
            winningOutcome: outcome,
            resolutionMethod: 'admin_override',
            adminOverrideReason: reason || 'Admin manual override',
            adminOverrideAt: new Date().toISOString(),
            status: 'resolved',
            disputeStatus: 'admin_resolved'
        });
        
        console.log(`🔧 Admin override: Market ${marketId} resolved as ${outcome}`);
        res.status(200).json({ success: true, message: `Market resolved as ${outcome}` });
        
    } catch (error) {
        console.error('Error overriding market:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/stats', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const marketsRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        const allMarketsSnapshot = await marketsRef.get();
        const disputedMarketsSnapshot = await marketsRef.where('status', '==', 'disputed').get();
        
        const juryCodesRef = db.collection(`artifacts/${APP_ID}/public/data/jury_codes`);
        const juryCodesSnapshot = await juryCodesRef.get();
        const activeJuryCodes = juryCodesSnapshot.docs.filter(doc => {
            const data = doc.data();
            return !data.used && new Date(data.expiresAt) > new Date();
        });
        
        const juryVotesRef = db.collection(`artifacts/${APP_ID}/public/data/jury_votes`);
        const juryVotesSnapshot = await juryVotesRef.get();
        
        res.status(200).json({
            totalMarkets: allMarketsSnapshot.size,
            disputedMarkets: disputedMarketsSnapshot.size,
            totalJuryCodes: juryCodesSnapshot.size,
            activeJuryCodes: activeJuryCodes.length,
            totalJuryVotes: juryVotesSnapshot.size
        });
        
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/verify', requireAdmin, async (req, res) => {
    res.status(200).json({ valid: true, message: 'Admin authenticated successfully' });
});

// Enhancement C: Allow jury/admin to request second Swarm run with updated data
app.post('/api/admin/request-second-swarm', requireAdmin, async (req, res) => {
    const { marketId, reason } = req.body;
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const marketRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(marketId);
        const marketSnap = await marketRef.get();
        
        if (!marketSnap.exists) {
            return res.status(404).json({ error: 'Market not found' });
        }
        
        const market = marketSnap.data();
        
        console.log(`🔄 Second Swarm run requested for market "${market.title}"`);
        console.log(`   Reason: ${reason || 'Admin/jury request for updated data'}`);
        
        // Run Swarm-Verify with fresh data
        const resolution = await swarmVerifyResolution(market, {
            geminiApiKey: GEMINI_API_KEY,
            geminiUrl: GEMINI_URL
        });
        
        // Store second-pass evidence
        const evidenceRef = marketRef.collection('resolutionEvidence').doc('swarm-verify-second-run');
        await evidenceRef.set({
            ...resolution,
            requestReason: reason,
            requestedAt: new Date().toISOString(),
            isJuryRequested: true
        });
        
        // Update market with new resolution data
        await marketRef.update({
            secondSwarmRunCompleted: true,
            secondSwarmRunAt: new Date().toISOString(),
            secondSwarmConfidence: resolution.consensus.confidence,
            secondSwarmOutcome: resolution.consensus.outcome,
            secondSwarmResolutionPath: resolution.resolutionPath,
            lastUpdated: new Date().toISOString()
        });
        
        res.status(200).json({
            success: true,
            resolution,
            message: `Second Swarm run completed: ${resolution.consensus.outcome} (${resolution.consensus.confidence}% confidence, Path ${resolution.resolutionPath})`
        });
        
    } catch (error) {
        console.error('Error running second Swarm:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/normal-markets', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const { filter } = req.body;
        const marketsRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        
        let query = marketsRef;
        if (filter === 'active') {
            query = marketsRef.where('isResolved', '==', false);
        } else if (filter === 'disputed') {
            query = marketsRef.where('status', '==', 'disputed');
        }
        
        const snapshot = await query.get();
        const markets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.status(200).json({ markets });
    } catch (error) {
        console.error('Error fetching normal markets:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/quick-plays', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const quickPlaysRef = db.collection(`artifacts/${APP_ID}/public/data/quick_plays`);
        const snapshot = await quickPlaysRef.get();
        const quickPlays = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.status(200).json({ quickPlays });
    } catch (error) {
        console.error('Error fetching quick plays:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/resolve-quick-play', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    const { quickPlayId, outcome } = req.body;
    
    try {
        const quickPlayRef = db.collection(`artifacts/${APP_ID}/public/data/quick_plays`).doc(quickPlayId);
        await quickPlayRef.update({
            status: 'resolved',
            outcome,
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'admin'
        });
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error resolving quick play:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/quick-polls', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const quickPollsRef = db.collection(`artifacts/${APP_ID}/public/data/quick_polls`);
        const snapshot = await quickPollsRef.get();
        const quickPolls = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.status(200).json({ quickPolls });
    } catch (error) {
        console.error('Error fetching quick polls:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/resolve-quick-poll', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    const { quickPollId, outcome } = req.body;
    
    try {
        const quickPollRef = db.collection(`artifacts/${APP_ID}/public/data/quick_polls`).doc(quickPollId);
        await quickPollRef.update({
            status: 'resolved',
            outcome,
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'admin'
        });
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error resolving quick poll:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/guardrails', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    try {
        const flaggedRef = db.collection(`artifacts/${APP_ID}/public/data/flagged_items`);
        const snapshot = await flaggedRef.get();
        const flaggedItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const stats = {
            duplicatesBlocked: flaggedItems.filter(i => i.type === 'duplicate').length,
            lowQualityBlocked: flaggedItems.filter(i => i.type === 'low-quality').length,
            sybilDetected: flaggedItems.filter(i => i.type === 'sybil').length,
            suspiciousCreators: flaggedItems.filter(i => i.type === 'suspicious-creator').length,
        };
        
        res.status(200).json({ stats, flaggedItems });
    } catch (error) {
        console.error('Error fetching guardrails:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/guardrails/settings', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    const { settings } = req.body;
    
    try {
        const settingsRef = db.collection(`artifacts/${APP_ID}/config`).doc('guardrails');
        await settingsRef.set(settings, { merge: true });
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating guardrail settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/guardrails/unflag', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    const { itemId } = req.body;
    
    try {
        const flaggedRef = db.collection(`artifacts/${APP_ID}/public/data/flagged_items`).doc(itemId);
        await flaggedRef.delete();
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error unflagging item:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/account-abstraction/config', requireAdmin, async (req, res) => {
    
    if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
    }
    
    const { config } = req.body;
    
    try {
        const configRef = db.collection(`artifacts/${APP_ID}/config`).doc('account_abstraction');
        await configRef.set(config, { merge: true });
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving account abstraction config:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/validate-market', async (req, res) => {
    const { title, description, userId } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    try {
        let warnings = [];
        let blocked = false;
        let blockReason = '';
        
        if (db) {
            const marketsRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
            const snapshot = await marketsRef.get();
            const existingMarkets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const duplicateCheck = await checkDuplicateMarket(title, existingMarkets);
            if (duplicateCheck.isDuplicate && duplicateCheck.score > 0.85) {
                blocked = true;
                blockReason = `Duplicate market detected. Too similar to: "${duplicateCheck.similarTo}"`;
                
                await db.collection(`artifacts/${APP_ID}/public/data/flagged_items`).add({
                    type: 'duplicate',
                    title,
                    reason: blockReason,
                    createdAt: new Date().toISOString(),
                    creatorId: userId,
                    similarTo: duplicateCheck.similarTo,
                    score: duplicateCheck.score
                });
            }
            
            if (!blocked) {
                const qualityCheck = await checkMarketQuality(title, description);
                if (qualityCheck.isLowQuality || qualityCheck.score < 0.6) {
                    blocked = true;
                    blockReason = qualityCheck.reason;
                    
                    await db.collection(`artifacts/${APP_ID}/public/data/flagged_items`).add({
                        type: 'low-quality',
                        title,
                        reason: blockReason,
                        createdAt: new Date().toISOString(),
                        creatorId: userId,
                        score: qualityCheck.score
                    });
                }
            }
            
            if (!blocked && userId) {
                const userMarketsSnapshot = await marketsRef.where('creatorId', '==', userId).get();
                const userMarkets = userMarketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const sybilCheck = await checkSybilBehavior(userId, userMarkets);
                if (sybilCheck.isSybil) {
                    blocked = true;
                    blockReason = sybilCheck.reason;
                    
                    await db.collection(`artifacts/${APP_ID}/public/data/flagged_items`).add({
                        type: 'sybil',
                        title,
                        reason: blockReason,
                        createdAt: new Date().toISOString(),
                        creatorId: userId,
                        score: sybilCheck.score
                    });
                }
            }
        }
        
        res.status(200).json({
            valid: !blocked,
            blocked,
            blockReason,
            warnings
        });
        
    } catch (error) {
        console.error('Error validating market:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// --- ACCOUNT ABSTRACTION CONFIG ---
// =====================================================================

app.get('/api/admin/account-abstraction/config', requireAdmin, async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    try {
        const configRef = db.collection(`artifacts/${APP_ID}/public/data/config`).doc('account_abstraction');
        const configDoc = await configRef.get();
        
        if (!configDoc.exists) {
            return res.status(200).json({
                googleAuthEnabled: false,
                appleAuthEnabled: false,
                gasSponsorship: true,
                gasLimit: '0.01',
                paymasterUrl: '',
                biconomyApiKey: ''
            });
        }
        
        res.status(200).json(configDoc.data());
    } catch (error) {
        console.error('Error fetching AA config:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/account-abstraction/config', requireAdmin, async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { config } = req.body;
    
    try {
        const configRef = db.collection(`artifacts/${APP_ID}/public/data/config`).doc('account_abstraction');
        await configRef.set(config, { merge: true });
        
        res.status(200).json({ success: true, message: 'Configuration saved successfully' });
    } catch (error) {
        console.error('Error saving AA config:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/account-abstraction/stats', requireAdmin, async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    try {
        const profilesRef = db.collection(`artifacts/${APP_ID}/public/data/profile`);
        const profilesSnapshot = await profilesRef.get();
        
        let googleLogins = 0;
        let appleLogins = 0;
        profilesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.authMethod === 'google') googleLogins++;
            if (data.authMethod === 'apple') appleLogins++;
        });
        
        res.status(200).json({
            totalUsers: profilesSnapshot.size,
            googleLogins,
            appleLogins,
            gasSponsoredTxs: 0,
            totalGasSpent: '0.00'
        });
    } catch (error) {
        console.error('Error fetching AA stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// --- MARKET DATA API (Historical Data, Analytics, Leaderboards) ---
// =====================================================================

app.get('/api/data/markets', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    try {
        const { category, status, limit = 50, offset = 0 } = req.query;
        let query = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        
        if (category && category !== 'all') {
            query = query.where('category', '==', category);
        }
        if (status) {
            if (status === 'resolved') {
                query = query.where('isResolved', '==', true);
            } else if (status === 'active') {
                query = query.where('isResolved', '==', false);
            }
        }
        
        query = query.orderBy('createdAt', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
        const snapshot = await query.get();
        
        const markets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.status(200).json({ markets, count: markets.length });
    } catch (error) {
        console.error('Error fetching markets data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/data/market/:marketId', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { marketId } = req.params;
    
    try {
        const marketRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(marketId);
        const marketDoc = await marketRef.get();
        
        if (!marketDoc.exists) {
            return res.status(404).json({ error: 'Market not found' });
        }
        
        const pledgesRef = db.collection(`artifacts/${APP_ID}/public/data/pledges`);
        const pledgesSnapshot = await pledgesRef.where('marketId', '==', marketId).get();
        const pledges = pledgesSnapshot.docs.map(doc => doc.data());
        
        const yesCount = pledges.filter(p => p.prediction === 'YES').length;
        const noCount = pledges.filter(p => p.prediction === 'NO').length;
        const totalVolume = pledges.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        res.status(200).json({
            market: { id: marketDoc.id, ...marketDoc.data() },
            stats: {
                totalVolume,
                yesCount,
                noCount,
                totalPledges: pledges.length
            },
            pledges
        });
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/data/market/:marketId/history', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { marketId } = req.params;
    
    try {
        const stakeLogsRef = db.collection(`artifacts/${APP_ID}/public/data/stake_logs`);
        const snapshot = await stakeLogsRef.where('marketId', '==', marketId).orderBy('timestamp', 'asc').get();
        
        const history = snapshot.docs.map(doc => ({
            timestamp: doc.data().timestamp,
            yesOdds: doc.data().yesOdds || 50,
            noOdds: doc.data().noOdds || 50,
            volume: doc.data().volume || 0
        }));
        
        res.status(200).json({ marketId, history });
    } catch (error) {
        console.error('Error fetching market history:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/data/leaderboard', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    try {
        const { limit = 100, sortBy = 'xp' } = req.query;
        const profilesRef = db.collection(`artifacts/${APP_ID}/public/data/profile`);
        
        let query = profilesRef;
        if (sortBy === 'xp') {
            query = query.orderBy('xp', 'desc');
        } else if (sortBy === 'totalEarnings') {
            query = query.orderBy('totalEarnings', 'desc');
        } else if (sortBy === 'winRate') {
            query = query.orderBy('winRate', 'desc');
        }
        
        query = query.limit(parseInt(limit));
        const snapshot = await query.get();
        
        const leaderboard = snapshot.docs.map((doc, index) => ({
            rank: index + 1,
            userId: doc.id,
            displayName: doc.data().displayName || 'Anonymous',
            avatar: doc.data().avatar || '🎯',
            xp: doc.data().xp || 0,
            totalEarnings: doc.data().totalEarnings || 0,
            totalPredictions: doc.data().totalPredictions || 0,
            totalWins: doc.data().totalWins || 0,
            winRate: doc.data().winRate || 0
        }));
        
        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/data/user/:userId/activity', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { userId } = req.params;
    
    try {
        const profileRef = db.collection(`artifacts/${APP_ID}/public/data/profile`).doc(userId);
        const profileDoc = await profileRef.get();
        
        if (!profileDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const pledgesRef = db.collection(`artifacts/${APP_ID}/public/data/pledges`);
        const pledgesSnapshot = await pledgesRef.where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50).get();
        
        const recentActivity = pledgesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const marketsCreatedRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        const marketsSnapshot = await marketsCreatedRef.where('createdBy', '==', userId).get();
        const marketsCreated = marketsSnapshot.size;
        
        res.status(200).json({
            profile: { id: profileDoc.id, ...profileDoc.data() },
            recentActivity,
            stats: {
                marketsCreated,
                totalPledges: recentActivity.length
            }
        });
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/data/stats', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    try {
        const marketsRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        const [allMarketsSnap, resolvedMarketsSnap, activeMarketsSnap] = await Promise.all([
            marketsRef.get(),
            marketsRef.where('isResolved', '==', true).get(),
            marketsRef.where('isResolved', '==', false).get()
        ]);
        
        const pledgesRef = db.collection(`artifacts/${APP_ID}/public/data/pledges`);
        const pledgesSnap = await pledgesRef.get();
        const totalVolume = pledgesSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        
        const profilesRef = db.collection(`artifacts/${APP_ID}/public/data/profile`);
        const profilesSnap = await profilesRef.get();
        
        res.status(200).json({
            totalMarkets: allMarketsSnap.size,
            resolvedMarkets: resolvedMarketsSnap.size,
            activeMarkets: activeMarketsSnap.size,
            totalPledges: pledgesSnap.size,
            totalVolume,
            totalUsers: profilesSnap.size
        });
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// --- MARKET DATA INDEXER API ---
// =====================================================================

/**
 * GET /api/indexer/markets
 * Query all markets with advanced filtering
 * Query params: category, status, isResolved, createdBy, limit, offset, sortBy, search
 */
app.get('/api/indexer/markets', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    try {
        const { 
            category, 
            status, 
            isResolved, 
            createdBy, 
            limit = 50, 
            startAfter,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search 
        } = req.query;
        
        let query = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        
        // Apply ONE filter to avoid composite index requirements
        // Priority: category > status > isResolved > createdBy
        if (category) {
            query = query.where('category', '==', category);
        } else if (status) {
            query = query.where('status', '==', status);
        } else if (isResolved !== undefined) {
            query = query.where('isResolved', '==', isResolved === 'true');
        } else if (createdBy) {
            query = query.where('createdBy', '==', createdBy);
        }
        
        // Apply sorting (only if compatible with filter)
        const sortField = sortBy === 'createdAt' ? 'createdAt' : 'createdAt';
        query = query.orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc');
        
        // Apply cursor-based pagination instead of offset
        if (startAfter) {
            const startDoc = await db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(startAfter).get();
            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }
        
        // Apply limit
        query = query.limit(parseInt(limit) + 1); // +1 to check if there are more
        
        const snapshot = await query.get();
        let markets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Check if there are more results
        const hasMore = markets.length > parseInt(limit);
        if (hasMore) {
            markets = markets.slice(0, parseInt(limit));
        }
        
        // Apply additional client-side filters
        if (search) {
            const searchLower = search.toLowerCase();
            markets = markets.filter(m => 
                m.title?.toLowerCase().includes(searchLower) ||
                m.description?.toLowerCase().includes(searchLower)
            );
        }
        
        const nextCursor = hasMore && markets.length > 0 ? markets[markets.length - 1].id : null;
        
        res.status(200).json({
            markets,
            total: markets.length,
            limit: parseInt(limit),
            nextCursor,
            hasMore
        });
    } catch (error) {
        console.error('Error querying markets:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/indexer/markets/:marketId/history
 * Get historical odds changes for a market
 */
app.get('/api/indexer/markets/:marketId/history', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { marketId } = req.params;
    
    try {
        // Get market basic info
        const marketRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(marketId);
        const marketDoc = await marketRef.get();
        
        if (!marketDoc.exists) {
            return res.status(404).json({ error: 'Market not found' });
        }
        
        // Get odds history (if exists)
        const historyRef = db.collection(`artifacts/${APP_ID}/public/data/market_history`).doc(marketId).collection('odds');
        const historySnapshot = await historyRef.orderBy('timestamp', 'asc').get();
        
        const oddsHistory = historySnapshot.docs.map(doc => ({
            timestamp: doc.data().timestamp,
            yesPercent: doc.data().yesPercent,
            noPercent: doc.data().noPercent
        }));
        
        res.status(200).json({
            marketId,
            market: { id: marketDoc.id, ...marketDoc.data() },
            oddsHistory,
            currentOdds: {
                yesPercent: marketDoc.data().yesPercent,
                noPercent: marketDoc.data().noPercent
            }
        });
    } catch (error) {
        console.error('Error fetching market history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/indexer/markets/:marketId/volume
 * Get volume and activity metrics for a market
 */
app.get('/api/indexer/markets/:marketId/volume', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { marketId } = req.params;
    
    try {
        // Get all pledges for this market
        const pledgesRef = db.collection(`artifacts/${APP_ID}/public/data/pledges`);
        const pledgesSnapshot = await pledgesRef.where('marketId', '==', marketId).get();
        
        let totalVolume = 0;
        let yesVolume = 0;
        let noVolume = 0;
        let uniqueUsers = new Set();
        let volumeOverTime = [];
        
        pledgesSnapshot.docs.forEach(doc => {
            const pledge = doc.data();
            const amount = pledge.amountUsd || pledge.amount || 0;
            
            totalVolume += amount;
            if (pledge.pick === 'YES') yesVolume += amount;
            if (pledge.pick === 'NO') noVolume += amount;
            
            uniqueUsers.add(pledge.userId);
            
            volumeOverTime.push({
                timestamp: pledge.timestamp,
                amount,
                pick: pledge.pick
            });
        });
        
        // Sort by timestamp
        volumeOverTime.sort((a, b) => a.timestamp - b.timestamp);
        
        res.status(200).json({
            marketId,
            volume: {
                total: totalVolume,
                yes: yesVolume,
                no: noVolume
            },
            participants: uniqueUsers.size,
            totalPledges: pledgesSnapshot.size,
            volumeOverTime
        });
    } catch (error) {
        console.error('Error fetching market volume:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/indexer/user/:userId/complete-activity
 * Get comprehensive user activity including all markets, pledges, and performance
 */
app.get('/api/indexer/user/:userId/complete-activity', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { userId } = req.params;
    const { limit = 100 } = req.query;
    
    try {
        // Get user profile
        const profileRef = db.collection(`artifacts/${APP_ID}/public/data/profile`).doc(userId);
        const profileDoc = await profileRef.get();
        
        if (!profileDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get all pledges
        const pledgesRef = db.collection(`artifacts/${APP_ID}/public/data/pledges`);
        const pledgesSnapshot = await pledgesRef
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .get();
        
        const pledges = pledgesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Get markets created by user
        const marketsRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`);
        const marketsSnapshot = await marketsRef.where('createdBy', '==', userId).get();
        const marketsCreated = marketsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Calculate stats
        const activePledges = pledges.filter(p => !p.isResolved);
        const resolvedPledges = pledges.filter(p => p.isResolved);
        const wins = resolvedPledges.filter(p => p.isWinner).length;
        const losses = resolvedPledges.filter(p => !p.isWinner).length;
        const totalStaked = pledges.reduce((sum, p) => sum + (p.amountUsd || p.amount || 0), 0);
        const totalEarnings = resolvedPledges.reduce((sum, p) => sum + (p.payout || 0), 0);
        const netProfit = totalEarnings - totalStaked;
        
        res.status(200).json({
            userId,
            profile: { id: profileDoc.id, ...profileDoc.data() },
            activity: {
                pledges,
                marketsCreated,
                stats: {
                    totalPledges: pledges.length,
                    activePledges: activePledges.length,
                    resolvedPledges: resolvedPledges.length,
                    wins,
                    losses,
                    winRate: resolvedPledges.length > 0 ? (wins / resolvedPledges.length * 100).toFixed(2) : 0,
                    totalStaked,
                    totalEarnings,
                    netProfit,
                    marketsCreated: marketsCreated.length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching complete user activity:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/indexer/markets/:marketId/odds-snapshot
 * Record a snapshot of current odds (for historical tracking)
 * Requires admin authentication
 */
app.post('/api/indexer/markets/:marketId/odds-snapshot', requireAdmin, async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Firebase not initialized' });
    }
    
    const { marketId } = req.params;
    
    try {
        // Get current market state
        const marketRef = db.collection(`artifacts/${APP_ID}/public/data/standard_markets`).doc(marketId);
        const marketDoc = await marketRef.get();
        
        if (!marketDoc.exists) {
            return res.status(404).json({ error: 'Market not found' });
        }
        
        const marketData = marketDoc.data();
        
        // Save odds snapshot
        const historyRef = db.collection(`artifacts/${APP_ID}/public/data/market_history`).doc(marketId).collection('odds');
        await historyRef.add({
            timestamp: new Date().toISOString(),
            yesPercent: marketData.yesPercent,
            noPercent: marketData.noPercent,
            recordedBy: 'admin',
            recordedAt: new Date().toISOString()
        });
        
        res.status(200).json({ 
            success: true,
            message: 'Odds snapshot recorded',
            marketId,
            odds: {
                yesPercent: marketData.yesPercent,
                noPercent: marketData.noPercent
            }
        });
    } catch (error) {
        console.error('Error recording odds snapshot:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Initialize Auto-Payout Job ---
const autoPayoutJob = new AutoPayoutJob();
if (db && process.env.DEPLOY_PRIVATE_KEY) {
    const initialized = autoPayoutJob.initialize(process.env.DEPLOY_PRIVATE_KEY, db);
    if (initialized) {
        autoPayoutJob.start(5); // Check every 5 minutes
        console.log('✅ Auto-payout job started (checks every 5 minutes)');
    }
} else {
    console.warn('⚠️  Auto-payout job not started (missing database or private key)');
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Predora Backend Server is live on port ${PORT}`);
    console.log(`🌐 Landing page: http://localhost:${PORT}/`);
    console.log(`🎮 App: http://localhost:${PORT}/app.html`);
});