#!/usr/bin/env node

/**
 * Test script for the telemetry integration
 * 
 * This script tests if the telemetry package is correctly set up
 * by recording some sample metrics and logging them.
 */

// Set environment variable to enable verbose telemetry logging
process.env.AIXTIV_TELEMETRY_VERBOSE = 'true';

// Import the telemetry module
const telemetry = require('../../lib/telemetry');

// Log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function runTest() {
  log('Initializing telemetry...');
  
  // Initialize telemetry
  const initialized = await telemetry.init();
  
  if (!initialized) {
    log('Failed to initialize telemetry.');
    process.exit(1);
  }
  
  log('Telemetry initialized successfully.');
  
  // Record a request
  log('Recording a test request...');
  telemetry.recordRequest('test-command');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Record knowledge access
  log('Recording knowledge access...');
  telemetry.recordKnowledgeAccess('test-knowledge');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Record an error
  log('Recording a test error...');
  telemetry.recordError('test-command', new Error('Test error'));
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Record duration
  log('Recording a test duration...');
  telemetry.recordDuration('test-command', 123.45);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Shutdown telemetry
  log('Shutting down telemetry...');
  await telemetry.shutdown();
  
  log('Test completed successfully!');
}

// Run the test
runTest().catch(error => {
  console.error('Error during test:', error);
  process.exit(1);
});
