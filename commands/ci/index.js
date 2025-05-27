// commands/ci/index.js
// Main export file for CI command modules

const { Command } = require('commander');
const deploy = require('./deploy');
const status = require('./status');
const logs = require('./logs');
const cdi = require('./cdi');
const ctt = require('./ctt');

// Create a command for CI operations
const ciCommand = new Command('ci')
  .description('Continuous Integration and Deployment commands for Aixtiv Symphony')
  .addCommand(deploy)
  .addCommand(status)
  .addCommand(logs)
  .addCommand(cdi)
  .addCommand(ctt);

module.exports = ciCommand;
