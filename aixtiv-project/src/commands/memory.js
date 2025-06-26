const { storeMemory, queryMemory } = require('../services/firestore');
const { displayResult, parseOptions, withSpinner } = require('../utils');
const chalk = require('chalk');
const telemetry = require('../utils/telemetry');

/**
 * Command handler for Flight Memory System (FMS) operations
 * @param {object} options - Command options
 */
async function memoryCommand(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('memory');

  const { action, type, query, data = '{}' } = parseOptions(options);

  // Validate action parameter
  if (!action || !['store', 'query'].includes(action)) {
    console.error(chalk.red('Error: Valid action is required'));
    console.log(`Use ${chalk.cyan('--action <store|query>')} to specify an action`);
    process.exit(1);
  }

  try {
    let result;

    // Handle different actions
    if (action === 'store') {
      // Validate type for store action
      if (!type) {
        console.error(chalk.red('Error: Memory type is required for store action'));
        console.log(`Use ${chalk.cyan('--type <type>')} to specify a memory type`);
        process.exit(1);
      }

      // Parse data if provided as a string
      let parsedData;
      try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        console.error(chalk.red('Error: Invalid JSON in memory data'));
        process.exit(1);
      }

      // Execute store operation with spinner
      result = await withSpinner(
        `Storing ${chalk.yellow(type)} memory in Flight Memory System`,
        storeMemory,
        type,
        parsedData
      );

      // Display additional information if successful
      if (result.success) {
        console.log(chalk.bold('Memory Details:'));
        console.log(`Memory ID: ${chalk.cyan(result.memoryId)}`);
        console.log(`Type: ${chalk.yellow(type)}`);
        console.log(`Status: ${chalk.magenta(result.status)}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
      }
    } else if (action === 'query') {
      // Parse query if provided as a string
      let parsedQuery;
      try {
        parsedQuery = typeof query === 'string' ? JSON.parse(query) : query || {};
      } catch (e) {
        console.error(chalk.red('Error: Invalid JSON in query parameter'));
        process.exit(1);
      }

      // Execute query operation with spinner
      result = await withSpinner(`Querying Flight Memory System`, queryMemory, parsedQuery);

      // Display additional information if successful
      if (result.success && result.results) {
        console.log(chalk.bold(`Found ${result.results.length} memories:`));

        if (result.results.length > 0) {
          result.results.forEach((memory, index) => {
            console.log(chalk.cyan(`\nMemory #${index + 1}:`));
            console.log(`ID: ${memory.id}`);
            console.log(`Type: ${memory.type}`);
            console.log(`Timestamp: ${memory.timestamp}`);
            console.log(`Data: ${JSON.stringify(memory.data, null, 2)}`);
          });
        } else {
          console.log(chalk.yellow('No memories found matching the query.'));
        }
      }
    }

    // Display result
    displayResult(result);
  } catch (error) {
    telemetry.recordError('memory', error);
    console.error(chalk.red('Memory operation failed:'), error.message);
    process.exit(1);
  }
}

module.exports = memoryCommand;
