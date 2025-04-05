const { listCopilots } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const { table } = require('table');

/**
 * Lists all co-pilots linked to a principal or all co-pilot relationships in the system
 */
module.exports = async function copilotList(options) {
  const { email, status = 'active' } = parseOptions(options);
  
  try {
    // If email is provided, list co-pilots for that principal
    // Otherwise, list all co-pilot relationships
    const searchTerm = email ? `principal ${email}` : 'all principals';
    
    const results = await withSpinner(
      `Listing co-pilots for ${searchTerm}`,
      () => listCopilots(email, status)
    );
    
    if (results && results.length > 0) {
      // Create table header
      const tableData = [
        ['Principal', 'Co-pilot', 'Trust Level', 'Status', 'Created', 'Expires']
      ];
      
      // Add each co-pilot to the table
      results.forEach(item => {
        tableData.push([
          item.principal,
          item.copilot,
          item.level,
          item.active ? 'Active' : 'Pending',
          new Date(item.createdAt).toLocaleDateString(),
          item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never'
        ]);
      });
      
      // Display success message with table
      console.log(chalk.green(`\n✓ Found ${results.length} co-pilot relationships\n`));
      console.log(table(tableData));
      
      // Summary statistics
      const activeCopilots = results.filter(item => item.active).length;
      const pendingCopilots = results.length - activeCopilots;
      const uniquePrincipals = new Set(results.map(item => item.principal)).size;
      const uniqueCopilots = new Set(results.map(item => item.copilot)).size;
      
      console.log(chalk.blue('\nSummary:'));
      console.log(`Total Relationships: ${results.length}`);
      console.log(`Active Co-pilots: ${activeCopilots}`);
      console.log(`Pending Co-pilots: ${pendingCopilots}`);
      console.log(`Unique Principals: ${uniquePrincipals}`);
      console.log(`Unique Co-pilots: ${uniqueCopilots}`);
      
      // Display note about filtering
      if (status !== 'all') {
        console.log(chalk.yellow('\nNote: Only showing relationships with status: ' + status));
        console.log('To show all relationships, use --status all');
      }
    } else {
      if (email) {
        displayResult(`No co-pilots found for principal ${email}`, 'info');
      } else {
        displayResult('No co-pilot relationships found in the system', 'info');
      }
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};