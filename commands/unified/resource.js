/**
 * Unified resource command module
 * 
 * This module provides a consolidated interface for managing resource access
 * for all agent types using the unified schema.
 */

const chalk = require('chalk');
const { table } = require('table');
const telemetry = require('../../lib/telemetry');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const { getAgent } = require('../../lib/agent-schema');
const { 
  grantUnifiedAgentAccess, 
  revokeUnifiedAgentAccess, 
  scanUnifiedResources 
} = require('../../lib/unified-resource');

/**
 * Grants an agent access to a resource
 */
async function grantAccess(options) {
  telemetry.recordKnowledgeAccess('resource');
  
  try {
    const { principal, agent, resource, type = 'readonly' } = parseOptions(options);

    // Validate required parameters
    if (!principal) {
      displayResult('Error: Principal email is required (--principal)', 'error');
      return;
    }

    if (!agent) {
      displayResult('Error: Agent ID is required (--agent)', 'error');
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

    // Get agent details
    const agentResult = await getAgent(agent);
    if (!agentResult.success) {
      displayResult(`Error: ${agentResult.message}`, 'error');
      return;
    }

    // Grant access
    const result = await withSpinner(
      `Granting ${type} access for agent ${agent} to resource ${resource}`,
      grantUnifiedAgentAccess,
      principal,
      agent,
      resource,
      type
    );

    if (result.success) {
      // Display success message
      console.log(chalk.green(`\n✓ ${result.message}\n`));
      
      // Display grant details
      const tableData = [
        ['Field', 'Value'],
        ['Principal', principal],
        ['Agent', `${agent} (${agentResult.agent.name})`],
        ['Resource', resource],
        ['Access Type', type],
        ['Granted At', new Date().toLocaleString()]
      ];
      
      console.log(table(tableData));
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Revokes an agent's access to a resource
 */
async function revokeAccess(options) {
  telemetry.recordKnowledgeAccess('resource');
  
  try {
    const { principal, agent, resource } = parseOptions(options);

    // Validate required parameters
    if (!principal) {
      displayResult('Error: Principal email is required (--principal)', 'error');
      return;
    }

    if (!agent) {
      displayResult('Error: Agent ID is required (--agent)', 'error');
      return;
    }

    if (!resource) {
      displayResult('Error: Resource ID is required (--resource)', 'error');
      return;
    }

    // Revoke access
    const result = await withSpinner(
      `Revoking access for agent ${agent} to resource ${resource}`,
      revokeUnifiedAgentAccess,
      principal,
      agent,
      resource
    );

    if (result.success) {
      console.log(chalk.green(`\n✓ ${result.message}\n`));
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Scans resources for access patterns
 */
async function scanResources(options) {
  telemetry.recordKnowledgeAccess('resource');
  
  try {
    const { resource, agent, principal } = parseOptions(options);

    // Build filters
    const filters = {};
    if (resource) filters.resource = resource;
    if (agent) filters.agent = agent;
    if (principal) filters.principal = principal;

    // Scan resources
    const result = await withSpinner(
      'Scanning resources',
      scanUnifiedResources,
      filters
    );

    if (result.success) {
      if (result.resources.length === 0) {
        console.log(chalk.yellow('\nNo resources found matching the specified criteria'));
        return;
      }

      console.log(chalk.green(`\n✓ Found ${result.resources.length} resources\n`));

      // Display resource table
      const tableData = [
        ['Resource ID', 'Name', 'Authorized Agents', 'Authorized Principals']
      ];

      for (const resource of result.resources) {
        tableData.push([
          resource.resourceId,
          resource.name || resource.resourceId,
          resource.authorizedAgents.join(', '),
          resource.authorizedPrincipals.join(', ')
        ]);
      }

      console.log(table(tableData));

      // If a single resource was requested, show detailed access information
      if (resource && result.resources.length === 1) {
        const resourceData = result.resources[0];
        
        console.log(chalk.bold('\nDetailed Access Information:'));
        
        const accessTableData = [
          ['Agent', 'Principal', 'Access Type', 'Granted At']
        ];

        for (const auth of resourceData.authorizations) {
          accessTableData.push([
            auth.agentId,
            auth.principal,
            auth.accessType,
            auth.createdAt ? new Date(auth.createdAt).toLocaleString() : 'Unknown'
          ]);
        }

        console.log(table(accessTableData));
      }
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

module.exports = {
  grant: grantAccess,
  revoke: revokeAccess,
  scan: scanResources
};

