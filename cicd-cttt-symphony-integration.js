/**
 * CI/CD CTTT Symphony Integration
 * Connects Symphony deployments to the Continuous Integration/Continuous Deployment
 * with Comprehensive Testing and Telemetry Tracking (CI/CD CTTT) system
 *
 * May 12, 2025
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

// Configuration
const PROJECT_ID = process.env.PROJECT_ID || 'api-for-warp-drive';
const ENVIRONMENTS = ['dev', 'staging', 'production', 'demo', 'sandbox'];
const BASE_DOMAIN = 'asoos.2100.cool';
const LOG_FILE = path.join(
  __dirname,
  'logs',
  `cttt-integration-${new Date().toISOString().replace(/:/g, '-')}.log`
);

// Ensure log directory exists
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
}

/**
 * Log message to console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

/**
 * Execute shell command and log output
 * @param {string} command - Command to execute
 * @returns {string} - Command output
 */
function executeCommand(command) {
  log(`Executing: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    log(`Command output: ${output.trim()}`);
    return output.trim();
  } catch (error) {
    log(`Command error: ${error.message}`);
    throw error;
  }
}

/**
 * Register environment with CTTT system
 * @param {string} environment - Environment name
 */
async function registerWithCTTT(environment) {
  log(`Registering ${environment} with CI/CD CTTT system...`);

  try {
    // Get current commit hash
    const commitHash = executeCommand('git rev-parse HEAD');

    // Register with CTTT API
    const ctttEndpoint = `https://cttt-api.${BASE_DOMAIN}/register-deployment`;
    const response = await axios.post(ctttEndpoint, {
      project: PROJECT_ID,
      component: 'symphony',
      environment,
      commitHash,
      domain: `${environment}.symphony.${BASE_DOMAIN}`,
      timestamp: new Date().toISOString(),
      metrics: {
        enabled: true,
        endpoints: ['/api/health', '/api/metrics', '/api/drift-status'],
      },
      testing: {
        enabled: true,
        testSuites: ['unit', 'integration', 'e2e', 'drift'],
      },
      telemetry: {
        enabled: true,
        level: 'comprehensive',
      },
    });

    if (response.data.success) {
      log(`Successfully registered ${environment} with CI/CD CTTT system`);
      return response.data;
    } else {
      throw new Error(`CTTT registration failed: ${response.data.message}`);
    }
  } catch (error) {
    log(`Error registering with CTTT: ${error.message}`);
    throw error;
  }
}

/**
 * Set up CI/CD triggers for environment
 * @param {string} environment - Environment name
 */
function setupCITriggers(environment) {
  log(`Setting up CI triggers for ${environment}...`);

  try {
    // Create Cloud Build trigger configuration
    const triggerConfig = {
      name: `symphony-${environment}-trigger`,
      description: `Auto-deploys Symphony interface to ${environment} environment`,
      github: {
        owner: 'AI-Publishing-International-LLP-UK',
        name: 'AIXTIV-SYMPHONY',
        push: {
          branch: environment === 'production' ? 'main' : environment,
        },
      },
      includedFiles: [
        'cicd-cttt-symphony-integration.js',
        'monitoring/**',
        'debug-symphony.sh',
        'start-symphony.sh',
        'start-symphony-fixed.sh',
        'symphony-production-deploy.sh',
        'SYMPHONY_IMPLEMENTATION_GUIDE.md',
      ],
      substitutions: {
        _ENVIRONMENT: environment,
        _DOMAIN: `${environment}.symphony.${BASE_DOMAIN}`,
      },
      filename: 'cloudbuild-ci-cttt-correct.yaml',
    };

    // Write trigger configuration
    const triggerConfigPath = path.join(
      __dirname,
      'cloud-build',
      'triggers',
      `symphony-${environment}-trigger.json`
    );
    fs.mkdirSync(path.dirname(triggerConfigPath), { recursive: true });
    fs.writeFileSync(triggerConfigPath, JSON.stringify(triggerConfig, null, 2));

    // Create or update trigger using gcloud
    executeCommand(
      `gcloud beta builds triggers import --source=${triggerConfigPath} --project=${PROJECT_ID}`
    );

    log(`Successfully set up CI trigger for ${environment}`);
  } catch (error) {
    log(`Error setting up CI trigger: ${error.message}`);
    throw error;
  }
}

