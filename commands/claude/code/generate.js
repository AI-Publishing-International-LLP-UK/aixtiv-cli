const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const { logAgentAction, getCurrentAgentId } = require('../../../lib/agent-tracking');
const fallbackGenerator = require('./fallback-generator');

// AIXTIV SYMPHONY vision statement for alignment with ASOOS principles
const AIXTIV_SYMPHONY_VISION = `AIXTIV SYMPHONY ORCHESTRATING OPERATING SYSTEM - The Definitive Architecture & Vision Statement

ASOOS defines a new technology category with OS of ASOOS referring to the first AI-Human focused OS. A smart Operating System designed to accelerate AI-Human-Synchronization. The acceleration increases AI-Human Synchronosity (AI-H-SYN) through an array of methods that involves the overall authentication process, professional skills, experience, and deep behavioral research modeling for a highly reliable outcome that forms the foundation of many key functions of the innovative OS, ASOOS.`;

// API endpoint configuration
// Code generation endpoint
const functionUrl =
  process.env.CLAUDE_API_ENDPOINT ||
  process.env.DR_CLAUDE_API ||
  'https://api.anthropic.com/v1/messages';

/**
 * Generate code using Claude Code assistant
 * @param {object} options - Command options
 */
// Debug display functionality is available through utils

// Import debug display
const { debugDisplay } = require('../../../lib/debug-display');
const telemetry = require('../../../lib/telemetry');

