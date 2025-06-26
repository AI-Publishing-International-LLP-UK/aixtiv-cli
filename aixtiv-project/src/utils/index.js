/**
 * Utility functions for Aixtiv CLI
 */

const chalk = require('chalk');
const ora = require('ora');

/**
 * Display a formatted result message
 * @param {object} result - The result object to display
 */
function displayResult(result) {
  if (result.success) {
    console.log(chalk.green(`✓ ${result.message}`));
  } else {
    console.error(chalk.red(`✗ ${result.message}`));
  }
}

/**
 * Parse command options and provide defaults
 * @param {object} options - Command options
 * @returns {object} Parsed options with defaults
 */
function parseOptions(options) {
  return {
    // Common options
    email: options.email || process.env.SALLEYPORT_USER_EMAIL,
    agent: options.agent || process.env.AIXTIV_AGENT_ID,
    resource: options.resource,
    // Allow additional options to pass through
    ...options,
  };
}

/**
 * Execute a function with a loading spinner
 * @param {string} message - The message to display while loading
 * @param {Function} fn - The function to execute
 * @param {...any} args - Arguments to pass to the function
 * @returns {Promise<any>} The result of the function
 */
async function withSpinner(message, fn, ...args) {
  const spinner = ora(message).start();
  try {
    const result = await fn(...args);
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

module.exports = {
  displayResult,
  parseOptions,
  withSpinner,
};
