const chalk = require('chalk');
const packageJson = require('../package.json');

/**
 * Version command handler
 * @param {Object} options - Command options
 * @param {boolean} options.verbose - Whether to show detailed information
 */
function versionCommand(options) {
  const { verbose } = options;

  console.log();
  console.log(chalk.green(`Aixtiv Sample CLI v${packageJson.version}`));

  if (verbose) {
    console.log();
    console.log(chalk.yellow('Detailed Version Information:'));
    console.log(chalk.cyan(`• Name: ${packageJson.name}`));
    console.log(chalk.cyan(`• Description: ${packageJson.description}`));
    console.log(chalk.cyan(`• Author: ${packageJson.author}`));
    console.log(chalk.cyan(`• License: ${packageJson.license}`));

    // Display dependency versions
    console.log();
    console.log(chalk.yellow('Dependencies:'));
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      console.log(chalk.cyan(`• ${name}: ${version}`));
    });

    // System information
    console.log();
    console.log(chalk.yellow('System Information:'));
    console.log(chalk.cyan(`• Node.js: ${process.version}`));
    console.log(chalk.cyan(`• Platform: ${process.platform}`));
    console.log(chalk.cyan(`• Architecture: ${process.arch}`));
  }

  console.log();
}

module.exports = versionCommand;
