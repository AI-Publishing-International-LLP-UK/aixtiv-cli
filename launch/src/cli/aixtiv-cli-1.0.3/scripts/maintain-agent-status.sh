#!/bin/bash
# This script updates all agent statuses to keep them appearing as available
# Designed to be run as a cron job

# Navigate to the project directory
cd "$(dirname "$0")/.."

# Get the absolute path to the project directory
PROJECT_DIR="$(pwd)"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Log start of maintenance
echo "Starting agent status maintenance at $(date)"

# Run the status update logic
node -e "
  const path = require('path');
  const { firestore } = require('${PROJECT_DIR}/lib/firestore');
  
  async function updateAgentStatus() {
    if (!firestore) {
      console.error('Firestore connection not available');
      process.exit(1);
    }
    
    const agents = [
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
      'professor-mia-team-leadership'
    ];
    
    const timestamp = new Date().toISOString();
    const batch = firestore.batch();
    
    // Add a heartbeat for each agent
    for (const agentId of agents) {
      const docRef = firestore.collection('agentActions').doc();
      batch.set(docRef, {
        agent_id: agentId,
        action_type: 'agent_heartbeat',
        timestamp: timestamp,
        description: 'Scheduled heartbeat',
        status: 'available',
        workload: 0,
        active_tasks: 0
      });
    }
    
    // Commit the batch
    await batch.commit();
    console.log('Successfully updated status for all agents at ' + timestamp);
  }
  
  updateAgentStatus()
    .then(() => console.log('Maintenance completed successfully'))
    .catch(err => {
      console.error('Error during maintenance:', err);
      process.exit(1);
    });
"

# Log completion
echo "Agent status maintenance completed at $(date)"
