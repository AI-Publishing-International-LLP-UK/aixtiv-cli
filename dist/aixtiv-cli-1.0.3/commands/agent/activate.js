const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { parseOptions, withSpinner, displayResult } = require('../../lib/utils');
const { firestore } = require('../../lib/firestore');
const { logAgentAction } = require('../../lib/agent-tracking');

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
  return [
    'dr-burby-s2do-blockchain',
    'dr-claude-orchestrator',
    'dr-cypriot-rewards',
    'dr-grant-cybersecurity',
    'dr-grant-sallyport',
    'dr-lucy-flight-memory',
    'dr-maria-brand-director',
    'dr-maria-support',
    'dr-match-bid-suite',
    'dr-memoria-anthology',
    'dr-roark-wish-visionary',
    'dr-sabina-dream-counselor',
    'professor-lee-q4d-trainer',
    'professor-mia-team-leadership',
  ];
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
      const agentCard = agentCards.find((card) => card.id === agent);
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

    // Update agent status
    const result = await withSpinner(
      `Activating ${agent ? 'agent: ' + chalk.cyan(agent) : team ? 'team: ' + chalk.cyan(team) : 'all agents'}`,
      async () => {
        const timestamp = new Date().toISOString();
        const batch = firestore.batch();

        // Create records for each agent
        for (const agentId of agentsToActivate) {
          const docRef = firestore.collection('agentActions').doc();
          batch.set(docRef, {
            agent_id: agentId,
            action_type: 'agent_activation',
            timestamp: timestamp,
            description: 'Manual activation via command',
            status: 'available',
            workload: 0,
            active_tasks: 0,
          });

          // Add a heartbeat as well
          const heartbeatRef = firestore.collection('agentActions').doc();
          const heartbeatTime = new Date(new Date(timestamp).getTime() + 1000).toISOString();
          batch.set(heartbeatRef, {
            agent_id: agentId,
            action_type: 'agent_heartbeat',
            timestamp: heartbeatTime,
            description: 'Heartbeat signal after activation',
            status: 'available',
            workload: 0,
            active_tasks: 0,
          });

          // Log agent activation in tracking system
          await logAgentAction('agent_activation', {
            agent_id: agentId,
            activation_time: timestamp,
            activated_by: 'CLI command',
            status: 'available',
          });
        }

        // Commit the batch
        await batch.commit();

        return {
          status: 'activated',
          agentCount: agentsToActivate.length,
          agents: agentsToActivate,
          timestamp: timestamp,
        };
      }
    );

    // Display result
    displayResult({
      success: result.status === 'activated',
      message: `${result.agentCount} agent(s) successfully activated`,
      details: result,
    });

    console.log(chalk.bold('\nActivated Agents:'));
    for (const agentId of result.agents) {
      console.log(`- ${chalk.green(agentId)}`);
    }

    console.log(chalk.bold('\nNext Steps:'));
    console.log(`Check agent status: ${chalk.yellow('aixtiv claude:status')}`);
  } catch (error) {
    console.error(chalk.red('\nAgent activation failed:'), error.message);
    process.exit(1);
  }
};
