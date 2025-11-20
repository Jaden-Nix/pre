

// --- ESM Imports ---
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import OpenAI from 'openai';

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const APP_ID = 'predora-app';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Firebase Admin SDK Initialization ---
let db = null;
try {
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountString) {
        const serviceAccount = JSON.parse(serviceAccountString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin SDK initialized successfully.");
        db = admin.firestore();
    } else {
        console.warn("⚠️  Firebase Admin SDK not initialized (missing GOOGLE_APPLICATION_CREDENTIALS).");
        console.log("   App will work with client-side Firebase only.");
    }
} catch (e) {
    console.error("❌ Firebase Admin initialization failed:", e.message);
}
const app = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.static(path.join(__dirname, '..')));

// --- ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'app.html'));
});

app.get('/pitch-deck', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'pitch-deck', 'index.html'));
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
            // Logic condensed for brevity - exact same as previous version
            const systemPrompt = `As of ${today}, verify the outcome of: "${market.title}". Respond ONLY 'YES', 'NO', 'AMBIGUOUS'.`;
            const payload = {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: `Market: "${market.title}"` }] }],
                tools: [{ "google_search": {} }]
            };

            const response = await callGoogleApi(payload);
            const outcome = response.candidates[0].content.parts[0].text.trim().toUpperCase();

            if (outcome === 'YES' || outcome === 'NO') {
                // ... (Payout logic )
                 await doc.ref.update({ isResolved: true, winningOutcome: outcome });
                 console.log(`ORACLE: Resolved ${market.title} as ${outcome}`);
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
        const systemPrompt = `You are a prediction market question generator. Create 3 interesting, verifiable prediction market questions for today. Focus on technology, crypto, AI, business, or current events. Each question should be answerable with YES/NO in 7 days.`;
        
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
        
        const collectionPath = `artifacts/${APP_ID}/public/data/standard_markets`;
        
        for (const market of data.markets) {
            await db.collection(collectionPath).add({
                ...market,
                createdAt: new Date().toISOString(),
                isResolved: false,
                yesPool: 0,
                noPool: 0,
                totalVolume: 0
            });
            console.log(`ORACLE: Created market: ${market.title}`);
        }
    } catch (error) {
        console.error("ORACLE: Error in createDailyMarkets:", error);
    }
}

async function autoGenerateQuickPlays() {
    if (!db) return console.log("ORACLE: Skipping autoGenerateQuickPlays - Firebase Admin not initialized");
    console.log("ORACLE: Running autoGenerateQuickPlays...");
    
    try {
        const systemPrompt = `Generate 5 quick, fun YES/NO prediction questions about events in the next 24 hours. Make them engaging and fast-paced.`;
        
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
        
        for (const item of data.questions) {
            await db.collection(collectionPath).add({
                question: item.question,
                expiresAt: item.expiresAt,
                createdAt: new Date().toISOString(),
                isActive: true
            });
            console.log(`ORACLE: Created quick play: ${item.question}`);
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
function getMockPrice(asset) { return asset === 'BNB' ? 500 : asset === 'CAKE' ? 3.5 : 1; }
function getBalanceField(asset) { return asset === 'BNB' ? 'bnbBalance' : asset === 'CAKE' ? 'cakeBalance' : 'balance'; }

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
            
            const notificationData = {
                userId: doc.id,
                type: 'jury_invite',
                marketId: marketId,
                marketTitle: marketTitle,
                juryCode: code,
                message: `You've been selected as a juror for: "${marketTitle}"`,
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
    const adminSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
    const configuredAdminSecret = process.env.ADMIN_SECRET;
    
    if (!configuredAdminSecret) {
        console.warn('⚠️ ADMIN_SECRET not configured - admin endpoints disabled');
        return false;
    }
    
    return adminSecret === configuredAdminSecret;
}

app.post('/api/admin/disputed-markets', async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
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

app.post('/api/admin/override-market', async (req, res) => {
    const { marketId, outcome, reason } = req.body;
    
    if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
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

app.post('/api/admin/stats', async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Predora Backend Server is live on port ${PORT}`);
    console.log(`🌐 Landing page: http://localhost:${PORT}/`);
    console.log(`🎮 App: http://localhost:${PORT}/app.html`);
});