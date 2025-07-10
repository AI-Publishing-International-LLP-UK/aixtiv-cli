/**
 * Emotion Tuning System - Deployment Script
 *
 * This script handles the deployment and registration of the emotion tuning system
 * with the Symphony platform. It creates necessary links, updates configurations,
 * and ensures the service is properly registered.
 *
 * (c) 2025 Copyright AI Publishing International LLP
 */

const fs = require('fs').promises;
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

/**
 * Deploy the emotion tuning system
 */
async function deployEmotionTuningSystem() {
  console.log('Deploying Emotion Tuning System...');

  try {
    // Create deployment record
    const deployment = {
      service: 'emotion-tuning',
      version: getVersion(),
      timestamp: new Date().toISOString(),
      status: 'deploying',
      dependencies: ['speech', 'firebase'],
    };

    // Register the service with Symphony
    await registerWithSymphony(deployment);

    // Create service links in Symphony registry
    await createServiceLinks(deployment);

    // Update deployment status
    deployment.status = 'deployed';
    await updateDeploymentStatus(deployment);

    console.log('Emotion Tuning System deployment completed successfully');
    return true;
  } catch (error) {
    console.error('Deployment failed:', error);
    return false;
  }
}

/**
 * Get the current version of the emotion tuning system
 */
function getVersion() {
  try {
    const packageJson = require('../package.json');
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.warn('Could not determine version from package.json, using default');
    return '1.0.0';
  }
}

/**
 * Register the service with Symphony
 */
async function registerWithSymphony(deployment) {
  console.log('Registering Emotion Tuning service with Symphony...');

  const firestore = admin.firestore();

  // Add to Symphony service registry
  await firestore.collection('symphony_services').doc('emotion-tuning').set({
    name: 'Agent Emotion Tuning',
    description: 'Adjusts tone of agent responses based on user preferences',
    version: deployment.version,
    status: 'active',
    type: 'core',
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    dependencies: deployment.dependencies,
  });

  console.log('Service registered with Symphony');
}

/**
 * Create necessary links in Symphony registry
 */
async function createServiceLinks(deployment) {
  console.log('Creating service links...');

  // Create directory for Symphony links if it doesn't exist
  const symphonyDir = path.join(__dirname, '..', 'symphony-integration');
  try {
    await fs.mkdir(symphonyDir, { recursive: true });
  } catch (error) {
    console.warn('Error creating symphony directory:', error);
  }

  // Create emotion tuning service link file
  const linkConfig = {
    service: 'emotion-tuning',
    version: deployment.version,
    type: 'core',
    path: 'src/services/emotion-tuning',
    command: 'copilot:emotion',
    dependencies: deployment.dependencies,
    timestamp: new Date().toISOString(),
  };

  // Write the link file
  await fs.writeFile(
    path.join(symphonyDir, 'emotion-tuning.json'),
    JSON.stringify(linkConfig, null, 2)
  );

  console.log('Service links created');
}

/**
 * Update deployment status
 */
async function updateDeploymentStatus(deployment) {
  console.log('Updating deployment status...');

  const firestore = admin.firestore();

  // Add deployment record
  await firestore.collection('deployments').add({
    ...deployment,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Deployment status updated');
}

// Run the deployment if called directly
if (require.main === module) {
  deployEmotionTuningSystem()
    .then((success) => {
      if (success) {
        console.log('Emotion Tuning System deployed successfully');
        process.exit(0);
      } else {
        console.error('Emotion Tuning System deployment failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Error during deployment:', error);
      process.exit(1);
    });
}

module.exports = {
  deployEmotionTuningSystem,
};
