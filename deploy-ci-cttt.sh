#!/bin/bash
# Deploy using CI/CD CTTT (Continuous Training and Testing) Pipeline
# This script runs the Cloud Build CI/CD CTTT pipeline

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set default configuration
CONFIG_FILE="cloudbuild-domain-management.yaml"
PROJECT_ID="api-for-warp-drive"

# Error handling function
handle_error() {
    local exit_code=$1
    local error_msg=$2
    
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}[ERROR] $error_msg (Exit Code: $exit_code)${NC}"
        echo -e "${RED}[ABORT] Deployment aborted due to errors${NC}"
        exit $exit_code
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --config)
      CONFIG_FILE="$2"
      shift
      shift
      ;;
    --project)
      PROJECT_ID="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --config FILE      CI/CD CTTT configuration file (default: cloudbuild-ci-cttt.yaml)"
      echo "  --project ID       Google Cloud project ID (default: api-for-warp-drive)"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Verify configuration file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}[ERROR] Configuration file '$CONFIG_FILE' not found${NC}"
  exit 1
fi

# Print deployment information
echo -e "${GREEN}================= CI/CD CTTT Deployment ==================${NC}"
echo -e "${BLUE}Configuration: ${YELLOW}$CONFIG_FILE${NC}"
echo -e "${BLUE}Project ID: ${YELLOW}$PROJECT_ID${NC}"
echo -e "${GREEN}=========================================================${NC}"

# Check that user is authenticated
echo -e "${BLUE}[AUTH] Verifying authentication status${NC}"
current_user=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$current_user" ]; then
    echo -e "${RED}[ERROR] Not authenticated with gcloud${NC}"
    echo -e "${BLUE}[INFO] Please run 'gcloud auth login' and try again${NC}"
    exit 1
fi
echo -e "${GREEN}[AUTH] Authenticated as $current_user${NC}"

# Set Google Cloud Project
echo -e "${YELLOW}[CONFIG] Setting Google Cloud Project to $PROJECT_ID${NC}"
gcloud config set project "$PROJECT_ID"
handle_error $? "Failed to set Google Cloud project"

# Run Cloud Build with the specified configuration
echo -e "${GREEN}[DEPLOY] Starting CI/CD CTTT deployment pipeline${NC}"
echo -e "${BLUE}[INFO] Submitting build with config: $CONFIG_FILE${NC}"

# Submit the build
gcloud builds submit --config="$CONFIG_FILE" --substitutions=_DEPLOY_ENV=staging,_TRIGGER_SOURCE=manual .
handle_error $? "Failed to submit build"

echo -e "${GREEN}[SUCCESS] CI/CD CTTT build submitted successfully${NC}"
echo -e "${BLUE}[INFO] You can monitor build progress in the Google Cloud Console:${NC}"
echo -e "${YELLOW}https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID${NC}"

# Exit successfully
exit 0