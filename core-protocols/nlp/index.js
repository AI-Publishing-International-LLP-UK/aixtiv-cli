/**
 * Aixtiv CLI - Natural Language Processing Core
 *
 * This module provides functionality to interpret natural language commands
 * and convert them into Aixtiv CLI commands.
 */

const { execSync } = require('child_process');
const { classifyIntent } = require('./intent-classifier');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'nlp-processor' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/nlp.log'),
    }),
  ],
});

// Add console logging in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

/**
 * Process natural language input and convert it to Aixtiv CLI commands
 *
 * @param {string} input - Natural language input
 * @param {Object} options - Processing options
 * @returns {Object} Result object with processed command
 */
function processNaturalLanguage(input, options = {}) {
  const sessionId = options.sessionId || 'default';
  const dryRun = options.dryRun || false;

  logger.info(`Processing natural language input: "${input}" (session: ${sessionId})`);

  try {
    // Classify the intent of the natural language input
    let intent;

    if (options.clarifiedIntent) {
      intent = options.clarifiedIntent;
    } else {
      intent = classifyIntent(input);
    }

    // Check if we have a valid intent with high enough confidence
    if (!intent.command || intent.confidence < 0.4) {
      if (intent.possibleIntents && intent.possibleIntents.length > 0) {
        // We have some possible matches but not enough confidence
        logger.warn('Detected ambiguous intent, clarification needed');
        return {
          success: false,
          needsMoreInfo: true,
          possibleIntents: intent.possibleIntents,
          input: input,
          message: 'Could you provide more details about what you want to do?',
        };
      }

      // We don't have a match
      logger.warn('Could not determine intent with sufficient confidence');
      return {
        success: false,
        message: 'I did not understand that command. Try being more specific.',
        input: input,
      };
    }

    // Build the command string with flags
    const commandString = buildCommandString(intent);

    // Execute the command (or just return the string in dry run mode)
    return executeCommand(commandString, intent, { dryRun });
  } catch (error) {
    logger.error(`Error processing natural language input: ${error.message}`, { error });
    return {
      success: false,
      message: `Error: ${error.message}`,
      input: input,
    };
  }
}

/**
 * Build an Aixtiv CLI command string from an intent object
 *
 * @param {Object} intent - Intent object with command and flags
 * @returns {string} Command string
 */
function buildCommandString(intent) {
  let command = `aixtiv ${intent.command}`;

  // Add flags with values
  for (const [flag, value] of Object.entries(intent.flags)) {
    // Handle values with spaces by adding quotes
    const formattedValue = value.toString().includes(' ') ? `"${value}"` : value;

    // Check if it's a long flag (--flag) or short flag (-f)
    const flagPrefix = flag.length === 1 ? '-' : '--';
    command += ` ${flagPrefix}${flag} ${formattedValue}`;
  }

  logger.debug(`Built command string: ${command}`);
  return command;
}

/**
 * Execute an Aixtiv CLI command
 *
 * @param {string} commandString - Command to execute
 * @param {Object} intent - Original intent object
 * @param {Object} options - Execution options
 * @returns {Object} Command execution result
 */
function executeCommand(commandString, intent, options = {}) {
  // In dry run mode, just return the command without executing
  if (options.dryRun) {
    logger.info(`Dry run mode, command: ${commandString}`);
    return {
      success: true,
      command: commandString,
      intent: intent,
      output: `Would execute: ${commandString}`,
      dryRun: true,
    };
  }

  // Otherwise execute the command
  try {
    logger.info(`Executing command: ${commandString}`);
    logger.info(`Current working directory: ${process.cwd()}`);
    
    // Try updating the command to use node directly
    // Instead of: aixtiv domain list
    // Use: node /Users/as/asoos/aixtiv-cli/bin/aixtiv.js domain list
    const absolutePath = path.resolve(__dirname, '../../bin/aixtiv.js');
    
    // Extract the base command and any arguments
    const baseCommand = commandString.replace(/^aixtiv /, '');
    const updatedCommandString = `node ${absolutePath} ${baseCommand}`;
    
    logger.info(`Updated command string: ${updatedCommandString}`);
    
    // Try the updated command string
    const output = execSync(updatedCommandString, { encoding: 'utf8' });

    return {
      success: true,
      command: updatedCommandString,
      intent: intent,
      output: output,
    };
  } catch (error) {
    logger.error(`Error executing command: ${error.message}`, { error });
    return {
      success: false,
      command: commandString,
      intent: intent,
      error: error.message,
      output: error.stdout || error.message,
    };
  }
}

module.exports = {
  processNaturalLanguage,
};
