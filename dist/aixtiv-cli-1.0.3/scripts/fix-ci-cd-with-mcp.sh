#!/bin/bash
# fix-ci-cd-with-mcp.sh
# Script to fix CI/CD workflow failures using the MCP authentication pattern

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
MCP_PROJECT_ID="dr-claude-live"
SERVICE_ACCOUNT="monitoring@${PROJECT_ID}.iam.gserviceaccount.com"
MCP_AUTH_PATTERN=$(grep -A 5 "Authenticate to Google Cloud" .github/workflows/deploy-mcp-drclaude.yml | grep -v "name:")

# Repositories to update
REPOSITORIES=(
  "AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY"
  "C2100-PR/aixtiv-symphony-opus1"
  "C2100-PR/code-gold-standards"
  "C2100-PR/content-management-system"
  # Removed non-existent repository
  # "C2100-PR/c2100-PR"
  # Added correct repository paths
  "C2100-PR/aixtiv-cli"
  "C2100-PR/aixtiv-cli-distribution"
)

# Function to check prerequisites
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  
  # Check GitHub CLI
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI not found. Please install it first.${NC}"
    exit 1
  fi

  if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}All prerequisites met.${NC}"
}

# Function to extract MCP auth pattern
extract_mcp_pattern() {
  echo -e "${YELLOW}Extracting Model Context Protocol authentication pattern...${NC}"
  
  if [ -z "$MCP_AUTH_PATTERN" ]; then
    echo -e "${RED}Failed to extract MCP authentication pattern from deploy-mcp-drclaude.yml.${NC}"
    echo -e "${YELLOW}Using default Google Cloud authentication pattern instead.${NC}"
    MCP_AUTH_PATTERN="      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: \${{ secrets.GCP_SA_KEY }}"
  else
    echo -e "${GREEN}Successfully extracted MCP authentication pattern.${NC}"
  fi
}

# Function to fix workflow files
fix_workflow_files() {
  echo -e "${YELLOW}Applying MCP authentication pattern to workflows...${NC}"
  
  for repo in "${REPOSITORIES[@]}"; do
    echo "Processing $repo..."
    
    # Create temporary directory for repo
    REPO_DIR="temp_${repo//\//_}"
    mkdir -p "$REPO_DIR"
    
    # Clone the repository (with timeout)
    timeout 30 gh repo clone "$repo" "$REPO_DIR" || {
      echo -e "${RED}Failed to clone $repo. Skipping.${NC}"
      continue
    }
    
    # Find workflow files that need fixing
    WORKFLOW_FILES=$(find "$REPO_DIR/.github/workflows" -name "*.yml" -o -name "*.yaml" 2>/dev/null)
    
    if [ -z "$WORKFLOW_FILES" ]; then
      echo "No workflow files found in $repo. Skipping."
      rm -rf "$REPO_DIR"
      continue
    fi
    
    # Process each workflow file
    for file in $WORKFLOW_FILES; do
      echo "Checking $file..."
      
      # Check if file contains Google Cloud authentication that needs fixing
      if grep -q "google-github-actions/auth" "$file" && ! grep -q "workload_identity_provider" "$file"; then
        echo "Fixing authentication in $file..."
        
        # Create a backup
        cp "$file" "${file}.bak"
        
        # Replace the authentication block
        sed -i.tmp '/Authenticate to Google Cloud/,/credentials_json\|workload_identity_provider/ c\
      - name: Authenticate to Google Cloud\
        uses: google-github-actions/auth@v1\
        with:\
          credentials_json: ${{ secrets.GCP_SA_KEY }}' "$file"
        
        rm -f "${file}.tmp"
        
        echo -e "${GREEN}Fixed authentication in $file.${NC}"
      else
        echo "No authentication fix needed for $file."
      fi
    done
    
    # Commit and push changes
    cd "$REPO_DIR"
    if git diff --quiet; then
      echo "No changes to commit for $repo."
      cd ..
      rm -rf "$REPO_DIR"
      continue
    fi
    
    git config user.name "Dr. Lucy Automation"
    git config user.email "service@coaching2100.com"
    git add .
    git commit -m "fix: Update Google Cloud authentication pattern to match MCP standard"
    
    git push && {
      echo -e "${GREEN}Successfully pushed changes to $repo.${NC}"
    } || {
      echo -e "${RED}Failed to push changes to $repo. Please check permissions.${NC}"
    }
    
    cd ..
    rm -rf "$REPO_DIR"
  done
}

