#!/bin/bash
# Agent Tracking System Setup
# This script sets up the agent tracking system for the Aixtiv Symphony ecosystem

set -e

# Default settings
AGENT_ID=${AGENT_ID:-"SETUP_SCRIPT"}
PROJECT_ID=${PROJECT_ID:-"api-for-warp-drive"}
CONFIG_DIR="$HOME/.aixtiv"
LOG_DIR="$CONFIG_DIR/logs"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$ROOT_DIR/bin"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
print_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

print_success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Ensure bin directory exists and is executable
setup_bin_directory() {
    print_info "Setting up bin directory..."
    
    if [ ! -d "$BIN_DIR" ]; then
        mkdir -p "$BIN_DIR"
        print_info "Created bin directory at $BIN_DIR"
    fi
    
    # Ensure agent-tracking.sh exists and is executable
    if [ ! -f "$BIN_DIR/agent-tracking.sh" ]; then
        print_warning "agent-tracking.sh not found in bin directory, creating it..."
        
        # Create agent-tracking.sh script
        cat > "$BIN_DIR/agent-tracking.sh" << 'EOF'
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
EOF
        
        chmod +x "$BIN_DIR/agent-tracking.sh"
        print_success "Created agent-tracking.sh script"
    else
        print_info "agent-tracking.sh already exists"
    fi
}

