const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');

// AIXTIV SYMPHONY vision statement for alignment with ASOOS principles
const AIXTIV_SYMPHONY_VISION = `AIXTIV SYMPHONY ORCHESTRATING OPERATING SYSTEM - The Definitive Architecture & Vision Statement

ASOOS defines a new technology category with OS of ASOOS referring to the first AI-Human focused OS. A smart Operating System designed to accelerate AI-Human-Synchronization. The acceleration increases AI-Human Synchronosity (AI-H-SYN) through an array of methods that involves the overall authentication process, professional skills, experience, and deep behavioral research modeling for a highly reliable outcome that forms the foundation of many key functions of the innovative OS, ASOOS.`;

// API endpoint configuration
// Code generation endpoint
const functionUrl = 'https://drclaude.live/code-generate';
/**
 * Generate code using Claude Code assistant
 * @param {object} options - Command options
 */
module.exports = async function generateCode(options) {
  const { task, language, outputFile, context } = parseOptions(options);
  
  try {
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
          const payload = {
            task: task,
            language: language || 'javascript',
            context_files: contextFiles,
            timestamp: new Date().toISOString(),
            asoos_vision: AIXTIV_SYMPHONY_VISION,
            model: 'claude-3-7-v2', // Specify SuperClaude3 model version
            datapipe: 'true'        // Enable data pipe for improved performance
          };
          
          // Create an agent that ignores SSL certificate validation
          const httpsAgent = new https.Agent({
            rejectUnauthorized: false
          });
          
          const response = await fetch(functionUrl, {
            method: 'POST',  // Explicitly set HTTP method to POST
            headers: {
              'Content-Type': 'application/json',
              'X-Aixtiv-Region': 'us-west1-b',
              'X-Aixtiv-Datapipe': 'superclaude3'
            },
            body: JSON.stringify(payload),
            agent: httpsAgent // Add this line to ignore SSL certificate validation
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
    
    // Show more helpful error information
    if (error.message.includes('ECONNREFUSED') || error.message.includes('404')) {
      console.error(chalk.yellow('\nTroubleshooting tips:'));
      console.error('1. Check if the Claude API service is running locally');
      console.error('2. Set the CLAUDE_API_ENDPOINT environment variable to point to your API');
      console.error('   Example: export CLAUDE_API_ENDPOINT=https://your-claude-api-endpoint.com/claude-code-generate');
      console.error('3. Make sure your network connection can reach the Claude API service');
      console.error('\nCurrent endpoint: ' + functionUrl);
    }
    
    process.exit(1);
  }
};
