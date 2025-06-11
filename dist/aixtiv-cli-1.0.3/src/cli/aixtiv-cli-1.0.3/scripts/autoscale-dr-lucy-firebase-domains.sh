#!/bin/bash

##############################################################################
# Dr. Claude Orchestrator
# Firebase Domain Autoscaling Engine for Aixtiv Symphony
# Honoring the orchestral design work of Dr. Claude
#
# This script integrates Firebase domain verification with Dr. Lucy's
# autoscaling system. It's designed to be called during autoscaling events
# to ensure all domains are properly verified and connected to Firebase.
#
# Usage:
#   ./autoscale-dr-lucy-firebase-domains.sh [--force] [--dry-run] [--verbose]
#
# Options:
#   --force     Force verification of all domains
#   --dry-run   Perform a dry run without making changes
#   --verbose   Enable verbose logging
#   --help      Display help message
#
# © 2025 AI Publishing International LLP
#
# @system_codename Dr. Claude Orchestrator
# @domain Firebase Hosting + DNS Auto-Binding
# @agent_owner Dr. Lucy (execution) + Dr. Claude (architecture)
# @license Aixtiv Symphony IP under AIPI
# @metadata_tag orchestrated_by: Dr. Claude Orchestrator
##############################################################################

# Set script to exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="${SCRIPT_DIR}/autoscale-verify-firebase-domains.js"
CLI_BIN="${SCRIPT_DIR}/../src/cli/aixtiv.js"
LOG_DIR="${HOME}/.aixtiv-cli/logs/autoscale"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/autoscale_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create log directory if it doesn't exist
mkdir -p "${LOG_DIR}"

# Display help message
function show_help() {
  echo -e "${BLUE}Dr. Lucy Firebase Domain Autoscaling Integration Script${NC}"
  echo
  echo "This script integrates Firebase domain verification with Dr. Lucy's"
  echo "autoscaling system. It ensures all domains are properly verified."
  echo
  echo -e "${CYAN}Usage:${NC}"
  echo "  ./autoscale-dr-lucy-firebase-domains.sh [options]"
  echo
  echo -e "${CYAN}Options:${NC}"
  echo "  --force     Force verification of all domains"
  echo "  --dry-run   Perform a dry run without making changes"
  echo "  --verbose   Enable verbose logging"
  echo "  --help      Display this help message"
  echo
  echo -e "${CYAN}Examples:${NC}"
  echo "  ./autoscale-dr-lucy-firebase-domains.sh"
  echo "  ./autoscale-dr-lucy-firebase-domains.sh --force --verbose"
  echo
}

# Check for help flag
if [[ "$*" == *"--help"* ]]; then
  show_help
  exit 0
fi

# Banner
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE} Dr. Lucy Firebase Domain Autoscaling Integration Script ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "${CYAN}Date: $(date)${NC}"
echo -e "${CYAN}Log: ${LOG_FILE}${NC}"
echo

# Parse command line arguments
ARGS=""
if [[ "$*" == *"--force"* ]]; then
  ARGS="${ARGS} --force"
  echo -e "${YELLOW}Force mode enabled${NC}"
fi

if [[ "$*" == *"--dry-run"* ]]; then
  ARGS="${ARGS} --dry-run"
  echo -e "${YELLOW}Dry run mode enabled${NC}"
fi

if [[ "$*" == *"--verbose"* ]]; then
  ARGS="${ARGS} --verbose"
  echo -e "${YELLOW}Verbose logging enabled${NC}"
fi

echo -e "${BLUE}Starting domain verification...${NC}"
echo

# Check for existence of CLI and script
if [ ! -f "${CLI_BIN}" ]; then
  echo -e "${RED}Error: Aixtiv CLI not found at ${CLI_BIN}${NC}"
  echo -e "${YELLOW}Falling back to direct Node script execution${NC}"
  
  if [ ! -f "${NODE_SCRIPT}" ]; then
    echo -e "${RED}Error: Node script not found at ${NODE_SCRIPT}${NC}"
    echo -e "${RED}Aborting verification process${NC}"
    exit 1
  fi
  
  # Run the Node.js script directly
  echo -e "${CYAN}Executing: node ${NODE_SCRIPT}${ARGS}${NC}"
  node "${NODE_SCRIPT}"${ARGS} | tee -a "${LOG_FILE}"
else
  # Run through the Aixtiv CLI
  echo -e "${CYAN}Executing: ${CLI_BIN} domain:autoscale-verify${ARGS}${NC}"
  "${CLI_BIN}" domain:autoscale-verify${ARGS} | tee -a "${LOG_FILE}"
fi

# Check exit status
if [ $? -eq 0 ]; then
  echo
  echo -e "${GREEN}Domain verification completed successfully${NC}"
  echo -e "${BLUE}Log saved to: ${LOG_FILE}${NC}"
  exit 0
else
  echo
  echo -e "${RED}Domain verification failed${NC}"
  echo -e "${BLUE}Check log for details: ${LOG_FILE}${NC}"
  exit 1
fi