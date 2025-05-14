const { grantCopilotAccess } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const { table } = require('table');

/**
 * Grants a co-pilot access to a resource on behalf of a principal
 */
module.exports = async function copilotGrant(options) {
  const { email, copilot, resource, type = 'readonly' } = parseOptions(options);

  // Validate required parameters
  if (!email) {
    displayResult('Error: Principal email is required (--email)', 'error');
    return;
  }

  if (!copilot) {
    displayResult('Error: Co-pilot email or ID is required (--copilot)', 'error');
    return;
  }

  if (!resource) {
    displayResult('Error: Resource ID is required (--resource)', 'error');
    return;
  }

  // Validate access type
  const validTypes = ['readonly', 'delegated', 'full'];
  if (!validTypes.includes(type)) {
    displayResult(
      `Error: Invalid access type. Valid options are: ${validTypes.join(', ')}`,
      'error'
    );
    return;
  }

  // Format co-pilot email if just name was provided
  let copilotEmail = copilot;
  if (!copilot.includes('@')) {
    copilotEmail = `${copilot}@dr${copilot}.live`;
  }

  try {
    // Attempt to grant access to the co-pilot
    const result = await withSpinner(
      `Granting ${type} access for co-pilot ${copilotEmail} to resource ${resource}`,
      () => grantCopilotAccess(email, copilotEmail, resource, type)
    );

    if (result && result.success) {
      // Format a nice table with the access details
      const tableData = [
        ['Field', 'Value'],
        ['Principal', email],
        ['Co-pilot', copilotEmail],
        ['Resource', resource],
        ['Access Type', type],
        ['Delegated', 'Yes'],
        ['Created At', new Date(result.createdAt).toLocaleString()],
        ['Expires', result.expiresAt ? new Date(result.expiresAt).toLocaleString() : 'Never'],
      ];

      // Display success message with table
      console.log(chalk.green(`\n✓ Success: ${type} access granted to co-pilot\n`));
      console.log(table(tableData));

      // Display information about what the co-pilot can do
      console.log(chalk.blue('The co-pilot can now:'));

      if (type === 'readonly') {
        console.log('- View the resource and its properties');
        console.log('- Run analytical operations on the resource');
        console.log('- Access historical data related to the resource');
      } else if (type === 'delegated') {
        console.log('- View and modify the resource');
        console.log('- Grant readonly access to other agents');
        console.log('- Perform operations on behalf of the principal');
      } else if (type === 'full') {
        console.log('- View, modify, and delete the resource');
        console.log('- Grant and revoke access to other agents');
        console.log('- Transfer ownership (with principal approval)');
        console.log('- Configure advanced Symphony features');
      }
    } else {
      displayResult(`Error: ${result?.message || 'Failed to grant access to co-pilot'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};
