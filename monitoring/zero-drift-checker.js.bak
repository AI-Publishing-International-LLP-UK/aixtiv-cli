/**
 * Symphony Zero-Drift Checker
 * Monitors Symphony instances for drift and automatically applies corrections
 * May 12, 2025
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Configuration
const PROJECT_ID = process.env.PROJECT_ID || 'api-for-warp-drive';
const ENVIRONMENTS = ['dev', 'staging', 'production', 'demo', 'sandbox'];
const BASE_DOMAIN = 'asoos.2100.cool';
const BASELINE_THRESHOLD = 0.95; // 95% similarity required to pass
const CHECK_INTERVAL_MINUTES = 15;
const MAX_AUTO_CORRECTIONS = 3; // Maximum auto-corrections before alerting

// Initialize clients
const firestore = new Firestore({
  projectId: PROJECT_ID,
});
const pubsub = new PubSub({ projectId: PROJECT_ID });
const secretManager = new SecretManagerServiceClient();

// Initialize metrics
let driftMetrics = {
  detected: 0,
  corrected: 0,
  failedCorrections: 0,
};

// Baseline templates for different components
const baselineTemplates = {
  api: {},
  ui: {},
  behavior: {},
};

/**
 * Load baselines from Firestore
 */
async function loadBaselines() {
  console.log('Loading baselines from Firestore...');

  try {
    const baselineSnapshot = await firestore.collection('symphony-baselines').doc('current').get();

    if (baselineSnapshot.exists) {
      const data = baselineSnapshot.data();

      baselineTemplates.api = data.api || {};
      baselineTemplates.ui = data.ui || {};
      baselineTemplates.behavior = data.behavior || {};

      console.log('Baselines loaded successfully');
      return true;
    } else {
      console.error('Error: No baseline templates found in Firestore');
      return false;
    }
  } catch (error) {
    console.error('Error loading baselines:', error);
    return false;
  }
}

/**
 * Check API endpoints for drift
 * @param {string} environment - Environment name
 * @returns {Object} - Drift report
 */
