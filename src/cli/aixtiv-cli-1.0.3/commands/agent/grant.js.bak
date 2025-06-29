const { grantAgentAccess } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const telemetry = require('../../lib/telemetry');

/**
 * Grant agent access to a resource
 * @param {object} options - Command options
 */
module.exports = async function agentGrant(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('agent');
  const { email, agent, resource, type } = parseOptions(options);

  try {
    // Validate access type
    const validTypes = ['full', 'readonly', 'delegated'];
    if (!validTypes.includes(type)) {
      console.error(
        chalk.red('Error:'),
        `Invalid access type '${type}'. Must be one of: ${validTypes.join(', ')}`
      );
      process.exit(1);
    }

    // Execute grant operation with spinner
    const result = await withSpinner(
      `Granting ${type} access for agent ${agent} to resource ${resource}`,
      grantAgentAccess,
      email,
      agent,
      resource,
      type
    );

    // Display result
    displayResult(result);

    // Display additional details if successful
    if (result.success) {
      console.log(chalk.bold('Grant Details:'));
      console.log(`Principal: ${chalk.cyan(email)}`);
      console.log(`Agent: ${chalk.cyan(agent)}`);
      console.log(`Resource: ${chalk.yellow(resource)}`);
      console.log(`Access Type: ${chalk.magenta(type)}`);

      if (type === 'full') {
        console.log(`Special Access: ${chalk.green('Yes')}`);
        console.log(`Override Rules: ${chalk.green('Yes')}`);
      }
    }
  } catch (error) {
    console.error(chalk.red('Grant operation failed:'), error.message);
    process.exit(1);
  }
};
