#!/usr/bin/env node

/**
 * Script to enable or disable telemetry for Aixtiv CLI
 * Usage: node toggle-telemetry.js [enable|disable]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_FILE = path.join(os.homedir(), '.aixtiv-telemetry');

function enableTelemetry() {
  fs.writeFileSync(ENV_FILE, 'AIXTIV_TELEMETRY_ENABLED=true\n');
  console.log('Telemetry has been enabled for Aixtiv CLI');
}

function disableTelemetry() {
  fs.writeFileSync(ENV_FILE, 'AIXTIV_TELEMETRY_ENABLED=false\n');
  console.log('Telemetry has been disabled for Aixtiv CLI');
}

function showStatus() {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const enabled = content.includes('AIXTIV_TELEMETRY_ENABLED=true');
    console.log(`Telemetry is currently ${enabled ? 'enabled' : 'disabled'} for Aixtiv CLI`);
  } catch (error) {
    console.log('Telemetry is enabled by default for Aixtiv CLI');
  }
}

// Process command line arguments
const command = process.argv[2];
if (command === 'enable') {
  enableTelemetry();
} else if (command === 'disable') {
  disableTelemetry();
} else {
  showStatus();
  console.log('\nUsage: node toggle-telemetry.js [enable|disable]');
}
