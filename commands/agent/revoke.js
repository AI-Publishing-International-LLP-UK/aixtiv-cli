const { revokeAgentAccess } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const inquirer = require('inquirer');
const telemetry = require('../../lib/telemetry');

/**
 * Revoke agent access to a resource
 * @param {object} options - Command options
 */
module.exports = async function agentRevoke(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('agent');
  const { email, agent, resource } = parseOptions(options);

  try {
    // Confirm revocation unless forced
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to revoke access for agent ${agent} to resource ${resource}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
    }

    // Execute revoke operation with spinner
    const result = await withSpinner(
      `Revoking access for agent ${agent} to resource ${resource}`,
      revokeAgentAccess,
      email,
      agent,
      resource
    );

    // Display result
    displayResult(result);

    // Display additional details if successful
    if (result.success) {
      console.log(chalk.bold('Revocation Details:'));
      console.log(`Principal: ${chalk.cyan(email)}`);
      console.log(`Agent: ${chalk.cyan(agent)}`);
      console.log(`Resource: ${chalk.yellow(resource)}`);
      console.log(`Status: ${chalk.green('Access Revoked')}`);
    }
  } catch (error) {
    console.error(chalk.red('Revocation operation failed:'), error.message);
    process.exit(1);
  }
};
