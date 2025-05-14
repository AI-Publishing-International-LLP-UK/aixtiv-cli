const chalk = require('chalk');
const fetch = require('node-fetch');
const https = require('https');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const { firestore } = require('../../../lib/firestore');
const { logAgentAction } = require('../../../lib/agent-tracking');

// Claude API endpoint configuration
const CLAUDE_API_ENDPOINT =
  process.env.CLAUDE_API_ENDPOINT ||
  process.env.DR_CLAUDE_API ||
  'https://us-west1-aixtiv-symphony.cloudfunctions.net';
const PROJECT_DELEGATE_ENDPOINT = `${CLAUDE_API_ENDPOINT}/dr-claude/projects/delegate`;

/**
 * Delegate a project to Dr. Claude for FMS orchestration
 * @param {object} options - Command options
 */
// Import debug display
const { debugDisplay } = require('../../../lib/debug-display');

module.exports = async function delegateProjectToAgent(options) {
  // Capture internal reasoning
  const internalThought = `Processing delegateProjectToAgent command with parameters: ${JSON.stringify(arguments[0])}`;

  const { project, description, priority, deadline, tags, assignTo } = parseOptions(options);

  try {
    // Execute project creation with spinner
    const result = await withSpinner(
      `Creating project "${chalk.cyan(project || 'Unnamed')}" and delegating to Dr. Claude`,
      async () => {
        // Validate project name and description
        if (!project) {
          throw new Error('Project name is required');
        }
        if (!description) {
          throw new Error('Project description is required');
        }

        // Create project payload
        const projectData = {
          name: project,
          description: description,
          priority: priority || 'medium',
          deadline: deadline || null,
          tags: tags ? tags.split(',').map((t) => t.trim()) : [],
          assigned_to: assignTo || null,
          orchestrator: 'dr-claude',
          created_at: new Date().toISOString(),
        };

        // Log the delegation request
        await logAgentAction('project_delegation_request', {
          project_name: project,
          description: description,
          priority: priority,
          assignee: assignTo,
        });

        // Create HTTPS agent that ignores SSL certificate validation
        const httpsAgent = new https.Agent({
          rejectUnauthorized: false,
        });

        try {
          // Make API call to Dr. Claude endpoint
          const response = await fetch(PROJECT_DELEGATE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-api-key': process.env.ANTHROPIC_API_KEY || process.env.DR_CLAUDE_API || '',
              'anthropic-version': '2023-06-01',
              'x-agent-id': 'dr-claude-orchestrator',
            },
            body: JSON.stringify({ ...projectData, operation: 'projects-delegate' }),
            agent: httpsAgent,
            timeout: 15000, // 15 second timeout
          });

          // Handle API errors
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Response Error: ${errorText}`);
            throw new Error(`API error (${response.status}): ${errorText}`);
          }

          // Parse API response
          const apiResponse = await response.json();

          // Store project in Firestore
          if (firestore) {
            const projectRef = firestore.collection('projects').doc(apiResponse.project_id);
            await projectRef.set({
              ...projectData,
              project_id: apiResponse.project_id,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          // Log successful delegation
          await logAgentAction('project_delegation_completed', {
            project_id: apiResponse.project_id,
            project_name: project,
            assignee: assignTo,
          });

          // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  return {
            status: 'created',
            project_id: apiResponse.project_id,
            created_at: apiResponse.created_at || new Date().toISOString(),
            orchestrator: 'dr-claude',
            assigned_to: assignTo || null,
            priority: priority || 'medium',
            deadline: deadline || null,
            tags: tags ? tags.split(',').map((t) => t.trim()) : [],
          };
        } catch (error) {
          console.error(`API Call Error: ${error.message}`);

          // Provide fallback operation when API is unreachable
          if (
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('404') ||
            error.message.includes('timeout')
          ) {
            console.warn(
              chalk.yellow(
                '\nCould not reach Dr. Claude API endpoint. Using local fallback operation.'
              )
            );

            // Generate a project ID
            const projectId = `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Store project locally in Firestore
            if (firestore) {
              const projectRef = firestore.collection('projects').doc(projectId);
              await projectRef.set({
                ...projectData,
                project_id: projectId,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                note: 'Created with local fallback (API unreachable)',
              });
            }

            // Log fallback operation
            await logAgentAction('project_delegation_fallback', {
              project_id: projectId,
              project_name: project,
              error: error.message,
            });

            // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  return {
              status: 'created',
              project_id: projectId,
              created_at: new Date().toISOString(),
              orchestrator: 'local-fallback',
              assigned_to: assignTo || null,
              priority: priority || 'medium',
              deadline: deadline || null,
              tags: tags ? tags.split(',').map((t) => t.trim()) : [],
              isLocalFallback: true,
            };
          } else {
            throw error;
          }
        }
      }
    );

    // Display result
    displayResult({
      success: result.status === 'created',
      message: `Project ${result.status === 'created' ? 'successfully created' : 'creation failed'}${result.isLocalFallback ? ' (using local fallback)' : ''}`,
      details: result,
    });

    if (result.status === 'created') {
      if (result.isLocalFallback) {
        console.log(
          chalk.yellow(
            '\nNote: This project was created using a LOCAL FALLBACK process because the Dr. Claude API was not available.'
          )
        );
      }

      console.log(chalk.bold('\nProject Details:'));
      console.log(`Project ID: ${chalk.cyan(result.project_id)}`);
      console.log(`Name: ${chalk.yellow(project || 'Unnamed Project')}`);
      console.log(`Priority: ${getPriorityColor(priority || 'medium')}`);
      console.log(`Deadline: ${chalk.blue(deadline || 'Not specified')}`);
      console.log(
        `Orchestrator: ${chalk.green(result.isLocalFallback ? 'Local System (API Fallback)' : 'Dr. Claude (Sir Hand)')}`
      );

      if (assignTo) {
        console.log(`Assigned To: ${chalk.magenta(assignTo)}`);
        console.log(`Status: ${chalk.green('Assigned & Delegated')}`);
      } else {
        console.log(`Status: ${chalk.green('Pending Resource Assignment')}`);
      }

      console.log(chalk.bold('\nNext Steps:'));
      if (assignTo) {
        console.log(`Dr. Claude will coordinate with ${assignTo} to execute the project.`);
      } else {
        console.log(`Dr. Claude will analyze requirements and assign to the appropriate agent.`);
        console.log(
          `Possible assignees include Dr. Lucy, Dr. Match, and other VLS solution providers.`
        );
      }
      console.log(
        `Use ${chalk.yellow('aixtiv project:status -p ' + result.project_id)} to check progress.`
      );
      console.log(
        `Use ${chalk.yellow('aixtiv project:update -p ' + result.project_id + ' -s notes -v "additional context"')} to provide more information.`
      );
    }
  } catch (error) {
    console.error(chalk.red('\nProject delegation failed:'), error.message);

    // Show more helpful error information
    if (error.message.includes('ECONNREFUSED') || error.message.includes('404')) {
      console.error(chalk.yellow('\nTroubleshooting tips:'));
      console.error('1. Check if the Dr. Claude cloud function is deployed and running');
      console.error(
        '2. Set the CLAUDE_API_ENDPOINT environment variable to point to the correct function URL'
      );
      console.error(
        '   Example: export CLAUDE_API_ENDPOINT=https://us-central1-your-project.cloudfunctions.net'
      );
      console.error('3. Make sure your network connection can reach the Google Cloud Functions');
      console.error('\nCurrent endpoint: ' + PROJECT_DELEGATE_ENDPOINT);
    }

    // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:process.exit'
  });
  
  process.exit(1);
  }
};

/**
 * Returns colored text based on priority
 * @param {string} priority - Priority level
 * @// Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  returns {string} Colored priority text
 */
function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  return chalk.red('High');
    case 'medium':
      // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  return chalk.yellow('Medium');
    case 'low':
      // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  return chalk.blue('Low');
    default:
      // Display debug information
  debugDisplay({
    thought: internalThought,
    result: result,
    command: 'claude:return'
  });
  
  return chalk.green(priority);
  }
}
