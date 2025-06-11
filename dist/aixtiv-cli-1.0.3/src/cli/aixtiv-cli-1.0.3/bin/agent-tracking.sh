#!/bin/bash
# Agent Tracking Shell Script
# This script allows tracking agent actions from bash scripts

# Get the agent ID from environment variable or default
AGENT_ID=${AGENT_ID:-"UNSPECIFIED_AGENT"}

# Function to log agent actions to a log file and to Cloud Logging if available
log_agent_action() {
    action_type=$1
    description=$2
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    log_dir="$HOME/.aixtiv/logs"
    today=$(date +"%Y-%m-%d")
    log_file="$log_dir/agent-actions-$today.log"
    
    # Create log directory if it doesn't exist
    mkdir -p "$log_dir"
    
    # Format the log entry
    log_entry="{\"timestamp\":\"$timestamp\",\"agent_id\":\"$AGENT_ID\",\"action_type\":\"$action_type\",\"description\":\"$description\"}"
    
    # Write to log file
    echo "$log_entry" >> "$log_file"
    
    # Output to console if verbose mode is enabled
    if [[ "$AGENT_TRACKING_VERBOSE" == "true" ]]; then
        echo "AGENT_ACTION [$action_type]: $description"
    fi
    
    # Send to Cloud Logging if gcloud is available
    if command -v gcloud > /dev/null && [[ "$AGENT_TRACKING_CLOUD" == "true" ]]; then
        project_id=${GOOGLE_CLOUD_PROJECT:-"api-for-warp-drive"}
        gcloud logging write agent-actions "$log_entry" \
            --payload-type=json \
            --project="$project_id" \
            --severity=INFO &> /dev/null || true
    fi
    
    # Send to Firestore if Firebase Admin credentials are available
    if [[ -f "$HOME/.aixtiv/firebase-agent-tracking.json" ]] && command -v node > /dev/null && [[ "$AGENT_TRACKING_FIRESTORE" == "true" ]]; then
        node -e "
        const admin = require('firebase-admin');
        try {
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert('$HOME/.aixtiv/firebase-agent-tracking.json')
                });
            }
            
            admin.firestore().collection('agentActions').add({
                timestamp: new Date('$timestamp'),
                agent_id: '$AGENT_ID',
                action_type: '$action_type',
                description: '$description'
            });
        } catch (e) {
            // Silently fail if Firestore logging fails
        }
        " &> /dev/null || true
    fi
    
    return 0
}

# Initialize agent tracking
if [[ -z "$AGENT_TRACKING_INITIALIZED" ]]; then
    export AGENT_TRACKING_INITIALIZED="true"
    export AGENT_TRACKING_VERBOSE=${AGENT_TRACKING_VERBOSE:-"false"}
    export AGENT_TRACKING_CLOUD=${AGENT_TRACKING_CLOUD:-"false"}
    export AGENT_TRACKING_FIRESTORE=${AGENT_TRACKING_FIRESTORE:-"false"}
    
    log_agent_action "agent_tracking_initialized" "Agent tracking initialized for agent $AGENT_ID"
fi