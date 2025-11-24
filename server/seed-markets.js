import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedMarkets() {
  console.log('🌱 Seeding Quick Play markets...');
  
  const APP_ID = 'predora-hackathon';
  const collectionPath = `artifacts/${APP_ID}/public/data/quick_plays`;
  
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const sampleMarkets = [
    {
      question: "Will Bitcoin break $100K in the next 24 hours?",
      expiresAt: in24Hours.toISOString(),
      createdAt: admin.firestore.Timestamp.now(),
      isActive: true,
      yesPoolBusd: 50,
      noPoolBusd: 50,
      yesVotes: 0,
      noVotes: 0,
      totalVolumeBusd: 0,
      yesPercent: 50,
      noPercent: 50,
      status: 'active'
    },
    {
      question: "Will Ethereum reach $4,000 today?",
      expiresAt: in24Hours.toISOString(),
      createdAt: admin.firestore.Timestamp.now(),
      isActive: true,
      yesPoolBusd: 50,
      noPoolBusd: 50,
      yesVotes: 0,
      noVotes: 0,
      totalVolumeBusd: 0,
      yesPercent: 50,
      noPercent: 50,
      status: 'active'
    },
    {
      question: "Will BNB price increase by 5% in the next 24h?",
      expiresAt: in24Hours.toISOString(),
      createdAt: admin.firestore.Timestamp.now(),
      isActive: true,
      yesPoolBusd: 50,
      noPoolBusd: 50,
      yesVotes: 0,
      noVotes: 0,
      totalVolumeBusd: 0,
      yesPercent: 50,
      noPercent: 50,
      status: 'active'
    },
    {
      question: "Will any major tech company announce layoffs today?",
      expiresAt: in24Hours.toISOString(),
      createdAt: admin.firestore.Timestamp.now(),
      isActive: true,
      yesPoolBusd: 50,
      noPoolBusd: 50,
      yesVotes: 0,
      noVotes: 0,
      totalVolumeBusd: 0,
      yesPercent: 50,
      noPercent: 50,
      status: 'active'
    },
    {
      question: "Will the S&P 500 close green today?",
      expiresAt: in24Hours.toISOString(),
      createdAt: admin.firestore.Timestamp.now(),
      isActive: true,
      yesPoolBusd: 50,
      noPoolBusd: 50,
      yesVotes: 0,
      noVotes: 0,
      totalVolumeBusd: 0,
      yesPercent: 50,
      noPercent: 50,
      status: 'active'
    }
  ];
  
  try {
    for (const market of sampleMarkets) {
      await db.collection(collectionPath).add(market);
      console.log(`✅ Created: ${market.question}`);
    }
    console.log(`\n🎉 Successfully seeded ${sampleMarkets.length} Quick Play markets!`);
  } catch (error) {
    console.error('❌ Error seeding markets:', error);
  }
  
  process.exit(0);
}

seedMarkets();
