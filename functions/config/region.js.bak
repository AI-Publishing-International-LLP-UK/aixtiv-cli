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

const { setGlobalOptions } = require('firebase-functions/v2');

// Set default options for all v2 functions
setGlobalOptions({
  region: 'us-west1',
  memory: '256MiB',
  maxInstances: 10,
  timeoutSeconds: 540,
});

// Note: This configuration applies to all functions using v2 APIs.
// Individual functions can override these settings by specifying options directly.
console.log('Firebase Functions v2 global options set to us-west1 region');
