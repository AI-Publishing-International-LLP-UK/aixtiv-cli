/**
 * Unified agent command module
 *
 * This module provides a consolidated interface for managing all agent types,
 * including regular agents, RIX, QRIX, and co-pilots, using the unified schema.
 */

const {
  createAgent,
  getAgent,
  listAgents,
  updateAgent,
  extendAgent,
  migrateAgents,
  SQUADRONS,
  AGENT_TYPES,
} = require('../../lib/agent-schema');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const { table } = require('table');
const telemetry = require('../../lib/telemetry');

// Common validation functions
function validateSquadron(squadron) {
  if (!SQUADRONS[squadron]) {
    throw new Error(`Invalid squadron. Must be one of: ${Object.keys(SQUADRONS).join(', ')}`);
  }
  return squadron;
}

function validateAgentType(type) {
  if (!AGENT_TYPES[type]) {
    throw new Error(`Invalid agent type. Must be one of: ${Object.keys(AGENT_TYPES).join(', ')}`);
  }
  return type;
}

/**
 * Creates a new agent in the unified system
 */
async function registerAgent(options) {
  telemetry.recordKnowledgeAccess('agent');

  try {
    const {
      name,
      squadron,
      number,
      type = 'BASE',
      description,
      roles,
      actions,
      lifecycles,
      sectors,
      collaborator,
    } = parseOptions(options);

    // Validate required parameters
    if (!name) {
      displayResult('Error: Agent name is required (--name)', 'error');
      return;
    }

    if (!squadron) {
      displayResult('Error: Squadron is required (--squadron)', 'error');
      return;
    }

    if (!number) {
      displayResult('Error: Agent number is required (--number)', 'error');
      return;
    }

    // Validate squadron and type
    try {
      validateSquadron(squadron);
      validateAgentType(type);
    } catch (error) {
      displayResult(`Error: ${error.message}`, 'error');
      return;
    }

    // Parse array parameters
    const parsedRoles = roles ? roles.split(',').map((r) => r.trim()) : [];
    const parsedActions = actions ? actions.split(',').map((a) => a.trim()) : [];
    const parsedLifecycles = lifecycles ? lifecycles.split(',').map((l) => l.trim()) : [];
    const parsedSectors = sectors ? sectors.split(',').map((s) => s.trim()) : [];

    // Create agent
    const result = await withSpinner(
      `Creating ${type} agent ${name} in ${squadron}-${String(number).padStart(2, '0')}`,
      createAgent,
      {
        name,
        squadron,
        number,
        type,
        description,
        roles: parsedRoles,
        actions: parsedActions,
        lifecycles: parsedLifecycles,
        sectors: parsedSectors,
        humanCollaborator: collaborator,
      }
    );

    if (result.success) {
      // Display agent card
      console.log(chalk.green('\n✓ Agent registered successfully\n'));
      displayAgentCard(result.agent);
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Displays a formatted agent card
 */
function displayAgentCard(agent) {
  // Format the agent ID with background color
  const squadronColor = {
    S01: chalk.bgRed.white,
    S02: chalk.bgBlue.white,
    S03: chalk.bgGreen.black,
    S04: chalk.bgYellow.black,
    S05: chalk.bgMagenta.white,
    S06: chalk.bgCyan.black,
  };

  const colorFn = squadronColor[agent.squadron] || chalk.bgWhite.black;
  const formattedId = colorFn(` ${agent.id} `);

  // Format the agent type with color
  const typeColor = {
    BASE: chalk.white,
    RIX: chalk.yellow,
    QRIX: chalk.magenta,
    COPILOT: chalk.cyan,
  };

  const typeColorFn = typeColor[agent.type] || chalk.white;
  const formattedType = typeColorFn(agent.type);

  // Create agent card table
  const tableData = [
    ['Field', 'Value'],
    ['ID', formattedId],
    ['Name', chalk.bold(agent.name)],
    ['Squadron', `${agent.squadron} (${SQUADRONS[agent.squadron].name})`],
    ['Type', formattedType],
    ['Description', agent.description || ''],
  ];

  // Add roles if available
  if (agent.roles && agent.roles.length > 0) {
    tableData.push(['Roles', agent.roles.join(', ')]);
  }

  // Add actions if available
  if (agent.actions && agent.actions.length > 0) {
    tableData.push(['Actions', agent.actions.join(', ')]);
  }

  // Add human collaborator if available
  if (agent.humanCollaborator) {
    tableData.push(['Human Collaborator', agent.humanCollaborator]);
  }

  // Add creation date
  if (agent.createdAt) {
    const createdAt =
      agent.createdAt instanceof Date
        ? agent.createdAt.toLocaleString()
        : new Date(agent.createdAt).toLocaleString();
    tableData.push(['Created', createdAt]);
  }

  console.log(table(tableData));

  // Display additional details based on agent type
  if (agent.type === 'COPILOT' && agent.attributes?.copilot) {
    const copilotData = [
      ['Co-Pilot Details', 'Value'],
      ['Trust Level', agent.attributes.copilot.level],
      ['Verified', agent.attributes.copilot.verified ? 'Yes' : 'No'],
      [
        'Cultural Empathy',
        agent.attributes.copilot.culturalEmpathyVerified ? 'Verified' : 'Not Verified',
      ],
    ];

    if (agent.attributes.copilot.expiresAt) {
      const expiresAt = new Date(agent.attributes.copilot.expiresAt).toLocaleString();
      copilotData.push(['Expires', expiresAt]);
    }

    console.log('\nCo-Pilot Specific Details:');
    console.log(table(copilotData));
  } else if (agent.type === 'QRIX' && agent.attributes?.qrix) {
    const qrixData = [
      ['QRIX Details', 'Value'],
      ['Activation Status', agent.attributes.qrix.activationStatus],
      ['Core Nodes', agent.attributes.qrix.coreNodes?.join(', ') || 'None'],
    ];

    if (agent.attributes.qrix.components && agent.attributes.qrix.components.length > 0) {
      qrixData.push(['Components', agent.attributes.qrix.components.join(', ')]);
    }

    console.log('\nQRIX Specific Details:');
    console.log(table(qrixData));
  }
}

/**
 * Gets an agent by ID and displays details
 */
async function getAgentInfo(options) {
  telemetry.recordKnowledgeAccess('agent');

  try {
    const { id } = parseOptions(options);

    if (!id) {
      displayResult('Error: Agent ID is required (--id)', 'error');
      return;
    }

    const result = await withSpinner(`Retrieving agent ${id}`, getAgent, id);

    if (result.success) {
      displayAgentCard(result.agent);
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Lists agents with optional filters
 */
async function listAgentsCmd(options) {
  telemetry.recordKnowledgeAccess('agent');

  try {
    const { squadron, type, collaborator, active = true, capabilities } = parseOptions(options);

    // Parse capabilities if provided
    const parsedCapabilities = capabilities ? capabilities.split(',').map((c) => c.trim()) : [];

    // Build filters
    const filters = {
      squadron,
      type,
      humanCollaborator: collaborator,
      active: active === 'false' ? false : Boolean(active),
    };

    if (parsedCapabilities.length > 0) {
      filters.capabilities = parsedCapabilities;
    }

    // Get filtered agents
    const agents = await withSpinner('Retrieving agents', listAgents, filters);

    if (agents.length === 0) {
      console.log(chalk.yellow('No agents found matching the specified criteria'));
      return;
    }

    // Display summary
    console.log(chalk.green(`\n✓ Found ${agents.length} agents\n`));

    // Create summary table
    const tableData = [['ID', 'Name', 'Type', 'Squadron', 'Status', 'Human Collaborator']];

    for (const agent of agents) {
      tableData.push([
        agent.id,
        agent.name,
        agent.type,
        agent.squadron,
        agent.active ? 'Active' : 'Inactive',
        agent.humanCollaborator || 'None',
      ]);
    }

    console.log(table(tableData));
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Updates an existing agent
 */
async function updateAgentCmd(options) {
  telemetry.recordKnowledgeAccess('agent');

  try {
    const {
      id,
      name,
      description,
      type,
      roles,
      actions,
      lifecycles,
      sectors,
      collaborator,
      active,
    } = parseOptions(options);

    if (!id) {
      displayResult('Error: Agent ID is required (--id)', 'error');
      return;
    }

    // Build update object
    const updates = {};

    if (name) updates.name = name;
    if (description) updates.description = description;
    if (collaborator !== undefined) updates.humanCollaborator = collaborator;
    if (active !== undefined) updates.active = active === 'true';

    // Validate type if provided
    if (type) {
      try {
        validateAgentType(type);
        updates.type = type;
      } catch (error) {
        displayResult(`Error: ${error.message}`, 'error');
        return;
      }
    }

    // Parse array parameters
    if (roles) updates.roles = roles.split(',').map((r) => r.trim());
    if (actions) updates.actions = actions.split(',').map((a) => a.trim());
    if (lifecycles) updates.lifecycles = lifecycles.split(',').map((l) => l.trim());
    if (sectors) updates.sectors = sectors.split(',').map((s) => s.trim());

    // Update agent
    const result = await withSpinner(`Updating agent ${id}`, updateAgent, id, updates);

    if (result.success) {
      console.log(chalk.green(`\n✓ ${result.message}\n`));

      // Retrieve updated agent
      const updatedAgent = await getAgent(id);
      if (updatedAgent.success) {
        displayAgentCard(updatedAgent.agent);
      }
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Extends an agent with new capabilities or upgrades type
 */
async function extendAgentCmd(options) {
  telemetry.recordKnowledgeAccess('agent');

  try {
    const { id, newType, capabilities, specialties, components, coreNodes, level } =
      parseOptions(options);

    if (!id) {
      displayResult('Error: Agent ID is required (--id)', 'error');
      return;
    }

    // Validate type if provided
    if (newType) {
      try {
        validateAgentType(newType);
      } catch (error) {
        displayResult(`Error: ${error.message}`, 'error');
        return;
      }
    }

    // Build extension object
    const extension = {};

    if (newType) extension.newType = newType;

    // Parse array parameters
    if (capabilities) extension.capabilities = capabilities.split(',').map((c) => c.trim());
    if (specialties) extension.specialties = specialties.split(',').map((s) => s.trim());
    if (components) extension.components = components.split(',').map((c) => c.trim());
    if (coreNodes) extension.coreNodes = coreNodes.split(',').map((n) => n.trim());
    if (level) extension.level = level;

    // Extend agent
    const result = await withSpinner(`Extending agent ${id}`, extendAgent, id, extension);

    if (result.success) {
      console.log(chalk.green(`\n✓ ${result.message}\n`));

      // Retrieve updated agent
      const updatedAgent = await getAgent(id);
      if (updatedAgent.success) {
        displayAgentCard(updatedAgent.agent);
      }
    } else {
      displayResult(`Error: ${result.message}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

/**
 * Migrates existing agents, co-pilots, and QRIX to the unified schema
 */
async function migrateAgentsCmd() {
  telemetry.recordKnowledgeAccess('agent');

  try {
    console.log(
      chalk.yellow(
        '\n⚠️ This will migrate existing agents, co-pilots, and QRIX to the unified schema'
      )
    );
    console.log(chalk.yellow('   This operation cannot be undone\n'));

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('Are you sure you want to proceed? (yes/no): ', async (answer) => {
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log(chalk.yellow('\nMigration cancelled'));
        return;
      }

      // Perform migration
      const result = await withSpinner('Migrating agents to unified schema', migrateAgents);

      if (result.success) {
        const { results } = result;

        console.log(chalk.green(`\n✓ Migration completed successfully\n`));
        console.log(chalk.bold('Migration Summary:'));
        console.log(`Agents migrated: ${chalk.cyan(results.migrated.agents)}`);
        console.log(`Co-pilots migrated: ${chalk.cyan(results.migrated.copilots)}`);
        console.log(`QRIX migrated: ${chalk.cyan(results.migrated.qrix)}`);
        console.log(`Errors: ${chalk.red(results.errors.length)}`);

        if (results.errors.length > 0) {
          console.log(chalk.yellow('\nThe following errors occurred during migration:'));
          for (const error of results.errors) {
            console.log(
              `- ${error.type} ${error.originalId || error.originalEmail}: ${error.error}`
            );
          }
        }
      } else {
        displayResult(`Error: ${result.message}`, 'error');
      }
    });
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
}

module.exports = {
  register: registerAgent,
  get: getAgentInfo,
  list: listAgentsCmd,
  update: updateAgentCmd,
  extend: extendAgentCmd,
  migrate: migrateAgentsCmd,
};
