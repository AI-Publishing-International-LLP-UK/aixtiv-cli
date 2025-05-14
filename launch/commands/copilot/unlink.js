const { unlinkCopilot } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const inquirer = require('inquirer');

/**
 * Unlinks a co-pilot from a principal, removing their trusted relationship
 */
module.exports = async function copilotUnlink(options) {
  const { email, copilot } = parseOptions(options);

  // Validate required parameters
  if (!email) {
    displayResult('Error: Principal email is required (--email)', 'error');
    return;
  }

  if (!copilot) {
    displayResult('Error: Co-pilot email or ID is required (--copilot)', 'error');
    return;
  }

  // Format co-pilot email if just name was provided
  let copilotEmail = copilot;
  if (!copilot.includes('@')) {
    copilotEmail = `${copilot}@dr${copilot}.live`;
  }

  try {
    // Confirm unlinking unless forced
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to unlink co-pilot ${copilotEmail} from principal ${email}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
    }

    // Attempt to unlink the co-pilot
    const result = await withSpinner(
      `Unlinking co-pilot ${copilotEmail} from principal ${email}`,
      () => unlinkCopilot(email, copilotEmail)
    );

    if (result && result.success) {
      displayResult(
        `Co-pilot ${copilotEmail} has been unlinked from principal ${email}`,
        'success'
      );

      // Additional information about consequences
      console.log(chalk.yellow('\nNote: The co-pilot can no longer:'));
      console.log(' - Access resources on behalf of the principal');
      console.log(' - Receive delegated permissions from the principal');
      console.log(' - Connect to linked agents of the principal');

      // If there were active sessions
      if (result.activeSessions > 0) {
        console.log(
          chalk.yellow(`\n${result.activeSessions} active sessions have been terminated.`)
        );
      }
    } else {
      displayResult(`Error: ${result?.message || 'Failed to unlink co-pilot'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};