# Setup configuration directory
setup_config_directory() {
    print_info "Setting up configuration directory..."
    
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        print_info "Created config directory at $CONFIG_DIR"
    fi
    
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        print_info "Created log directory at $LOG_DIR"
    fi
    
    # Create a placeholder Firebase credentials file if it doesn't exist
    if [ ! -f "$CONFIG_DIR/firebase-agent-tracking.json" ]; then
        cat > "$CONFIG_DIR/firebase-agent-tracking.json" << EOF
{
  "type": "service_account",
  "project_id": "$PROJECT_ID",
  "private_key_id": "PLACEHOLDER_REPLACE_WITH_ACTUAL_KEY",
  "private_key": "PLACEHOLDER_REPLACE_WITH_ACTUAL_KEY",
  "client_email": "firebase-adminsdk@$PROJECT_ID.iam.gserviceaccount.com",
  "client_id": "PLACEHOLDER",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40$PROJECT_ID.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
EOF
        print_warning "Created placeholder Firebase credentials file. Replace with actual credentials."
    else
        print_info "Firebase credentials file already exists"
    fi
}

# Setup firestore rules
setup_firestore_rules() {
    print_info "Setting up Firestore rules..."
    
    # Create Firestore rules file
    cat > "$ROOT_DIR/firestore.rules" << EOF
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Agent Actions collection: only authenticated users can read, only service account can write
    match /agentActions/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email.matches('.*@$PROJECT_ID.iam.gserviceaccount.com');
    }
    
    // Agent Configuration: only admins can write
    match /agentConfig/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
EOF
    
    # Create Firestore indexes
    cat > "$ROOT_DIR/firestore.indexes.json" << EOF
{
  "indexes": [
    {
      "collectionId": "agentActions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "agent_id", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionId": "agentActions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "action_type", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
    
    print_success "Created Firestore rules and indexes"
}

# Setup agent monitoring script
setup_agent_monitoring() {
    print_info "Setting up agent monitoring script..."
    
    # Create monitoring directory if it doesn't exist
    if [ ! -d "$ROOT_DIR/monitoring" ]; then
        mkdir -p "$ROOT_DIR/monitoring"
    fi
    
    # Create agent monitoring script
    cat > "$ROOT_DIR/monitoring/agent-monitor.sh" << 'EOF'
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
            days_old=$(( ( $(date -u +%s) - $(date -u -d "$date" +%s) ) / 86400 ))
            
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
    echo "[" > "$ROOT_DIR/reports/agent-activity-$TODAY.json"
    
    first=true
    for file in $log_files; do
        if [[ "$(basename "$file")" =~ agent-actions-([0-9]{4}-[0-9]{2}-[0-9]{2}).log ]]; then
            date="${BASH_REMATCH[1]}"
            days_old=$(( ( $(date -u +%s) - $(date -u -d "$date" +%s) ) / 86400 ))
            
            if [ "$days_old" -le 30 ]; then
                # Count actions by agent and type
                while IFS= read -r line; do
                    if [ "$first" = false ]; then
                        echo "," >> "$ROOT_DIR/reports/agent-activity-$TODAY.json"
                    else
                        first=false
                    fi
                    echo "$line" >> "$ROOT_DIR/reports/agent-activity-$TODAY.json"
                done < <(grep -o '{.*}' "$file")
            fi
        fi
    done
    
    echo "]" >> "$ROOT_DIR/reports/agent-activity-$TODAY.json"
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
EOF
    
    chmod +x "$ROOT_DIR/monitoring/agent-monitor.sh"
    
    print_success "Created agent monitoring script"
}

# Create agent report script
create_agent_report_script() {
    print_info "Creating agent report script..."
    
    cat > "$ROOT_DIR/scripts/generate-agent-report.js" << 'EOF'
#!/usr/bin/env node
/**
 * Agent Activity Report Generator
 * This script generates reports of agent activity based on log files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { program } = require('commander');

// Parse command line arguments
program
  .option('--agent <agent>', 'Filter by agent ID')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--action <action>', 'Filter by action type')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .parse(process.argv);

const options = program.opts();

// Setup paths
const CONFIG_DIR = path.join(os.homedir(), '.aixtiv');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');
const REPORT_DIR = path.join(CONFIG_DIR, 'reports');

// Ensure directories exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Helper to parse log files
function parseLogFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(entry => entry !== null);
  } catch (error) {
    console.error(`Error reading log file ${filePath}:`, error.message);
    return [];
  }
}

// Get log files in date range
function getLogFiles(fromDate, toDate) {
  const files = [];
  const logFiles = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('agent-actions-') && f.endsWith('.log'));
  
  for (const file of logFiles) {
    const match = file.match(/agent-actions-(\d{4}-\d{2}-\d{2})\.log/);
    if (match) {
      const fileDate = match[1];
      if ((!fromDate || fileDate >= fromDate) && (!toDate || fileDate <= toDate)) {
        files.push(path.join(LOG_DIR, file));
      }
    }
  }
  
  return files;
}

// Filter log entries
function filterEntries(entries) {
  return entries.filter(entry => {
    if (options.agent && entry.agent_id !== options.agent) {
      return false;
    }
    
    if (options.action && entry.action_type !== options.action) {
      return false;
    }
    
    return true;
  });
}

// Display results in table format
function displayTableFormat(entries) {
  console.log('Agent Activity Report');
  console.log('====================');
  console.log(`Total Actions: ${entries.length}`);
  console.log('');
  
  // Group by agent and action type
  const actionsByAgent = {};
  for (const entry of entries) {
    if (!actionsByAgent[entry.agent_id]) {
      actionsByAgent[entry.agent_id] = {
        count: 0,
        actions: {}
      };
    }
    
    actionsByAgent[entry.agent_id].count++;
    
    if (!actionsByAgent[entry.agent_id].actions[entry.action_type]) {
      actionsByAgent[entry.agent_id].actions[entry.action_type] = 0;
    }
    
    actionsByAgent[entry.agent_id].actions[entry.action_type]++;
  }
  
  // Display agent summary
  console.log('Actions by Agent:');
  for (const [agent, data] of Object.entries(actionsByAgent)) {
    console.log(`${agent}: ${data.count} actions`);
    console.log('  Actions:');
    for (const [action, count] of Object.entries(data.actions)) {
      console.log(`    ${action}: ${count}`);
    }
    console.log('');
  }
  
  // Display recent activities
  console.log('Recent Activities:');
  const recent = entries.slice(-10).reverse();
  for (const entry of recent) {
    console.log(`[${entry.timestamp}] ${entry.agent_id}: ${entry.action_type} - ${entry.description || ''}`);
  }
}

// Main function
function main() {
  // Parse date range
  const fromDate = options.from || '';
  const toDate = options.to || '';
  
  // Get log files
  const logFiles = getLogFiles(fromDate, toDate);
  
  if (logFiles.length === 0) {
    console.log('No log files found for the specified date range.');
    return;
  }
  
  // Parse log entries
  let allEntries = [];
  for (const file of logFiles) {
    allEntries = [...allEntries, ...parseLogFile(file)];
  }
  
  // Filter entries
  const filteredEntries = filterEntries(allEntries);
  
  // Display results
  if (options.format === 'json') {
    console.log(JSON.stringify(filteredEntries, null, 2));
  } else {
    displayTableFormat(filteredEntries);
  }
}

main();
EOF
    
    chmod +x "$ROOT_DIR/scripts/generate-agent-report.js"
    
    # Add script to npm scripts
    if ! grep -q "agent:report" "$ROOT_DIR/package.json"; then
        print_info "Adding agent:report script to package.json..."
        # This is a simplified approach - in a real scenario you'd use jq or a similar tool
        sed -i.bak 's/"scripts": {/"scripts": {\n    "agent:report": "node scripts\/generate-agent-report.js",/g' "$ROOT_DIR/package.json"
        rm -f "$ROOT_DIR/package.json.bak"
    fi
    
    print_success "Created agent report script"
}

# Create cleanup script
create_cleanup_script() {
    print_info "Creating agent log cleanup script..."
    
    cat > "$ROOT_DIR/scripts/cleanup-agent-logs.js" << 'EOF'
#!/usr/bin/env node
/**
 * Agent Log Cleanup Utility
 * Cleans up old agent tracking logs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { program } = require('commander');

// Parse command line arguments
program
  .option('--days <days>', 'Number of days of logs to keep', '30')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .parse(process.argv);

const options = program.opts();
const daysToKeep = parseInt(options.days, 10);
const dryRun = options.dryRun || false;

// Setup paths
const CONFIG_DIR = path.join(os.homedir(), '.aixtiv');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');
const REPORT_DIR = path.join(CONFIG_DIR, 'reports');

// Calculate cutoff date
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

// Delete old files from a directory
function cleanupDirectory(directory, filePattern) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory ${directory} does not exist, skipping.`);
    return 0;
  }
  
  let deletedCount = 0;
  const files = fs.readdirSync(directory)
    .filter(f => filePattern.test(f))
    .map(f => ({
      name: f,
      path: path.join(directory, f),
      date: extractDateFromFilename(f)
    }))
    .filter(f => f.date && f.date < cutoffDate);
  
  for (const file of files) {
    if (dryRun) {
      console.log(`Would delete: ${file.path}`);
    } else {
      try {
        fs.unlinkSync(file.path);
        console.log(`Deleted: ${file.path}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${file.path}:`, error.message);
      }
    }
  }
  
  return deletedCount;
}

// Extract date from filename
function extractDateFromFilename(filename) {
  const match = filename.match(/.*?(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return new Date(match[1]);
  }
  return null;
}

// Main function
function main() {
  console.log(`Cleaning up agent logs older than ${daysToKeep} days...`);
  
  if (dryRun) {
    console.log('Dry run mode: no files will be deleted');
  }
  
  // Cleanup log files
  const logFilesDeleted = cleanupDirectory(LOG_DIR, /agent-actions-.*\.log/);
  
  // Cleanup report files
  const reportFilesDeleted = cleanupDirectory(REPORT_DIR, /agent-summary-.*\.txt/);
  
  console.log(`Cleanup complete: ${logFilesDeleted} log files and ${reportFilesDeleted} report files removed.`);
}

main();
EOF
    
    chmod +x "$ROOT_DIR/scripts/cleanup-agent-logs.js"
    
    # Add script to npm scripts
    if ! grep -q "agent:cleanup" "$ROOT_DIR/package.json"; then
        print_info "Adding agent:cleanup script to package.json..."
        sed -i.bak 's/"scripts": {/"scripts": {\n    "agent:cleanup": "node scripts\/cleanup-agent-logs.js",/g' "$ROOT_DIR/package.json"
        rm -f "$ROOT_DIR/package.json.bak"
    fi
    
    print_success "Created agent log cleanup script"
}

# Create Python agent tracking module
create_python_agent_tracking() {
    print_info "Creating Python agent tracking module..."
    
    # Ensure automation directory exists
    if [ ! -d "$ROOT_DIR/automation" ]; then
        mkdir -p "$ROOT_DIR/automation"
    fi
    
    cat > "$ROOT_DIR/automation/agent_tracking.py" << 'EOF'
#!/usr/bin/env python3
"""
Agent Tracking System for Python
Track and attribute actions performed by agents in Python scripts
"""

import os
import json
import logging
import datetime
import uuid
from typing import Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agent_tracking')

# Constants
AGENT_ID_ENV = 'AGENT_ID'
DEFAULT_AGENT_ID = 'UNSPECIFIED_AGENT'
LOG_DIR = os.path.expanduser('~/.aixtiv/logs')


class AgentTracking:
    """Agent Tracking System for Python applications"""
    
    def __init__(self, agent_id: Optional[str] = None):
        """Initialize agent tracking"""
        self.agent_id = agent_id or os.environ.get(AGENT_ID_ENV, DEFAULT_AGENT_ID)
        
        # Ensure log directory exists
        os.makedirs(LOG_DIR, exist_ok=True)
        
        # Log initialization
        self.log_action('agent_tracking_initialized', 'Python agent tracking initialized')
    
    def log_action(self, action_type: str, description: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Log an action performed by the agent
        
        Args:
            action_type: Type of action being performed
            description: Human-readable description of the action
            details: Additional details about the action
            
        Returns:
            Dict containing the logged action
        """
        timestamp = datetime.datetime.utcnow().isoformat() + 'Z'
        today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
        log_file = os.path.join(LOG_DIR, f'agent-actions-{today}.log')
        
        log_entry = {
            'timestamp': timestamp,
            'agent_id': self.agent_id,
            'action_type': action_type,
            'description': description
        }
        
        if details:
            log_entry['details'] = details
        
        # Write to log file
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logger.error(f'Failed to write to log file: {e}')
        
        # Log to console
        logger.info(f'AGENT_ACTION [{action_type}]: {description}')
        
        # Send to Cloud Logging if available
        self._log_to_cloud(log_entry)
        
        # Send to Firestore if available
        self._log_to_firestore(log_entry)
        
        return log_entry
    
    def _log_to_cloud(self, log_entry: Dict[str, Any]) -> bool:
        """Log entry to Cloud Logging if available"""
        try:
            from google.cloud import logging as cloud_logging
            
            # Only attempt cloud logging if enabled
            if os.environ.get('AGENT_TRACKING_CLOUD', 'false').lower() == 'true':
                client = cloud_logging.Client()
                logger = client.logger('agent-actions')
                logger.log_struct(log_entry)
                return True
        except (ImportError, Exception) as e:
            # Silently fail if Cloud Logging not available
            pass
        
        return False
    
    def _log_to_firestore(self, log_entry: Dict[str, Any]) -> bool:
        """Log entry to Firestore if available"""
        try:
            import firebase_admin
            from firebase_admin import credentials
            from firebase_admin import firestore
            
            # Only attempt Firestore logging if enabled
            if os.environ.get('AGENT_TRACKING_FIRESTORE', 'false').lower() == 'true':
                # Initialize Firebase if not already initialized
                if not firebase_admin._apps:
                    cred_path = os.path.expanduser('~/.aixtiv/firebase-agent-tracking.json')
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                
                db = firestore.client()
                db.collection('agentActions').add(log_entry)
                return True
        except (ImportError, Exception) as e:
            # Silently fail if Firestore not available
            pass
        
        return False
    
    def set_agent_id(self, agent_id: str) -> None:
        """Set the current agent ID"""
        self.agent_id = agent_id
        os.environ[AGENT_ID_ENV] = agent_id
        logger.info(f'Set agent ID to: {agent_id}')


# Create a global instance for easy import
_tracker = AgentTracking()

# Export functions at module level for ease of use
def log_agent_action(action_type: str, description: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Log an agent action (module-level function)"""
    return _tracker.log_action(action_type, description, details)

def set_agent_id(agent_id: str) -> None:
    """Set the agent ID (module-level function)"""
    _tracker.set_agent_id(agent_id)

def get_agent_id() -> str:
    """Get the current agent ID"""
    return _tracker.agent_id


if __name__ == '__main__':
    # Example usage
    log_agent_action('test_action', 'Testing agent tracking')
    print(f'Current agent ID: {get_agent_id()}')
EOF
    
    chmod +x "$ROOT_DIR/automation/agent_tracking.py"
    
    print_success "Created Python agent tracking module"
}

# Main setup function
main() {
    print_info "Setting up Agent Tracking System for Aixtiv Symphony..."
    
    # Source the agent tracking script if it exists
    if [ -f "$BIN_DIR/agent-tracking.sh" ]; then
        source "$BIN_DIR/agent-tracking.sh"
        export AGENT_TRACKING_VERBOSE="true"
        log_agent_action "setup_start" "Starting agent tracking system setup"
    fi
    
    # Setup bin directory and script
    setup_bin_directory
    
    # Now we can source the agent tracking script
    source "$BIN_DIR/agent-tracking.sh"
    export AGENT_TRACKING_VERBOSE="true"
    
    # Setup config directory
    setup_config_directory
    
    # Setup Firestore rules
    setup_firestore_rules
    
    # Setup agent monitoring
    setup_agent_monitoring
    
    # Create agent report script
    create_agent_report_script
    
    # Create cleanup script
    create_cleanup_script
    
    # Create Python agent tracking module
    create_python_agent_tracking
    
    log_agent_action "setup_complete" "Agent tracking system setup completed"
    
    print_success "Agent Tracking System setup complete!"
    print_info "To use agent tracking in your scripts, source the agent tracking script:"
    print_info "  source \"$(dirname \"\$0\")/../bin/agent-tracking.sh\""
    print_info "Then use log_agent_action to track actions:"
    print_info "  log_agent_action \"action_type\" \"action description\""
    print_info ""
    print_info "To generate reports, run:"
    print_info "  npm run agent:report"
    print_info ""
    print_info "To monitor agent activity, run:"
    print_info "  npm run agent:monitor"
}

# Run main setup
main