async function checkApiDrift(environment) {
  console.log(`Checking API drift for ${environment}...`);

  const domain = `${environment}.symphony.${BASE_DOMAIN}`;
  const endpoints = Object.keys(baselineTemplates.api);
  const results = {};

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`https://${domain}/api/${endpoint}`);
      const baseline = baselineTemplates.api[endpoint];

      // Compare response structure to baseline
      const driftScore = calculateSimilarity(response.data, baseline);

      results[endpoint] = {
        driftScore,
        passing: driftScore >= BASELINE_THRESHOLD,
        timestamp: new Date().toISOString(),
      };

      if (driftScore < BASELINE_THRESHOLD) {
        console.warn(
          `API drift detected in ${environment} for endpoint ${endpoint} (score: ${driftScore})`
        );
      }
    } catch (error) {
      console.error(`Error checking API endpoint ${endpoint} in ${environment}:`, error.message);
      results[endpoint] = {
        error: error.message,
        passing: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return results;
}

/**
 * Check UI components for drift
 * @param {string} environment - Environment name
 * @returns {Object} - Drift report
 */
async function checkUiDrift(environment) {
  console.log(`Checking UI drift for ${environment}...`);

  const domain = `${environment}.symphony.${BASE_DOMAIN}`;
  const components = Object.keys(baselineTemplates.ui);
  const results = {};

  for (const component of components) {
    try {
      // Use DOM extraction API to get component structure
      const response = await axios.post(`https://${domain}/api/dom-extract`, {
        selector: baselineTemplates.ui[component].selector,
      });

      const baseline = baselineTemplates.ui[component].structure;

      // Compare DOM structure to baseline
      const driftScore = calculateSimilarity(response.data, baseline);

      results[component] = {
        driftScore,
        passing: driftScore >= BASELINE_THRESHOLD,
        timestamp: new Date().toISOString(),
      };

      if (driftScore < BASELINE_THRESHOLD) {
        console.warn(
          `UI drift detected in ${environment} for component ${component} (score: ${driftScore})`
        );
      }
    } catch (error) {
      console.error(`Error checking UI component ${component} in ${environment}:`, error.message);
      results[component] = {
        error: error.message,
        passing: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return results;
}

/**
 * Check behavioral aspects for drift
 * @param {string} environment - Environment name
 * @returns {Object} - Drift report
 */
async function checkBehaviorDrift(environment) {
  console.log(`Checking behavior drift for ${environment}...`);

  const domain = `${environment}.symphony.${BASE_DOMAIN}`;
  const behaviors = Object.keys(baselineTemplates.behavior);
  const results = {};

  for (const behavior of behaviors) {
    try {
      // Execute behavior test
      const response = await axios.post(`https://${domain}/api/behavior-test`, {
        testCase: behavior,
        parameters: baselineTemplates.behavior[behavior].parameters,
      });

      const baseline = baselineTemplates.behavior[behavior].expectedResults;

      // Compare behavior results to baseline
      const driftScore = calculateSimilarity(response.data, baseline);

      results[behavior] = {
        driftScore,
        passing: driftScore >= BASELINE_THRESHOLD,
        timestamp: new Date().toISOString(),
      };

      if (driftScore < BASELINE_THRESHOLD) {
        console.warn(
          `Behavior drift detected in ${environment} for ${behavior} (score: ${driftScore})`
        );
      }
    } catch (error) {
      console.error(`Error checking behavior ${behavior} in ${environment}:`, error.message);
      results[behavior] = {
        error: error.message,
        passing: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return results;
}

/**
 * Calculate similarity between actual response and baseline
 * @param {Object} actual - Actual response
 * @param {Object} baseline - Baseline template
 * @returns {number} - Similarity score (0-1)
 */
function calculateSimilarity(actual, baseline) {
  if (!actual || !baseline) return 0;

  try {
    // For simple objects, compare key existence and rough structure
    const baselineKeys = Object.keys(baseline);
    const actualKeys = Object.keys(actual);

    // Check if all baseline keys exist in the actual response
    const matchingKeys = baselineKeys.filter((key) => actualKeys.includes(key));
    const keyMatchRatio = matchingKeys.length / baselineKeys.length;

    // Check data types of matching keys
    let typeMatchCount = 0;
    for (const key of matchingKeys) {
      if (typeof actual[key] === typeof baseline[key]) {
        typeMatchCount++;
      }
    }
    const typeMatchRatio = typeMatchCount / matchingKeys.length;

    // Calculate final similarity score
    return keyMatchRatio * 0.7 + typeMatchRatio * 0.3;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

/**
 * Attempt to automatically correct detected drift
 * @param {string} environment - Environment name
 * @param {Object} driftReport - Drift report
 * @returns {boolean} - Success status
 */
async function applyCorrections(environment, driftReport) {
  console.log(`Applying corrections for ${environment}...`);

  const domain = `${environment}.symphony.${BASE_DOMAIN}`;
  let correctionsApplied = 0;
  let correctionsSucceeded = 0;

  // Get correction token from Secret Manager
  const tokenName = `projects/${PROJECT_ID}/secrets/symphony-correction-token/versions/latest`;
  const [tokenResponse] = await secretManager.accessSecretVersion({ name: tokenName });
  const correctionToken = tokenResponse.payload.data.toString();

  // Apply API corrections
  for (const endpoint in driftReport.api) {
    if (!driftReport.api[endpoint].passing) {
      correctionsApplied++;

      try {
        const response = await axios.post(`https://${domain}/api/system/correct`, {
          type: 'api',
          target: endpoint,
          baseline: baselineTemplates.api[endpoint],
          token: correctionToken,
        });

        if (response.data.success) {
          correctionsSucceeded++;
          console.log(`Successfully corrected API drift for ${endpoint} in ${environment}`);
        } else {
          console.error(
            `Failed to correct API drift for ${endpoint} in ${environment}: ${response.data.message}`
          );
        }
      } catch (error) {
        console.error(
          `Error applying API correction for ${endpoint} in ${environment}:`,
          error.message
        );
      }
    }
  }

  // Apply UI corrections
  for (const component in driftReport.ui) {
    if (!driftReport.ui[component].passing) {
      correctionsApplied++;

      try {
        const response = await axios.post(`https://${domain}/api/system/correct`, {
          type: 'ui',
          target: component,
          baseline: baselineTemplates.ui[component],
          token: correctionToken,
        });

        if (response.data.success) {
          correctionsSucceeded++;
          console.log(`Successfully corrected UI drift for ${component} in ${environment}`);
        } else {
          console.error(
            `Failed to correct UI drift for ${component} in ${environment}: ${response.data.message}`
          );
        }
      } catch (error) {
        console.error(
          `Error applying UI correction for ${component} in ${environment}:`,
          error.message
        );
      }
    }
  }

  // Apply behavior corrections
  for (const behavior in driftReport.behavior) {
    if (!driftReport.behavior[behavior].passing) {
      correctionsApplied++;

      try {
        const response = await axios.post(`https://${domain}/api/system/correct`, {
          type: 'behavior',
          target: behavior,
          baseline: baselineTemplates.behavior[behavior],
          token: correctionToken,
        });

        if (response.data.success) {
          correctionsSucceeded++;
          console.log(`Successfully corrected behavior drift for ${behavior} in ${environment}`);
        } else {
          console.error(
            `Failed to correct behavior drift for ${behavior} in ${environment}: ${response.data.message}`
          );
        }
      } catch (error) {
        console.error(
          `Error applying behavior correction for ${behavior} in ${environment}:`,
          error.message
        );
      }
    }
  }

  // Update metrics
  driftMetrics.detected += correctionsApplied;
  driftMetrics.corrected += correctionsSucceeded;
  driftMetrics.failedCorrections += correctionsApplied - correctionsSucceeded;

  console.log(
    `Applied ${correctionsSucceeded}/${correctionsApplied} corrections for ${environment}`
  );

  // Store the correction record in Firestore
  await firestore.collection('symphony-corrections').add({
    environment,
    timestamp: new Date(),
    corrections: {
      applied: correctionsApplied,
      succeeded: correctionsSucceeded,
      failed: correctionsApplied - correctionsSucceeded,
    },
    report: driftReport,
  });

  return correctionsSucceeded === correctionsApplied;
}

/**
 * Check environment for drift
 * @param {string} environment - Environment name
 */
async function checkEnvironment(environment) {
  console.log(`\n========== Checking ${environment} environment ==========`);

  // Check all aspects for drift
  const apiDrift = await checkApiDrift(environment);
  const uiDrift = await checkUiDrift(environment);
  const behaviorDrift = await checkBehaviorDrift(environment);

  // Consolidate drift report
  const driftReport = {
    environment,
    timestamp: new Date().toISOString(),
    api: apiDrift,
    ui: uiDrift,
    behavior: behaviorDrift,
  };

  // Calculate overall drift status
  const apiPassing = Object.values(apiDrift).every((result) => result.passing);
  const uiPassing = Object.values(uiDrift).every((result) => result.passing);
  const behaviorPassing = Object.values(behaviorDrift).every((result) => result.passing);

  driftReport.status = {
    apiPassing,
    uiPassing,
    behaviorPassing,
    overall: apiPassing && uiPassing && behaviorPassing,
  };

  // Store results in Firestore
  await firestore
    .collection('symphony-drift-checks')
    .doc(`${environment}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
    .set(driftReport);

  // If drift detected, try to correct it
  if (!driftReport.status.overall) {
    console.log(`Drift detected in ${environment} environment. Attempting corrections...`);

    // Get correction count for today
    const today = new Date().toISOString().split('T')[0];
    const correctionCountQuery = await firestore
      .collection('symphony-corrections')
      .where('environment', '==', environment)
      .where('timestamp', '>=', new Date(today))
      .get();

    const correctionCount = correctionCountQuery.size;

    if (correctionCount < MAX_AUTO_CORRECTIONS) {
      const success = await applyCorrections(environment, driftReport);

      if (success) {
        console.log(`Successfully corrected drift in ${environment} environment`);
      } else {
        console.error(`Failed to correct all drift in ${environment} environment`);
        await sendAlert(environment, driftReport);
      }
    } else {
      console.warn(
        `Reached maximum auto-corrections (${MAX_AUTO_CORRECTIONS}) for ${environment} today. Manual intervention required.`
      );
      await sendAlert(environment, driftReport, true);
    }
  } else {
    console.log(`✅ No drift detected in ${environment} environment`);
  }

  // Report metrics to Cloud Monitoring
  await reportMetrics(environment, driftReport);

  console.log(`========== Completed check for ${environment} environment ==========\n`);
}

/**
 * Send alert notification
 * @param {string} environment - Environment name
 * @param {Object} driftReport - Drift report
 * @param {boolean} maxCorrectionsReached - Whether max corrections have been reached
 */
async function sendAlert(environment, driftReport, maxCorrectionsReached = false) {
  console.log(`Sending alert for ${environment}...`);

  try {
    // Create detailed alert message
    const alertData = {
      environment,
      timestamp: new Date().toISOString(),
      maxCorrectionsReached,
      driftReport,
    };

    // Publish alert to PubSub
    const topic = pubsub.topic('symphony-drift-alerts');
    const messageId = await topic.publish(Buffer.from(JSON.stringify(alertData)));

    console.log(`Alert sent with message ID: ${messageId}`);

    // Also log to Firestore for historical tracking
    await firestore.collection('symphony-alerts').add(alertData);
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}

/**
 * Report metrics to Cloud Monitoring
 * @param {string} environment - Environment name
 * @param {Object} driftReport - Drift report
 */
async function reportMetrics(environment, driftReport) {
  console.log(`Reporting metrics for ${environment}...`);

  try {
    // Create metrics object
    const metrics = {
      environment,
      timestamp: new Date().toISOString(),
      drift_detected: driftReport.status.overall ? 0 : 1,
      api_drift: Object.values(driftReport.api).filter((r) => !r.passing).length,
      ui_drift: Object.values(driftReport.ui).filter((r) => !r.passing).length,
      behavior_drift: Object.values(driftReport.behavior).filter((r) => !r.passing).length,
      corrections_applied: driftMetrics.corrected,
      corrections_failed: driftMetrics.failedCorrections,
    };

    // Publish metrics to PubSub for Cloud Monitoring
    const topic = pubsub.topic('symphony-metrics');
    await topic.publish(Buffer.from(JSON.stringify(metrics)));

    console.log(`Metrics reported successfully for ${environment}`);
  } catch (error) {
    console.error('Error reporting metrics:', error);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('========== Starting Symphony Zero-Drift Check ==========');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Checking environments: ${ENVIRONMENTS.join(', ')}`);

  // Load baseline templates
  const baselinesLoaded = await loadBaselines();
  if (!baselinesLoaded) {
    console.error('Cannot proceed without baselines. Exiting.');
    process.exit(1);
  }

  // Check each environment
  for (const environment of ENVIRONMENTS) {
    await checkEnvironment(environment);
  }

  console.log('========== Symphony Zero-Drift Check Complete ==========');
  console.log(`Final metrics: ${JSON.stringify(driftMetrics, null, 2)}`);
}

// Schedule recurring check
console.log(`Setting up zero-drift checks every ${CHECK_INTERVAL_MINUTES} minutes`);
main().catch((error) => {
  console.error('Fatal error in zero-drift checker:', error);
  process.exit(1);
});

setInterval(
  () => {
    main().catch((error) => {
      console.error('Fatal error in zero-drift checker:', error);
      // Don't exit on scheduled checks to maintain the interval
    });
  },
  CHECK_INTERVAL_MINUTES * 60 * 1000
);
