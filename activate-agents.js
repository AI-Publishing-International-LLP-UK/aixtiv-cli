#!/usr/bin/env node

/**
 * Aixtiv Agent Activation Script
 * 
 * This script activates one or more agents in the Aixtiv system by updating
 * their status from offline to online in the Firestore database.
 * 
 * Usage:
 *   - Standalone: node activate-agents.js [agentId]
 *   - Via CLI: aixtiv agent:activate [--agent=agentId]
 * 
 * Parameters:
 *   - agentId: Optional. ID of a specific agent to activate. If omitted, all agents will be activated.
 * 
 * The script updates the following agent fields:
 *   - status: Set to "online"
 *   - workload: Set to "0%"
 *   - activeTasks: Set to 0
 *   - lastActive: Set to current timestamp
 */

// Import required modules
const admin = require('firebase-admin');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');

// Define default agent IDs
const DEFAULT_AGENTS = [
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

// Function to initialize Firebase Admin if not already initialized
function initializeFirebase() {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'aixtiv-symphony',
        // Use us-west1 region
        databaseURL: `https://${process.env.GOOGLE_CLOUD_PROJECT || 'aixtiv-symphony'}.firebaseio.com`,
      });
    }
    return admin.firestore();
  } catch (error) {
    console.error(chalk.red('Error initializing Firebase:'), error.message);
    throw error;
  }
}

/**
 * Activate a specific agent by ID
 * @param {Object} db - Firestore database instance
 * @param {string} agentId - ID of the agent to activate
 * @returns {Promise<Object>} - Result of the activation
 */
async function activateAgent(db, agentId) {
  const spinner = ora(`Activating agent: ${chalk.cyan(agentId)}`).start();
  
  try {
    // Check if agent exists
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      spinner.fail(`Agent ${chalk.yellow(agentId)} not found.`);
      return { success: false, agentId, error: 'Agent not found' };
    }
    
    const agentData = agentDoc.data();
    
    // Skip if agent is already online
    if (agentData.status === 'online') {
      spinner.info(`Agent ${chalk.green(agentId)} is already online.`);
      return { success: true, agentId, status: 'already_online' };
    }
    
    // Update agent status
    await agentRef.update({
      status: 'online',
      workload: '0%',
      activeTasks: 0,
      lastActive: new Date().toISOString(),
    });
    
    // Record activation in agent actions
    await db.collection('agentActions').add({
      agent_id: agentId,
      action_type: 'agent_activation',
      timestamp: new Date().toISOString(),
      description: 'Manual activation via script',
      status: 'available',
      workload: 0,
      active_tasks: 0,
    });
    
    spinner.succeed(`Agent ${chalk.green(agentId)} activated successfully.`);
    return { success: true, agentId, status: 'activated' };
  } catch (error) {
    spinner.fail(`Failed to activate agent ${chalk.yellow(agentId)}: ${error.message}`);
    return { success: false, agentId, error: error.message };
  }
}

/**
 * Activate all agents in the database
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Object>} - Result of the activation
 */
async function activateAllAgents(db) {
  const spinner = ora('Retrieving agent list...').start();
  
  try {
    // Get all agents from Firestore
    const agentsRef = db.collection('agents');
    const snapshot = await agentsRef.get();
    
    if (snapshot.empty) {
      spinner.info('No agents found in the database. Falling back to default agent list.');
      spinner.stop();
      
      // If no agents found, use default list
      return activateDefaultAgents(db);
    }
    
    spinner.succeed(`Found ${chalk.cyan(snapshot.size)} agents.`);
    
    // Create a batch to update multiple documents
    const batch = db.batch();
    const timestamp = new Date().toISOString();
    const results = { success: true, activated: 0, skipped: 0, failed: 0, agents: [] };
    
    // Process each agent
    spinner.start('Activating agents...');
    snapshot.forEach(doc => {
      const agentData = doc.data();
      const agentId = doc.id;
      
      // Only update offline agents
      if (agentData.status === 'offline') {
        batch.update(doc.ref, {
          status: 'online',
          workload: '0%',
          activeTasks: 0,
          lastActive: timestamp,
        });
        
        // Add to agent actions collection
        const actionRef = db.collection('agentActions').doc();
        batch.set(actionRef, {
          agent_id: agentId,
          action_type: 'agent_activation',
          timestamp: timestamp,
          description: 'Batch activation via script',
          status: 'available',
          workload: 0,
          active_tasks: 0,
        });
        
        results.activated++;
        results.agents.push({ id: agentId, status: 'activated' });
      } else {
        results.skipped++;
        results.agents.push({ id: agentId, status: 'already_online' });
      }
    });
    
    // Commit the batch if there are updates
    if (results.activated > 0) {
      await batch.commit();
      spinner.succeed(`Activated ${chalk.green(results.activated)} agents. Skipped ${results.skipped} agents that were already online.`);
    } else {
      spinner.info('All agents are already online. No activation needed.');
    }
    
    return results;
  } catch (error) {
    spinner.fail(`Failed to activate agents: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Activate the default list of agents
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Object>} - Result of the activation
 */
async function activateDefaultAgents(db) {
  console.log(`Activating ${chalk.cyan(DEFAULT_AGENTS.length)} default agents:`);
  
  const results = { success: true, activated: 0, failed: 0, agents: [] };
  
  // Process each default agent
  for (const agentId of DEFAULT_AGENTS) {
    const result = await activateAgent(db, agentId);
    
    if (result.success && result.status === 'activated') {
      results.activated++;
    } else if (result.success && result.status === 'already_online') {
      // Count as success but not activated
    } else {
      results.failed++;
    }
    
    results.agents.push(result);
  }
  
  // Update overall success status
  if (results.failed > 0 && results.activated === 0) {
    results.success = false;
  }
  
  return results;
}

/**
 * Main function to execute the script
 */
async function main() {
  try {
    // Get agent ID from command line args if provided
    const args = process.argv.slice(2);
    const agentId = args[0];
    
    // Initialize Firebase and get Firestore instance
    const db = initializeFirebase();
    
    // Activate agent(s)
    let result;
    
    if (agentId) {
      console.log(`Activating specific agent: ${chalk.cyan(agentId)}`);
      result = await activateAgent(db, agentId);
    } else {
      console.log('Activating all agents...');
      result = await activateAllAgents(db);
    }
    
    // Display summary
    console.log('\n' + chalk.bold.underline('Activation Summary:'));
    
    if (result.success) {
      if (agentId) {
        if (result.status === 'activated') {
          console.log(chalk.green('✓ Agent activated successfully.'));
        } else if (result.status === 'already_online') {
          console.log(chalk.yellow('ℹ Agent was already online.'));
        }
      } else {
        console.log(chalk.green(`✓ Successfully activated ${result.activated} agents.`));
        if (result.skipped > 0) {
          console.log(chalk.yellow(`ℹ Skipped ${result.skipped} agents that were already online.`));
        }
        if (result.failed > 0) {
          console.log(chalk.red(`✗ Failed to activate ${result.failed} agents.`));
        }
      }
    } else {
      console.log(chalk.red(`✗ Activation failed: ${result.error}`));
    }
    
    console.log('\n' + chalk.bold('Next Steps:'));
    console.log(`Check agent status: ${chalk.yellow('aixtiv claude:status')}`);
    
    return result;
  } catch (error) {
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

// Execute script if run directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
} else {
  // Export for use as a module
  module.exports = {
    activateAgent,
    activateAllAgents,
    activateDefaultAgents,
    DEFAULT_AGENTS,
  };
}

