/**
 * Aixtiv CLI - Natural Language Processing Command
 *
 * This module registers a new command in the Aixtiv CLI that allows users
 * to interact with the system using natural language instead of command codes.
 */

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const figlet = require('figlet');
const Table = require('cli-table3');
const boxen = require('boxen'); // Add this line to require boxen

// Get the root directory of the project
const projectRoot = path.resolve(__dirname, '../..');

// Import NLP processor
let nlpProcessor;
try {
  nlpProcessor = require('../../core-protocols/nlp');
  console.log('NLP processor loaded successfully');
} catch (error) {
  console.error(`Error loading NLP processor: ${error.message}`);
  console.error('Make sure the core-protocols/nlp module is available');
  process.exit(1);
}

// Conversation context manager for stateful interactions
let conversationContext;
try {
  conversationContext = require('../../wing/jet-port/dispatching/conversation-context');
  console.log('Conversation context manager loaded successfully');
} catch (error) {
  console.warn('Conversation context manager not available, using stateless mode');
  // Create minimal stub if module doesn't exist yet
  conversationContext = {
    updateContext: (sessionId, input, result) => {
      return {};
    },
    getContext: (sessionId) => {
      return {};
    },
    handleClarification: (sessionId, clarification) => {
      return null;
    },
  };
}

/**
 * Display a fancy NLP mode banner
 */
function displayBanner() {
  console.log(chalk.cyan(figlet.textSync('Aixtiv NLP', { font: 'Standard' })));

  console.log(
    boxen(chalk.yellow(' Natural Language Interface to Aixtiv CLI '), {
      padding: 1,
      borderColor: 'cyan',
      margin: 1,
      borderStyle: 'round',
    })
  );
}

/**
 * Format the command result for display
 */
function formatResult(result) {
  if (!result) {
    return chalk.red('No result returned from command');
  }

  // If the command execution failed
  if (!result.success) {
    return chalk.red(`Error: ${result.error || result.message || 'Unknown error'}`);
  }

  // If this was a dry run, just show what would have been executed
  if (result.dryRun) {
    return chalk.dim(`Would execute: ${result.command}`);
  }

  // Parse the command output and format it nicely
  let output = '';

  if (result.command) {
    output += chalk.green(`\n✓ Executed: ${chalk.bold(result.command)}\n\n`);
  }

  if (result.output) {
    // Try to format the output nicely
    output += result.output;
  }

  return output;
}

/**
 * Interactive mode for NLP interface
 */
async function startInteractiveMode() {
  displayBanner();

  console.log(chalk.cyan('\nNatural Language Interface - Interactive Mode'));
  console.log(chalk.dim('Type "exit" or "quit" to leave interactive mode'));
  console.log(chalk.dim('Type "help" for assistance\n'));

  const sessionId = uuidv4();
  let keepGoing = true;

  while (keepGoing) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.green('Aixtiv>'),
        validate: (value) => value.trim() !== '' || 'Please enter a command',
      },
    ]);

    // Check for exit commands
    if (['exit', 'quit'].includes(input.toLowerCase().trim())) {
      keepGoing = false;
      console.log(chalk.yellow('Exiting NLP mode. Goodbye!'));
      continue;
    }

    // Check for help command
    if (input.toLowerCase().trim() === 'help') {
      displayHelp();
      continue;
    }

    // Process the natural language input
    const spinner = ora('Processing...').start();

    try {
      const context = conversationContext.getContext(sessionId);

      // Check if we're waiting for clarification
      let result;
      if (context.clarificationState && context.clarificationState.waitingForClarification) {
        spinner.text = 'Processing clarification...';
        const clarifiedIntent = conversationContext.handleClarification(sessionId, input);

        if (clarifiedIntent) {
          // Use the clarified intent
          spinner.text = 'Executing command based on clarification...';
          result = nlpProcessor.processNaturalLanguage(input, {
            sessionId,
            clarifiedIntent,
          });
        } else {
          // Still unclear, try processing the input directly
          spinner.text = 'Attempting to process input...';
          result = nlpProcessor.processNaturalLanguage(input, { sessionId });
        }
      } else {
        // Normal processing
        result = nlpProcessor.processNaturalLanguage(input, { sessionId });
      }

      // Update the spinner based on the result
      if (result.success) {
        spinner.succeed('Command processed successfully');
      } else if (result.needsMoreInfo) {
        spinner.info('Clarification needed');
      } else {
        spinner.fail('Command processing failed');
      }

      // Display the formatted result
      console.log(formatResult(result));
    } catch (error) {
      spinner.fail('Error processing command');
      console.error(chalk.red(`Error: ${error.message}`));
    }

    console.log(''); // Add a blank line for readability
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(chalk.cyan('\nNatural Language Interface - Help'));
  console.log(
    chalk.dim('Instead of using command flags and options, you can use natural language\n')
  );

  const table = new Table({
    head: [chalk.cyan('Example Phrases'), chalk.cyan('Equivalent Command')],
    colWidths: [50, 50],
  });

  table.push(
    [
      'Create a new project called "Website Redesign"',
      'aixtiv claude:agent:delegate -p "Website Redesign"',
    ],
    [
      'Generate a login component in React',
      'aixtiv claude:code:generate -t "Create a login component" -l javascript',
    ],
    ['Check security for our main repository', 'aixtiv claude:automation:github -r main -a secure'],
    ['Link lucy as a copilot', 'aixtiv copilot:link -c lucy']
  );

  console.log(table.toString());
  // Create a simple ASCII box
  console.log('');
  console.log(chalk.cyan('┌' + '─'.repeat(50) + '┐'));
  console.log(
    chalk.cyan('│') +
      ' ' +
      chalk.yellow('Natural Language Interface to Aixtiv CLI') +
      ' '.repeat(14) +
      chalk.cyan('│')
  );
  console.log(chalk.cyan('└' + '─'.repeat(50) + '┘'));
  console.log('');
}

/**
 * Process a single command in non-interactive mode
 *
 * @param {string} inputString - Natural language input
 * @param {Object} options - Command options
 * @returns {number} Exit code (0 for success, 1 for failure)
 */
function processSingleCommand(inputString, options) {
  const sessionId = options.session || uuidv4();
  const dryRun = options.dryRun || false;

  // Process the natural language input
  try {
    const result = nlpProcessor.processNaturalLanguage(inputString, {
      sessionId,
      dryRun,
    });

    // Display the result
    console.log(formatResult(result));

    // Return success/failure for programmatic use
    return result.success ? 0 : 1;
  } catch (error) {
    console.error(chalk.red(`Error processing command: ${error.message}`));
    return 1;
  }
}

// Create and export the command
const nlpCommand = new Command('nlp')
  .description('Process natural language to execute Aixtiv CLI commands')
  .option('-d, --dry-run', 'Show what command would be executed without running it', false)
  .option('-s, --session <id>', 'Session ID for continued conversation context')
  .option('-i, --interactive', 'Start interactive NLP mode', false)
  .argument('[input...]', 'Natural language input (omit to enter interactive mode)')
  .action((input, options) => {
    // If no input is provided or interactive mode is explicitly requested, start interactive mode
    if ((input.length === 0 || options.interactive) && process.stdin.isTTY) {
      startInteractiveMode();
      return;
    }

    // Otherwise, process the input as a single command
    const inputString = input.join(' ');
    return processSingleCommand(inputString, options);
  });

module.exports = nlpCommand;