/**
 * Configure post-deployment hooks
 * @param {string} environment - Environment name
 */
function setupPostDeploymentHooks(environment) {
  log(`Setting up post-deployment hooks for ${environment}...`);

  try {
    // Create post-deployment script
    const postDeployScript = `#!/bin/bash
# Post-deployment hooks for Symphony ${environment}
# Generated: ${new Date().toISOString()}

# Configuration
ENVIRONMENT="${environment}"
DOMAIN="${environment}.symphony.${BASE_DOMAIN}"
PROJECT_ID="${PROJECT_ID}"

# Log function
log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Send deployment notification
log "Sending deployment notification..."
curl -X POST "https://cttt-api.${BASE_DOMAIN}/deployment-complete" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project": "'$PROJECT_ID'",
    "component": "symphony",
    "environment": "'$ENVIRONMENT'",
    "domain": "'$DOMAIN'",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "status": "success"
  }'

# Run zero-drift baseline check
log "Running zero-drift baseline check..."
node monitoring/zero-drift-checker.js --environment=$ENVIRONMENT --mode=baseline

# Verify monitoring is active
log "Verifying monitoring is active..."
gcloud monitoring metrics list \\
  --filter="metric.type=starts_with(\\"custom.googleapis.com/symphony\\")" \\
  --project=$PROJECT_ID

# Register telemetry endpoints
log "Registering telemetry endpoints..."
curl -X POST "https://cttt-api.${BASE_DOMAIN}/register-telemetry" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project": "'$PROJECT_ID'",
    "component": "symphony",
    "environment": "'$ENVIRONMENT'",
    "endpoints": [
      {
        "path": "/api/telemetry/user-activity",
        "type": "user-activity",
        "frequency": "real-time"
      },
      {
        "path": "/api/telemetry/error-reports",
        "type": "error-reports",
        "frequency": "real-time"
      },
      {
        "path": "/api/telemetry/performance",
        "type": "performance",
        "frequency": "periodic",
        "interval": 60
      }
    ]
  }'

log "Post-deployment hooks completed for $ENVIRONMENT"
`;

    // Write post-deployment script
    const scriptPath = path.join(__dirname, 'scripts', `post-deploy-${environment}.sh`);
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    fs.writeFileSync(scriptPath, postDeployScript);
    fs.chmodSync(scriptPath, '755'); // Make executable

    // Add to Cloud Build config
    const postDeployStep = {
      name: 'gcr.io/cloud-builders/bash',
      id: 'post-deployment-hooks',
      args: ['-c', `./scripts/post-deploy-${environment}.sh`],
    };

    // Update cloudbuild-ci-cttt-correct.yaml
    let cloudBuildConfig = fs.readFileSync(
      path.join(__dirname, 'cloudbuild-ci-cttt-correct.yaml'),
      'utf8'
    );

    // Check if post-deployment step already exists
    if (!cloudBuildConfig.includes('post-deployment-hooks')) {
      // Add post-deployment step
      cloudBuildConfig = cloudBuildConfig.replace(
        "timeout: '3600s'",
        `# Post-deployment hooks
  - name: 'gcr.io/cloud-builders/bash'
    id: 'post-deployment-hooks'
    entrypoint: 'bash'
    args:
      - '-c'
      - './scripts/post-deploy-$_ENVIRONMENT.sh'
    env:
      - 'PROJECT_ID=${PROJECT_ID}'

timeout: '3600s'`
      );

      // Write updated Cloud Build config
      fs.writeFileSync(path.join(__dirname, 'cloudbuild-ci-cttt-correct.yaml'), cloudBuildConfig);
    }

    log(`Successfully set up post-deployment hooks for ${environment}`);
  } catch (error) {
    log(`Error setting up post-deployment hooks: ${error.message}`);
    throw error;
  }
}

