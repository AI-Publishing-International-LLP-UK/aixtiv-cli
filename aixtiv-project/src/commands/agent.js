const { orchestrateAgent } = require('../services/firestore');
const { displayResult, parseOptions, withSpinner } = require('../utils');
const chalk = require('chalk');
const telemetry = require('../utils/telemetry');

/**
 * Command handler for agent orchestration
 * @param {object} options - Command options
 */
async function agentCommand(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('agent');

  const { email, agent, task, data = '{}' } = parseOptions(options);

  // Validate required parameters
  if (!agent) {
    console.error(chalk.red('Error: Agent ID is required'));
    console.log(`Use ${chalk.cyan('--agent <id>')} to specify an agent ID`);
    process.exit(1);
  }

  if (!task) {
    console.error(chalk.red('Error: Task type is required'));
    console.log(`Use ${chalk.cyan('--task <type>')} to specify a task type`);
    process.exit(1);
  }

  try {
    // Parse task data if provided as a string
    let parsedData;
    try {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      console.error(chalk.red('Error: Invalid JSON in task data'));
      process.exit(1);
    }

    // Execute agent orchestration with spinner
    const result = await withSpinner(
      `Orchestrating agent ${chalk.cyan(agent)} for task ${chalk.yellow(task)}`,
      orchestrateAgent,
      email,
      agent,
      task,
      parsedData
    );

    // Display result
    displayResult(result);

    // Show additional information if successful
    if (result.success) {
      console.log(chalk.bold('Task Details:'));
      console.log(`Task ID: ${chalk.cyan(result.taskId)}`);
      console.log(`Status: ${chalk.yellow(result.status)}`);
      console.log(`Agent: ${chalk.magenta(result.agent)}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
    }
  } catch (error) {
    telemetry.recordError('agent', error);
    console.error(chalk.red('Agent orchestration failed:'), error.message);
    process.exit(1);
  }
}

module.exports = agentCommand;
