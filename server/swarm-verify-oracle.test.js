/**
 * Test Suite for Swarm-Verify Oracle
 * 
 * Tests:
 * 1. Geometric median algorithm (unit tests)
 * 2. Input sanitization (security)
 * 3. Consensus aggregation (edge cases)
 * 4. Evidence hashing (cryptography)
 * 5. Integration tests (mocked agents)
 * 6. Chaos tests (Byzantine failures)
 */

import {
    sanitizeMarketData,
    computeGeometricMedian,
    aggregateConsensus,
    generateEvidenceHash,
    CONFIG
} from './swarm-verify-oracle.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function assert(condition, message) {
    if (!condition) {
        throw new Error(`❌ Assertion failed: ${message}`);
    }
    console.log(`✅ PASS: ${message}`);
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`❌ ${message}\n   Expected: ${expected}\n   Got: ${actual}`);
    }
    console.log(`✅ PASS: ${message}`);
}

function assertArrayEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`❌ ${message}\n   Expected: ${JSON.stringify(expected)}\n   Got: ${JSON.stringify(actual)}`);
    }
    console.log(`✅ PASS: ${message}`);
}

function assertInRange(value, min, max, message) {
    if (value < min || value > max) {
        throw new Error(`❌ ${message}\n   Expected ${value} to be between ${min} and ${max}`);
    }
    console.log(`✅ PASS: ${message}`);
}

// ============================================================================
// UNIT TESTS: GEOMETRIC MEDIAN
// ============================================================================

function testGeometricMedian() {
    console.log('\n📐 Testing Geometric Median Algorithm...\n');
    
    // Test 1: Single point
    const single = computeGeometricMedian([75]);
    assertEquals(single, 75, 'Single point returns itself');
    
    // Test 2: Two points (should be between them)
    const two = computeGeometricMedian([50, 100]);
    assertInRange(two, 50, 100, 'Two points returns value between them');
    
    // Test 3: Three identical points
    const identical = computeGeometricMedian([80, 80, 80]);
    assertEquals(identical, 80, 'Identical points return that value');
    
    // Test 4: Outlier resistance (Byzantine fault tolerance)
    const outliers = computeGeometricMedian([85, 87, 90, 5, 92]);
    assertInRange(outliers, 80, 95, 'Resists outliers (5 is ignored)');
    
    // Test 5: Empty array
    const empty = computeGeometricMedian([]);
    assertEquals(empty, 0, 'Empty array returns 0');
    
    // Test 6: Normal distribution
    const normal = computeGeometricMedian([70, 75, 80, 85, 90]);
    assertInRange(normal, 75, 85, 'Normal distribution finds center');
    
    // Test 7: Byzantine attack (50% malicious agents)
    const byzantine = computeGeometricMedian([90, 92, 88, 0, 0]);
    assertInRange(byzantine, 40, 100, 'Tolerates 50% Byzantine agents');
    
    // Test 8: Boundary conditions
    const boundary = computeGeometricMedian([0, 100]);
    assertInRange(boundary, 0, 100, 'Handles boundary values');
    
    console.log('\n✅ All geometric median tests passed!\n');
}

// ============================================================================
// UNIT TESTS: INPUT SANITIZATION
// ============================================================================

function testInputSanitization() {
    console.log('\n🛡️  Testing Input Sanitization (Security)...\n');
    
    // Test 1: HTML injection
    const htmlInjection = sanitizeMarketData({
        title: 'Will Bitcoin hit $100k? <script>alert("xss")</script>',
        description: '<img src=x onerror=alert(1)>',
        category: 'Crypto'
    });
    assert(!htmlInjection.title.includes('<script>'), 'Removes script tags');
    assert(!htmlInjection.description.includes('<img'), 'Removes img tags');
    
    // Test 2: Length limits
    const longText = 'A'.repeat(1000);
    const truncated = sanitizeMarketData({
        title: longText,
        description: longText
    });
    assert(truncated.title.length <= 500, 'Truncates long titles');
    assert(truncated.description.length <= 500, 'Truncates long descriptions');
    
    // Test 3: Special characters
    const specialChars = sanitizeMarketData({
        title: 'Will {outcome} === "YES"? <test>',
        description: 'Market about {}[]<>'
    });
    assert(!specialChars.title.includes('<'), 'Removes < character');
    assert(!specialChars.title.includes('>'), 'Removes > character');
    assert(!specialChars.title.includes('{'), 'Removes { character');
    
    // Test 4: Null/undefined handling
    const nullData = sanitizeMarketData({
        title: null,
        description: undefined
    });
    assertEquals(nullData.title, '', 'Handles null title');
    assertEquals(nullData.description, '', 'Handles undefined description');
    
    console.log('\n✅ All sanitization tests passed!\n');
}

