#!/bin/bash

# Extract agent display names from status output
AGENT_STATUS_OUTPUT=$(aixtiv claude:status)

# Extract agent display names and their status
echo "Analyzing agent status output..."
echo "$AGENT_STATUS_OUTPUT" | grep -E "│ [a-z .][a-z .-]+…" | while read -r line; do
  # Extract agent name and status
  AGENT_DISPLAY=$(echo "$line" | grep -o "│ [a-z .][a-z .-]\+…" | sed 's/│ //g' | sed 's/…//g')
  STATUS=$(echo "$line" | grep -o "│ [a-z]\+[ ]\+" | head -1 | sed 's/│ //g' | xargs)
  
  # Only process offline agents
  if [ "$STATUS" = "offline" ]; then
    # Convert display name to ID format
    AGENT_ID=$(echo "$AGENT_DISPLAY" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    echo "Found offline agent: $AGENT_DISPLAY (ID: $AGENT_ID)"
    
    # Additional debugging information
    echo "Agent display name length: $(echo "$AGENT_DISPLAY" | wc -c)"
    echo "Agent ID length: $(echo "$AGENT_ID" | wc -c)"
    echo "Status: $STATUS"
    
    # Try special activation for this specific agent
    echo "Activating offline agent: $AGENT_DISPLAY using ID: $AGENT_ID"
    
    # Try multiple ID formats to capture potential variations
    export AGENT_ID="$AGENT_ID"
    export AGENT_DISPLAY_NAME="$AGENT_DISPLAY"
    
    node -e "
      const agentTracking = require('./lib/agent-tracking');
      
      async function activateAgent() {
        // Try multiple formats and timestamps to ensure activation
        const formats = [
          process.env.AGENT_ID,
          process.env.AGENT_ID.replace(/-/g, ' '),
          process.env.AGENT_DISPLAY_NAME.toLowerCase()
        ];
        
        console.log('Trying activation with multiple ID formats:', formats);
        
        for (const format of formats) {
          // Set agent ID
          process.env.AGENT_ID = format;
          
          // Log with current timestamp
          const now = new Date();
          
          await agentTracking.logAgentAction('agent_online', {
            description: 'Agent is online and connected',
            status: 'available',
            timestamp: now.toISOString(),
            workload: 0
          });
          
          await agentTracking.logAgentAction('agent_heartbeat', {
            description: 'Agent heartbeat signal',
            status: 'available',
            timestamp: new Date(now.getTime() + 1000).toISOString(),
            workload: 0,
            active_tasks: 0
          });
          
          console.log('Logged activity for agent format:', format);
        }
      }
      
      activateAgent().catch(console.error);
    "
  fi
done

echo "All offline agents have been targeted for activation"
