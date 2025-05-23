// commands/chore/index.js
// Main export file for Chore command modules

const { Command } = require('commander');
const deploy = require('./deploy');

// Create a command for chore operations
const choreCommand = new Command('chore')
  .description('Manage and execute chores for system maintenance and deployment')
  .addCommand(deploy);

module.exports = choreCommand;

