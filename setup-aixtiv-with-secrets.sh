#!/bin/bash
# setup-aixtiv-with-secrets.sh - Configure Aixtiv CLI with GCP secrets

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==== Aixtiv CLI Secret Configuration ====${NC}"
echo -e "${BLUE}Project: 859242575175${NC}"

# Function to safely access a secret and export it as an environment variable
fetch_secret() {
  local secret_name=$1
  local env_var_name=$2
  
  echo -e "Fetching secret: ${secret_name}..."
  
  if value=$(gcloud secrets versions access latest --secret=${secret_name} --project=859242575175 2>/dev/null); then
    # Successfully retrieved the secret
    export "${env_var_name}=${value}"
    echo -e "${GREEN}✅ Set ${env_var_name} (${#value} characters)${NC}"
  else
    # Failed to retrieve the secret
    echo -e "${RED}❌ Failed to access secret: ${secret_name}${NC}"
    return 1
  fi
}

# Check for Aixtiv CLI
if ! command -v aixtiv &> /dev/null; then
    echo -e "${YELLOW}Warning: Aixtiv CLI not found in PATH${NC}"
    echo -e "If you're using an alias, this is normal."
fi

# Set up main Anthropic API key for Dr. Claude
echo -e "\n${BLUE}Setting up Dr. Claude API access...${NC}"
fetch_secret "new-admin-anthropic" "ANTHROPIC_API_KEY"
fetch_secret "anthropic-admin" "DR_CLAUDE_API_KEY"

# Set up Aixtiv API endpoints
echo -e "\n${BLUE}Setting up API endpoints...${NC}"
export CLAUDE_API_ENDPOINT="https://us-west1-aixtiv-symphony.cloudfunctions.net"
export DR_CLAUDE_API="https://us-west1-aixtiv-symphony.cloudfunctions.net"
echo -e "${GREEN}✅ Set CLAUDE_API_ENDPOINT${NC}"
echo -e "${GREEN}✅ Set DR_CLAUDE_API${NC}"

# Set up other integrations as needed
echo -e "\n${BLUE}Setting up additional integrations...${NC}"
fetch_secret "pineconeconnect" "PINECONE_API_KEY"
fetch_secret "lucy-claude-01" "LUCY_CLAUDE_API_KEY"
fetch_secret "langchain" "LANGCHAIN_01_KEY"
fetch_secret "langchain02" "LANGCHAIN_02_KEY"

# Test Aixtiv configuration
echo -e "\n${BLUE}Testing Aixtiv CLI configuration...${NC}"
echo -e "Running auth:verify to test connectivity..."

# Try to run auth:verify silently to check connection
if aixtiv auth:verify -a "dr-claude-orchestrator" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully verified agent authentication${NC}"
else
    echo -e "${YELLOW}⚠️ Verification may have issues, but secrets are set${NC}"
fi

echo -e "\n${BLUE}==== Configuration Complete ====${NC}"
echo -e "Your Aixtiv CLI is now configured with the following environment variables:"
echo -e "- ANTHROPIC_API_KEY (${#ANTHROPIC_API_KEY} chars)"
echo -e "- DR_CLAUDE_API_KEY (${#DR_CLAUDE_API_KEY} chars)"
echo -e "- CLAUDE_API_ENDPOINT: ${CLAUDE_API_ENDPOINT}"
echo -e "- DR_CLAUDE_API: ${DR_CLAUDE_API}"
echo -e "- PINECONE_API_KEY (${#PINECONE_API_KEY} chars)"
echo -e "- LUCY_CLAUDE_API_KEY (${#LUCY_CLAUDE_API_KEY} chars)
echo -e "- LANGCHAIN_01_KEY (${#LANGCHAIN_01_KEY} chars)"
echo -e "- LANGCHAIN_02_KEY (${#LANGCHAIN_02_KEY} chars)
echo -e "\n${YELLOW}Note: These variables will only persist in the current terminal session${NC}"
echo -e "To make them permanent, add them to your ~/.zshrc or ~/.bash_profile"
echo -e "${BLUE}===============================${NC}"
