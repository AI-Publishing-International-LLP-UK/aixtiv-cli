#!/bin/bash
# Script to add MA as a talkio.com agent to the tracking system

# Source the agent tracking library
source "$(dirname "$0")/bin/agent-tracking.sh"

# Set the agent ID for MA@talkio.com
export AGENT_ID="MA@talkio.com"

# Log an initial action to record this agent in the system
log_agent_action "agent_registered" "Registered MA as a talkio.com authenticated agent with principal pr@coaching2100.com and co-pilot mia@drmia.live"

echo "Successfully added MA@talkio.com to the agent tracking system"
