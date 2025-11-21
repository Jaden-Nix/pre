/**
 * Swarm-Verify Oracle: Multi-Agent Byzantine Fault-Tolerant Market Resolution
 * 
 * Architecture:
 * - Phase 1: Parallel agent research (Perplexity, GPT-4o, Gemini, Brave Search)
 * - Phase 2: Skeptic agent adversarial verification
 * - Phase 3: Geometric median consensus on confidence scores
 * - Phase 4: Threshold-based resolution (default 85%)
 * 
 * Security: Prompt injection mitigation, input sanitization, cryptographic hashing
 * Fault Tolerance: Byzantine resilient up to 50% faulty agents
 */

import crypto from 'crypto';
import OpenAI from 'openai';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    CONSENSUS_THRESHOLD: 85, // Minimum confidence % to resolve
    AGENT_TIMEOUT_MS: 12000, // 12 seconds per agent
    MAX_RETRIES: 2,
    PARALLEL_MODE: true, // Run agents in parallel (faster but more expensive)
    GEOMETRIC_MEDIAN_MAX_ITERATIONS: 100,
    GEOMETRIC_MEDIAN_TOLERANCE: 1e-6,
};

// ============================================================================
// AGENT CLIENTS
// ============================================================================

/**
 * OpenAI GPT-4o client (via Replit AI Integrations)
 */
const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

/**
 * Utility: Fetch with timeout
 */
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

/**
 * Utility: Exponential backoff retry
 */
async function retryWithBackoff(fn, maxRetries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.min(1000 * Math.pow(2, i), 8000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// ============================================================================
// SECURITY: PROMPT INJECTION MITIGATION
// ============================================================================

/**
 * Sanitize market data to prevent prompt injection
 */
function sanitizeMarketData(market) {
    const sanitize = (str) => {
        if (!str) return '';
        // Remove HTML/JS tags, limit length, escape special chars
        return String(str)
            .replace(/<[^>]*>/g, '')
            .replace(/[<>{}]/g, '')
            .slice(0, 500)
            .trim();
    };
    
    return {
        title: sanitize(market.title),
        description: sanitize(market.description),
        resolutionDate: sanitize(market.resolutionDate),
        category: sanitize(market.category),
    };
}

/**
 * Generate cryptographic hash of evidence
 */
function generateEvidenceHash(data) {
    return crypto.createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
}

// ============================================================================
// AGENT 1: GPT-4O RESEARCH AGENT (via Replit AI Integrations)
// ============================================================================

async function gpt4oResearchAgent(market) {
    const sanitized = sanitizeMarketData(market);
    
    const systemPrompt = `You are a factual research agent for prediction market resolution. 
Your task is to determine if the following market outcome is TRUE or FALSE based on logical reasoning and general knowledge.

Rules:
1. Use credible reasoning and established facts
2. If evidence is inconclusive or contradictory, return AMBIGUOUS
3. Provide confidence score (0-100) based on evidence quality
4. Be thorough but concise

Output format:
OUTCOME: YES|NO|AMBIGUOUS
CONFIDENCE: <0-100>
RATIONALE: <detailed explanation>
SOURCES: <any relevant URLs or references>`;

    const userPrompt = `Market Title: "${sanitized.title}"
Description: "${sanitized.description}"
Resolution Date: ${sanitized.resolutionDate}
Category: ${sanitized.category}

Determine the outcome with maximum accuracy using your knowledge and reasoning.`;

    const response = await retryWithBackoff(async () => {
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // Using gpt-4o for research
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_completion_tokens: 1000,
        });
        return completion;
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse response
    const outcomeMatch = content.match(/OUTCOME:\s*(YES|NO|AMBIGUOUS)/i);
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
    const rationaleMatch = content.match(/RATIONALE:\s*(.+?)(?=SOURCES:|$)/is);
    const sourcesMatch = content.match(/SOURCES:\s*(.+?)$/is);

    return {
        agent: 'gpt4o-research',
        outcome: outcomeMatch ? outcomeMatch[1].toUpperCase() : 'AMBIGUOUS',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 65,
        rationale: rationaleMatch ? rationaleMatch[1].trim() : content,
        sources: sourcesMatch ? sourcesMatch[1].split(',').map(s => s.trim()).filter(s => s.startsWith('http')) : [],
        rawResponse: content,
        timestamp: new Date().toISOString()
    };
}

// ============================================================================
// AGENT 2: GPT-4O-MINI SKEPTIC AGENT (via Replit AI Integrations)
// ============================================================================

async function gpt4oMiniSkepticAgent(market, otherAgentResults = []) {
    const sanitized = sanitizeMarketData(market);
    
    const systemPrompt = `You are a PARANOID SKEPTIC agent designed to adversarially verify prediction market resolutions.

Your role:
1. ASSUME all claims are false until proven with overwhelming evidence
2. Look for contradictions, biases, and unreliable reasoning
3. Challenge assumptions and question weak evidence
4. Only accept outcomes backed by strong logical proof
5. Default to AMBIGUOUS if ANY doubt exists

Be extremely critical and conservative.`;

    let userPrompt = `Market: "${sanitized.title}"
Description: "${sanitized.description}"
Resolution Date: ${sanitized.resolutionDate}`;

    // If other agents provided results, critique them
    if (otherAgentResults.length > 0) {
        userPrompt += `\n\nOTHER AGENTS' FINDINGS (verify these critically):\n`;
        otherAgentResults.forEach((result, i) => {
            userPrompt += `\nAgent ${i + 1} (${result.agent}):
- Outcome: ${result.outcome}
- Confidence: ${result.confidence}%
- Rationale: ${result.rationale.slice(0, 300)}`;
        });
        userPrompt += `\n\nYour task: Adversarially verify these findings. Look for flaws, contradictions, and weak evidence.`;
    }

    userPrompt += `\n\nOutput format:
OUTCOME: YES|NO|AMBIGUOUS
CONFIDENCE: <0-100>
RATIONALE: <critical analysis>`;

    const response = await retryWithBackoff(async () => {
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.4,
            max_completion_tokens: 800,
        });
        return completion;
    });

    const content = response.choices[0]?.message?.content || '';

    const outcomeMatch = content.match(/OUTCOME:\s*(YES|NO|AMBIGUOUS)/i);
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
    const rationaleMatch = content.match(/RATIONALE:\s*(.+?)$/is);

    return {
        agent: 'gpt4o-mini-skeptic',
        outcome: outcomeMatch ? outcomeMatch[1].toUpperCase() : 'AMBIGUOUS',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 30, // Skeptic defaults lower
        rationale: rationaleMatch ? rationaleMatch[1].trim() : content,
        sources: [],
        rawResponse: content,
        timestamp: new Date().toISOString()
    };
}

