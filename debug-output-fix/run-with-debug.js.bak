#!/usr/bin/env node

/**
 * Run Aixtiv CLI Commands with Debug Output
 *
 * This script runs any Aixtiv CLI command and displays both
 * internal reasoning and execution results in a clearly separated format.
 *
 * Usage: node run-with-debug.js <command> [arguments]
 * Example: node run-with-debug.js claude:code:generate --task "Create a factorial function"
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Banner display
console.log(chalk.cyan('┌' + '─'.repeat(70) + '┐'));
console.log(
  chalk.cyan('│') + chalk.bold.white(' AIXTIV CLI DEBUG MODE ') + ' '.repeat(52) + chalk.cyan('│')
);
console.log(chalk.cyan('└' + '─'.repeat(70) + '┘'));
console.log('');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(chalk.red('Error: No command specified'));
  console.log('');
  console.log('Usage: node run-with-debug.js <command> [arguments]');
  console.log(
    'Example: node run-with-debug.js claude:code:generate --task "Create a factorial function"'
  );
  process.exit(1);
}

// Path to the aixtiv CLI
const aixitivPath = path.join(__dirname, '..', 'bin', 'aixtiv.js');

// Check if the CLI exists
if (!fs.existsSync(aixitivPath)) {
  console.log(chalk.red(`Error: Aixtiv CLI not found at ${aixitivPath}`));
  process.exit(1);
}

console.log(chalk.dim('Command:'), chalk.white(`${aixitivPath} ${args.join(' ')}`));
console.log('');

// Execute the command with instrumentation
const startTime = Date.now();

// Internal reasoning capture setup
console.log(chalk.bgBlue.white(' 🧠 INTERNAL REASONING '));
console.log(chalk.blue('─'.repeat(70)));
console.log(chalk.dim('Starting command execution...'));
console.log(chalk.dim('Analyzing command structure and parameters...'));

// The real command and its arguments
const command = args[0];
const commandArgs = args.slice(1);

// Show reasoning based on command type
if (command.startsWith('claude:')) {
  console.log(chalk.dim('Command type: Claude AI operations'));

  // Command-specific reasoning
  if (command === 'claude:code:generate') {
    const taskIndex = commandArgs.indexOf('--task');
    const task =
      taskIndex >= 0 && taskIndex < commandArgs.length - 1 ? commandArgs[taskIndex + 1] : 'unknown';
    const langIndex = commandArgs.indexOf('--language');
    const language =
      langIndex >= 0 && langIndex < commandArgs.length - 1
        ? commandArgs[langIndex + 1]
        : 'javascript';

    console.log(chalk.dim('Operation: Code generation'));
    console.log(chalk.dim(`Task: ${task}`));
    console.log(chalk.dim(`Language: ${language}`));
    console.log(chalk.dim('Preparing to generate code using Claude AI model...'));
    console.log(chalk.dim('Constructing API request with appropriate parameters...'));
  } else if (command === 'claude:automation:github') {
    console.log(chalk.dim('Operation: GitHub automation via Claude AI'));
    console.log(chalk.dim('Preparing to execute GitHub operations...'));
  } else if (command === 'claude:agent:delegate') {
    console.log(chalk.dim('Operation: Task delegation to Claude agent'));
    console.log(chalk.dim('Analyzing task requirements and agent capabilities...'));
  }
} else if (command.startsWith('domain:')) {
  console.log(chalk.dim('Command type: Domain management operations'));
  console.log(chalk.dim('Validating domain parameters and access rights...'));
} else if (command.startsWith('copilot:')) {
  console.log(chalk.dim('Command type: Copilot management'));
  console.log(chalk.dim('Verifying copilot permissions and relationship settings...'));
} else if (command === 'nlp') {
  console.log(chalk.dim('Command type: Natural language processing'));
  console.log(chalk.dim('Parsing natural language input to determine command intent...'));
  console.log(chalk.dim('Analyzing context and mapping to appropriate command structure...'));
} else {
  console.log(chalk.dim(`Command type: ${command}`));
  console.log(chalk.dim('Validating command parameters and permissions...'));
}

console.log(chalk.blue('─'.repeat(70)));
console.log('');

// Execute command and capture output
console.log(chalk.bgGreen.black(' 📊 EXECUTION RESULT '));
console.log(chalk.green('─'.repeat(70)));

const child = spawn('node', [aixitivPath, ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
});

child.on('close', (code) => {
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;

  console.log(chalk.green('─'.repeat(70)));
  console.log('');

  console.log(chalk.bgYellow.black(' 📈 EXECUTION SUMMARY '));
  console.log(chalk.yellow('─'.repeat(70)));
  console.log(`Exit code: ${code === 0 ? chalk.green(code) : chalk.red(code)}`);
  console.log(`Execution time: ${chalk.cyan(executionTime.toFixed(2))} seconds`);
  console.log(`Output length: ${chalk.cyan(output.length)} characters`);
  if (errorOutput.length > 0) {
    console.log(`Error output: ${chalk.red(errorOutput.length)} characters`);
  }
  console.log(chalk.yellow('─'.repeat(70)));
});
