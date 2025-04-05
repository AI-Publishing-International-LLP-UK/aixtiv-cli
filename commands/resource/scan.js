const { scanResources } = require('../../lib/firestore');
const { 
  displayResult, 
  parseOptions, 
  withSpinner, 
  formatResourcesTable,
  formatAuthorizationsTable
} = require('../../lib/utils');
const chalk = require('chalk');

/**
 * Scan resources for access patterns
 * @param {object} options - Command options
 */
module.exports = async function resourceScan(options) {
  const { resource, agent, email } = parseOptions(options);
  
  try {
    // Build filter description for spinner
    const filterParts = [];
    if (resource) filterParts.push(`resource ${resource}`);
    if (agent) filterParts.push(`agent ${agent}`);
    if (email) filterParts.push(`principal ${email}`);
    
    const filterDesc = filterParts.length > 0
      ? ` with filters: ${filterParts.join(', ')}`
      : '';
    
    // Execute scan operation with spinner
    const result = await withSpinner(
      `Scanning resources${filterDesc}`,
      scanResources,
      { resource, agent, email }
    );
    
    // Display result
    displayResult(result);
    
    // Display scan results if successful
    if (result.success) {
      const { resources } = result;
      
      if (resources.length === 0) {
        console.log(chalk.yellow('No resources found matching the specified filters.'));
        return;
      }
      
      // Display resources table
      console.log(chalk.bold(`Found ${resources.length} resource(s):`));
      console.log(formatResourcesTable(resources));
      
      // If scanning a single resource, show detailed authorizations
      if (resource && resources.length === 1) {
        const resourceData = resources[0];
        const authorizations = resourceData.authorizations || [];
        
        if (authorizations.length > 0) {
          console.log(chalk.bold(`Authorizations for resource ${resource}:`));
          console.log(formatAuthorizationsTable(authorizations));
        } else {
          console.log(chalk.yellow(`No authorizations found for resource ${resource}.`));
        }
      }
      
      // Show summary stats
      console.log(chalk.bold('Summary:'));
      console.log(`Total Resources: ${chalk.cyan(resources.length)}`);
      
      // Count unique agents
      const uniqueAgents = new Set();
      resources.forEach(r => r.authorizedAgents.forEach(a => uniqueAgents.add(a)));
      console.log(`Unique Agents: ${chalk.cyan(uniqueAgents.size)}`);
      
      // Count unique principals
      const uniquePrincipals = new Set();
      resources.forEach(r => r.authorizedPrincipals.forEach(p => uniquePrincipals.add(p)));
      console.log(`Unique Principals: ${chalk.cyan(uniquePrincipals.size)}`);
    }
  } catch (error) {
    console.error(chalk.red('Scan operation failed:'), error.message);
    process.exit(1);
  }
};