// ============================================================================
// AGENT 3: DUCKDUCKGO FACT-CHECKER (NO API KEY REQUIRED!)
// ============================================================================

async function duckDuckGoAgent(market) {
    const sanitized = sanitizeMarketData(market);
    const searchQuery = `${sanitized.title} ${sanitized.category}`;

    const response = await retryWithBackoff(async () => {
        const res = await fetchWithTimeout(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            },
            CONFIG.AGENT_TIMEOUT_MS
        );
        
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`DuckDuckGo API error: ${error}`);
        }
        
        return res.json();
    });

    // DuckDuckGo returns instant answers, related topics, and abstract
    const abstract = response.Abstract || '';
    const abstractText = response.AbstractText || '';
    const relatedTopics = response.RelatedTopics || [];
    const abstractSource = response.AbstractSource || '';
    const abstractURL = response.AbstractURL || '';
    
    // Analyze the abstract and related content
    const content = (abstractText + ' ' + relatedTopics.map(t => t.Text || '').join(' ')).toLowerCase();
    
    let outcome = 'AMBIGUOUS';
    let confidence = 45;
    let rationale = 'No definitive information found.';
    
    if (content.length > 50) {
        // Basic keyword analysis
        const yesKeywords = ['confirmed', 'verified', 'true', 'yes', 'successful', 'achieved', 'completed'];
        const noKeywords = ['false', 'denied', 'failed', 'no', 'rejected', 'unsuccessful', 'cancelled'];
        
        const yesCount = yesKeywords.reduce((count, word) => count + (content.match(new RegExp(word, 'g')) || []).length, 0);
        const noCount = noKeywords.reduce((count, word) => count + (content.match(new RegExp(word, 'g')) || []).length, 0);
        
        if (yesCount > noCount * 1.5) {
            outcome = 'YES';
            confidence = Math.min(65, 45 + yesCount * 4);
            rationale = `DuckDuckGo found ${yesCount} positive indicators. ${abstractText.slice(0, 200)}`;
        } else if (noCount > yesCount * 1.5) {
            outcome = 'NO';
            confidence = Math.min(65, 45 + noCount * 4);
            rationale = `DuckDuckGo found ${noCount} negative indicators. ${abstractText.slice(0, 200)}`;
        } else if (abstractText.length > 30) {
            rationale = `Mixed signals from DuckDuckGo. ${abstractText.slice(0, 200)}`;
            confidence = 50;
        }
    }

    return {
        agent: 'duckduckgo',
        outcome,
        confidence,
        rationale,
        sources: abstractURL ? [abstractURL] : [],
        rawResponse: abstractText.slice(0, 500),
        timestamp: new Date().toISOString()
    };
}

