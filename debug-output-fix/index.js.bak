/**
 * Aixtiv CLI Debug Output Enhancement - Main Index
 *
 * This file provides a central reference point for all the resources
 * related to the debug output enhancement project.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Display a welcome message and guide
console.log(chalk.cyan('┌' + '─'.repeat(70) + '┐'));
console.log(
  chalk.cyan('│') +
    chalk.bold.white(' AIXTIV CLI DEBUG OUTPUT ENHANCEMENT ') +
    ' '.repeat(35) +
    chalk.cyan('│')
);
console.log(chalk.cyan('└' + '─'.repeat(70) + '┘'));
console.log('');

// List available resources
console.log(chalk.yellow('Available Resources:'));
console.log('');

const resources = [
  {
    name: 'install.sh',
    description: 'Installation script to set up the debug output enhancement',
    usage: './debug-output-fix/install.sh',
  },
  {
    name: 'test-debug-output.sh',
    description: 'Test script to verify the debug output enhancement',
    usage: './debug-output-fix/test-debug-output.sh',
  },
  {
    name: 'run-with-debug.js',
    description: 'Run any Aixtiv CLI command with debug output',
    usage: 'node debug-output-fix/run-with-debug.js <command> [arguments]',
  },
  {
    name: 'fix-cli-output.js',
    description: 'Script that modifies the CLI to enhance output display',
    usage: 'node debug-output-fix/fix-cli-output.js',
  },
  {
    name: 'examples/example-command.js',
    description: 'Example command showing how to structure debug output',
    usage: 'Reference implementation for developers',
  },
  {
    name: 'README.md',
    description: 'Documentation with usage instructions and customization options',
    usage: 'Read for detailed information',
  },
];

// Display resources in a formatted table
for (const resource of resources) {
  console.log(chalk.green(` • ${resource.name}`));
  console.log(`   ${resource.description}`);
  console.log(chalk.dim(`   Usage: ${resource.usage}`));
  console.log('');
}

// Instructions to get started
console.log(chalk.yellow('Quick Start:'));
console.log('');
console.log(' 1. Install the enhancement:');
console.log(chalk.cyan('    ./debug-output-fix/install.sh'));
console.log('');
console.log(' 2. Test the enhancement:');
console.log(chalk.cyan('    ./debug-output-fix/test-debug-output.sh'));
console.log('');
console.log(' 3. Use with any command:');
console.log(chalk.cyan('    ./bin/aixtiv-debug.js <command> [arguments]'));
console.log('    or');
console.log(chalk.cyan('    node debug-output-fix/run-with-debug.js <command> [arguments]'));
console.log('');

// Check if installation is complete
if (fs.existsSync(path.join(__dirname, '..', 'bin', 'aixtiv-debug.js'))) {
  console.log(chalk.green('✅ Debug output enhancement is installed and ready to use!'));
} else {
  console.log(chalk.yellow('⚠️ Debug output enhancement is not yet installed.'));
  console.log('   Run the installation script to complete setup:');
  console.log(chalk.cyan('   ./debug-output-fix/install.sh'));
}

console.log('');
console.log(chalk.cyan('Thank you for using the Aixtiv CLI Debug Output Enhancement!'));
