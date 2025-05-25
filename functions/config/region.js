/**
 * Regional Configuration for Firebase Functions
 * 
 * This file configures all Firebase Functions to deploy to us-west1 region.
 * Used to ensure consistency and prevent accidental deployment to us-central1.
 * 
 * @module config/region
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const functions = require('firebase-functions/v2');

// Set default options for all v2 functions
functions.setGlobalOptions({
  region: 'us-west1',
  memory: '256MiB',
  maxInstances: 10
});

// Export the configured functions object
module.exports = {
  regional: {
    firestore: functions.firestore,
    scheduler: functions.scheduler,
    https: functions.https
  }
};