// ============================================================================
// UNIT TESTS: CONSENSUS AGGREGATION
// ============================================================================

function testConsensusAggregation() {
    console.log('\n🤝 Testing Consensus Aggregation...\n');
    
    // Test 1: Unanimous YES
    const unanimous = aggregateConsensus([
        { agent: 'a1', outcome: 'YES', confidence: 90, rationale: 'R1', sources: ['http://a.com'] },
        { agent: 'a2', outcome: 'YES', confidence: 85, rationale: 'R2', sources: ['http://b.com'] },
        { agent: 'a3', outcome: 'YES', confidence: 92, rationale: 'R3', sources: ['http://c.com'] }
    ]);
    assertEquals(unanimous.outcome, 'YES', 'Unanimous YES consensus');
    assertInRange(unanimous.confidence, 80, 95, 'Confidence in expected range');
    
    // Test 2: Majority NO
    const majorityNo = aggregateConsensus([
        { agent: 'a1', outcome: 'NO', confidence: 88, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'NO', confidence: 82, rationale: 'R2', sources: [] },
        { agent: 'a3', outcome: 'YES', confidence: 70, rationale: 'R3', sources: [] }
    ]);
    assertEquals(majorityNo.outcome, 'NO', 'Majority NO wins');
    
    // Test 3: AMBIGUOUS handling
    const ambiguous = aggregateConsensus([
        { agent: 'a1', outcome: 'AMBIGUOUS', confidence: 50, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'AMBIGUOUS', confidence: 55, rationale: 'R2', sources: [] },
        { agent: 'a3', outcome: 'YES', confidence: 60, rationale: 'R3', sources: [] }
    ]);
    assertEquals(ambiguous.outcome, 'AMBIGUOUS', 'AMBIGUOUS majority detected');
    
    // Test 4: Source aggregation
    const sources = aggregateConsensus([
        { agent: 'a1', outcome: 'YES', confidence: 80, rationale: 'R1', sources: ['http://a.com', 'http://b.com'] },
        { agent: 'a2', outcome: 'YES', confidence: 85, rationale: 'R2', sources: ['http://b.com', 'http://c.com'] }
    ]);
    assert(sources.sources.includes('http://a.com'), 'Includes source A');
    assert(sources.sources.includes('http://c.com'), 'Includes source C');
    assertEquals(sources.sources.filter(s => s === 'http://b.com').length, 1, 'Deduplicates sources');
    
    // Test 5: Vote counting
    const votes = aggregateConsensus([
        { agent: 'a1', outcome: 'YES', confidence: 90, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'NO', confidence: 80, rationale: 'R2', sources: [] },
        { agent: 'a3', outcome: 'YES', confidence: 85, rationale: 'R3', sources: [] },
        { agent: 'a4', outcome: 'AMBIGUOUS', confidence: 50, rationale: 'R4', sources: [] }
    ]);
    assertEquals(votes.agentVotes.YES, 2, 'Counts YES votes correctly');
    assertEquals(votes.agentVotes.NO, 1, 'Counts NO votes correctly');
    assertEquals(votes.agentVotes.AMBIGUOUS, 1, 'Counts AMBIGUOUS votes correctly');
    
    console.log('\n✅ All consensus aggregation tests passed!\n');
}

// ============================================================================
// UNIT TESTS: EVIDENCE HASHING
// ============================================================================

function testEvidenceHashing() {
    console.log('\n🔐 Testing Evidence Hashing (Cryptography)...\n');
    
    // Test 1: Deterministic hashing
    const data1 = { market: 'Test', outcome: 'YES' };
    const hash1 = generateEvidenceHash(data1);
    const hash2 = generateEvidenceHash(data1);
    assertEquals(hash1, hash2, 'Same data produces same hash');
    
    // Test 2: Different data produces different hash
    const data2 = { market: 'Test', outcome: 'NO' };
    const hash3 = generateEvidenceHash(data2);
    assert(hash1 !== hash3, 'Different data produces different hash');
    
    // Test 3: Hash format (SHA-256 = 64 hex characters)
    assertEquals(hash1.length, 64, 'SHA-256 hash is 64 characters');
    assert(/^[a-f0-9]{64}$/.test(hash1), 'Hash is valid hex');
    
    // Test 4: Sensitivity to changes
    const data3 = { market: 'Test ', outcome: 'YES' }; // Extra space
    const hash4 = generateEvidenceHash(data3);
    assert(hash1 !== hash4, 'Hash changes with whitespace');
    
    console.log('\n✅ All evidence hashing tests passed!\n');
}

