#!/bin/bash
# Fix script for agent-monitor.sh to correct the report path issue
# This script replaces ROOT_DIR with REPORT_DIR in the file

# Ensure we're in the right directory
cd "$(dirname "$0")"

SCRIPT_PATH="monitoring/agent-monitor.sh"

# Check if the script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "ERROR: $SCRIPT_PATH not found. Are you in the aixtiv-cli directory?"
  exit 1
fi

# Create a backup
BACKUP_PATH="${SCRIPT_PATH}.path.bak.$(date +%Y%m%d%H%M%S)"
echo "Creating backup of current script at $BACKUP_PATH"
cp "$SCRIPT_PATH" "$BACKUP_PATH"

# Apply the fix
echo "Fixing report path issue..."
sed -i.tmp 's/\$ROOT_DIR\/reports\/agent-activity-\$TODAY\.json/\$REPORT_DIR\/agent-activity-\$TODAY\.json/g' "$SCRIPT_PATH"

# Remove temporary file created by sed on macOS
rm -f "${SCRIPT_PATH}.tmp"

# Ensure script is executable
chmod +x "$SCRIPT_PATH"

echo "Fix successfully applied!"
echo "The undefined ROOT_DIR variable has been replaced with REPORT_DIR."
echo "You can now run 'npm run agent:monitor' again to test the fix."

