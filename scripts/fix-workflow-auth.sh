#!/bin/bash
# fix-workflow-auth.sh
# Script to fix authentication issues in GitHub workflows across repositories
# This script implements both service account key rotation and OIDC setup

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
SERVICE_ACCOUNT="monitoring@${PROJECT_ID}.iam.gserviceaccount.com"
WORKLOAD_POOL="github-pool"
WORKLOAD_PROVIDER="github-provider"
TEMP_KEY_FILE="temp_service_key.json"

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
  
  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}gcloud CLI not found. Please install it first.${NC}"
    exit 1
  fi
  
  # Check GitHub CLI
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI not found. Please install it first.${NC}"
    exit 1
  }
  
  # Check authentication
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${RED}Not authenticated with gcloud. Please run 'gcloud auth login' first.${NC}"
    exit 1
  fi
  
  if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}All prerequisites met.${NC}"
}

# Function to update service account keys (Solution 1)
update_service_account_keys() {
  echo -e "${YELLOW}Implementing Solution 1: Updating service account keys...${NC}"
  
  # Create new service account key
  echo "Creating new service account key..."
  gcloud iam service-accounts keys create ${TEMP_KEY_FILE} --iam-account=${SERVICE_ACCOUNT}
  
  # Add key as GitHub Secret to each repository
  for repo in "${REPOSITORIES[@]}"; do
    echo "Adding secret to $repo..."
    gh secret set GOOGLE_APPLICATION_CREDENTIALS --body="$(cat ${TEMP_KEY_FILE})" --repo=${repo}
  done
  
  # Delete the temporary key file
  rm ${TEMP_KEY_FILE}
  
  echo -e "${GREEN}Service account keys updated successfully.${NC}"
}

# Function to set up Workload Identity Federation (Solution 2)
setup_workload_identity() {
  echo -e "${YELLOW}Implementing Solution 2: Setting up Workload Identity Federation...${NC}"
  
  # Create Workload Identity Pool
  echo "Creating Workload Identity Pool..."
  gcloud iam workload-identity-pools create "${WORKLOAD_POOL}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool" \
    --quiet || echo "Workload identity pool already exists, continuing..."
  
  # Create Workload Identity Provider
  echo "Creating Workload Identity Provider..."
  gcloud iam workload-identity-pools providers create-oidc "${WORKLOAD_PROVIDER}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${WORKLOAD_POOL}" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --quiet || echo "Workload identity provider already exists, continuing..."
  
  # Allow the provider to impersonate the service account for each repository
  for repo in "${REPOSITORIES[@]}"; do
    echo "Setting up IAM binding for $repo..."
    gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
      --project="${PROJECT_ID}" \
      --role="roles/iam.workloadIdentityUser" \
      --member="principalSet://iam.googleapis.com/projects/${PROJECT_ID}/locations/global/workloadIdentityPools/${WORKLOAD_POOL}/attribute.repository/${repo}"
  done
  
  echo -e "${GREEN}Workload Identity Federation set up successfully.${NC}"
}

# Function to verify the fix
verify_fix() {
  echo -e "${YELLOW}Verifying the fix...${NC}"
  
  # Ask user which repository to test
  echo "Which repository would you like to test the fix on?"
  select repo in "${REPOSITORIES[@]}"; do
    if [ -n "$repo" ]; then
      echo "Triggering workflow run on $repo..."
      gh workflow run monitoring.yml --repo=${repo}
      break
    else
      echo "Invalid selection, please try again."
    fi
  done
  
  echo -e "${GREEN}Verification initiated. Please check the workflow run status in GitHub.${NC}"
}

# Main execution
echo -e "${YELLOW}=== CI/CD Workflow Authentication Fix Script ===${NC}"
echo "This script will implement both solutions for fixing CI/CD workflow authentication issues."

check_prerequisites

# Implement Solution 1
read -p "Implement Solution 1 (Update Service Account Keys)? [y/N] " implement_solution1
if [[ $implement_solution1 =~ ^[Yy]$ ]]; then
  update_service_account_keys
fi

# Implement Solution 2
read -p "Implement Solution 2 (Set up Workload Identity Federation)? [y/N] " implement_solution2
if [[ $implement_solution2 =~ ^[Yy]$ ]]; then
  setup_workload_identity
fi

# Verify fix
read -p "Verify the fix by triggering a workflow run? [y/N] " verify
if [[ $verify =~ ^[Yy]$ ]]; then
  verify_fix
fi

echo -e "${GREEN}Script execution completed.${NC}"
echo "Please refer to the docs/CI_CD_FIX_INSTRUCTIONS.md file for more details on the implemented solutions."