// ============================================================================
// AGENT 4: GEMINI INVESTIGATOR (OPTIONAL)
// ============================================================================

async function geminiAgent(market, geminiApiKey, geminiUrl) {
    if (!geminiApiKey || !geminiUrl) {
        throw new Error('Gemini API not configured');
    }

    const sanitized = sanitizeMarketData(market);
    
    const systemPrompt = `You are an investigative research agent. Determine if this prediction market outcome is TRUE or FALSE using web search.

Output format:
OUTCOME: YES|NO|AMBIGUOUS
CONFIDENCE: <0-100>
RATIONALE: <explanation>
SOURCE: <URL>`;

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: `Market: "${sanitized.title}"\nDescription: "${sanitized.description}"` }] }],
        tools: [{ "google_search": {} }]
    };

    const response = await retryWithBackoff(async () => {
        const res = await fetchWithTimeout(
            `${geminiUrl}?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            },
            CONFIG.AGENT_TIMEOUT_MS
        );
        
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Gemini API error: ${error}`);
        }
        
        return res.json();
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const outcomeMatch = content.match(/OUTCOME:\s*(YES|NO|AMBIGUOUS)/i);
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
    const rationaleMatch = content.match(/RATIONALE:\s*(.+?)(?=SOURCE:|$)/is);
    const sourceMatch = content.match(/SOURCE:\s*(https?:\/\/[^\s]+)/i);

    return {
        agent: 'gemini',
        outcome: outcomeMatch ? outcomeMatch[1].toUpperCase() : 'AMBIGUOUS',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 50,
        rationale: rationaleMatch ? rationaleMatch[1].trim() : content,
        sources: sourceMatch ? [sourceMatch[1]] : [],
        rawResponse: content,
        timestamp: new Date().toISOString()
    };
}

// ============================================================================
// GEOMETRIC MEDIAN CONSENSUS (Weiszfeld's Algorithm)
// ============================================================================

/**
 * Compute geometric median of confidence scores using Weiszfeld's algorithm
 * This provides Byzantine fault tolerance - robust to up to 50% faulty agents
 */
function computeGeometricMedian(points, maxIterations = CONFIG.GEOMETRIC_MEDIAN_MAX_ITERATIONS, tolerance = CONFIG.GEOMETRIC_MEDIAN_TOLERANCE) {
    if (points.length === 0) return 0;
    if (points.length === 1) return points[0];
    
    // Convert to 2D points (confidence, 0) for algorithm
    const points2D = points.map(p => [p, 0]);
    
    // Initialize with arithmetic mean
    let y = [
        points2D.reduce((sum, p) => sum + p[0], 0) / points2D.length,
        0
    ];
    
    for (let iter = 0; iter < maxIterations; iter++) {
        // Calculate distances
        const distances = points2D.map(p => 
            Math.sqrt(Math.pow(p[0] - y[0], 2) + Math.pow(p[1] - y[1], 2))
        );
        
        // Avoid division by zero
        const weights = distances.map(d => 1 / (d + 1e-10));
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        
        // Update estimate
        const y_new = [
            weights.reduce((sum, w, i) => sum + w * points2D[i][0], 0) / weightSum,
            0
        ];
        
        // Check convergence
        const diff = Math.sqrt(Math.pow(y_new[0] - y[0], 2));
        if (diff < tolerance) {
            break;
        }
        
        y = y_new;
    }
    
    return Math.max(0, Math.min(100, Math.round(y[0])));
}

/**
 * Aggregate agent results using geometric median consensus
 */
