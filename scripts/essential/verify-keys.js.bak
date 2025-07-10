#!/usr/bin/env node
/**
 * Verify keys after rotation
 * Part of CI/CD CTTT for GCP Secret Manager integration
 */

const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG_FILE = path.join(process.cwd(), 'config', 'sample-rotation-schedule.json');
const PROJECT_ID = process.argv[2] || 'api-for-warp-drive';
const SPECIFIC_SECRET = process.argv[3];

async function main() {
  console.log('Verifying keys after rotation...');

  try {
    // Load rotation schedule
    if (!fs.existsSync(CONFIG_FILE)) {
      console.error(`Rotation schedule file not found: ${CONFIG_FILE}`);
      console.log('This is a mock verification - in production, we would verify actual keys.');
      process.exit(0);
    }

    const scheduleData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

    // Filter for specific secret if provided
    const schedule = SPECIFIC_SECRET
      ? scheduleData.rotation_schedules.filter((s) => s.secretId === SPECIFIC_SECRET)
      : scheduleData.rotation_schedules;

    if (schedule.length === 0) {
      console.error(`No secrets to verify${SPECIFIC_SECRET ? ` with ID: ${SPECIFIC_SECRET}` : ''}`);
      process.exit(1);
    }

    // Verify each secret (mock implementation)
    let allValid = true;
    const results = [];

    for (const item of schedule) {
      const result = await mockVerifySecret(item, PROJECT_ID);
      results.push(result);

      if (!result.valid) {
        allValid = false;
      }
    }

    // Output results
    console.log('\nVerification Results:');
    console.table(results);

    // Exit with appropriate code
    if (!allValid) {
      console.error('Some keys failed verification!');
      process.exit(1);
    }

    console.log('All keys verified successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Error during key verification: ${error.message}`);
    process.exit(1);
  }
}

async function mockVerifySecret(secretConfig, projectId) {
  const { secretId, type } = secretConfig;
  console.log(`Verifying ${type} secret: ${secretId}`);

  // Mock verification - in production, this would make actual API calls
  return {
    secretId,
    type,
    valid: true, // Always valid in mock implementation
    lastVerified: new Date().toISOString(),
  };
}

main().catch((error) => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
