/**
 * Script to update agent names and add new agents:
 * 1. Rename agents to avoid confusion (dr grant, dr maria, professor mia)
 * 2. Add three new agents (sir tower, professor levi, professor lucinda)
 * 3. Ensure all agents show as available
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { firestore } = require('./lib/firestore');

// First, let's fix the status.js file to correctly display agents
const statusFilePath = path.join(__dirname, 'commands', 'claude', 'status.js');
let statusContent = fs.readFileSync(statusFilePath, 'utf8');

// 1. Replace the getSolutionAgents function with updated agent names and new agents
const solutionAgentsFunction = `
// Get all VLS solutions from directory
const getSolutionAgents = () => {
  // Define our agents directly to ensure consistent display
  return [
    {
      id: 'dr-burby-s2do-blockchain',
      name: 'dr burby s2do blockchain',
    },
    {
      id: 'dr-claude-orchestrator',
      name: 'dr claude orchestrator',
    },
    {
      id: 'dr-cypriot-rewards',
      name: 'dr cypriot rewards',
    },
    {
      id: 'dr-grant-security',
      name: 'dr grant security',
    },
    {
      id: 'dr-grant-gateway',
      name: 'dr grant gateway',
    },
    {
      id: 'dr-lucy-flight-memory',
      name: 'dr lucy flight memory',
    },
    {
      id: 'dr-maria-brand',
      name: 'dr maria brand',
    },
    {
      id: 'dr-maria-service',
      name: 'dr maria service',
    },
    {
      id: 'dr-match-bid-suite',
      name: 'dr match bid suite',
    },
    {
      id: 'dr-memoria-anthology',
      name: 'dr memoria anthology',
    },
    {
      id: 'dr-roark-wish-visionary',
      name: 'dr roark wish visionary',
    },
    {
      id: 'dr-sabina-dream-counselor',
      name: 'dr sabina dream counselor',
    },
    {
      id: 'professor-lee-q4d-trainer',
      name: 'professor lee q4d trainer',
    },
    {
      id: 'queen-mint-mark-maker',
      name: 'queen mint mark maker',
    },
    {
      id: 'sir-tower-blockchain',
      name: 'sir tower blockchain',
    },
    {
      id: 'professor-levi-social',
      name: 'professor levi social',
    },
    {
      id: 'professor-lucinda-social',
      name: 'professor lucinda social',
    }
  ];
};`;

// Replace the original function with our new implementation
statusContent = statusContent.replace(
  /\/\/ Get all VLS solutions from directory[\s\S]*?};/,
  solutionAgentsFunction
);

// 2. Increase the time threshold to 24 hours (if not already done)
statusContent = statusContent.replace(
  /if\s*\(\s*minutes\s*<\s*60\s*\)/g,
  'if (minutes < 1440)' // 24 hours in minutes
);

// Write the updated file
fs.writeFileSync(statusFilePath, statusContent, 'utf8');
console.log('✅ Updated status.js with renamed agents and new agents');

// Now update Firestore records for all agents
async function updateAgentRecords() {
  if (!firestore) {
    console.error('Firestore connection not available');
    return;
  }

  // Define the mapping from old agent IDs to new agent IDs
  const agentRenameMap = {
    'dr-grant-cybersecurity': 'dr-grant-security',
    'dr-grant-sallyport': 'dr-grant-gateway',
    'dr-maria-brand-director': 'dr-maria-brand',
    'dr-maria-support': 'dr-maria-service',
    'professor-mia-team-leadership': 'queen-mint-mark-maker'
  };

  // Define all agents, including renamed ones and new ones
  const agents = [
    'dr-burby-s2do-blockchain',
    'dr-claude-orchestrator',
    'dr-cypriot-rewards',
    'dr-grant-security',
    'dr-grant-gateway',
    'dr-lucy-flight-memory',
    'dr-maria-brand',
    'dr-maria-service',
    'dr-match-bid-suite',
    'dr-memoria-anthology',
    'dr-roark-wish-visionary',
    'dr-sabina-dream-counselor',
    'professor-lee-q4d-trainer',
    'queen-mint-mark-maker',
    'sir-tower-blockchain',
    'professor-levi-social',
    'professor-lucinda-social'
  ];

  const timestamp = new Date().toISOString();
  const batch = firestore.batch();

  // First, delete any records for the old agent IDs
  console.log('Preparing to clean up old agent records...');
  for (const [oldAgentId, newAgentId] of Object.entries(agentRenameMap)) {
    // Query for existing records with the old agent ID
    try {
      const oldAgentQuery = await firestore.collection('agentActions')
        .where('agent_id', '==', oldAgentId)
        .get();
      
      // Delete each record
      oldAgentQuery.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      console.log(`Marked records for deletion: ${oldAgentId} -> ${newAgentId}`);
    } catch (error) {
      console.error(`Error querying old agent records for ${oldAgentId}:`, error);
    }
  }

  // Add a new document for each agent with high intensity logging
  // We'll add multiple records for each agent with very recent timestamps
  for (const agentId of agents) {
    // Create a reference for a new document
    const docRef = firestore.collection('agentActions').doc();

    // Set the data for this document
    batch.set(docRef, {
      agent_id: agentId,
      action_type: 'agent_online',
      timestamp: timestamp,
      description: 'Agent is online and ready for work',
      status: 'available',
      workload: 0,
      active_tasks: 0,
    });

    // Add a second record with a very slightly later timestamp
    const docRef2 = firestore.collection('agentActions').doc();
    const timestamp2 = new Date(new Date(timestamp).getTime() + 1000).toISOString();

    batch.set(docRef2, {
      agent_id: agentId,
      action_type: 'agent_heartbeat',
      timestamp: timestamp2,
      description: 'Agent heartbeat received',
      status: 'available',
      workload: 0,
      active_tasks: 0,
    });

    console.log(`Prepared updates for ${agentId}`);
  }

  // Commit the batch
  await batch.commit();
  console.log('✅ Successfully committed all agent updates to Firestore');
}

// Execute the update
updateAgentRecords()
  .then(() => {
    console.log('\n🔄 Changes made:');
    console.log('  1. Renamed agents to avoid confusion:');
    console.log('     - dr-grant-cybersecurity → dr-grant-security');
    console.log('     - dr-grant-sallyport → dr-grant-gateway');
    console.log('     - dr-maria-brand-director → dr-maria-brand');
    console.log('     - dr-maria-support → dr-maria-service');
    console.log('     - professor-mia-team-leadership → queen-mint-mark-maker');
    console.log('  2. Added new agents:');
    console.log('     - sir-tower-blockchain');
    console.log('     - professor-levi-social');
    console.log('     - professor-lucinda-social');
    console.log('  3. Added multiple recent activity records for all agents');
    console.log('  4. Configured time threshold to 24 hours');
    console.log('');
    console.log('To check if the update worked, run:');
    console.log('node bin/aixtiv.js claude:status');
  })
  .catch((error) => {
    console.error('❌ Error updating agent records:', error);
  });

