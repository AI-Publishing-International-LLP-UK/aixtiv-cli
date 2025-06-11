#!/bin/bash

# Deploy Dr. Claude function directly with gcloud
# This script deploys the drClaude function to us-west1-b using gcloud commands directly

# Color definitions for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
FUNCTION_NAME="drClaude"
RUNTIME="nodejs18"
MEMORY="512MB"
TIMEOUT="60s"
ENTRY_POINT="drClaude"
SOURCE_DIR="./functions"

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

# Function to check if gcloud is installed
check_gcloud() {
  if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}[ERROR] gcloud CLI not found. Please install it first.${NC}"
    echo -e "${BLUE}[INFO] Visit https://cloud.google.com/sdk/docs/install for installation instructions.${NC}"
    exit 1
  fi
}

# Main deployment function
deploy_function() {
  echo -e "${GREEN}========== Dr. Claude Function Deployment ==========${NC}"
  echo -e "${BLUE}Project ID:${NC} $PROJECT_ID"
  echo -e "${BLUE}Region:${NC} $REGION"
  echo -e "${BLUE}Zone:${NC} $ZONE"
  echo -e "${BLUE}Function:${NC} $FUNCTION_NAME"
  echo -e "${BLUE}Runtime:${NC} $RUNTIME"
  echo -e "${BLUE}Memory:${NC} $MEMORY"
  echo -e "${BLUE}Timeout:${NC} $TIMEOUT"
  echo -e "${GREEN}=================================================${NC}"

  # Check if we are in the correct project
  echo -e "${YELLOW}[STEP 1] Setting Google Cloud Project to $PROJECT_ID${NC}"
  gcloud config set project "$PROJECT_ID"
  handle_error $? "Failed to set Google Cloud project"

  # Delete the function if it already exists
  echo -e "${YELLOW}[STEP 2] Checking if function already exists...${NC}"
  if gcloud functions describe "$FUNCTION_NAME" --region="$REGION" &> /dev/null; then
    echo -e "${BLUE}[INFO] Function exists, deleting it first...${NC}"
    gcloud functions delete "$FUNCTION_NAME" --region="$REGION" --quiet
    handle_error $? "Failed to delete existing function"
  else
    echo -e "${BLUE}[INFO] Function does not exist yet. Proceeding with deployment.${NC}"
  fi

  # Deploy the function
  echo -e "${YELLOW}[STEP 3] Deploying function...${NC}"
  gcloud functions deploy "$FUNCTION_NAME" \
    --region="$REGION" \
    --runtime="$RUNTIME" \
    --memory="$MEMORY" \
    --timeout="$TIMEOUT" \
    --entry-point="$ENTRY_POINT" \
    --source="$SOURCE_DIR" \
    --trigger-http \
    --allow-unauthenticated
  
  handle_error $? "Failed to deploy function"

  # Check deployment status
  echo -e "${YELLOW}[STEP 4] Verifying deployment...${NC}"
  gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --format="json" | grep "status"
  handle_error $? "Failed to retrieve function status"

  echo -e "${GREEN}[SUCCESS] Function $FUNCTION_NAME successfully deployed to $REGION${NC}"
  
  # Get the function URL
  FUNCTION_URL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --format="value(httpsTrigger.url)")
  echo -e "${BLUE}[INFO] Function URL: ${YELLOW}$FUNCTION_URL${NC}"
  echo -e "${BLUE}[INFO] Test with: curl -X POST $FUNCTION_URL${NC}"
}

# Entry point
echo -e "${BLUE}Starting Dr. Claude function deployment...${NC}"
check_gcloud
deploy_function
echo -e "${GREEN}Deployment completed!${NC}"
