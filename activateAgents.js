const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

async function activateAllAgents() {
  const agentsRef = db.collection('agents');
  const snapshot = await agentsRef.get();

  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const agentData = doc.data();
    if (agentData.status === 'offline') {
      batch.update(doc.ref, {
        status: 'online',
        workload: '0%',
        activeTasks: 0,
        lastActive: new Date().toISOString(),
      });
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Activated ${count} agents. All systems GO.`);
}

activateAllAgents().catch(console.error);
