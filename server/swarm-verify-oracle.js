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
    // Three-tier confidence system:
    HIGH_CONFIDENCE_THRESHOLD: 90,    // Path A: Auto-resolve (>= 90%)
    MID_CONFIDENCE_THRESHOLD: 85,     // Path A2: Extended AI review + second pass (85-90%)
    LOW_CONFIDENCE_THRESHOLD: 85,     // Path B: Manual human review (< 85%)
    
    AGENT_TIMEOUT_MS: 12000, // 12 seconds per agent
    MAX_RETRIES: 2,
    PARALLEL_MODE: true, // Run agents in parallel (faster but more expensive)
    GEOMETRIC_MEDIAN_MAX_ITERATIONS: 100,
    GEOMETRIC_MEDIAN_TOLERANCE: 1e-6,
    
    // Second-pass settings for mid-confidence tier
    SECOND_PASS_ENABLED: true,
    SECOND_PASS_TEMPERATURE: 0.1, // Lower temperature for more focused second pass
    
    // Multi-model scoring (Enhancement B)
    MULTI_MODEL_SCORING_ENABLED: true,
    SCORING_WEIGHTS: {
        factual: 0.45,       // Fact verification weight
        consistency: 0.25,    // Internal consistency check
        timestamp: 0.20,      // Temporal validity
        sentiment: 0.10       // Bias detection
    },
    USE_BLENDED_SCORE: true, // Use weighted blend vs raw consensus
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
// SECOND-PASS AGENT (for mid-confidence tier 85-90%)
// ============================================================================

/**
 * Conducts a focused second-pass review for mid-confidence cases
 * Uses lower temperature and cross-validation prompts
 */
async function secondPassReview(market, firstPassResults) {
    const sanitized = sanitizeMarketData(market);
    
    const systemPrompt = `You are a verification agent conducting a SECOND-PASS review for market resolution.

CONTEXT: A first-pass multi-agent consensus reached ${firstPassResults.confidence}% confidence in outcome "${firstPassResults.outcome}".
This is in the mid-confidence range (85-90%), requiring additional verification.

Your task: Cross-validate the first-pass conclusion with FOCUSED fact-checking.

Rules:
1. Challenge the first-pass outcome - look for disconfirming evidence
2. Search for recent updates or developments
3. Verify temporal accuracy (has the event actually occurred by the resolution date?)
4. Check for edge cases or technicalities that might change the outcome
5. Be MORE CRITICAL than first-pass agents

Output format:
OUTCOME: YES|NO|AMBIGUOUS
CONFIDENCE: <0-100>
RATIONALE: <focused analysis>
CHANGES_DETECTED: <any new evidence vs first pass>`;

    const userPrompt = `Market Title: "${sanitized.title}"
Description: "${sanitized.description}"
Resolution Date: ${sanitized.resolutionDate}

FIRST-PASS RESULT: ${firstPassResults.outcome} (${firstPassResults.confidence}% confidence)
FIRST-PASS RATIONALE: ${firstPassResults.rationale}

Conduct second-pass verification. Be critical and thorough.`;

    const response = await retryWithBackoff(async () => {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: CONFIG.SECOND_PASS_TEMPERATURE,
            max_completion_tokens: 1200,
        });
        return completion;
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse response
    const outcomeMatch = content.match(/OUTCOME:\s*(YES|NO|AMBIGUOUS)/i);
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
    const rationaleMatch = content.match(/RATIONALE:\s*(.+?)(?=CHANGES_DETECTED:|$)/is);
    const changesMatch = content.match(/CHANGES_DETECTED:\s*(.+?)$/is);

    return {
        agent: 'second-pass-review',
        outcome: outcomeMatch ? outcomeMatch[1].toUpperCase() : 'AMBIGUOUS',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
        rationale: rationaleMatch ? rationaleMatch[1].trim() : content,
        changesDetected: changesMatch ? changesMatch[1].trim() : 'None detected',
        rawResponse: content,
        timestamp: new Date().toISOString(),
        isSecondPass: true
    };
}

// ============================================================================
// MULTI-MODEL SCORING SYSTEM (Phase 3.5)
// ============================================================================

/**
 * Factual Scorer: Verifies factual accuracy using gpt-4o-mini
 * Returns score 0-100
 */