module.exports = async function generateCode(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('ai-model');
  // Capture internal reasoning
  const internalThought = `Processing generateCode command with parameters: ${JSON.stringify(arguments[0])}`;

  const { task, language, outputFile, context } = parseOptions(options);

  // Log the code generation request with agent attribution
  logAgentAction('code_generation_request', {
    task,
    language: language || 'javascript',
    has_context: !!context,
    agent_id: getCurrentAgentId(),
  });

  try {
    // Read context files if provided
    let contextFiles = [];
    if (context) {
      const contextPaths = context.split(',').map((p) => p.trim());
      for (const contextPath of contextPaths) {
        if (fs.existsSync(contextPath)) {
          try {
            const content = fs.readFileSync(contextPath, 'utf8');
            contextFiles.push({
              path: contextPath,
              content: content,
            });
          } catch (err) {
            console.warn(
              chalk.yellow(`Warning: Could not read context file ${contextPath}: ${err.message}`)
            );
          }
        } else {
          console.warn(chalk.yellow(`Warning: Context file not found: ${contextPath}`));
        }
      }
    }

    // Execute code generation with spinner
    const result = await withSpinner(
      `Claude Code is generating ${chalk.cyan(language || 'javascript')} code for your task`,
      async () => {
        try {
          const payload = {
            model: 'claude-3-sonnet-20240229', // Use a valid model name
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Task: ${task}\n\nPlease generate code in ${language || 'javascript'} for the task described above.${contextFiles.length > 0 ? '\n\nHere is additional context:' : ''}`,
                  },
                ],
              },
            ],
          };

          // Add context files to the content array if they exist
          if (contextFiles.length > 0) {
            for (const file of contextFiles) {
              payload.messages[0].content.push({
                type: 'text',
                text: `File: ${file.path}\n\n${file.content}`,
              });
            }

            // Add the vision statement as the final context element
            payload.messages[0].content.push({
              type: 'text',
              text: `Vision Context: ${AIXTIV_SYMPHONY_VISION}`,
            });
          }

          // Create an agent that ignores SSL certificate validation
          const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
          });

          try {
            const response = await fetch(functionUrl, {
              method: 'POST', // Explicitly set HTTP method to POST
              headers: {
                'Content-Type': 'application/json',
                'anthropic-api-key':
                  process.env.ANTHROPIC_API_KEY || process.env.DR_CLAUDE_API || '',
                'anthropic-version': '2023-06-01',
                'X-Agent-ID': getCurrentAgentId(), // Add agent ID in headers for tracking
              },
              body: JSON.stringify(payload),
              agent: httpsAgent, // Add this line to ignore SSL certificate validation
              timeout: 15000, // 15 second timeout
            });

            if (!response.ok) {
              // Capture the error response details
              try {
                const errorBody = await response.text();
                console.error(`Anthropic API Error (${response.status}):\n`, errorBody);
                throw new Error(`API responded with status ${response.status}: ${errorBody}`);
              } catch (e) {
                throw new Error(`API responded with status ${response.status}`);
              }
            }

            const jsonResponse = await response.json();

            // Extract the code from the assistant's response
            let code = '';
            let explanation = '';

            if (jsonResponse.content && jsonResponse.content.length > 0) {
              // The Claude API response includes an array of content blocks
              // We need to extract the code blocks from the response
              for (const block of jsonResponse.content) {
                if (block.type === 'text') {
                  code += block.text;
                }
              }
            }
          } catch (error) {
            // If API call fails with network error or timeout, use fallback generator
            if (
              error.message.includes('ECONNREFUSED') ||
              error.message.includes('404') ||
              error.message.includes('timeout') ||
              error.message.includes('network')
            ) {
              console.warn(
                chalk.yellow(
                  '\nCould not reach Claude API endpoint. Using local fallback generator.'
                )
              );

              // Use fallback generator
              const fallbackResult = fallbackGenerator.generateCode(task, language || 'javascript');
            } else {
              throw error;
            }
          }
        } catch (error) {
          throw new Error(`Failed to generate code: ${error.message}`);
        }
      }
    );

    // Log the result with agent attribution
    logAgentAction('code_generation_result', {
      success: result.status === 'completed',
      task,
      language: language || 'javascript',
      agent_id: getCurrentAgentId(),
      usedFallback: result.isLocalFallback || false,
    });

    // Display result
    displayResult({
      success: result.status === 'completed',
      message: `Code generation ${result.status === 'completed' ? 'successfully completed' : 'failed'}${result.isLocalFallback ? ' (using local fallback)' : ''}`,
      details: {
        task: task,
        language: language || 'javascript',
        performed_by: getCurrentAgentId(),
        mode: result.isLocalFallback ? 'local' : 'api',
      },
    });

    if (result.status === 'completed' && result.code) {
      if (result.isLocalFallback) {
        console.log(
          chalk.yellow(
            '\nNote: This code was generated using a LOCAL FALLBACK generator because the Claude API was not available.'
          )
        );
      }

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

          // Log file save action
          logAgentAction('code_saved_to_file', {
            output_file: outputFile,
            language: language || 'javascript',
            agent_id: getCurrentAgentId(),
            usedFallback: result.isLocalFallback || false,
          });
        } catch (err) {
          console.error(chalk.red(`\nError saving to file: ${err.message}`));

          // Log error
          logAgentAction('code_save_error', {
            output_file: outputFile,
            error: err.message,
            agent_id: getCurrentAgentId(),
          });
        }
      }

      if (result.explanation) {
        console.log(chalk.bold('\nCode Explanation:'));
        console.log(result.explanation);
      }
    }
  } catch (error) {
    console.error(chalk.red('\nCode generation failed:'), error.message);

    // Log error with agent attribution
    logAgentAction('code_generation_error', {
      error: error.message,
      task,
      language: language || 'javascript',
      agent_id: getCurrentAgentId(),
    });

    // Show more helpful error information
    if (error.message.includes('ECONNREFUSED') || error.message.includes('404')) {
      console.error(chalk.yellow('\nTroubleshooting tips:'));
      console.error('1. Check if the Claude API service is running locally');
      console.error('2. Set the CLAUDE_API_ENDPOINT environment variable to point to your API');
      console.error(
        '   Example: export CLAUDE_API_ENDPOINT=https://your-claude-api-endpoint.com/claude-code-generate'
      );
      console.error('3. Make sure your network connection can reach the Claude API service');
      console.error('\nCurrent endpoint: ' + functionUrl);
    }
  }
};
