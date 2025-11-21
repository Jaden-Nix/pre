import { PrivyClient } from '@privy-io/server-auth';

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

let privyClient = null;

if (PRIVY_APP_ID && PRIVY_APP_SECRET) {
    privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    console.log("✅ Privy Client initialized successfully.");
} else {
    console.warn("⚠️  Privy not initialized (missing PRIVY_APP_ID or PRIVY_APP_SECRET).");
}

export async function verifyPrivyToken(accessToken) {
    if (!privyClient) {
        throw new Error('Privy client not initialized');
    }

    try {
        const verifiedClaims = await privyClient.verifyAuthToken(accessToken);
        return {
            userId: verifiedClaims.userId,
            user: verifiedClaims
        };
    } catch (error) {
        throw new Error(`Privy token verification failed: ${error.message}`);
    }
}

export async function getPrivyUser(userId) {
    if (!privyClient) {
        throw new Error('Privy client not initialized');
    }

    try {
        const user = await privyClient.getUserById(userId);
        return user;
    } catch (error) {
        throw new Error(`Failed to get Privy user: ${error.message}`);
    }
}

export { privyClient };
