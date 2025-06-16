#!/usr/bin/env node

/**
 * Manual telemetry integration script
 * 
 * This script makes targeted changes to the main CLI file to add telemetry
 * support without comprehensive rewrapping of all commands.
 */

const fs = require('fs');
const path = require('path');

// Paths
const MAIN_CLI_PATH = path.resolve(__dirname, '../../bin/aixtiv.js');
const BACKUP_CLI_PATH = `${MAIN_CLI_PATH}.bak`;

// Create backup if it doesn't already exist
if (!fs.existsSync(BACKUP_CLI_PATH)) {
  fs.copyFileSync(MAIN_CLI_PATH, BACKUP_CLI_PATH);
  console.log(`Created backup at ${BACKUP_CLI_PATH}`);
}

// Read the main CLI file
let content = fs.readFileSync(MAIN_CLI_PATH, 'utf8');

// Check if telemetry is already integrated
if (content.includes('require(\'../lib/telemetry\')') || 
    content.includes('require("../lib/telemetry")')) {
  console.log('Telemetry import already found in the main CLI file.');
} else {
  // Add telemetry import and initialization
  // Find the line after the initial import statements
  const lines = content.split('\n');
  let insertPosition = 0;
  
  // Look for a good insertion point after imports
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const program = new Command()')) {
      insertPosition = i + 1;
      break;
    }
  }
  
  if (insertPosition === 0) {
    console.error('Could not find a suitable insertion point for telemetry initialization.');
    process.exit(1);
  }
  
  // Insert telemetry initialization
  const telemetryCode = `
// Initialize telemetry
const telemetry = require('../lib/telemetry');

// Initialize telemetry asynchronously
(async () => {
  try {
    await telemetry.init();
    // Set up graceful shutdown
    process.on('exit', () => {
      telemetry.shutdown();
    });
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
  }
})();`;
  
  lines.splice(insertPosition, 0, telemetryCode);
  content = lines.join('\n');
  
  // Write the updated content
  fs.writeFileSync(MAIN_CLI_PATH, content);
  console.log('Added telemetry initialization to the main CLI file.');
}

console.log('\nTelemetry has been manually integrated into the main CLI file.');
console.log('To track commands and errors, you need to add calls to the telemetry functions in your code:');
console.log('- telemetry.recordRequest(commandName)');
console.log('- telemetry.recordError(commandName, error)');
console.log('- telemetry.recordDuration(commandName, durationMs)');
console.log('- telemetry.recordKnowledgeAccess(accessType)');
console.log('\nFor examples, see the telemetry/command_example.md file.');
