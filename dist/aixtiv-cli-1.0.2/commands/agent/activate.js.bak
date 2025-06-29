const chalk = require('chalk');
const ora = require('ora');
const { parseOptions, withSpinner, displayResult } = require('../../lib/utils');
const { firestore } = require('../../lib/firestore');

/**
 * Activate agents by updating their status
 * @param {object} options - Command options
 */
module.exports = async function activateAgents(options) {
  const { agent } = parseOptions(options);

  try {
    if (!firestore) {
      throw new Error('Firestore connection is not available');
    }

    // Define the default agent list
    const defaultAgents = [
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

    // Determine which agents to activate
    const agentsToActivate = agent ? [agent] : defaultAgents;

    // Update agent status
    const result = await withSpinner(
      `Activating ${agent ? 'agent: ' + chalk.cyan(agent) : 'all agents'}`,
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