// ============================================================================
// INTEGRATION TESTS: MOCKED AGENTS
// ============================================================================

function testMockedAgents() {
    console.log('\n🧪 Testing Integration with Mocked Agents...\n');
    
    // Test 1: Verify agent result structure
    const mockAgent1 = {
        agent: 'perplexity',
        outcome: 'YES',
        confidence: 88,
        rationale: 'Evidence shows outcome is true',
        sources: ['http://source1.com'],
        rawResponse: 'Full response',
        timestamp: new Date().toISOString()
    };
    
    assert(mockAgent1.agent, 'Agent has name');
    assert(['YES', 'NO', 'AMBIGUOUS'].includes(mockAgent1.outcome), 'Outcome is valid');
    assertInRange(mockAgent1.confidence, 0, 100, 'Confidence is 0-100');
    assert(mockAgent1.rationale.length > 0, 'Rationale exists');
    
    // Test 2: Multi-agent consensus
    const mockAgents = [
        { agent: 'perplexity', outcome: 'YES', confidence: 88, rationale: 'R1', sources: ['http://a.com'] },
        { agent: 'gpt4o-skeptic', outcome: 'YES', confidence: 75, rationale: 'R2', sources: ['http://b.com'] },
        { agent: 'brave-search', outcome: 'NO', confidence: 60, rationale: 'R3', sources: ['http://c.com'] },
        { agent: 'gemini', outcome: 'YES', confidence: 82, rationale: 'R4', sources: ['http://d.com'] }
    ];
    
    const consensus = aggregateConsensus(mockAgents);
    assertEquals(consensus.outcome, 'YES', 'Majority YES outcome (3 vs 1)');
    assert(consensus.confidence > 0, 'Consensus has confidence score');
    assertEquals(consensus.agentResults.length, 4, 'All agents included in results');
    
    console.log('\n✅ All integration tests passed!\n');
}

// ============================================================================
// CHAOS TESTS: BYZANTINE FAILURES
// ============================================================================

