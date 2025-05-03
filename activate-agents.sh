#!/bin/bash

# Script to activate all agents in the Aixtiv CLI system

# Set environment variables for agent tracking
export AGENT_TRACKING_VERBOSE="true"
export AGENT_TRACKING_FIRESTORE="true"

# List of agents to activate
AGENTS=(
  "dr-claude-orchestrator"
  "dr-lucy-flight-memory"
  "dr-match-bid-suite"
  "dr-memoria-anthology"
  "dr-grant-salleyport"
  "dr-maria-brand-director"
  "dr-burby-s2do-blockchain"
  "dr-cypriot-rewards"
  "dr-grant-cybersecurity"
  "professor-mia-team-leadership"
  "dr-roark-wish-visionary"
  "dr-sabina-dream-counselor"
  "professor-lee-q4d-trainer"
)

# Add missing aliases that might appear in the status output
ALIASES=(
  "dr-maria-support"
)

# Function to activate an agent
activate_agent() {
  local agent=$1
  echo "Activating agent: $agent"
  
  # Set the agent ID
  export AGENT_ID="$agent"
  
  # Use node to log agent actions that will set the agent as active
  node -e "
    const agentTracking = require('./lib/agent-tracking');
    
    async function activateAgent() {
      // Log agent initialization
      await agentTracking.logAgentAction('agent_initialization', {
        description: 'Agent activated and ready for tasks',
        status: 'available',
        workload: 0
      });
      
      // Log agent availability - log twice to ensure it's registered
      await agentTracking.logAgentAction('agent_status_update', {
        description: 'Agent marked as available',
        status: 'available',
        workload: 0,
        active_tasks: 0
      });
      
      // Log second update to ensure visibility
      await agentTracking.logAgentAction('agent_ready', {
        description: 'Agent is active and ready for tasks',
        status: 'available',
        workload: 0,
        active_tasks: 0
      });
      
      console.log('Agent $agent activated successfully');
    }
    
    activateAgent().catch(err => console.error('Error activating agent:', err));
  "
  
  # Small delay between agent activations
  sleep 2
}

# Activate each agent
for agent in "${AGENTS[@]}"; do
  activate_agent "$agent"
done

# Also activate any aliases
for agent in "${ALIASES[@]}"; do
  activate_agent "$agent"
done

echo "All agents have been activated"
echo "Run 'aixtiv claude:status' to verify agent status"
