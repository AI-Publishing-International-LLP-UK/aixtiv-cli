const chalk = require('chalk');

/**
 * Hello command handler
 * @param {Object} options - Command options
 * @param {string} options.name - The name to greet
 */
function helloCommand(options) {
  const { name } = options;

  console.log();
  console.log(chalk.green('🚀 Welcome to Aixtiv Symphony Orchestration System!'));
  console.log(chalk.yellow(`Hello, ${name}! This is a sample CLI command.`));
  console.log();
  console.log(chalk.blue('Some things you can try:'));
  console.log(chalk.cyan('  • Run with a custom name: aixtiv-sample hello --name "Your Name"'));
  console.log(chalk.cyan('  • Check version info: aixtiv-sample version --verbose'));
  console.log();
}

module.exports = helloCommand;
