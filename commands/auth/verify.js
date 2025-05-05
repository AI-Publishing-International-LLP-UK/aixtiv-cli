const { verifyAuthentication } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');

/**
 * Verify authentication with SalleyPort
 * @param {object} options - Command options
 */
module.exports = async function authVerify(options) {
  const { email, agent } = parseOptions(options);

  try {
    // Execute verification with spinner
    const result = await withSpinner(
      `Verifying authentication${email ? ` for ${email}` : ''}${agent ? ` with agent ${agent}` : ''}`,
      verifyAuthentication,
      { email, agent }
    );

    // Display result
    displayResult(result);

    // Display additional details based on verification type
    if (result.success) {
      if (email && agent) {
        // Both email and agent
        console.log(`Principal: ${chalk.cyan(email)}`);
        console.log(`Agent: ${chalk.cyan(agent)}`);
        console.log(
          `Status: ${result.status === 'authorized' ? chalk.green('Authorized') : chalk.red('Unauthorized')}`
        );

        if (result.resourceCount > 0) {
          console.log(`Resources: ${result.resources.map((r) => chalk.yellow(r)).join(', ')}`);
        } else {
          console.log('Resources: None');
        }
      } else if (email) {
        // Only email
        console.log(`Principal: ${chalk.cyan(email)}`);
        console.log(
          `Status: ${result.isDelegated ? chalk.green('Delegated') : chalk.red('Not delegated')}`
        );
      } else if (agent) {
        // Only agent
        console.log(`Agent: ${chalk.cyan(agent)}`);
        console.log(
          `Status: ${result.isAuthorized ? chalk.green('Authorized') : chalk.red('Unauthorized')}`
        );

        if (result.resourceCount > 0) {
          console.log(`Resources: ${result.resources.map((r) => chalk.yellow(r)).join(', ')}`);
        } else {
          console.log('Resources: None');
        }
      } else {
        // System status
        console.log(`SalleyPort Status: ${chalk.green('Configured')}`);
        console.log(`Delegates: ${chalk.cyan(result.delegateCount)}`);
        console.log(`Agents: ${chalk.cyan(result.agentCount)}`);

        if (result.agents && result.agents.length > 0) {
          console.log(`Agent IDs: ${result.agents.map((a) => chalk.yellow(a)).join(', ')}`);
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Verification failed:'), error.message);
    process.exit(1);
  }
};