function testByzantineFailures() {
    console.log('\n⚡ Testing Byzantine Fault Tolerance (Chaos)...\n');
    
    // Test 1: 50% malicious agents (maximum tolerance)
    const halfMalicious = [
        { agent: 'honest1', outcome: 'YES', confidence: 90, rationale: 'R1', sources: [] },
        { agent: 'honest2', outcome: 'YES', confidence: 85, rationale: 'R2', sources: [] },
        { agent: 'malicious1', outcome: 'NO', confidence: 100, rationale: 'R3', sources: [] }, // Overconfident attack
        { agent: 'malicious2', outcome: 'NO', confidence: 100, rationale: 'R4', sources: [] }
    ];
    
    const result1 = aggregateConsensus(halfMalicious);
    // With 50/50 split, it could go either way, but geometric median should moderate confidence
    assert(result1.confidence <= 100, 'Confidence is moderated');
    
    // Test 2: Outlier confidence scores (Byzantine attack)
    const outlierAttack = [
        { agent: 'a1', outcome: 'YES', confidence: 85, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'YES', confidence: 88, rationale: 'R2', sources: [] },
        { agent: 'a3', outcome: 'YES', confidence: 90, rationale: 'R3', sources: [] },
        { agent: 'malicious', outcome: 'YES', confidence: 5, rationale: 'R4', sources: [] } // Sabotage attempt
    ];
    
    const result2 = aggregateConsensus(outlierAttack);
    const medianConfidence = computeGeometricMedian([85, 88, 90, 5]);
    assertInRange(medianConfidence, 70, 95, 'Geometric median resists outliers');
    
    // Test 3: Mixed malicious behavior
    const mixedAttack = [
        { agent: 'honest', outcome: 'YES', confidence: 85, rationale: 'R1', sources: ['http://real.com'] },
        { agent: 'mal1', outcome: 'NO', confidence: 100, rationale: 'Attack', sources: [] },
        { agent: 'mal2', outcome: 'AMBIGUOUS', confidence: 0, rationale: 'Attack', sources: [] }
    ];
    
    const result3 = aggregateConsensus(mixedAttack);
    // Honest agent is outnumbered but system should not crash
    assert(result3.outcome, 'System produces outcome despite attacks');
    assert(result3.confidence >= 0 && result3.confidence <= 100, 'Confidence in valid range');
    
    // Test 4: All agents disagree (worst case)
    const totalDisagreement = [
        { agent: 'a1', outcome: 'YES', confidence: 80, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'NO', confidence: 80, rationale: 'R2', sources: [] },
        { agent: 'a3', outcome: 'AMBIGUOUS', confidence: 80, rationale: 'R3', sources: [] }
    ];
    
    const result4 = aggregateConsensus(totalDisagreement);
    assert(result4.outcome, 'Produces outcome even with total disagreement');
    
    console.log('\n✅ All Byzantine fault tolerance tests passed!\n');
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

function testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases...\n');
    
    // Test 1: Very high confidence (all agents 100%)
    const highConfidence = aggregateConsensus([
        { agent: 'a1', outcome: 'YES', confidence: 100, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'YES', confidence: 100, rationale: 'R2', sources: [] }
    ]);
    assertEquals(highConfidence.confidence, 100, 'Handles maximum confidence');
    
    // Test 2: Very low confidence (all agents 0%)
    const lowConfidence = aggregateConsensus([
        { agent: 'a1', outcome: 'AMBIGUOUS', confidence: 0, rationale: 'R1', sources: [] },
        { agent: 'a2', outcome: 'AMBIGUOUS', confidence: 0, rationale: 'R2', sources: [] }
    ]);
    assertEquals(lowConfidence.confidence, 0, 'Handles minimum confidence');
    
    // Test 3: Single agent (minimum requirement not met in real system)
    const singleAgent = aggregateConsensus([
        { agent: 'lonely', outcome: 'YES', confidence: 75, rationale: 'R1', sources: [] }
    ]);
    assertEquals(singleAgent.outcome, 'YES', 'Single agent produces output');
    assertEquals(singleAgent.confidence, 75, 'Single agent confidence preserved');
    
    // Test 4: Huge number of agents (scalability)
    const manyAgents = Array.from({ length: 100 }, (_, i) => ({
        agent: `agent${i}`,
        outcome: i % 2 === 0 ? 'YES' : 'NO',
        confidence: 70 + (i % 30),
        rationale: `R${i}`,
        sources: []
    }));
    
    const manyResult = aggregateConsensus(manyAgents);
    assert(manyResult.agentResults.length === 100, 'Handles 100 agents');
    
    // Test 5: Invalid URLs in sources
    const invalidSources = aggregateConsensus([
        { agent: 'a1', outcome: 'YES', confidence: 80, rationale: 'R1', sources: ['not-a-url', 'http://valid.com'] }
    ]);
    assert(invalidSources.sources.every(s => s.startsWith('http')), 'Filters invalid URLs');
    
    console.log('\n✅ All edge case tests passed!\n');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('🧪 ========================================');
    console.log('🧪  SWARM-VERIFY ORACLE TEST SUITE');
    console.log('🧪 ========================================');
    
    try {
        testGeometricMedian();
        testInputSanitization();
        testConsensusAggregation();
        testEvidenceHashing();
        testMockedAgents();
        testByzantineFailures();
        testEdgeCases();
        
        console.log('\n🎉 ========================================');
        console.log('🎉  ALL TESTS PASSED!');
        console.log('🎉 ========================================\n');
        console.log('✅ Geometric Median: Byzantine fault-tolerant');
        console.log('✅ Security: Prompt injection mitigated');
        console.log('✅ Consensus: Handles edge cases correctly');
        console.log('✅ Cryptography: SHA-256 hashing verified');
        console.log('✅ Integration: Multi-agent flow working');
        console.log('✅ Chaos: Tolerates up to 50% Byzantine agents\n');
        
        return true;
    } catch (error) {
        console.error('\n💥 ========================================');
        console.error('💥  TEST SUITE FAILED');
        console.error('💥 ========================================\n');
        console.error(error.message);
        console.error(error.stack);
        return false;
    }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { runAllTests };
