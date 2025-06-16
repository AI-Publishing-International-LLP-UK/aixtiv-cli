# Command Integration Example

This example shows how to integrate telemetry into a specific command file. Let's use a simple example of the `claude:status` command.

## Original Command File

```javascript
// commands/claude/status.js
const chalk = require('chalk');
const { table } = require('table');

async function claudeStatus(options) {
  const { agent } = options;
  
  try {
    // Get agent status from API
    const agents = await fetchAgentStatus(agent);
    
    // Display agent status
    displayAgentStatus(agents);
    
    return agents;
  } catch (error) {
    console.error(chalk.red('Error fetching agent status:'), error.message);
    throw error;
  }
}

async function fetchAgentStatus(agentId) {
  // Mock implementation
  return [
    { id: agentId || 'dr-claude', status: 'active', workload: 'medium' }
  ];
}

function displayAgentStatus(agents) {
  // Display logic here
  console.log(chalk.green('Agent status retrieved successfully.'));
}

module.exports = claudeStatus;
```

## Modified Command with Telemetry

```javascript
// commands/claude/status.js
const chalk = require('chalk');
const { table } = require('table');
const telemetry = require('../../lib/telemetry');

async function claudeStatus(options) {
  const { agent } = options;
  
  try {
    // Record knowledge access 
    telemetry.recordKnowledgeAccess('agent-status');
    
    // Get agent status from API
    const agents = await fetchAgentStatus(agent);
    
    // Display agent status
    displayAgentStatus(agents);
    
    return agents;
  } catch (error) {
    console.error(chalk.red('Error fetching agent status:'), error.message);
    throw error;
  }
}

async function fetchAgentStatus(agentId) {
  // We don't need to add telemetry here since the middleware handles
  // the request and error recording for the main command
  
  // Mock implementation
  return [
    { id: agentId || 'dr-claude', status: 'active', workload: 'medium' }
  ];
}

function displayAgentStatus(agents) {
  // Display logic here
  console.log(chalk.green('Agent status retrieved successfully.'));
}

module.exports = claudeStatus;
```

## Note

The main telemetry for the command (request count, duration, and errors) is handled by the middleware we added in the main CLI file. You only need to add specific telemetry calls for things like knowledge access within the command.

The middleware wraps each command like this:

```javascript
// In bin/aixtiv.js
program
  .command('claude:status')
  .description('Check status of Dr. Claude agents and their workloads')
  .option('-a, --agent <agent>', 'Specific agent to check (omit for all agents)')
  .action(withTelemetry('claude:status', claudeStatus));
```

This approach ensures consistent telemetry across all commands without requiring extensive code changes to each command file.
