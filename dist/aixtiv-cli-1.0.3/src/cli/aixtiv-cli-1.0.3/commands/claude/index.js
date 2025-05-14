/**
 * Dr. Claude Command Suite for Aixtiv CLI
 * 
 * This module registers all commands for the Dr. Claude suite, including:
 * - Agent commands for delegation and orchestration
 * - Project commands for listing and management
 * - Code generation commands
 * - Automation commands
 */

// Import command modules
const agent = require('./agent');
const project = require('./project');
const code = require('./code');
const telemetry = require('../../lib/telemetry');

// Export commands
module.exports = {
  agent,
  project,
  code
};

