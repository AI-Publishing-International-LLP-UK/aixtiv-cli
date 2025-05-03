const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');

/**
 * Delegate a project to Dr. Claude for FMS orchestration
 * @param {object} options - Command options
 */
module.exports = async function delegateProjectToAgent(options) {
  const { project, description, priority, deadline, tags, assignTo } = parseOptions(options);
  
  try {
    // Execute project creation with spinner
    const result = await withSpinner(
      `Creating project "${chalk.cyan(project || 'Unnamed')}" and delegating to Dr. Claude`,
      async () => {
        // Temporary implementation that simulates success
        console.log(chalk.yellow('NOTE: This is a temporary implementation until full API integration is complete.'));
        
        // Simulate API response
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          status: 'created',
          project_id: 'pr-' + Math.random().toString(16).substring(2, 10),
          created_at: new Date().toISOString(),
          orchestrator: 'dr-claude',
          assigned_to: assignTo || null,
          priority: priority || 'medium',
          deadline: deadline || null,
          tags: tags ? tags.split(',').map(t => t.trim()) : []
        };
      }
    );
    
    // Display result
    displayResult({
      success: result.status === 'created',
      message: `Project ${result.status === 'created' ? 'successfully created' : 'creation failed'}`,
      details: result
    });
    
    if (result.status === 'created') {
      console.log(chalk.bold('\nProject Details:'));
      console.log(`Project ID: ${chalk.cyan(result.project_id)}`);
      console.log(`Name: ${chalk.yellow(project || 'Unnamed Project')}`);
      console.log(`Priority: ${getPriorityColor(priority || 'medium')}`);
      console.log(`Deadline: ${chalk.blue(deadline || 'Not specified')}`);
      console.log(`Orchestrator: ${chalk.green('Dr. Claude (Sir Hand)')}`);
      
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
        console.log(`Possible assignees include Dr. Lucy, Dr. Match, and other VLS solution providers.`);
      }
      console.log(`Use ${chalk.yellow('aixtiv project:status -p ' + result.project_id)} to check progress.`);
      console.log(`Use ${chalk.yellow('aixtiv project:update -p ' + result.project_id + ' -s notes -v "additional context"')} to provide more information.`);
    }
  } catch (error) {
    console.error(chalk.red('\nProject delegation failed:'), error.message);
    process.exit(1);
  }
};

/**
 * Returns colored text based on priority
 * @param {string} priority - Priority level
 * @returns {string} Colored priority text
 */
function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return chalk.red('High');
    case 'medium':
      return chalk.yellow('Medium');
    case 'low':
      return chalk.blue('Low');
    default:
      return chalk.green(priority);
  }
}
