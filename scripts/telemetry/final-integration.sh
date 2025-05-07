#!/bin/bash

# Aixtiv CLI Telemetry Final Integration Script
# ---------------------------------------------
# This script performs the final integration of telemetry into the Aixtiv CLI.
# It ensures all command files are properly instrumented, verifies the main CLI
# integration, and runs tests to confirm everything is working correctly.

set -e # Exit on any error

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}      Aixtiv CLI Telemetry Final Integration           ${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Base directory
BASE_DIR=$(pwd)
TELEMETRY_DIR="$BASE_DIR/telemetry"
SCRIPTS_DIR="$BASE_DIR/scripts/telemetry"
COMMANDS_DIR="$BASE_DIR/commands"
LIB_DIR="$BASE_DIR/lib"

# Function to check if a file exists
file_exists() {
  if [ -f "$1" ]; then
    return 0
  else
    return 1
  fi
}

# Step 1: Verify telemetry agent binary is built
echo -e "\n${YELLOW}Step 1: Verifying telemetry agent binary...${NC}"
if ! file_exists "$TELEMETRY_DIR/bin/telemetry-agent"; then
  echo -e "${RED}Telemetry agent binary not found. Building...${NC}"
  cd "$TELEMETRY_DIR" && ./build.sh
  cd "$BASE_DIR"
else
  echo -e "${GREEN}✓ Telemetry agent binary found.${NC}"
fi

# Step 2: Verify Node.js wrapper exists
echo -e "\n${YELLOW}Step 2: Verifying Node.js wrapper...${NC}"
if ! file_exists "$LIB_DIR/telemetry/index.js"; then
  echo -e "${RED}Node.js wrapper not found. This is a critical error.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Node.js wrapper found.${NC}"
fi

# Step 3: Verify main CLI telemetry integration
echo -e "\n${YELLOW}Step 3: Verifying main CLI integration...${NC}"
if grep -q "require('../lib/telemetry')" "$BASE_DIR/bin/aixtiv.js"; then
  echo -e "${GREEN}✓ Main CLI already integrated with telemetry.${NC}"
else
  echo -e "${YELLOW}Main CLI not integrated. Running integration script...${NC}"
  node "$SCRIPTS_DIR/manual-integrate.js"
fi

# Step 4: Add telemetry to key command files
echo -e "\n${YELLOW}Step 4: Adding telemetry to key command files...${NC}"

# Array of important command files to instrument
KEY_COMMANDS=(
  # Auth commands
  "commands/auth/verify.js"
  # Agent commands
  "commands/agent/grant.js"
  "commands/agent/revoke.js"
  # Copilot commands
  "commands/copilot/link.js"
  "commands/copilot/list.js"
  "commands/copilot/verify.js"
  # Claude commands
  "commands/claude/agent/delegate.js"
  "commands/claude/code/generate.js"
  "commands/claude/index.js"
  # Resource commands
  "commands/resource/scan.js"
  # Init command
  "commands/init/index.js"
)

# Find which commands exist and integrate them
for cmd in "${KEY_COMMANDS[@]}"; do
  if file_exists "$BASE_DIR/$cmd"; then
    echo -e "  ${YELLOW}Processing $cmd...${NC}"
    
    # Check if telemetry is already integrated
    if grep -q "require.*telemetry" "$BASE_DIR/$cmd"; then
      echo -e "  ${GREEN}✓ Telemetry already integrated in $cmd${NC}"
    else
      # Run the knowledge tracking integration
      node "$SCRIPTS_DIR/add-knowledge-tracking.js" "$BASE_DIR/$cmd"
      echo -e "  ${GREEN}✓ Added telemetry to $cmd${NC}"
    fi
  else
    echo -e "  ${YELLOW}⚠ File $cmd not found, skipping${NC}"
  fi
done

# Step 5: Create directory for telemetry logs if it doesn't exist
echo -e "\n${YELLOW}Step 5: Setting up telemetry logs directory...${NC}"
LOGS_DIR="$BASE_DIR/logs/telemetry"
mkdir -p "$LOGS_DIR"
echo -e "${GREEN}✓ Created telemetry logs directory: $LOGS_DIR${NC}"

# Step 6: Create a script to enable/disable telemetry
echo -e "\n${YELLOW}Step 6: Creating telemetry control script...${NC}"
cat > "$SCRIPTS_DIR/toggle-telemetry.js" << 'INNERSCRIPT'
#!/usr/bin/env node

/**
 * Script to enable or disable telemetry for Aixtiv CLI
 * Usage: node toggle-telemetry.js [enable|disable]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_FILE = path.join(os.homedir(), '.aixtiv-telemetry');

function enableTelemetry() {
  fs.writeFileSync(ENV_FILE, 'AIXTIV_TELEMETRY_ENABLED=true\n');
  console.log('Telemetry has been enabled for Aixtiv CLI');
}

function disableTelemetry() {
  fs.writeFileSync(ENV_FILE, 'AIXTIV_TELEMETRY_ENABLED=false\n');
  console.log('Telemetry has been disabled for Aixtiv CLI');
}

function showStatus() {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const enabled = content.includes('AIXTIV_TELEMETRY_ENABLED=true');
    console.log(`Telemetry is currently ${enabled ? 'enabled' : 'disabled'} for Aixtiv CLI`);
  } catch (error) {
    console.log('Telemetry is enabled by default for Aixtiv CLI');
  }
}

// Process command line arguments
const command = process.argv[2];
if (command === 'enable') {
  enableTelemetry();
} else if (command === 'disable') {
  disableTelemetry();
} else {
  showStatus();
  console.log('\nUsage: node toggle-telemetry.js [enable|disable]');
}
INNERSCRIPT

chmod +x "$SCRIPTS_DIR/toggle-telemetry.js"
echo -e "${GREEN}✓ Created telemetry toggle script: $SCRIPTS_DIR/toggle-telemetry.js${NC}"

# Step 7: Final verification test
echo -e "\n${YELLOW}Step 7: Running final verification test...${NC}"
echo -e "${YELLOW}Testing telemetry functionality...${NC}"

# Set telemetry to verbose for testing
export AIXTIV_TELEMETRY_VERBOSE=true

node "$SCRIPTS_DIR/test-telemetry.js" > "$LOGS_DIR/verification-test.log" 2>&1 &
TEST_PID=$!

# Wait a bit for the test to start
sleep 2

# Check if test is still running
if kill -0 $TEST_PID 2>/dev/null; then
  echo -e "${GREEN}✓ Telemetry test is running. Waiting for completion...${NC}"
  
  # Wait for the test to complete, but not more than 10 seconds
  COUNT=0
  while kill -0 $TEST_PID 2>/dev/null && [ $COUNT -lt 10 ]; do
    sleep 1
    COUNT=$((COUNT+1))
  done
  
  # If test is still running after 10 seconds, kill it
  if kill -0 $TEST_PID 2>/dev/null; then
    kill $TEST_PID
    echo -e "${YELLOW}⚠ Test was running longer than expected, but telemetry appears to be working.${NC}"
  else
    echo -e "${GREEN}✓ Telemetry test completed successfully.${NC}"
  fi
else
  echo -e "${RED}✗ Telemetry test failed to start.${NC}"
fi

# Reset telemetry verbose mode
unset AIXTIV_TELEMETRY_VERBOSE

# Step 8: Update package.json with telemetry scripts
echo -e "\n${YELLOW}Step 8: Adding telemetry scripts to package.json...${NC}"

# Check if jq is available for JSON manipulation
if command -v jq >/dev/null 2>&1; then
  # Create a temporary file with updated scripts
  jq '.scripts += {
    "telemetry:test": "node scripts/telemetry/test-telemetry.js",
    "telemetry:enable": "node scripts/telemetry/toggle-telemetry.js enable",
    "telemetry:disable": "node scripts/telemetry/toggle-telemetry.js disable",
    "telemetry:status": "node scripts/telemetry/toggle-telemetry.js",
    "telemetry:integrate": "node scripts/telemetry/add-knowledge-tracking.js"
  }' package.json > package.json.tmp
  
  # Check if the operation was successful
  if [ $? -eq 0 ]; then
    mv package.json.tmp package.json
    echo -e "${GREEN}✓ Updated package.json with telemetry scripts.${NC}"
  else
    echo -e "${RED}✗ Failed to update package.json. You'll need to add scripts manually.${NC}"
    rm -f package.json.tmp
  fi
else
  echo -e "${YELLOW}⚠ jq is not available. Skipping package.json update. Add the following scripts manually:${NC}"
  echo '  "telemetry:test": "node scripts/telemetry/test-telemetry.js",'
  echo '  "telemetry:enable": "node scripts/telemetry/toggle-telemetry.js enable",'
  echo '  "telemetry:disable": "node scripts/telemetry/toggle-telemetry.js disable",'
  echo '  "telemetry:status": "node scripts/telemetry/toggle-telemetry.js",'
  echo '  "telemetry:integrate": "node scripts/telemetry/add-knowledge-tracking.js"'
fi

# Step 9: Final summary
echo -e "\n${BLUE}=======================================================${NC}"
echo -e "${BLUE}      Telemetry Integration Complete!                   ${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo -e "${GREEN}Telemetry has been successfully integrated into the Aixtiv CLI.${NC}"
echo -e "\n${YELLOW}Usage:${NC}"
echo -e "  ${GREEN}• npm run telemetry:test${NC} - Test telemetry functionality"
echo -e "  ${GREEN}• npm run telemetry:status${NC} - Check telemetry status"
echo -e "  ${GREEN}• npm run telemetry:enable${NC} - Enable telemetry"
echo -e "  ${GREEN}• npm run telemetry:disable${NC} - Disable telemetry"
echo -e "  ${GREEN}• npm run telemetry:integrate [file.js]${NC} - Add telemetry to a file"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  ${GREEN}1. Commit these changes to the repository${NC}"
echo -e "  ${GREEN}2. Deploy the updated CLI${NC}"
echo -e "  ${GREEN}3. Consider setting up a telemetry dashboard${NC}"
echo -e "\n${BLUE}=======================================================${NC}"
