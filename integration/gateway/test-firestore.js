const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'api-for-warp-drive'
});

const db = admin.firestore();

db.collection('agent-registry').limit(1).get().then(snapshot => {
  snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()));
}).catch(error => {
  console.error('Error:', error);
}).finally(() => {
  process.exit();
});

