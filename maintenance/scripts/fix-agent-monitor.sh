#!/bin/bash
# Fix script for agent-monitor.sh to ensure macOS compatibility
# This script backs up the original file and applies the fix for date command

# Ensure we're in the right directory
cd "$(dirname "$0")"

SCRIPT_PATH="monitoring/agent-monitor.sh"

# Check if the script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "ERROR: $SCRIPT_PATH not found. Are you in the aixtiv-cli directory?"
  exit 1
fi

# Create a backup
BACKUP_PATH="${SCRIPT_PATH}.bak.$(date +%Y%m%d%H%M%S)"
echo "Creating backup of original script at $BACKUP_PATH"
cp "$SCRIPT_PATH" "$BACKUP_PATH"

# Apply the fix
echo "Applying cross-platform date command fix..."
sed -i.tmp '
/days_old=\$((.*\$(date -u -d/c\
            # Cross-platform date-to-epoch handling\
            if [[ "$(uname)" == "Darwin" ]]; then\
                # macOS: use date -j -f\
                date_epoch=$(date -j -f "%Y-%m-%d" "$date" +%s 2>/dev/null)\
            else\
                # Linux: use date -d\
                date_epoch=$(date -u -d "$date" +%s 2>/dev/null)\
            fi\
            now_epoch=$(date -u +%s)\
            days_old=$(( (now_epoch - date_epoch) / 86400 ))
' "$SCRIPT_PATH"

# Remove temporary file created by sed on macOS
rm -f "${SCRIPT_PATH}.tmp"

# Ensure script is executable
chmod +x "$SCRIPT_PATH"

echo "Fix successfully applied!"
echo "You can now run 'npm run agent:monitor' to test the fix."

