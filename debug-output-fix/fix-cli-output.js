/**
 * Fix CLI Output Display
 * 
 * This script enhances the Aixtiv CLI to display both internal reasoning (thought process)
 * and execution outputs explicitly labeled.
 */

const fs = require('fs');
const path = require('path');

// Paths to files that need modification
const utilsPath = path.join(__dirname, '..', 'lib', 'utils.js');
const displayResultPath = path.join(__dirname, '..', 'src', 'display.js');

// Check if utils.js exists and modify it
function modifyUtils() {
  if (fs.existsSync(utilsPath)) {
    console.log(`Modifying ${utilsPath} to enhance output display...`);
    
    let utilsContent = fs.readFileSync(utilsPath, 'utf8');
    
    // Find the displayResult function or similar
    if (utilsContent.includes('displayResult')) {
      // Add debug output wrapper
      utilsContent = utilsContent.replace(
        /function displayResult\s*\([^)]*\)\s*\{/,
        `function displayResult(params) {
  // Debug: Show internal thought process
  console.log('\\n🧠 INTERNAL REASONING:');
  console.log('-'.repeat(50));
  if (params.details && params.details.reasoning) {
    console.log(params.details.reasoning);
  } else {
    console.log('No detailed reasoning available for this operation');
  }
  console.log('-'.repeat(50));
  
  // Display regular output with clear label
  console.log('\\n📊 EXECUTION RESULT:');
  console.log('-'.repeat(50));`
      );
      
      // Close the function with additional separator
      utilsContent = utilsContent.replace(
        /}(\s*\/\/\s*end of displayResult|\s*$)/,
        `  console.log('-'.repeat(50));
}$1`
      );
      
      // Write modified content
      fs.writeFileSync(utilsPath, utilsContent);
      console.log('✅ Successfully enhanced output display in utils.js');
    } else {
      console.log('⚠️ Could not locate displayResult function in utils.js');
    }
  } else {
    console.log(`⚠️ File not found: ${utilsPath}`);
  }
}

// Create a debug display module if it doesn't exist
function createDebugDisplay() {
  const debugDisplayPath = path.join(__dirname, '..', 'lib', 'debug-display.js');
  
  console.log(`Creating debug display module at ${debugDisplayPath}...`);
  
  const debugDisplayContent = `/**
 * Debug Display Module for Aixtiv CLI
 * 
 * This module provides enhanced output display showing both
 * internal reasoning and execution results.
 */

const chalk = require('chalk');

/**
 * Display debug information with both thought process and results
 * 
 * @param {Object} options - Display options
 * @param {string} options.thought - Internal reasoning/thought process
 * @param {Object} options.result - Execution result
 * @param {string} options.command - Command that was executed
 */
function debugDisplay(options) {
  const { thought, result, command } = options;
  
  // Display thought process
  console.log('\\n' + chalk.bgBlue.white(' INTERNAL REASONING '));
  console.log(chalk.blue('-'.repeat(50)));
  console.log(thought || 'No detailed reasoning available');
  console.log(chalk.blue('-'.repeat(50)));
  
  // Display execution result
  console.log('\\n' + chalk.bgGreen.black(' EXECUTION RESULT '));
  console.log(chalk.green('-'.repeat(50)));
  
  if (command) {
    console.log(chalk.bold('Command: ') + command);
  }
  
  if (result) {
    if (typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  } else {
    console.log('No result data available');
  }
  
  console.log(chalk.green('-'.repeat(50)));
}

module.exports = {
  debugDisplay
};
`;

  fs.writeFileSync(debugDisplayPath, debugDisplayContent);
  console.log('✅ Created debug display module');
  
  return debugDisplayPath;
}

// Add debug wrapper to main CLI commands
function enhanceCommandModules() {
  // Target the claude commands as an example
  const claudeCommandDir = path.join(__dirname, '..', 'commands', 'claude');
  
  if (fs.existsSync(claudeCommandDir)) {
    // Find subcommands
    const subcommandDirs = fs.readdirSync(claudeCommandDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const subDir of subcommandDirs) {
      const subDirPath = path.join(claudeCommandDir, subDir);
      const files = fs.readdirSync(subDirPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
        .map(dirent => dirent.name);
      
      for (const file of files) {
        const filePath = path.join(subDirPath, file);
        console.log(`Enhancing command module: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add debug display to module exports
        content = content.replace(
          /module\.exports\s*=\s*async\s*function\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/,
          `// Import debug display
const { debugDisplay } = require('../../lib/debug-display');

module.exports = async function $1($2) {
  // Capture internal reasoning
  const internalThought = \`Processing $1 command with parameters: \${JSON.stringify(arguments[0])}\`;
`
        );
        
        // Add debug display before return or at the end
        if (content.includes('return') || content.includes('process.exit')) {
          content = content.replace(
            /(return|process\.exit)/g,
            `// Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:$1'
  });
  
  $1`
          );
        } else {
          content = content.replace(
            /}(\s*\/\/\s*end of|$)/,
            `  // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result || 'Command completed',
    command: 'claude:$1'
  });
}$1`
          );
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Enhanced ${file}`);
      }
    }
  } else {
    console.log(`⚠️ Directory not found: ${claudeCommandDir}`);
  }
}

// Create a README file
function createReadme() {
  const readmePath = path.join(__dirname, 'README.md');
  
  const readmeContent = `# Aixtiv CLI Output Enhancement

This project enhances the Aixtiv CLI to display both internal reasoning and execution results.

## Features

- Clearly labeled internal thought process
- Separated execution results
- Color-coded output for better readability

## Usage

1. Run the fix-cli-output.js script to apply the enhancements:

\`\`\`bash
node debug-output-fix/fix-cli-output.js
\`\`\`

2. Use any CLI command as normal, and you'll now see both the internal reasoning and the execution results:

\`\`\`bash
./bin/aixtiv.js claude:code:generate --task "Create a factorial function"
\`\`\`

## Customization

You can modify the debug-display.js module to customize how the output is formatted and displayed.
`;

  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ Created README with usage instructions');
}

// Main execution
function main() {
  console.log('🔍 Starting Aixtiv CLI output enhancement...');
  
  // Create debug display module
  const debugDisplayPath = createDebugDisplay();
  
  // Modify utils.js if it exists
  modifyUtils();
  
  // Enhance command modules
  enhanceCommandModules();
  
  // Create README
  createReadme();
  
  console.log('✅ CLI output enhancement complete!');
  console.log('');
  console.log('Now run your Aixtiv CLI commands to see both internal reasoning and execution results.');
  console.log('Example: ./bin/aixtiv.js claude:code:generate --task "Create a factorial function"');
}

// Run the main function
main();
