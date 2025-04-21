const fetch = require('node-fetch');
const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const authManager = require('../../../lib/auth');

// GitHub organization repositories
const AI_PUBLISHING_REPOS = [
  'AIXTIV-SYMPHONY',
  'Dr-Claude-Automation',
  'copilot-codespaces-vscode',
  'Pilots-Lounge',
  'demo-repository'
];

// GitHub organization details
const GITHUB_ORG = {
  name: 'AI-Publishing-International-LLP-UK',
  url: 'https://github.com/AI-Publishing-International-LLP-UK',
  admin: 'admin@coaching2100.com'
};

/**
 * Use Dr. Claude Automation to manage GitHub repositories
 * @param {object} options - Command options
 */
module.exports = async function automateGithubTasks(options) {
  const { repository, action, branch, securityCheck, organization } = parseOptions(options);
  
  try {
    // Verify repository exists in organization
    const repoExists = repository === 'all' || AI_PUBLISHING_REPOS.includes(repository);
    if (!repoExists && organization !== 'custom') {
      console.log(chalk.yellow(`\nRepository "${repository}" not found in ${GITHUB_ORG.name}.`));
      console.log(chalk.yellow('Available repositories:'));
      AI_PUBLISHING_REPOS.forEach(repo => console.log(chalk.cyan(`- ${repo}`)));
      console.log(chalk.yellow('\nUse --organization=custom to work with external repositories.'));
      return;
    }
    
    // GitHub automation endpoint via integration gateway
    const endpointPath = '/automation/github';
    
    // Build action description
    let actionDesc = '';
    switch (action) {
      case 'align':
        actionDesc = `aligning all files in repository ${chalk.cyan(repository)}`;
        break;
      case 'clean':
        actionDesc = `cleaning pending changes in repository ${chalk.cyan(repository)}`;
        break;
      case 'secure':
        actionDesc = `performing security checks on repository ${chalk.cyan(repository)}`;
        break;
      case 'memoria-assist':
        actionDesc = `helping Dr. Memoria with Anthology workflows in repository ${chalk.cyan(repository)}`;
        break;
      case 'sync':
        actionDesc = `synchronizing Dr-Claude-Automation changes with ${chalk.cyan(repository)}`;
        break;
      default:
        actionDesc = `performing ${action} on repository ${chalk.cyan(repository)}`;
    }
    
    // Execute automation with spinner
    const result = await withSpinner(
      `Dr. Claude Automation is ${actionDesc}`,
      async () => {
        try {
          // Make authenticated request
          return await authManager.makeAuthenticatedRequest(
            endpointPath,
            'dr-claude', // Service name to impersonate
            {
              repository: repository,
              action: action,
              branch: branch || 'main',
              organization: organization || GITHUB_ORG.name,
              security_check: securityCheck === 'true' || securityCheck === true,
              timestamp: new Date().toISOString()
            }
          );
        } catch (error) {
          throw new Error(`Failed to execute GitHub automation: ${error.message}`);
        }
      }
    );
    
    // Display result
    displayResult({
      success: result.status === 'completed',
      message: `Automation ${result.status === 'completed' ? 'successfully completed' : 'failed'}`,
      details: result
    });
    
    if (result.status === 'completed') {
      console.log(chalk.bold('\nAutomation Details:'));
      console.log(`Repository: ${chalk.cyan(repository)}`);
      console.log(`Organization: ${chalk.magenta(organization || GITHUB_ORG.name)}`);
      console.log(`Action: ${chalk.yellow(action)}`);
      console.log(`Branch: ${chalk.blue(branch || 'main')}`);
      console.log(`Security Checks: ${securityCheck ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`GitHub URL: ${chalk.gray(`${GITHUB_ORG.url}/${repository}`)}`);
      
      if (result.changes && result.changes.length > 0) {
        console.log(chalk.bold('\nChanges Made:'));
        result.changes.forEach((change, index) => {
          console.log(`${index + 1}. ${change}`);
        });
      }
      
      if (action === 'sync' && result.syncDetails) {
        console.log(chalk.bold('\nSync Details:'));
        console.log(`Dr-Claude-Automation version: ${chalk.cyan(result.syncDetails.version || 'latest')}`);
        console.log(`Components synced: ${chalk.green(result.syncDetails.components || 0)}`);
        console.log(`Files updated: ${chalk.yellow(result.syncDetails.filesUpdated || 0)}`);
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log(chalk.bold('\nRecommendations:'));
        result.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
      
      if (action === 'memoria-assist') {
        console.log(chalk.bold('\nDr. Memoria Anthology Integration:'));
        console.log(`Content segments processed: ${chalk.cyan(result.contentSegments || 0)}`);
        console.log(`Automation workflow completed: ${chalk.green('Yes')}`);
      }
    }
  } catch (error) {
    console.error(chalk.red('\nGitHub automation failed:'), error.message);
    process.exit(1);
  }
};