async function factualScorer(market, consensus) {
    const sanitized = sanitizeMarketData(market);
    
    const prompt = `Verify factual accuracy of this market resolution:

Market: "${sanitized.title}"
Description: "${sanitized.description}"
Consensus Outcome: ${consensus.outcome}
Consensus Rationale: ${consensus.rationale.slice(0, 300)}

Rate factual accuracy (0-100). Consider:
- Are facts verifiable?
- Is reasoning sound?
- Any factual errors?

Output: SCORE: <0-100>
REASON: <brief explanation>`;

    try {
        const response = await retryWithBackoff(async () => {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_completion_tokens: 300,
            });
            return completion;
        });

        const content = response.choices[0]?.message?.content || '';
        const scoreMatch = content.match(/SCORE:\s*(\d+)/i);
        return scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1]))) : 70;
    } catch (error) {
        console.warn(`⚠️  Factual scorer failed: ${error.message}`);
        return 70;
    }
}

/**
 * Consistency Scorer: Checks for internal contradictions
 * Uses heuristics + short prompt, returns score 0-100
 */
async function consistencyScorer(market, consensus) {
    const sanitized = sanitizeMarketData(market);
    
    let heuristicScore = 100;
    
    const rationale = consensus.rationale.toLowerCase();
    const outcome = consensus.outcome;
    
    if (outcome === 'YES') {
        const negativeWords = ['no', 'not', 'false', 'denied', 'failed', 'unsuccessful'];
        const negCount = negativeWords.reduce((count, word) => 
            count + (rationale.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
        heuristicScore -= negCount * 8;
    } else if (outcome === 'NO') {
        const positiveWords = ['yes', 'confirmed', 'true', 'verified', 'successful', 'achieved'];
        const posCount = positiveWords.reduce((count, word) => 
            count + (rationale.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
        heuristicScore -= posCount * 8;
    }
    
    if (consensus.agentVotes) {
        const totalVotes = Object.values(consensus.agentVotes).reduce((sum, count) => sum + count, 0);
        const majorityVotes = consensus.agentVotes[outcome] || 0;
        const agreement = majorityVotes / totalVotes;
        if (agreement < 0.6) heuristicScore -= 20;
        else if (agreement < 0.8) heuristicScore -= 10;
    }
    
    const prompt = `Check for contradictions in this reasoning:

Market: "${sanitized.title}"
Outcome: ${consensus.outcome}
Rationale: ${consensus.rationale.slice(0, 400)}

Rate consistency (0-100). Look for:
- Contradictory statements
- Logic flaws
- Conflicting evidence

Output: SCORE: <0-100>`;

    try {
        const response = await retryWithBackoff(async () => {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_completion_tokens: 200,
            });
            return completion;
        });

        const content = response.choices[0]?.message?.content || '';
        const scoreMatch = content.match(/SCORE:\s*(\d+)/i);
        const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;
        
        const blendedScore = Math.round((heuristicScore * 0.4) + (aiScore * 0.6));
        return Math.max(0, Math.min(100, blendedScore));
    } catch (error) {
        console.warn(`⚠️  Consistency scorer failed: ${error.message}`);
        return Math.max(0, Math.min(100, heuristicScore));
    }
}

/**
 * Timestamp Scorer: Validates temporal accuracy
 * Returns score 0-100
 */
async function timestampScorer(market, consensus) {
    const sanitized = sanitizeMarketData(market);
    
    let score = 100;
    
    try {
        const resolutionDate = new Date(sanitized.resolutionDate);
        const now = new Date();
        
        if (resolutionDate > now) {
            const daysUntil = Math.floor((resolutionDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntil > 365) {
                score = 40;
            } else if (daysUntil > 180) {
                score = 55;
            } else if (daysUntil > 90) {
                score = 70;
            } else if (daysUntil > 30) {
                score = 85;
            } else if (daysUntil > 7) {
                score = 95;
            }
        } else {
            const daysPast = Math.floor((now - resolutionDate) / (1000 * 60 * 60 * 24));
            if (daysPast > 365) {
                score = 95;
            } else if (daysPast > 30) {
                score = 100;
            } else if (daysPast > 7) {
                score = 98;
            } else if (daysPast >= 0) {
                score = 90;
            }
        }
        
        const rationale = consensus.rationale.toLowerCase();
        const futureKeywords = ['will', 'upcoming', 'planned', 'scheduled', 'expected'];
        const pastKeywords = ['occurred', 'happened', 'completed', 'finished', 'concluded'];
        
        const hasFutureLanguage = futureKeywords.some(word => rationale.includes(word));
        const hasPastLanguage = pastKeywords.some(word => rationale.includes(word));
        
        if (resolutionDate <= now && hasFutureLanguage && !hasPastLanguage) {
            score = Math.max(40, score - 25);
        }
        
        if (resolutionDate > now && hasPastLanguage && consensus.outcome !== 'AMBIGUOUS') {
            score = Math.max(30, score - 35);
        }
        
    } catch (error) {
        console.warn(`⚠️  Timestamp parsing failed: ${error.message}`);
        score = 75;
    }
    
    return Math.max(0, Math.min(100, score));
}

/**
 * Sentiment Scorer: Detects bias in rationale
 * Uses heuristics to identify overly biased language, returns score 0-100
 */
async function sentimentScorer(market, consensus) {
    let score = 100;
    
    const rationale = consensus.rationale.toLowerCase();
    
    const strongBiasWords = [
        'obviously', 'clearly', 'undoubtedly', 'certainly', 'definitely',
        'absolutely', 'guaranteed', 'impossible', 'never', 'always'
    ];
    const moderateBiasWords = [
        'probably', 'likely', 'unlikely', 'seems', 'appears',
        'supposedly', 'allegedly', 'reportedly'
    ];
    
    const strongCount = strongBiasWords.reduce((count, word) => 
        count + (rationale.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const moderateCount = moderateBiasWords.reduce((count, word) => 
        count + (rationale.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    
    score -= strongCount * 12;
    score -= moderateCount * 5;
    
    const exclamationCount = (rationale.match(/!/g) || []).length;
    score -= exclamationCount * 8;
    
    const allCapsWords = (consensus.rationale.match(/\b[A-Z]{3,}\b/g) || []).length;
    score -= allCapsWords * 6;
    
    const emotionalWords = ['amazing', 'terrible', 'horrible', 'fantastic', 'awful', 'shocking'];
    const emotionalCount = emotionalWords.reduce((count, word) => 
        count + (rationale.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    score -= emotionalCount * 10;
    
    if (consensus.confidence > 95 && strongCount > 2) {
        score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
}

/**
 * Multi-Model Scoring Orchestrator
 * Runs all 4 scorers in parallel and calculates weighted blend
 */
async function runMultiModelScoring(market, consensus, agentResults) {
    console.log(`🎯 Phase 3.5: Running multi-model scoring...`);
    
    const [factualScore, consistencyScore, timestampScore, sentimentScore] = await Promise.all([
        factualScorer(market, consensus),
        consistencyScorer(market, consensus),
        timestampScorer(market, consensus),
        sentimentScorer(market, consensus)
    ]);
    
    console.log(`   Factual: ${factualScore}%, Consistency: ${consistencyScore}%, Timestamp: ${timestampScore}%, Sentiment: ${sentimentScore}%`);
    
    const weights = CONFIG.SCORING_WEIGHTS;
    const blendedScore = Math.round(
        (factualScore * weights.factual) +
        (consistencyScore * weights.consistency) +
        (timestampScore * weights.timestamp) +
        (sentimentScore * weights.sentiment)
    );
    
    const adjustedConfidence = CONFIG.USE_BLENDED_SCORE 
        ? Math.min(consensus.confidence, blendedScore)
        : consensus.confidence;
    
    console.log(`   Blended score: ${blendedScore}%, Adjusted confidence: ${adjustedConfidence}%`);
    
    return {
        factualScore,
        consistencyScore,
        timestampScore,
        sentimentScore,
        blendedScore,
        adjustedConfidence
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
    
    // Phase 3.5: Multi-Model Scoring (post-consensus evaluation)
    let multiModelScores = null;
    let confidenceForRouting = consensus.confidence;
    
    if (CONFIG.MULTI_MODEL_SCORING_ENABLED) {
        try {
            multiModelScores = await runMultiModelScoring(market, consensus, allResults);
            if (CONFIG.USE_BLENDED_SCORE) {
                confidenceForRouting = multiModelScores.adjustedConfidence;
                console.log(`   Using adjusted confidence (${confidenceForRouting}%) for tier routing`);
            }
        } catch (scoringError) {
            console.warn(`⚠️  Multi-model scoring failed: ${scoringError.message}`);
            multiModelScores = {
                factualScore: null,
                consistencyScore: null,
                timestampScore: null,
                sentimentScore: null,
                blendedScore: null,
                adjustedConfidence: consensus.confidence
            };
        }
    }
    
    // Phase 4: Three-Tier Confidence-Based Resolution
    const highThreshold = market.highConfidenceThreshold || CONFIG.HIGH_CONFIDENCE_THRESHOLD;
    const midThreshold = market.midConfidenceThreshold || CONFIG.MID_CONFIDENCE_THRESHOLD;
    const lowThreshold = market.lowConfidenceThreshold || CONFIG.LOW_CONFIDENCE_THRESHOLD;
    
    let finalConsensus = consensus;
    let secondPassResult = null;
    let resolutionPath = '';
    let requiresManualReview = false;
    
    // Tier 1: High Confidence (>= 90%) - PATH A: Auto-resolve
    if (confidenceForRouting >= highThreshold) {
        resolutionPath = 'A';
        requiresManualReview = false;
        console.log(`🎯 Phase 4: PATH A - High confidence (${confidenceForRouting}% >= ${highThreshold}%)`);
        console.log(`   Auto-resolve with 30-minute dispute window`);
    } 
    // Tier 2: Mid Confidence (85-90%) - PATH A2: Extended AI review + second pass
    else if (confidenceForRouting >= midThreshold && confidenceForRouting < highThreshold && CONFIG.SECOND_PASS_ENABLED) {
        resolutionPath = 'A2';
        console.log(`🎯 Phase 4: PATH A2 - Mid confidence (${confidenceForRouting}% in range ${midThreshold}-${highThreshold}%)`);
        console.log(`   Triggering second-pass review...`);
        
        try {
            secondPassResult = await secondPassReview(market, consensus);
            console.log(`✅ Second-pass complete: ${secondPassResult.outcome} (${secondPassResult.confidence}%)`);
            
            // Re-aggregate with second-pass included
            const withSecondPass = [...allResults, secondPassResult];
            finalConsensus = aggregateConsensus(withSecondPass);
            
            console.log(`📊 Final consensus after second-pass: ${finalConsensus.outcome} (${finalConsensus.confidence}%)`);
            
            // After second pass, re-evaluate tier
            if (finalConsensus.confidence >= highThreshold) {
                console.log(`   ✅ Upgraded to PATH A after second pass`);
                resolutionPath = 'A2-upgraded';
                requiresManualReview = false;
            } else if (finalConsensus.confidence >= midThreshold) {
                console.log(`   ⚠️ Still mid-confidence - escalating to PATH B (manual review)`);
                resolutionPath = 'A2-escalated';
                requiresManualReview = true;
            } else {
                console.log(`   ⚠️ Downgraded to PATH B (manual review)`);
                resolutionPath = 'A2-downgraded';
                requiresManualReview = true;
            }
        } catch (secondPassError) {
            console.error(`❌ Second-pass failed:`, secondPassError.message);
            // Fall back to manual review on second-pass failure
            resolutionPath = 'A2-failed';
            requiresManualReview = true;
        }
    }
    // Tier 3: Low Confidence (< 85%) - PATH B: Manual human review
    else {
        resolutionPath = 'B';
        requiresManualReview = true;
        console.log(`🎯 Phase 4: PATH B - Low confidence (${confidenceForRouting}% < ${lowThreshold}%)`);
        console.log(`   Flagging for manual human review`);
    }
    
    // Generate cryptographic evidence hash
    const evidenceHash = generateEvidenceHash({
        market: sanitized,
        agentResults: secondPassResult ? [...allResults, secondPassResult] : allResults,
        consensus: finalConsensus,
        timestamp: new Date().toISOString()
    });
    
    const elapsedTime = Date.now() - startTime;
    
    return {
        success: !requiresManualReview && resolutionPath.startsWith('A'), // Auto-resolve if not manual review
        requiresManualReview,
        resolutionPath,
        uncertaintyReason: requiresManualReview ? `Confidence ${finalConsensus.confidence}% requires human verification` : null,
        hadSecondPass: secondPassResult !== null,
        consensus: {
            outcome: finalConsensus.outcome,
            confidence: finalConsensus.confidence,
            rationale: finalConsensus.rationale,
            sources: finalConsensus.sources,
            resolutionPath,
            highConfidenceThreshold: highThreshold,
            midConfidenceThreshold: midThreshold,
            lowConfidenceThreshold: lowThreshold
        },
        multiModelScores: multiModelScores ? {
            factual: multiModelScores.factualScore,
            consistency: multiModelScores.consistencyScore,
            timestamp: multiModelScores.timestampScore,
            sentiment: multiModelScores.sentimentScore,
            weighted: multiModelScores.blendedScore,
            adjustedConfidence: multiModelScores.adjustedConfidence
        } : null,
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
            parallelMode: CONFIG.PARALLEL_MODE,
            multiModelScoringEnabled: CONFIG.MULTI_MODEL_SCORING_ENABLED
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
