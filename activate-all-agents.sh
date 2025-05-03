#!/bin/bash

# Script to activate all agents by reading their names from claude:status

# Set environment variables for agent tracking
export AGENT_TRACKING_VERBOSE="true"
export AGENT_TRACKING_FIRESTORE="true"

# Get the list of agents from claude:status
echo "Fetching agent list from claude:status..."
agent_list=$(aixtiv claude:status | grep -o "│ [a-z .-]\+…" | sed 's/│ //g' | sed 's/…//g')

# Function to activate an agent
activate_agent() {
  local agent_display_name=$1
  # Convert display name to id format (lowercase, hyphens)
  local agent_id=$(echo "$agent_display_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  
  echo "Activating agent: $agent_display_name (ID: $agent_id)"
  
  # Set the agent ID
  export AGENT_ID="$agent_id"
  
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
      
      // Log agent availability
      await agentTracking.logAgentAction('agent_status_update', {
        description: 'Agent marked as available',
        status: 'available',
        workload: 0,
        active_tasks: 0
      });
      
      // Log agent ready state
      await agentTracking.logAgentAction('agent_ready', {
        description: 'Agent is online and ready for tasks',
        status: 'available',
        workload: 0,
        active_tasks: 0
      });
      
      console.log('Agent $agent_id activated successfully');
    }
    
    activateAgent().catch(err => console.error('Error activating agent:', err));
  "
  
  # Small delay between agent activations
  sleep 2
}

# Process each agent
echo "Found agents to activate:"
echo "$agent_list"
echo ""

# Activate each agent
while IFS= read -r agent_name; do
  activate_agent "$agent_name"
done <<< "$agent_list"

# Also activate professor-mia-team-leadership specifically
activate_agent "professor mia team leadership"

echo "All agents have been activated"
echo "Run 'aixtiv claude:status' to verify agent status"
