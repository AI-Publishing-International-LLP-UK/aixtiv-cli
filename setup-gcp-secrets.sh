#!/bin/bash
# setup-gcp-secrets.sh - Script to safely retrieve Google Cloud Secrets

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up GCP Secret Manager access...${NC}"
echo -e "${BLUE}Project: 859242575175${NC}"

# Function to safely access a secret and export it as an environment variable
fetch_secret() {
  local secret_name=$1
  local env_var_name=$2
  
  echo -e "Fetching secret: ${secret_name}..."
  
  if value=$(gcloud secrets versions access latest --secret=${secret_name} --project=859242575175 2>/dev/null); then
    # Successfully retrieved the secret
    export "${env_var_name}=${value}"
    echo -e "${GREEN}✅ Successfully accessed ${secret_name} and stored as ${env_var_name}${NC}"
    echo -e "   ${env_var_name} is ${#value} characters long"
  else
    # Failed to retrieve the secret
    echo -e "${RED}❌ Failed to access secret: ${secret_name}${NC}"
    return 1
  fi
}

# Clear any existing values
unset ANTHROPIC_ADMIN_KEY LUCY_CLAUDE_KEY PINECONE_KEY NEW_ANTHROPIC_KEY OAUTH_CREDENTIALS

# Fetch each secret and export as environment variables
fetch_secret "anthropic-admin" "ANTHROPIC_ADMIN_KEY"
fetch_secret "lucy-claude-01" "LUCY_CLAUDE_KEY"
fetch_secret "pineconeconnect" "PINECONE_KEY"
fetch_secret "new-admin-anthropic" "NEW_ANTHROPIC_KEY"
fetch_secret "oauth-credentials" "OAUTH_CREDENTIALS"
fetch_secret "langchain02" "LANGCHAIN_02_KEY"

echo -e "\n${BLUE}==== Summary ====${NC}"
echo -e "To use these secrets in other scripts or applications:"
echo "- They are now available as environment variables in this terminal session"
echo "- Access them using \$ANTHROPIC_ADMIN_KEY, \$LUCY_CLAUDE_KEY, etc."
echo -e "${BLUE}=================${NC}"
