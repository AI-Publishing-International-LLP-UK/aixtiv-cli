/**
 * Example Command with Explicit Thought Process and Result Output
 *
 * This is a template showing how to structure commands to clearly
 * display both internal reasoning/thought process and execution results.
 */

const chalk = require('chalk');

/**
 * Example command implementation
 * @param {object} options - Command options
 */
async function exampleCommand(options) {
  // ===== INTERNAL REASONING SECTION =====
  // This section contains the internal logic and thought process
  console.log(chalk.bgBlue.white('\n🧠 INTERNAL REASONING:'));
  console.log(chalk.blue('─'.repeat(50)));

  console.log('Received command options:', JSON.stringify(options, null, 2));
  console.log('Analyzing parameters and determining execution path...');
  console.log('Checking if required parameters are present...');

  const missingParams = [];
  if (!options.param1) missingParams.push('param1');
  if (!options.param2) missingParams.push('param2');

  if (missingParams.length > 0) {
    console.log(`Missing required parameters: ${missingParams.join(', ')}`);
    console.log('Will use default values for missing parameters');
  } else {
    console.log('All required parameters are present');
  }

  console.log('Preparing execution plan based on parameters...');
  console.log('Determining which action to take...');

  const selectedAction = options.action || 'default';
  console.log(`Selected action: ${selectedAction}`);

  console.log(chalk.blue('─'.repeat(50)));

  // ===== EXECUTION RESULT SECTION =====
  // This section contains the actual execution and results
  console.log(chalk.bgGreen.black('\n📊 EXECUTION RESULT:'));
  console.log(chalk.green('─'.repeat(50)));

  console.log(chalk.bold('Command:'), 'example-command');
  console.log(chalk.bold('Parameters:'));
  console.log(` - param1: ${options.param1 || 'default value'}`);
  console.log(` - param2: ${options.param2 || 'default value'}`);
  console.log(` - action: ${selectedAction}`);

  console.log(chalk.bold('\nOutput:'));

  try {
    // Simulated execution result
    const result = {
      success: true,
      message: 'Command executed successfully',
      data: {
        timestamp: new Date().toISOString(),
        action: selectedAction,
        results: [
          { id: 1, status: 'complete' },
          { id: 2, status: 'pending' },
        ],
      },
    };

    console.log(JSON.stringify(result, null, 2));

    console.log(chalk.bold('\nSummary:'));
    console.log(`✅ ${result.message}`);
    console.log(`📅 Executed at: ${result.data.timestamp}`);
    console.log(`📊 Items processed: ${result.data.results.length}`);
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
  }

  console.log(chalk.green('─'.repeat(50)));
}

module.exports = exampleCommand;
