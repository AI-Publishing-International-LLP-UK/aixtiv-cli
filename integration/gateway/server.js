const express = require('express');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

admin.initializeApp({
  credential: serviceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.applicationDefault(),
  projectId: 'api-for-warp-drive'
});

const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Verify Firestore connection
    await admin.firestore().collection('agents').limit(1).get();
    res.json({ status: 'healthy', firestore: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Gateway service listening on port ${port}`);
});

