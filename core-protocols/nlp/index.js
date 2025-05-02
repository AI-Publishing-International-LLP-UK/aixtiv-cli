/**
 * Aixtiv CLI - Natural Language Processing Module
 * 
 * Main entry point for the natural language processing functionality.
 * This module interfaces with the rest of the Aixtiv CLI system.
 */

const winston = require('winston');
const { execSync } = require('child_process');
const { classifyIntent } = require('./intent-classifier');
const fs = require('fs');
const path = require('path');

// Make sure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'nlp.log')
    })
  ]
});

// Try to import conversation context manager (may not exist in early versions)
let conversationContext;
try {
  conversationContext = require('../../wing/jet-port/dispatching/conversation-context');
  logger.info('Conversation context manager loaded successfully');
} catch (error) {
  logger.warn('Conversation context manager not available, running in stateless mode');
  // Create stub if module doesn't exist yet
  conversationContext = {
    updateContext: (sessionId, input, result) => { return {}; },
    getContext: (sessionId) => { return {}; }
  };
}

/**
 * Process natural language input and execute corresponding command
 * 
 * @param {string} input - Natural language command from user
 * @param {Object} options - Additional options including:
 *   - dryRun: If true, shows the command but doesn't execute it
 *   - sessionId: Optional session identifier for maintaining context
 *   - verbose: If true, provides more detailed output
 * @returns {Object} Result of the command execution
 */
function processNaturalLanguage(input, options = {}) {
  const sessionId = options.sessionId || 'default-session';
  logger.info(`Processing natural language input: "${input}" (session: ${sessionId})`);
  
  try {
    // Get previous conversation context if available
    const context = conversationContext.getContext(sessionId);
    
    // Classify the intent
    let intent = classifyIntent(input);
    
    // Enhance with context if confidence is low
    if (intent.confidence < 0.6 && context.lastIntent) {
      logger.debug('Using conversation context to enhance understanding');
      intent = enhanceIntentWithContext(intent, context);
    }
    
    // Update the conversation context with this new interaction
    conversationContext.updateContext(sessionId, input, intent);
    
    // Handle the case where we couldn't determine the intent
    if (!intent.command) {
      return handleLowConfidence(intent, options);
    }
    
    // Convert the intent to a command string
    const commandString = buildCommandString(intent);
    
    // Execute or display the command based on options
    return executeCommand(commandString, intent, options);
  } catch (error) {
    logger.error(`Error processing natural language input: ${error.message}`, { error });
    return {
      success: false,
      error: error.message,
      command: null,
      output: null
    };
  }
}

/**
 * Enhance an intent with previous conversation context
 */
function enhanceIntentWithContext(intent, context) {
  // If we have a previous intent, use it to fill in missing details
  if (context.lastIntent && context.lastIntent.command) {
    logger.debug(`Enhancing intent with context from previous interaction: ${context.lastIntent.command}`);
    
    // If current intent has no command but previous did, and confidence is very low,
    // this might be a continuation of the previous command
    if (!intent.command && intent.confidence < 0.3) {
      intent.command = context.lastIntent.command;
      intent.confidence += 0.2;
    }
    
    // Fill in missing flags from previous intent if they're not in the current one
    if (intent.command === context.lastIntent.command) {
      for (const [key, value] of Object.entries(context.lastIntent.flags)) {
        if (!intent.flags[key]) {
          intent.flags[key] = value;
        }
      }
    }
  }
  
  return intent;
}

/**
 * Handle the case where confidence in the intent is too low
 */
function handleLowConfidence(intent, options) {
  logger.warn('Could not determine intent with sufficient confidence');
  
  let message = 'I\'m not sure what you want to do. ';
  
  if (intent.possibleIntents && intent.possibleIntents.length > 0) {
    message += `Did you want to perform one of these actions? ${intent.possibleIntents.join(', ')}`;
  } else {
    message += 'Please try rephrasing your request with more specific details.';
  }
  
  return {
    success: false,
    needsMoreInfo: true,
    possibleIntents: intent.possibleIntents || [],
    message: message,
    command: null,
    output: message
  };
}

/**
 * Build a command string from the classified intent
 * 
 * @param {Object} intent - The classified intent object
 * @returns {string} The command string to execute
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
 * Execute the command
 * 
 * @param {string} commandString - The command to execute
 * @param {Object} intent - The original intent object
 * @param {Object} options - Execution options
 * @returns {Object} Result of execution
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
      dryRun: true
    };
  }
  
  // Otherwise execute the command
  try {
    logger.info(`Executing command: ${commandString}`);
    const output = execSync(commandString, { encoding: 'utf8' });
    
    return {
      success: true,
      command: commandString,
      intent: intent,
      output: output
    };
  } catch (error) {
    logger.error(`Error executing command: ${error.message}`, { error });
    return {
      success: false,
      command: commandString,
      intent: intent,
      error: error.message,
      output: error.stdout || error.message
    };
  }
}

module.exports = {
  processNaturalLanguage,
  buildCommandString
};

