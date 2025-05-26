const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { parseOptions, withSpinner, displayResult } = require('../../lib/utils');
const { firestore } = require('../../lib/firestore');
const { logAgentAction } = require('../../lib/agent-tracking');

// Import functions from the improved activate-agents.js script
const activateAgentsModule = require('../../activate-agents');

/**
 * Load agent cards from configuration
 * @returns {Promise<Array>} - List of agent configurations
 */
async function loadAgentCards() {
  const agentCardsDir = path.join(process.cwd(), 'config', 'agent-cards');

  try {
    // Check if directory exists
    if (!fs.existsSync(agentCardsDir)) {
      console.warn(chalk.yellow(`Agent cards directory not found at ${agentCardsDir}`));
      // Return default list if directory doesn't exist
      return getDefaultAgents().map((id) => ({ id }));
    }

    // Read agent card files
    const cardFiles = fs.readdirSync(agentCardsDir).filter((file) => file.endsWith('.json'));

    if (cardFiles.length === 0) {
      console.warn(chalk.yellow('No agent card files found'));
      // Return default list if no files found
      return getDefaultAgents().map((id) => ({ id }));
    }

    // Parse agent cards
    const agents = [];
    for (const file of cardFiles) {
      try {
        const cardPath = path.join(agentCardsDir, file);
        const cardContent = fs.readFileSync(cardPath, 'utf8');
        const card = JSON.parse(cardContent);

        // Add card to list if it has an ID
        if (card.id) {
          agents.push(card);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Error loading agent card ${file}: ${error.message}`));
      }
    }

    return agents.length > 0 ? agents : getDefaultAgents().map((id) => ({ id }));
  } catch (error) {
    console.warn(chalk.yellow(`Error loading agent cards: ${error.message}`));
    // Return default list on error
    return getDefaultAgents().map((id) => ({ id }));
  }
}

/**
 * Get default agent IDs
 * @returns {Array<string>} - List of default agent IDs
 */
function getDefaultAgents() {
  // Use the default agents list from the module
  return activateAgentsModule.DEFAULT_AGENTS;
}

/**
 * Get agent instances if specified in card
 * @param {Object} agentCard - Agent card configuration
 * @returns {Array<string>} - List of agent instance IDs
 */
function getAgentInstances(agentCard) {
  if (agentCard.instances && Array.isArray(agentCard.instances)) {
    return agentCard.instances.map((instance) => {
      return typeof instance === 'string' ? instance : instance.id;
    });
  }
  return [agentCard.id];
}

/**
 * Activate agents by updating their status
 * @param {object} options - Command options
 */
module.exports = async function activateAgents(options) {
  const { agent, team } = parseOptions(options);

  try {
    if (!firestore) {
      throw new Error('Firestore connection is not available');
    }

    // Load agent configurations
    const agentCards = await loadAgentCards();

    // Filter agents based on command options
    let agentsToActivate = [];

    if (agent) {
      // Activate specific agent
      const agentCard = agentCards.find((card) => card.id === agent || card.id.includes(agent));
      if (agentCard) {
        // Include agent instances if defined
        agentsToActivate = getAgentInstances(agentCard);
      } else {
        // Fallback to just the agent ID if card not found
        agentsToActivate = [agent];
      }
    } else if (team) {
      // Activate agents in a team (future implementation)
      console.warn(chalk.yellow('Team activation not fully implemented yet'));
      agentsToActivate = agentCards.map((card) => card.id);
    } else {
      // Activate all agents, including instances
      for (const card of agentCards) {
        agentsToActivate = agentsToActivate.concat(getAgentInstances(card));
      }
    }

    // Process each agent using the improved activation logic
    const results = {
      success: true,
      activated: 0,
      skipped: 0,
      failed: 0,
      agents: [],
      timestamp: new Date().toISOString()
    };

    // Use withSpinner for better UI feedback
    await withSpinner(
      `Activating ${agent ? 'agent: ' + chalk.cyan(agent) : team ? 'team: ' + chalk.cyan(team) : 'all agents'}`,
      async () => {
        for (const agentId of agentsToActivate) {
          // Use the improved activation function from the module
          const result = await activateAgentsModule.activateAgent(firestore, agentId);
          
          // Track results
          if (result.success) {
            if (result.status === 'activated') {
              results.activated++;
            } else if (result.status === 'already_online') {
              results.skipped++;
            }
          } else {
            results.failed++;
          }
          
          // Add to results for reporting
          results.agents.push({
            id: agentId,
            status: result.status || 'failed',
            error: result.error
          });
          
          // Log agent activation in tracking system (separate from Firestore updates)
          await logAgentAction('agent_activation', {
            agent_id: agentId,
            activation_time: results.timestamp,
            activated_by: 'CLI command',
            status: 'available',
          });
        }
        
        // Update overall success status
        if (results.failed > 0 && results.activated === 0) {
          results.success = false;
        }
        
        return results;
      }
    );

    // Display result in CLI-friendly format
    displayResult({
      success: results.success,
      message: `Activated ${results.activated} agent(s), skipped ${results.skipped}, failed ${results.failed}`,
      details: results,
    });

    // Show activated agents
    if (results.activated > 0) {
      console.log(chalk.bold('\nActivated Agents:'));
      results.agents.forEach(agent => {
        if (agent.status === 'activated') {
          console.log(`- ${chalk.green(agent.id)}`);
        }
      });
    }

    // Show skipped agents
    if (results.skipped > 0) {
      console.log(chalk.bold('\nAlready Online:'));
      results.agents.forEach(agent => {
        if (agent.status === 'already_online') {
          console.log(`- ${chalk.yellow(agent.id)}`);
        }
      });
    }

    // Show failed agents
    if (results.failed > 0) {
      console.log(chalk.bold('\nFailed Activations:'));
      results.agents.forEach(agent => {
        if (agent.status === 'failed' || !agent.status) {
          console.log(`- ${chalk.red(agent.id)}: ${agent.error || 'Unknown error'}`);
        }
      });
    }

    console.log(chalk.bold('\nNext Steps:'));
    console.log(`Check agent status: ${chalk.yellow('aixtiv claude:status')}`);
  } catch (error) {
    console.error(chalk.red('\nAgent activation failed:'), error.message);
    process.exit(1);
  }
};