function aggregateConsensus(agentResults) {
    // Group by outcome
    const outcomeGroups = {
        YES: [],
        NO: [],
        AMBIGUOUS: []
    };
    
    agentResults.forEach(result => {
        if (outcomeGroups[result.outcome]) {
            outcomeGroups[result.outcome].push(result);
        }
    });
    
    // Find majority outcome
    const outcomeCounts = {
        YES: outcomeGroups.YES.length,
        NO: outcomeGroups.NO.length,
        AMBIGUOUS: outcomeGroups.AMBIGUOUS.length
    };
    
    const majorityOutcome = Object.keys(outcomeCounts).reduce((a, b) => 
        outcomeCounts[a] > outcomeCounts[b] ? a : b
    );
    
    // Compute geometric median of confidence scores for majority outcome
    const majorityConfidences = outcomeGroups[majorityOutcome].map(r => r.confidence);
    const consensusConfidence = majorityConfidences.length > 0 
        ? computeGeometricMedian(majorityConfidences)
        : 0;
    
    // Aggregate sources
    const allSources = [...new Set(
        agentResults.flatMap(r => r.sources).filter(s => s && s.startsWith('http'))
    )];
    
    // Combine rationales
    const combinedRationale = agentResults
        .map(r => `[${r.agent}] ${r.rationale.slice(0, 200)}`)
        .join('\n\n');
    
    return {
        outcome: majorityOutcome,
        confidence: consensusConfidence,
        rationale: combinedRationale,
        sources: allSources.slice(0, 10),
        agentVotes: outcomeCounts,
        agentResults: agentResults.map(r => ({
            agent: r.agent,
            outcome: r.outcome,
            confidence: r.confidence
        }))
    };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Swarm-Verify: Multi-agent oracle resolution
 */
async function swarmVerifyResolution(market, options = {}) {
    const startTime = Date.now();
    
    console.log(`🐝 SWARM-VERIFY: Resolving market "${market.title}"`);
    
    // Sanitize input
    const sanitized = sanitizeMarketData(market);
    
    // Phase 1: Run agents (parallel or sequential)
    const agentTasks = [];
    const agentErrors = {};
    
    // GPT-4o Research Agent (via Replit AI Integrations - NO API KEY NEEDED)
    agentTasks.push(
        gpt4oResearchAgent(market)
            .catch(err => {
                agentErrors.gpt4o_research = err.message;
                return null;
            })
    );
    
    // DuckDuckGo Agent (NO API KEY NEEDED!)
    agentTasks.push(
        duckDuckGoAgent(market)
            .catch(err => {
                agentErrors.duckduckgo = err.message;
                return null;
            })
    );
    
    // Gemini (if available)
    if (options.geminiApiKey && options.geminiUrl) {
        agentTasks.push(
            geminiAgent(market, options.geminiApiKey, options.geminiUrl)
                .catch(err => {
                    agentErrors.gemini = err.message;
                    return null;
                })
        );
    }
    
    let phase1Results = CONFIG.PARALLEL_MODE
        ? await Promise.all(agentTasks)
        : await agentTasks.reduce(async (acc, task) => {
            const results = await acc;
            const result = await task;
            return [...results, result];
        }, Promise.resolve([]));
    
    // Filter out failed agents
    phase1Results = phase1Results.filter(r => r !== null);
    
    console.log(`✅ Phase 1 complete: ${phase1Results.length} agents responded`);
    
    // Require at least 2 successful agents
    if (phase1Results.length < 2) {
        throw new Error(`Insufficient agents (${phase1Results.length}/2 minimum). Errors: ${JSON.stringify(agentErrors)}`);
    }
    
    // Phase 2: Skeptic agent adversarial verification
    let skepticResult = null;
    try {
        skepticResult = await gpt4oMiniSkepticAgent(market, phase1Results);
        console.log(`🔍 Phase 2 complete: Skeptic verification done`);
    } catch (err) {
        console.warn(`⚠️  Skeptic agent failed: ${err.message}`);
        agentErrors.skeptic = err.message;
    }
    
    // Combine all results
    const allResults = skepticResult 
        ? [...phase1Results, skepticResult]
        : phase1Results;
    
    // Phase 3: Geometric median consensus
    const consensus = aggregateConsensus(allResults);
    console.log(`📊 Phase 3 complete: Consensus reached (${consensus.outcome}, ${consensus.confidence}%)`);
    
    // Phase 4: Threshold check
    const threshold = market.resolutionThreshold || CONFIG.CONSENSUS_THRESHOLD;
    const meetsThreshold = consensus.confidence >= threshold;
    
    console.log(`🎯 Phase 4: Threshold check (${consensus.confidence}% vs ${threshold}% required) - ${meetsThreshold ? 'PASS' : 'FAIL'}`);
    
    // Generate cryptographic evidence hash
    const evidenceHash = generateEvidenceHash({
        market: sanitized,
        agentResults: allResults,
        consensus,
        timestamp: new Date().toISOString()
    });
    
    const elapsedTime = Date.now() - startTime;
    
    return {
        success: meetsThreshold,
        consensus: {
            outcome: consensus.outcome,
            confidence: consensus.confidence,
            rationale: consensus.rationale,
            sources: consensus.sources,
            meetsThreshold,
            threshold
        },
        agents: {
            total: allResults.length,
            votes: consensus.agentVotes,
            results: allResults,
            errors: agentErrors
        },
        evidence: {
            hash: evidenceHash,
            timestamp: new Date().toISOString(),
            elapsedMs: elapsedTime
        },
        metadata: {
            version: '1.0.0',
            algorithm: 'geometric-median-consensus',
            parallelMode: CONFIG.PARALLEL_MODE
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    swarmVerifyResolution,
    CONFIG,
    // For testing
    sanitizeMarketData,
    computeGeometricMedian,
    aggregateConsensus,
    generateEvidenceHash
};
