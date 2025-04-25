const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');

/**
 * Generate code using Claude Code assistant
 * @param {object} options - Command options
 */
module.exports = async function generateCode(options) {
  const { task, language, outputFile, context } = parseOptions(options);
  
  try {
    // Code generation endpoint
    const functionUrl = 'https://us-west1-aixtiv-symphony.cloudfunctions.net/claude-code-generate';
    
    // Read context files if provided
    let contextFiles = [];
    if (context) {
      const contextPaths = context.split(',').map(p => p.trim());
      for (const contextPath of contextPaths) {
        if (fs.existsSync(contextPath)) {
          try {
            const content = fs.readFileSync(contextPath, 'utf8');
            contextFiles.push({
              path: contextPath,
              content: content
            });
          } catch (err) {
            console.warn(chalk.yellow(`Warning: Could not read context file ${contextPath}: ${err.message}`));
          }
        } else {
          console.warn(chalk.yellow(`Warning: Context file not found: ${contextPath}`));
        }
      }
    }
    
    // Execute code generation with spinner
    const result = await withSpinner(
      `Claude Code is generating ${chalk.cyan(language)} code for your task`,
      async () => {
        try {
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              task: task,
              language: language || 'javascript',
              context_files: contextFiles,
              timestamp: new Date().toISOString()
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          throw new Error(`Failed to generate code: ${error.message}`);
        }
      }
    );
    
    // Display result
    displayResult({
      success: result.status === 'completed',
      message: `Code generation ${result.status === 'completed' ? 'successfully completed' : 'failed'}`,
      details: {
        task: task,
        language: language || 'javascript'
      }
    });
    
    if (result.status === 'completed' && result.code) {
      console.log(chalk.bold('\nGenerated Code:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(result.code);
      console.log(chalk.gray('─'.repeat(50)));
      
      // Save to file if outputFile is provided
      if (outputFile) {
        try {
          const dir = path.dirname(outputFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(outputFile, result.code);
          console.log(chalk.green(`\nCode saved to ${outputFile}`));
        } catch (err) {
          console.error(chalk.red(`\nError saving to file: ${err.message}`));
        }
      }
      
      if (result.explanation) {
        console.log(chalk.bold('\nCode Explanation:'));
        console.log(result.explanation);
      }
    }
  } catch (error) {
    console.error(chalk.red('\nCode generation failed:'), error.message);
    process.exit(1);
  }
};
