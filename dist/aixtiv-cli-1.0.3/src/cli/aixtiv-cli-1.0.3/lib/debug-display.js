/**
 * Debug Display Module for Aixtiv CLI
 * 
 * This module provides enhanced output display showing both
 * internal reasoning and execution results.
 */

const chalk = require('chalk');

/**
 * Display debug information with both thought process and results
 * 
 * @param {Object} options - Display options
 * @param {string} options.thought - Internal reasoning/thought process
 * @param {Object} options.result - Execution result
 * @param {string} options.command - Command that was executed
 */
function debugDisplay(options) {
  const { thought, result, command } = options;
  
  // Display thought process
  console.log('\n' + chalk.bgBlue.white(' INTERNAL REASONING '));
  console.log(chalk.blue('-'.repeat(50)));
  console.log(thought || 'No detailed reasoning available');
  console.log(chalk.blue('-'.repeat(50)));
  
  // Display execution result
  console.log('\n' + chalk.bgGreen.black(' EXECUTION RESULT '));
  console.log(chalk.green('-'.repeat(50)));
  
  if (command) {
    console.log(chalk.bold('Command: ') + command);
  }
  
  if (result) {
    if (typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  } else {
    console.log('No result data available');
  }
  
  console.log(chalk.green('-'.repeat(50)));
}

module.exports = {
  debugDisplay
};
