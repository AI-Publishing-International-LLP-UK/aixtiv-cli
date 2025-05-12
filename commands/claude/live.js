/**
 * Dr. Claude Live Workflows Command
 * 
 * This module provides commands for executing live production workflows
 * using Claude Orchestration with real APIs including LinkedIn, 
 * GitHub, Pinecone, and Claude.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');
const inquirer = require('inquirer');
const { parseOptions, withSpinner, displayResult } = require('../../lib/utils');
const liveService = require('../../src/services/live');

// Available workflow types
const WORKFLOWS = {
  LINKEDIN: 'linkedin-memory-indexing',
  GITHUB: 'github-repository-analysis',
  CLAUDE: 'claude-content-generation'
};

/**
 * Execute a live production workflow
 * @param {Object} options - Command options
 */
module.exports = async function liveWorkflow(options) {
  const { 
    workflow = null,
    userId = null, 
    accessToken = null, 
    prompt = null, 
    format = 'text', 
    context = null,
    repository = null 
  } = parseOptions(options);

  // Validate command
  if (!workflow) {
    console.log(boxen(
      chalk.yellow('\n⚠️  No workflow specified. Use one of the following workflows:\n\n') +
      chalk.cyan('linkedin') + ' - LinkedIn Memory Indexing\n' +
      chalk.cyan('github') + ' - GitHub Repository Analysis\n' +
      chalk.cyan('claude') + ' - Claude Content Generation\n\n' +
      chalk.yellow('Example:') + ' aixtiv claude live --workflow linkedin --userId user123 --accessToken token123\n',
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'yellow' }
    ));
    return;
  }

  try {
    // Initialize live service
    const spinner = ora('Initializing Claude Orchestration live service...').start();
    await liveService.initialize();
    spinner.succeed('Claude Orchestration live service initialized');

    let workflowName;
    let workflowData = {};

    // Prepare workflow data based on workflow type
    switch (workflow.toLowerCase()) {
      case 'linkedin':
        workflowName = WORKFLOWS.LINKEDIN;
        
        // Validate LinkedIn workflow parameters
        if (!userId || !accessToken) {
          spinner.fail('LinkedIn workflow requires userId and accessToken parameters');
          return;
        }
        
        workflowData = { userId, accessToken };
        break;
        
      case 'github':
        workflowName = WORKFLOWS.GITHUB;
        
        // Validate GitHub workflow parameters
        if (!userId || !accessToken || !repository) {
          spinner.fail('GitHub workflow requires userId, accessToken, and repository parameters');
          return;
        }
        
        workflowData = { userId, accessToken, repositoryName: repository };
        break;
        
      case 'claude':
        workflowName = WORKFLOWS.CLAUDE;
        
        // Validate Claude workflow parameters
        if (!userId || !prompt) {
          spinner.fail('Claude workflow requires userId and prompt parameters');
          return;
        }
        
        workflowData = { userId, prompt, format, context };
        break;
        
      default:
        spinner.fail(`Unknown workflow: ${workflow}`);
        return;
    }

    // Execute the workflow
    console.log(chalk.cyan(`\n🚀 Executing ${workflow} workflow in production environment...\n`));
    
    const result = await withSpinner(
      `Orchestrating ${chalk.bold(workflow)} workflow`,
      async () => {
        return await liveService.orchestrateWorkflow(workflowName, workflowData);
      }
    );

    // Display the workflow result
    console.log(boxen(
      chalk.green(`\n✅ ${workflow} workflow completed successfully!\n\n`) +
      Object.entries(result).map(([key, value]) => 
        `${chalk.cyan(key)}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
      ).join('\n'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
    ));

    // Log to Firestore for tracking
    await liveService.storeInFirestore('workflow_executions', `${workflowName}_${Date.now()}`, {
      workflowName,
      executedAt: new Date().toISOString(),
      executedBy: userId,
      result
    });

  } catch (error) {
    console.error(
      boxen(
        chalk.red(`\n❌ Error executing ${workflow} workflow:\n\n`) +
        chalk.yellow(error.message),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'red' }
      )
    );
  }
};