#!/bin/bash
# Agent Monitoring Script
# Monitors agent activity and generates reports

# Source agent tracking
source "$(dirname "$0")/../bin/agent-tracking.sh"
export AGENT_ID="AGENT_MONITOR"

# Config
LOG_DIR="$HOME/.aixtiv/logs"
REPORT_DIR="$HOME/.aixtiv/reports"
DAYS_TO_KEEP=30
TODAY=$(date +"%Y-%m-%d")

# Create report directory
mkdir -p "$REPORT_DIR"

# Log start
log_agent_action "monitor_start" "Starting agent monitoring job"

# Function to process logs
process_logs() {
    log_files=$(find "$LOG_DIR" -name "agent-actions-*.log" -type f)
    
    # Count actions by agent
    echo "Agent Activity Summary (last 7 days):" > "$REPORT_DIR/agent-summary-$TODAY.txt"
    echo "--------------------------------------" >> "$REPORT_DIR/agent-summary-$TODAY.txt"
    
    for file in $log_files; do
        if [[ "$(basename "$file")" =~ agent-actions-([0-9]{4}-[0-9]{2}-[0-9]{2}).log ]]; then
            date="${BASH_REMATCH[1]}"
            # Only process last 7 days
            # Cross-platform date-to-epoch handling
            if [[ "$(uname)" == "Darwin" ]]; then
                # macOS: use date -j -f
                date_epoch=$(date -j -f "%Y-%m-%d" "$date" +%s 2>/dev/null)
            else
                # Linux: use date -d
                date_epoch=$(date -u -d "$date" +%s 2>/dev/null)
            fi
            now_epoch=$(date -u +%s)
            days_old=$(( (now_epoch - date_epoch) / 86400 ))
            
            if [ "$days_old" -le 7 ]; then
                echo "Processing $file..."
                
                # Count by agent
                echo "Date: $date" >> "$REPORT_DIR/agent-summary-$TODAY.txt"
                grep -o '"agent_id":"[^"]*"' "$file" | sort | uniq -c | sort -nr | 
                while read -r count agent; do
                    agent_name=$(echo "$agent" | grep -o '"agent_id":"[^"]*"' | cut -d':' -f2 | tr -d '\"')
                    echo "  $agent_name: $count actions" >> "$REPORT_DIR/agent-summary-$TODAY.txt"
                done
                
                echo "--------------------------------------" >> "$REPORT_DIR/agent-summary-$TODAY.txt"
            fi
        fi
    done
    
    # Generate JSON for dashboard
    echo "{" > "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "  \"generated\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"," >> "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "  \"summary\": {" >> "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "    \"total_actions\": 0," >> "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "    \"actions_by_agent\": {}," >> "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "    \"top_actions\": []" >> "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "  }" >> "$REPORT_DIR/agent-activity-$TODAY.json"
    echo "}" >> "$REPORT_DIR/agent-activity-$TODAY.json"
}

# Cleanup old logs
cleanup_old_logs() {
    find "$LOG_DIR" -name "agent-actions-*.log" -type f -mtime +$DAYS_TO_KEEP -delete
    find "$REPORT_DIR" -name "agent-summary-*.txt" -type f -mtime +$DAYS_TO_KEEP -delete
    log_agent_action "cleanup_complete" "Removed logs older than $DAYS_TO_KEEP days"
}

# Process logs
process_logs

# Cleanup old logs
cleanup_old_logs

# Log completion
log_agent_action "monitor_complete" "Agent monitoring job completed"

echo "Agent monitoring complete. Report saved to $REPORT_DIR/agent-summary-$TODAY.txt"
