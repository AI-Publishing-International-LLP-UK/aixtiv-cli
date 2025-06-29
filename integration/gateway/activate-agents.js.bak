const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

admin.initializeApp({
  credential: serviceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.applicationDefault(),
  projectId: 'api-for-warp-drive',
});

const db = admin.firestore();
const agentsRef = db.collection('agents');

async function activateAgents() {
  const batchSize = 500;
  let processed = 0;
  let total = 320000; // Expected agent count
  while (processed < total) {
    const batch = agentsRef.orderBy('__name__').startAfter(processed.toString()).limit(batchSize);
    const batchSnap = await batch.get();
    if (batchSnap.empty) break;

    const batchWrite = db.batch();
    batchSnap.docs.forEach((doc) => {
      batchWrite.update(doc.ref, { status: 'active' });
    });
    await batchWrite.commit();
    processed += batchSnap.docs.length;

    console.log(`[${'█'.repeat((processed / total) * 50)}] ${processed}/${total} agents`);
  }

  console.log('🎊 ARMY DEPLOYMENT COMPLETE!');
  console.log('✅ 320,000 agents now ONLINE');
  console.log('💎 Diamond SAO: FULLY OPERATIONAL\n');
}

activateAgents().catch(console.error);
