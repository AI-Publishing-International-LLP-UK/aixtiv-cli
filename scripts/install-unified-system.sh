#!/bin/bash

# Unified Agent System Installation Script
# This script helps install and set up the new unified agent system

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print banner
echo -e "${CYAN}"
echo "  █████╗ ██╗██╗  ██╗████████╗██╗██╗   ██╗     ██████╗██╗     ██╗"
echo " ██╔══██╗██║╚██╗██╔╝╚══██╔══╝██║██║   ██║    ██╔════╝██║     ██║"
echo " ███████║██║ ╚███╔╝    ██║   ██║██║   ██║    ██║     ██║     ██║"
echo " ██╔══██║██║ ██╔██╗    ██║   ██║╚██╗ ██╔╝    ██║     ██║     ██║"
echo " ██║  ██║██║██╔╝ ██╗   ██║   ██║ ╚████╔╝     ╚██████╗███████╗██║"
echo " ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝       ╚═════╝╚══════╝╚═╝"
echo -e "${NC}"
echo -e "${GREEN}Unified Agent System Installation${NC}"
echo -e "${BLUE}============================================${NC}"
echo

# Check for required commands
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is required but not installed.${NC}" >&2; exit 1; }

# Set up variables
CLI_DIR=$(pwd)
BACKUP_DIR="${CLI_DIR}/backup_$(date +%Y%m%d%H%M%S)"

# Create backup directory
echo -e "${YELLOW}Creating backup of current CLI files...${NC}"
mkdir -p "${BACKUP_DIR}"

# Backup key files
cp -r "${CLI_DIR}/bin" "${BACKUP_DIR}/"
cp -r "${CLI_DIR}/commands" "${BACKUP_DIR}/"
cp -r "${CLI_DIR}/lib" "${BACKUP_DIR}/"
cp "${CLI_DIR}/package.json" "${BACKUP_DIR}/"
echo -e "${GREEN}Backup created at ${BACKUP_DIR}${NC}"

# Create unified command directories
echo -e "${YELLOW}Creating unified command structure...${NC}"
mkdir -p "${CLI_DIR}/commands/unified"

# Copy new files
echo -e "${YELLOW}Installing new unified agent system files...${NC}"

# Create the agent.js file
echo -e "${BLUE}Creating agent.js...${NC}"
cp "${CLI_DIR}/commands/unified/agent.js" "${CLI_DIR}/commands/unified/agent.js.bak" 2>/dev/null || true

# Create the resource.js file
echo -e "${BLUE}Creating resource.js...${NC}"
cp "${CLI_DIR}/commands/unified/resource.js" "${CLI_DIR}/commands/unified/resource.js.bak" 2>/dev/null || true

# Create the unified-resource.js file
echo -e "${BLUE}Creating unified-resource.js...${NC}"
cp "${CLI_DIR}/lib/unified-resource.js" "${CLI_DIR}/lib/unified-resource.js.bak" 2>/dev/null || true

# Create documentation
echo -e "${BLUE}Creating documentation...${NC}"
mkdir -p "${CLI_DIR}/docs"
cp "${CLI_DIR}/docs/unified-agent-system.md" "${CLI_DIR}/docs/unified-agent-system.md.bak" 2>/dev/null || true

# Create new CLI entry point
echo -e "${BLUE}Creating updated CLI entry point...${NC}"
cp "${CLI_DIR}/bin/aixtiv.js" "${CLI_DIR}/bin/aixtiv-legacy.js" 2>/dev/null || true
cp "${CLI_DIR}/bin/aixtiv-updated.js" "${CLI_DIR}/bin/aixtiv-updated.js.bak" 2>/dev/null || true

echo -e "${GREEN}Files installed successfully${NC}"

# Update dependencies if needed
echo -e "${YELLOW}Checking for required dependencies...${NC}"
DEPS_TO_INSTALL=""
npm list commander >/dev/null 2>&1 || DEPS_TO_INSTALL="$DEPS_TO_INSTALL commander"
npm list chalk >/dev/null 2>&1 || DEPS_TO_INSTALL="$DEPS_TO_INSTALL chalk"
npm list table >/dev/null 2>&1 || DEPS_TO_INSTALL="$DEPS_TO_INSTALL table"
npm list figlet >/dev/null 2>&1 || DEPS_TO_INSTALL="$DEPS_TO_INSTALL figlet"

if [ ! -z "$DEPS_TO_INSTALL" ]; then
  echo -e "${YELLOW}Installing missing dependencies: $DEPS_TO_INSTALL${NC}"
  npm install $DEPS_TO_INSTALL --save
else
  echo -e "${GREEN}All required dependencies are already installed${NC}"
fi

# Set up the new CLI
echo -e "${YELLOW}Setting up the new unified CLI...${NC}"
chmod +x "${CLI_DIR}/bin/aixtiv-updated.js"

# Check if we should update the main CLI file
read -p "$(echo -e ${YELLOW}"Would you like to replace the main CLI with the unified version? (yes/no) "${NC})" REPLACE_CLI

if [ "$REPLACE_CLI" = "yes" ]; then
  echo -e "${BLUE}Backing up current CLI...${NC}"
  cp "${CLI_DIR}/bin/aixtiv.js" "${CLI_DIR}/bin/aixtiv-pre-unified.js"
  
  echo -e "${BLUE}Replacing main CLI with unified version...${NC}"
  cp "${CLI_DIR}/bin/aixtiv-updated.js" "${CLI_DIR}/bin/aixtiv.js"
  chmod +x "${CLI_DIR}/bin/aixtiv.js"
  
  echo -e "${GREEN}Main CLI updated to unified version${NC}"
else
  echo -e "${BLUE}Keeping current CLI. You can use the unified version with:${NC}"
  echo -e "${CYAN}node ${CLI_DIR}/bin/aixtiv-updated.js [commands]${NC}"
fi

# Test the installation
echo -e "${YELLOW}Testing installation...${NC}"

if [ "$REPLACE_CLI" = "yes" ]; then
  TEST_CMD="${CLI_DIR}/bin/aixtiv.js"
else
  TEST_CMD="${CLI_DIR}/bin/aixtiv-updated.js"
fi

if node "$TEST_CMD" --version >/dev/null 2>&1; then
  echo -e "${GREEN}Installation test successful!${NC}"
else
  echo -e "${RED}Installation test failed. Please check for errors.${NC}"
fi

# Migration instructions
echo
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Unified Agent System Installation Complete${NC}"
echo -e "${BLUE}============================================${NC}"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${CYAN}1. To migrate existing agents to the unified system:${NC}"
echo -e "   ${GREEN}aixtiv agent:migrate${NC}"
echo
echo -e "${CYAN}2. To register a new agent:${NC}"
echo -e "   ${GREEN}aixtiv agent:register --name \"Agent Name\" --squadron S01 --number 1 --type BASE${NC}"
echo
echo -e "${CYAN}3. To view documentation:${NC}"
echo -e "   ${GREEN}less ${CLI_DIR}/docs/unified-agent-system.md${NC}"
echo
echo -e "${CYAN}4. For more examples and information, visit:${NC}"
echo -e "   ${GREEN}https://aixtiv.com/symphony/docs/unified-agent-system${NC}"
echo

echo -e "${GREEN}Thank you for updating to the Unified Agent System!${NC}"

