const { verifySecurity } = require('../services/firestore');
const { displayResult, parseOptions, withSpinner } = require('../utils');
const chalk = require('chalk');
const telemetry = require('../utils/telemetry');

/**
 * Command handler for SalleyPort security operations
 * @param {object} options - Command options
 */
async function securityCommand(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('security');
  
  const { email, token, action = 'verify' } = parseOptions(options);
  
  // Validate required parameters
  if (!email) {
    console.error(chalk.red('Error: Email is required'));
    console.log(`Use ${chalk.cyan('--email <address>')} to specify an email address`);
    process.exit(1);
  }
  
  try {
    // Currently only 'verify' action is supported
    if (action !== 'verify') {
      console.error(chalk.red(`Error: Unsupported security action: ${action}`));
      console.log(`Currently supported actions: ${chalk.cyan('verify')}`);
      process.exit(1);
    }
    
    // Execute security verification with spinner
    const result = await withSpinner(
      `Verifying security access for ${chalk.cyan(email)} via SalleyPort`,
      verifySecurity,
      email,
      token
    );
    
    // Display result
    displayResult(result);
    
    // Show additional information if successful
    if (result.success) {
      console.log(chalk.bold('Security Details:'));
      console.log(`User: ${chalk.cyan(email)}`);
      console.log(`Access Level: ${chalk.yellow(result.accessLevel)}`);
      console.log(`Valid Until: ${chalk.magenta(result.validUntil)}`);
      console.log(`Verification Time: ${new Date().toISOString()}`);
      
      // Special note for higher access levels
      if (result.accessLevel === 'admin' || result.accessLevel === 'elevated') {
        console.log(chalk.green.bold('\nElevated Access Detected:'));
        console.log(chalk.green('You have enhanced permissions for security operations.'));
      }
    }
  } catch (error) {
    telemetry.recordError('security', error);
    console.error(chalk.red('Security verification failed:'), error.message);
    process.exit(1);
  }
}

module.exports = securityCommand;