# Function to update MCP secrets
update_mcp_secrets() {
  echo -e "${YELLOW}Updating GCP_SA_KEY secret in repositories...${NC}"
  
  # Check if we have a GCP service account key
  if [ ! -f "key.json" ]; then
    echo -e "${YELLOW}GCP service account key not found locally.${NC}"
    read -p "Create a new service account key? (y/N) " create_key
    
    if [[ $create_key =~ ^[Yy]$ ]]; then
      echo "Creating new service account key..."
      gcloud iam service-accounts keys create key.json --iam-account=$SERVICE_ACCOUNT || {
        echo -e "${RED}Failed to create service account key. Make sure you're authenticated with gcloud.${NC}"
        return 1
      }
    else
      echo -e "${YELLOW}Please provide the path to an existing service account key:${NC}"
      read -p "Path to key.json: " key_path
      
      if [ ! -f "$key_path" ]; then
        echo -e "${RED}File not found: $key_path${NC}"
        return 1
      fi
      
      cp "$key_path" key.json
    fi
  fi
  
  # Update the secret in each repository
  for repo in "${REPOSITORIES[@]}"; do
    echo "Updating GCP_SA_KEY in $repo..."
    
    gh secret set GCP_SA_KEY --repo="$repo" --body="$(cat key.json)" && {
      echo -e "${GREEN}Successfully updated GCP_SA_KEY in $repo.${NC}"
    } || {
      echo -e "${RED}Failed to update GCP_SA_KEY in $repo. Please check permissions.${NC}"
    }
  done
  
  # Clean up the key file
  read -p "Delete the key.json file? [y/N] " delete_key
  if [[ $delete_key =~ ^[Yy]$ ]]; then
    rm -f key.json
    echo "key.json deleted."
  else
    echo "Remember to delete key.json manually when you're done with it."
  fi
}

# Function to verify the fix
verify_fix() {
  echo -e "${YELLOW}Verifying the fix...${NC}"
  
  # Ask user which repository to test
  echo "Which repository would you like to test the fix on?"
  select repo in "${REPOSITORIES[@]}"; do
    if [ -n "$repo" ]; then
      echo "Triggering workflow run on $repo..."
      
      # List workflows
      WORKFLOWS=$(gh workflow list --repo="$repo" --json name,id -q '.[].name')
      
      if [ -z "$WORKFLOWS" ]; then
        echo -e "${RED}No workflows found in $repo.${NC}"
        break
      fi
      
      # Let user select a workflow
      echo "Select a workflow to run:"
      select workflow in $WORKFLOWS; do
        if [ -n "$workflow" ]; then
          gh workflow run "$workflow" --repo="$repo"
          echo -e "${GREEN}Workflow run triggered. Check GitHub for results.${NC}"
          break
        else
          echo "Invalid selection, please try again."
        fi
      done
      break
    else
      echo "Invalid selection, please try again."
    fi
  done
}

# Main execution
echo -e "${YELLOW}=== CI/CD Fix with MCP Authentication Pattern ===${NC}"
echo "This script will fix CI/CD workflows across repositories using the Model Context Protocol (MCP) authentication pattern."

check_prerequisites
extract_mcp_pattern

# Update workflow files
read -p "Fix workflow files with MCP authentication pattern? [y/N] " fix_workflows
if [[ $fix_workflows =~ ^[Yy]$ ]]; then
  fix_workflow_files
fi

# Update MCP secrets
read -p "Update GCP_SA_KEY secret in repositories? [y/N] " update_secrets
if [[ $update_secrets =~ ^[Yy]$ ]]; then
  update_mcp_secrets
fi

# Verify fix
read -p "Verify the fix by triggering a workflow run? [y/N] " verify
if [[ $verify =~ ^[Yy]$ ]]; then
  verify_fix
fi

echo -e "${GREEN}Script execution completed.${NC}"
echo "The CI/CD workflows should now be using the MCP authentication pattern."