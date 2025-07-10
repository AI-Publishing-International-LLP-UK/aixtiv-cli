#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');

// Display banner
console.log(chalk.cyan(figlet.textSync('Aixtiv Sample CLI', { horizontalLayout: 'full' })));
console.log(chalk.blue(`v${packageJson.version} - Sample CLI for Aixtiv Symphony`));
console.log();

// Import commands
const helloCommand = require('../commands/hello');
const versionCommand = require('../commands/version');

// Define the program
program
  .version(packageJson.version)
  .description('Sample CLI for Aixtiv Symphony Orchestration System');

// Register commands
program
  .command('hello')
  .description('Displays a greeting message')
  .option('-n, --name <name>', 'Your name', 'User')
  .action(helloCommand);

program
  .command('version')
  .description('Displays version information')
  .option('-v, --verbose', 'Show detailed version information')
  .action(versionCommand);

// Parse command line arguments
program.parse(process.argv);

// Display help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
