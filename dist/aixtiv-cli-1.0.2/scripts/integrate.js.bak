#!/usr/bin/env node

/**
 * Telemetry Integration Script
 * 
 * This script helps integrate telemetry into the Aixtiv CLI by:
 * 1. Modifying the main bin/aixtiv.js file to initialize telemetry
 * 2. Adding a telemetry wrapper for all commands
 * 
 * Usage: node scripts/telemetry/integrate.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Paths for files we need to modify
const ROOT_DIR = path.resolve(__dirname, '../..');
const MAIN_CLI_PATH = path.join(ROOT_DIR, 'bin', 'aixtiv.js');
const BACKUP_CLI_PATH = `${MAIN_CLI_PATH}.bak`;

// Telemetry initialization code to add
const TELEMETRY_INIT_CODE = `
// Initialize telemetry early
const telemetry = require('../lib/telemetry');

// Initialize telemetry and handle any initialization errors
(async () => {
  try {
    const telemetryEnabled = await telemetry.init();
    if (telemetryEnabled) {
      console.log(chalk.dim('Telemetry initialized'));
    }
  } catch (error) {
    console.error(chalk.dim(\`Telemetry initialization failed: \${error.message}\`));
  }
  
  // Set up graceful shutdown for telemetry
  process.on('exit', async () => {
    await telemetry.shutdown();
  });
  
  // Handle unhandled errors for telemetry recording
  process.on('uncaughtException', async (error) => {
    telemetry.recordError('uncaught', error);
    console.error(chalk.red('Uncaught exception:'), error);
    await telemetry.shutdown();
    process.exit(1);
  });
})();
`;

// Telemetry wrapper function to add
const TELEMETRY_WRAPPER_CODE = `
// Add telemetry middleware to measure command execution time
const withTelemetry = (command, handler) => {
  return (...args) => {
    const startTime = Date.now();
    telemetry.recordRequest(command);
    
    try {
      // Execute the original handler
      const result = handler(...args);
      
      // If the result is a promise, handle it with telemetry
      if (result && typeof result.then === 'function') {
        return result
          .then((value) => {
            const duration = Date.now() - startTime;
            telemetry.recordDuration(command, duration);
            return value;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            telemetry.recordError(command, error);
            telemetry.recordDuration(command, duration);
            throw error;
          });
      }
      
      // For synchronous handlers
      const duration = Date.now() - startTime;
      telemetry.recordDuration(command, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      telemetry.recordError(command, error);
      telemetry.recordDuration(command, duration);
      throw error;
    }
  };
};`;

/**
 * Backup a file before modifying it
 * @param {string} filePath Path to the file to backup
 */
function backupFile(filePath) {
  const backupPath = `${filePath}.bak`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup at ${backupPath}`);
}

/**
 * Check if telemetry is already integrated in the main CLI file
 * @param {string} fileContent Content of the main CLI file
 * @returns {boolean} True if telemetry is already integrated
 */
function isTelemetryAlreadyIntegrated(fileContent) {
  return fileContent.includes('require(\'../lib/telemetry\')') || 
         fileContent.includes('require("../lib/telemetry")');
}

/**
 * Add telemetry initialization to the main CLI file
 * @param {string} fileContent Content of the main CLI file
 * @returns {string} Updated file content
 */
function addTelemetryInit(fileContent) {
  // Find a suitable position after the imports but before main code
  const lines = fileContent.split('\n');
  let insertPosition = 0;
  
  // Look for dotenv config as a good insertion point
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('dotenv') && lines[i].includes('config')) {
      insertPosition = i + 1;
      break;
    }
  }
  
  // If we didn't find dotenv, look for the end of the imports
  if (insertPosition === 0) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('require(') || lines[i].includes('import ')) {
        insertPosition = i + 1;
      } else if (lines[i].trim() === '' && insertPosition > 0) {
        // Found the first empty line after imports
        break;
      }
    }
  }
  
  // Insert the telemetry initialization
  lines.splice(insertPosition, 0, TELEMETRY_INIT_CODE);
  
  // Find a good place to insert the wrapper function
  // Looking for a spot after command imports but before program definition
  let wrapperPosition = insertPosition + 10; // Skip past the telemetry init
  
  for (let i = wrapperPosition; i < lines.length; i++) {
    if (lines[i].includes('program.version(') || 
        lines[i].includes('program.command(')) {
      wrapperPosition = i;
      break;
    }
  }
  
  lines.splice(wrapperPosition, 0, TELEMETRY_WRAPPER_CODE);
  
  return lines.join('\n');
}

/**
 * Wrap all command action handlers with telemetry
 * @param {string} fileContent Content of the main CLI file
 * @returns {string} Updated file content
 */
function wrapCommandHandlers(fileContent) {
  // Replace all .action(...) calls with .action(withTelemetry(...))
  const pattern = /\.action\(([^)]+)\)/g;
  
  return fileContent.replace(pattern, (match, handler) => {
    // Skip if already wrapped
    if (handler.includes('withTelemetry(')) {
      return match;
    }
    
    // Extract command name from nearest .command() call
    const commandPattern = /\.command\('([^']+)'\)|\.command\("([^"]+)"\)/;
    const beforeMatch = fileContent.substring(0, fileContent.indexOf(match));
    const lastCommandLine = beforeMatch.split('\n').reverse().find(line => 
      line.includes('.command(')
    );
    
    let commandName = 'unknown';
    if (lastCommandLine) {
      const commandMatch = lastCommandLine.match(commandPattern);
      if (commandMatch) {
        commandName = commandMatch[1] || commandMatch[2];
      }
    }
    
    return `.action(withTelemetry('${commandName}', ${handler}))`;
  });
}

/**
 * Main function to integrate telemetry
 */
async function integrateTelementry() {
  console.log('Starting telemetry integration...');
  
  // Check if main CLI file exists
  if (!fs.existsSync(MAIN_CLI_PATH)) {
    console.error(`Main CLI file not found at ${MAIN_CLI_PATH}`);
    process.exit(1);
  }
  
  // Read the main CLI file
  const fileContent = fs.readFileSync(MAIN_CLI_PATH, 'utf8');
  
  // Check if telemetry is already integrated
  if (isTelemetryAlreadyIntegrated(fileContent)) {
    console.log('Telemetry appears to be already integrated. Do you want to continue? (y/n)');
    
    const answer = await new Promise(resolve => {
      rl.question('Continue? (y/n): ', resolve);
    });
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Integration cancelled');
      rl.close();
      return;
    }
  }
  
  // Backup the main CLI file
  backupFile(MAIN_CLI_PATH);
  
  // Add telemetry initialization
  let updatedContent = addTelemetryInit(fileContent);
  
  // Wrap command handlers with telemetry
  updatedContent = wrapCommandHandlers(updatedContent);
  
  // Write the updated content
  fs.writeFileSync(MAIN_CLI_PATH, updatedContent);
  
  console.log(`\nTelemetry integration complete!`);
  console.log(`\nMain CLI file updated at: ${MAIN_CLI_PATH}`);
  console.log(`Backup saved at: ${BACKUP_CLI_PATH}`);
  console.log(`\nNext steps:`);
  console.log(`1. Test the integration by running a command, e.g., 'bin/aixtiv.js --version'`);
  console.log(`2. Add specific telemetry calls for knowledge access in your command files`);
  console.log(`3. If any issues arise, restore from the backup: 'cp ${BACKUP_CLI_PATH} ${MAIN_CLI_PATH}'`);
  
  rl.close();
}

// Run the integration
integrateTelementry().catch(error => {
  console.error('Error during integration:', error);
  rl.close();
  process.exit(1);
});
