const { manageWorkflow, getWorkflowStatus } = require('../services/firestore');
const { displayResult, parseOptions, withSpinner } = require('../utils');
const chalk = require('chalk');
const telemetry = require('../utils/telemetry');

/**
 * Command handler for S2DO (Scan To Do) workflow management
 * @param {object} options - Command options
 */
async function workflowCommand(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('workflow');

  const { action, type, id, data = '{}' } = parseOptions(options);

  // Validate action parameter
  if (!action || !['create', 'update', 'status'].includes(action)) {
    console.error(chalk.red('Error: Valid action is required'));
    console.log(`Use ${chalk.cyan('--action <create|update|status>')} to specify an action`);
    process.exit(1);
  }

  try {
    let result;

    // Handle different actions
    if (action === 'create' || action === 'update') {
      // Validate parameters for create/update
      if (!type) {
        console.error(chalk.red('Error: Workflow type is required for create/update actions'));
        console.log(`Use ${chalk.cyan('--type <type>')} to specify a workflow type`);
        process.exit(1);
      }

      // Parse data if provided as a string
      let parsedData;
      try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        console.error(chalk.red('Error: Invalid JSON in workflow data'));
        process.exit(1);
      }

      // Execute workflow management with spinner
      result = await withSpinner(
        `${action === 'create' ? 'Creating' : 'Updating'} ${chalk.yellow(type)} workflow in S2DO system`,
        manageWorkflow,
        type,
        parsedData
      );

      // Display additional information if successful
      if (result.success) {
        console.log(chalk.bold('Workflow Details:'));
        console.log(`Workflow ID: ${chalk.cyan(result.workflowId)}`);
        console.log(`Type: ${chalk.yellow(type)}`);
        console.log(`Status: ${chalk.magenta(result.status)}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
      }
    } else if (action === 'status') {
      // Validate parameters for status
      if (!id) {
        console.error(chalk.red('Error: Workflow ID is required for status action'));
        console.log(`Use ${chalk.cyan('--id <workflow-id>')} to specify a workflow ID`);
        process.exit(1);
      }

      // Execute status check with spinner
      result = await withSpinner(
        `Checking status of workflow ${chalk.cyan(id)} in S2DO system`,
        getWorkflowStatus,
        id
      );

      // Display additional information if successful
      if (result.success) {
        console.log(chalk.bold('Workflow Status:'));
        console.log(`Workflow ID: ${chalk.cyan(result.workflowId)}`);
        console.log(`Status: ${chalk.yellow(result.status)}`);
        console.log(
          `Progress: ${chalk.magenta(`${result.completedSteps}/${result.totalSteps} steps`)} (${Math.round((result.completedSteps / result.totalSteps) * 100)}%)`
        );
        console.log(`Last Updated: ${result.lastUpdated}`);

        // Visual progress bar
        const progressBar = Array(20)
          .fill('░')
          .map((char, index) => {
            return index < Math.floor((result.completedSteps / result.totalSteps) * 20) ? '█' : '░';
          })
          .join('');

        console.log(`\n${chalk.cyan(progressBar)}`);
      }
    }

    // Display result
    displayResult(result);
  } catch (error) {
    telemetry.recordError('workflow', error);
    console.error(chalk.red('Workflow operation failed:'), error.message);
    process.exit(1);
  }
}

module.exports = workflowCommand;