/**
 * Configure continuous testing integration
 * @param {string} environment - Environment name
 */
function setupContinuousTesting(environment) {
  log(`Setting up continuous testing for ${environment}...`);

  try {
    // Create test configuration
    const testConfig = {
      environment,
      domain: `${environment}.symphony.${BASE_DOMAIN}`,
      testGroups: [
        {
          name: 'api',
          tests: ['health', 'authentication', 'error-handling', 'data-persistence'],
          frequency: 'hourly',
        },
        {
          name: 'ui',
          tests: ['components', 'responsive', 'accessibility', 'interactions'],
          frequency: 'daily',
        },
        {
          name: 'drift',
          tests: ['api-drift', 'ui-drift', 'behavior-drift'],
          frequency: '15min',
        },
        {
          name: 'e2e',
          tests: ['user-journey', 'error-recovery', 'purchase-flow', 'agent-fallback'],
          frequency: 'daily',
        },
      ],
    };

    // Write test configuration
    const testConfigPath = path.join(__dirname, 'tests', 'config', `symphony-${environment}.json`);
    fs.mkdirSync(path.dirname(testConfigPath), { recursive: true });
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Create test scheduler configuration for Cloud Scheduler
    const testSchedulerConfig = {
      name: `projects/${PROJECT_ID}/locations/us-west1/jobs/symphony-${environment}-tests`,
      schedule: '0 */4 * * *', // Every 4 hours
      timeZone: 'America/Los_Angeles',
      httpTarget: {
        uri: `https://cttt-api.${BASE_DOMAIN}/run-tests`,
        httpMethod: 'POST',
        body: Buffer.from(
          JSON.stringify({
            project: PROJECT_ID,
            component: 'symphony',
            environment: environment,
            config: `symphony-${environment}.json`,
          })
        ).toString('base64'),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    // Write test scheduler configuration
    const schedulerConfigPath = path.join(
      __dirname,
      'cloud-scheduler',
      `symphony-${environment}-tests.json`
    );
    fs.mkdirSync(path.dirname(schedulerConfigPath), { recursive: true });
    fs.writeFileSync(schedulerConfigPath, JSON.stringify(testSchedulerConfig, null, 2));

    // Create or update scheduler using gcloud
    executeCommand(`gcloud scheduler jobs import --project=${PROJECT_ID} ${schedulerConfigPath}`);

    log(`Successfully set up continuous testing for ${environment}`);
  } catch (error) {
    log(`Error setting up continuous testing: ${error.message}`);
    throw error;
  }
}

/**
 * Configure telemetry tracking
 * @param {string} environment - Environment name
 */
function setupTelemetryTracking(environment) {
  log(`Setting up telemetry tracking for ${environment}...`);

  try {
    // Create telemetry configuration
    const telemetryConfig = `
// Telemetry configuration for Symphony ${environment}
// Generated: ${new Date().toISOString()}

module.exports = {
  // Basic configuration
  enabled: true,
  environment: '${environment}',
  project: '${PROJECT_ID}',
  domain: '${environment}.symphony.${BASE_DOMAIN}',
  
  // Endpoints
  endpoints: {
    activity: 'https://cttt-api.${BASE_DOMAIN}/telemetry/activity',
    errors: 'https://cttt-api.${BASE_DOMAIN}/telemetry/errors',
    metrics: 'https://cttt-api.${BASE_DOMAIN}/telemetry/metrics',
    usage: 'https://cttt-api.${BASE_DOMAIN}/telemetry/usage'
  },
  
  // Tracking options
  options: {
    // User activity tracking
    userActivity: {
      enabled: true,
      captureClicks: true,
      capturePageViews: true,
      captureFormSubmissions: true,
      captureErrors: true,
      anonymizeIp: true
    },
    
    // Performance tracking
    performance: {
      enabled: true,
      metrics: [
        'fcp', // First Contentful Paint
        'lcp', // Largest Contentful Paint
        'cls', // Cumulative Layout Shift
        'fid', // First Input Delay
        'ttfb', // Time To First Byte
        'api-response-time'
      ],
      sampleRate: 0.1 // 10% of users
    },
    
    // Error tracking
    errors: {
      enabled: true,
      captureUnhandledRejections: true,
      captureUncaughtExceptions: true,
      breadcrumbs: true,
      sourceMapSupport: true,
      ignoreErrors: [
        'Network request failed',
        'Request aborted',
        'ResizeObserver loop limit exceeded'
      ]
    },
    
    // Drift tracking
    drift: {
      enabled: true,
      trackApiDrift: true,
      trackUiDrift: true,
      trackBehaviorDrift: true,
      reportInterval: 900000 // 15 minutes
    },
    
    // Comprehensive user behavior tracking
    behavior: {
      enabled: true,
      heatmaps: true,
      sessionRecording: ${environment !== 'production'}, // Disabled in production for privacy
      feedbackCapture: true,
      sentimentAnalysis: true
    }
  },
  
  // Data retention
  dataRetention: {
    activityLogs: 30, // days
    errorLogs: 90, // days
    performanceMetrics: 365, // days
    userSessions: ${environment !== 'production' ? 14 : 7} // days
  }
};
`;

    // Write telemetry configuration
    const telemetryConfigPath = path.join(
      __dirname,
      'config',
      'telemetry',
      `symphony-${environment}.js`
    );
    fs.mkdirSync(path.dirname(telemetryConfigPath), { recursive: true });
    fs.writeFileSync(telemetryConfigPath, telemetryConfig);

    // Create BigQuery dataset for telemetry (if not exists)
    try {
      executeCommand(`bq show ${PROJECT_ID}:symphony_telemetry_${environment.replace('-', '_')}`);
      log(`BigQuery dataset already exists for ${environment}`);
    } catch (error) {
      // Dataset doesn't exist, create it
      executeCommand(
        `bq mk --dataset ${PROJECT_ID}:symphony_telemetry_${environment.replace('-', '_')}`
      );
      log(`Created BigQuery dataset for ${environment}`);
    }

    // Create required tables
    const tables = [
      {
        name: 'user_activity',
        schema: [
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
          { name: 'session_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
          { name: 'event_data', type: 'JSON', mode: 'NULLABLE' },
          { name: 'page', type: 'STRING', mode: 'NULLABLE' },
          { name: 'user_agent', type: 'STRING', mode: 'NULLABLE' },
          { name: 'ip_hash', type: 'STRING', mode: 'NULLABLE' },
          { name: 'country', type: 'STRING', mode: 'NULLABLE' },
        ],
      },
      {
        name: 'error_reports',
        schema: [
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'error_type', type: 'STRING', mode: 'REQUIRED' },
          { name: 'error_message', type: 'STRING', mode: 'REQUIRED' },
          { name: 'stack_trace', type: 'STRING', mode: 'NULLABLE' },
          { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
          { name: 'session_id', type: 'STRING', mode: 'NULLABLE' },
          { name: 'page', type: 'STRING', mode: 'NULLABLE' },
          { name: 'user_agent', type: 'STRING', mode: 'NULLABLE' },
          { name: 'severity', type: 'STRING', mode: 'REQUIRED' },
        ],
      },
      {
        name: 'performance_metrics',
        schema: [
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'metric_name', type: 'STRING', mode: 'REQUIRED' },
          { name: 'metric_value', type: 'FLOAT', mode: 'REQUIRED' },
          { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
          { name: 'session_id', type: 'STRING', mode: 'NULLABLE' },
          { name: 'page', type: 'STRING', mode: 'NULLABLE' },
          { name: 'user_agent', type: 'STRING', mode: 'NULLABLE' },
          { name: 'connection_type', type: 'STRING', mode: 'NULLABLE' },
          { name: 'device_category', type: 'STRING', mode: 'NULLABLE' },
        ],
      },
      {
        name: 'drift_metrics',
        schema: [
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'drift_type', type: 'STRING', mode: 'REQUIRED' },
          { name: 'component', type: 'STRING', mode: 'REQUIRED' },
          { name: 'drift_score', type: 'FLOAT', mode: 'REQUIRED' },
          { name: 'baseline_version', type: 'STRING', mode: 'REQUIRED' },
          { name: 'is_passing', type: 'BOOLEAN', mode: 'REQUIRED' },
          { name: 'correction_applied', type: 'BOOLEAN', mode: 'REQUIRED' },
          { name: 'correction_successful', type: 'BOOLEAN', mode: 'NULLABLE' },
        ],
      },
    ];

    // Create tables
    for (const table of tables) {
      const schemaFile = path.join(__dirname, 'bq-schemas', `${table.name}.json`);
      fs.mkdirSync(path.dirname(schemaFile), { recursive: true });
      fs.writeFileSync(schemaFile, JSON.stringify(table.schema, null, 2));

      try {
        executeCommand(
          `bq show ${PROJECT_ID}:symphony_telemetry_${environment.replace('-', '_')}.${table.name}`
        );
        log(`Table ${table.name} already exists for ${environment}`);
      } catch (error) {
        // Table doesn't exist, create it
        executeCommand(
          `bq mk --table ${PROJECT_ID}:symphony_telemetry_${environment.replace('-', '_')}.${table.name} ${schemaFile}`
        );
        log(`Created table ${table.name} for ${environment}`);
      }
    }

    log(`Successfully set up telemetry tracking for ${environment}`);
  } catch (error) {
    log(`Error setting up telemetry tracking: ${error.message}`);
    throw error;
  }
}

/**
 * Setup Symphony environment integration with CI/CD CTTT
 * @param {string} environment - Environment name
 */
async function setupEnvironment(environment) {
  log(`\n=== Setting up ${environment} environment integration with CI/CD CTTT ===\n`);

  try {
    // Step 1: Register with CTTT system
    await registerWithCTTT(environment);

    // Step 2: Set up CI triggers
    setupCITriggers(environment);

    // Step 3: Set up post-deployment hooks
    setupPostDeploymentHooks(environment);

    // Step 4: Set up continuous testing
    setupContinuousTesting(environment);

    // Step 5: Set up telemetry tracking
    setupTelemetryTracking(environment);

    log(`\n=== Successfully integrated ${environment} with CI/CD CTTT system ===\n`);
  } catch (error) {
    log(`\n=== Failed to integrate ${environment} with CI/CD CTTT system: ${error.message} ===\n`);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  log('\n=== Starting Symphony CI/CD CTTT Integration ===\n');

  try {
    // Process all environments
    for (const environment of ENVIRONMENTS) {
      await setupEnvironment(environment);
    }

    log('\n=== Symphony CI/CD CTTT Integration Completed Successfully ===\n');
    log(`Integration log available at: ${LOG_FILE}`);

    // Create automated test for CI/CD integration
    createIntegrationTest();
  } catch (error) {
    log(`\n=== Symphony CI/CD CTTT Integration Failed: ${error.message} ===\n`);
    process.exit(1);
  }
}

/**
 * Create automated test for CI/CD integration
 */
function createIntegrationTest() {
  log('Creating automated test for CI/CD integration...');

  const testCode = `/**
 * Symphony CI/CD CTTT Integration Test
 * Verifies the integration between Symphony and the CI/CD CTTT system
 * 
 * May 12, 2025
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const PROJECT_ID = process.env.PROJECT_ID || 'api-for-warp-drive';
const ENVIRONMENTS = ${JSON.stringify(ENVIRONMENTS)};
const BASE_DOMAIN = 'asoos.2100.cool';

/**
 * Test CTTT registration
 */
async function testRegistration() {
  console.log('Testing CTTT registration...');
  
  for (const environment of ENVIRONMENTS) {
    const response = await axios.get(\`https://cttt-api.\${BASE_DOMAIN}/deployment-status\`, {
      params: {
        project: PROJECT_ID,
        component: 'symphony',
        environment
      }
    });
    
    assert(response.data.registered, \`\${environment} should be registered with CTTT\`);
    assert(response.data.status === 'active', \`\${environment} should have active status\`);
    
    console.log(\`✅ \${environment} registration verified\`);
  }
}

/**
 * Test CI triggers
 */
async function testCITriggers() {
  console.log('Testing CI triggers...');
  
  const response = await axios.get(\`https://cttt-api.\${BASE_DOMAIN}/ci-triggers\`, {
    params: {
      project: PROJECT_ID,
      component: 'symphony'
    }
  });
  
  for (const environment of ENVIRONMENTS) {
    const trigger = response.data.triggers.find(t => t.name === \`symphony-\${environment}-trigger\`);
    assert(trigger, \`Trigger for \${environment} should exist\`);
    assert(trigger.status === 'enabled', \`Trigger for \${environment} should be enabled\`);
    
    console.log(\`✅ \${environment} CI trigger verified\`);
  }
}

/**
 * Test telemetry tracking
 */
async function testTelemetry() {
  console.log('Testing telemetry tracking...');
  
  for (const environment of ENVIRONMENTS) {
    // Check if tables exist
    const response = await axios.get(\`https://cttt-api.\${BASE_DOMAIN}/telemetry-status\`, {
      params: {
        project: PROJECT_ID,
        component: 'symphony',
        environment
      }
    });
    
    assert(response.data.enabled, \`Telemetry should be enabled for \${environment}\`);
    assert(response.data.tables.length >= 4, \`At least 4 telemetry tables should exist for \${environment}\`);
    
    // Required tables
    const requiredTables = ['user_activity', 'error_reports', 'performance_metrics', 'drift_metrics'];
    for (const table of requiredTables) {
      assert(response.data.tables.includes(table), \`Table \${table} should exist for \${environment}\`);
    }
    
    console.log(\`✅ \${environment} telemetry tracking verified\`);
  }
}

/**
 * Test continuous testing
 */
async function testContinuousTesting() {
  console.log('Testing continuous testing configuration...');
  
  for (const environment of ENVIRONMENTS) {
    const response = await axios.get(\`https://cttt-api.\${BASE_DOMAIN}/test-config\`, {
      params: {
        project: PROJECT_ID,
        component: 'symphony',
        environment
      }
    });
    
    assert(response.data.enabled, \`Testing should be enabled for \${environment}\`);
    assert(response.data.testGroups.length >= 4, \`At least 4 test groups should exist for \${environment}\`);
    
    // Required test groups
    const requiredGroups = ['api', 'ui', 'drift', 'e2e'];
    for (const group of requiredGroups) {
      assert(response.data.testGroups.some(g => g.name === group), \`Test group \${group} should exist for \${environment}\`);
    }
    
    console.log(\`✅ \${environment} continuous testing verified\`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('Running Symphony CI/CD CTTT integration tests...');
    
    await testRegistration();
    await testCITriggers();
    await testTelemetry();
    await testContinuousTesting();
    
    console.log('✅ All integration tests passed!');
    return true;
  } catch (error) {
    console.error(\`❌ Integration test failed: \${error.message}\`);
    return false;
  }
}

// Export for use in CI/CD
module.exports = { runTests };

// Run tests if executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
`;

  // Write test file
  const testPath = path.join(__dirname, 'tests', 'integration', 'cicd-cttt-integration.test.js');
  fs.mkdirSync(path.dirname(testPath), { recursive: true });
  fs.writeFileSync(testPath, testCode);

  log(`Created automated test at: ${testPath}`);
}

// Run main function
if (require.main === module) {
  main();
}

// Export functions for use in other modules
module.exports = {
  registerWithCTTT,
  setupCITriggers,
  setupPostDeploymentHooks,
  setupContinuousTesting,
  setupTelemetryTracking,
};
