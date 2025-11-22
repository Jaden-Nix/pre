const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test user credentials (you'll need to provide these)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testPassword123';

async function testOnChainFlow() {
    try {
        console.log('🧪 Testing On-Chain Flow...\n');

        // Step 1: Get Firebase ID token (simulate login)
        console.log('Step 1: Authenticating user...');
        const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }).catch(err => {
            console.log('⚠️  Login failed - you may need to create a test user first');
            console.log('Error:', err.response?.data || err.message);
            return null;
        });

        if (!authResponse) {
            console.log('\n💡 To test, please:');
            console.log('1. Create a test user in Firebase Auth');
            console.log('2. Update TEST_EMAIL and TEST_PASSWORD in this script');
            return;
        }

        const idToken = authResponse.data.idToken;
        const userId = authResponse.data.userId;
        console.log(`✅ Authenticated as ${userId}\n`);

        // Step 2: Create an on-chain market
        console.log('Step 2: Creating on-chain market...');
        const marketData = {
            title: 'Will BTC reach $100k by end of 2025?',
            description: 'Test on-chain market for betting flow',
            category: 'Crypto',
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            liquidityBNB: '0.01' // 0.01 BNB liquidity
        };

        const createResponse = await axios.post(
            `${BASE_URL}/api/market/create-onchain`,
            marketData,
            { headers: { 'Authorization': `Bearer ${idToken}` } }
        ).catch(err => {
            console.log('❌ Market creation failed');
            console.log('Error:', err.response?.data || err.message);
            throw err;
        });

        const { marketId, onChainMarketId, txHash } = createResponse.data;
        console.log(`✅ Market created!`);
        console.log(`   Firestore ID: ${marketId}`);
        console.log(`   On-chain ID: ${onChainMarketId}`);
        console.log(`   TX: ${txHash}\n`);

        // Step 3: Check custodial wallet balance
        console.log('Step 3: Checking custodial wallet balances...');
        const balanceResponse = await axios.get(
            `${BASE_URL}/api/custodial/balance`,
            { headers: { 'Authorization': `Bearer ${idToken}` } }
        );

        console.log(`✅ Wallet balances:`);
        console.log(`   BNB: ${balanceResponse.data.bnbBalance}`);
        console.log(`   PRED: ${balanceResponse.data.predBalance}\n`);

        // Step 4: Place a bet with BNB
        console.log('Step 4: Placing BNB bet...');
        const bnbBetResponse = await axios.post(
            `${BASE_URL}/api/custodial/place-bet`,
            {
                userId: userId,
                onChainMarketId: onChainMarketId,
                pick: true, // YES
                amount: '0.001',
                currency: 'BNB'
            },
            { headers: { 'Authorization': `Bearer ${idToken}` } }
        ).catch(err => {
            console.log('❌ BNB bet failed');
            console.log('Error:', err.response?.data || err.message);
            throw err;
        });

        console.log(`✅ BNB bet placed!`);
        console.log(`   TX: ${bnbBetResponse.data.txHash}\n`);

        // Step 5: Place a bet with PRED
        console.log('Step 5: Placing PRED bet...');
        const predBetResponse = await axios.post(
            `${BASE_URL}/api/custodial/place-bet`,
            {
                userId: userId,
                onChainMarketId: onChainMarketId,
                pick: false, // NO
                amount: '10',
                currency: 'PRED'
            },
            { headers: { 'Authorization': `Bearer ${idToken}` } }
        ).catch(err => {
            console.log('❌ PRED bet failed');
            console.log('Error:', err.response?.data || err.message);
            throw err;
        });

        console.log(`✅ PRED bet placed!`);
        console.log(`   TX: ${predBetResponse.data.txHash}\n`);

        // Step 6: Check final balances
        console.log('Step 6: Checking final balances...');
        const finalBalanceResponse = await axios.get(
            `${BASE_URL}/api/custodial/balance`,
            { headers: { 'Authorization': `Bearer ${idToken}` } }
        );

        console.log(`✅ Final wallet balances:`);
        console.log(`   BNB: ${finalBalanceResponse.data.bnbBalance}`);
        console.log(`   PRED: ${finalBalanceResponse.data.predBalance}\n`);

        console.log('🎉 All tests passed! On-chain flow is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

testOnChainFlow();
