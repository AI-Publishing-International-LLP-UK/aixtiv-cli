#!/usr/bin/env node
const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');
require('dotenv').config();

// Display banner
console.log(chalk.cyan(figlet.textSync('Aixtiv Symphony', { horizontalLayout: 'full' })));
console.log(chalk.blue(`v${packageJson.version} - Aixtiv Symphony Project`));
console.log();

// Configure program
program.version(packageJson.version).description('Aixtiv Symphony Project CLI');

// Define commands here
// Example:
// program
//   .command('example:command')
//   .description('Example command description')
//   .option('-o, --option <value>', 'Option description')
//   .action(require('./commands/example'));

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (process.argv.length === 2) {
  program.outputHelp();
}

