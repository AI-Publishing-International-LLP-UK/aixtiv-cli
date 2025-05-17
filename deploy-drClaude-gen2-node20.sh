#!/bin/bash

# Deploy Dr. Claude function using Gen 2 functions with Node.js 20
# This script deploys the drClaude function to us-west1 using gcloud commands directly

# Color definitions for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
FUNCTION_NAME="drClaude"
RUNTIME="nodejs20"
MEMORY="512MB"
TIMEOUT="60s"
ENTRY_POINT="drClaude"
SOURCE_DIR="./functions"
MIN_INSTANCES=0
MAX_INSTANCES=10

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

# Update package.json to use Node.js 20
update_nodejs_version() {
  echo -e "${YELLOW}[STEP 0] Updating Node.js version to 20 in package.json${NC}"
  
  # Create a backup of the original package.json
  cp "${SOURCE_DIR}/package.json" "${SOURCE_DIR}/package.json.backup"
  
  # Update the Node.js version in package.json using sed
  sed -i '' 's/"node": "18"/"node": "20"/' "${SOURCE_DIR}/package.json"
  handle_error $? "Failed to update Node.js version in package.json"
  
  echo -e "${GREEN}[SUCCESS] Updated Node.js version to 20 in package.json${NC}"
}

# Main deployment function
deploy_function() {
  echo -e "${GREEN}========== Dr. Claude Function Deployment (Gen 2, Node.js 20) ==========${NC}"
  echo -e "${BLUE}Project ID:${NC} $PROJECT_ID"
  echo -e "${BLUE}Region:${NC} $REGION"
  echo -e "${BLUE}Function:${NC} $FUNCTION_NAME"
  echo -e "${BLUE}Runtime:${NC} $RUNTIME"
  echo -e "${BLUE}Memory:${NC} $MEMORY"
  echo -e "${BLUE}Timeout:${NC} $TIMEOUT"
  echo -e "${BLUE}Min Instances:${NC} $MIN_INSTANCES"
  echo -e "${BLUE}Max Instances:${NC} $MAX_INSTANCES"
  echo -e "${GREEN}=================================================================${NC}"

  # Update Node.js version in package.json
  update_nodejs_version

  # Check if we are in the correct project
  echo -e "${YELLOW}[STEP 1] Setting Google Cloud Project to $PROJECT_ID${NC}"
  gcloud config set project "$PROJECT_ID"
  handle_error $? "Failed to set Google Cloud project"

  # Delete the function if it already exists
  echo -e "${YELLOW}[STEP 2] Checking if function already exists...${NC}"
  if gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --gen2 &> /dev/null; then
    echo -e "${BLUE}[INFO] Gen 2 function exists, deleting it first...${NC}"
    gcloud functions delete "$FUNCTION_NAME" --region="$REGION" --gen2 --quiet
    handle_error $? "Failed to delete existing Gen 2 function"
  fi
  
  if gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --no-gen2 &> /dev/null; then
    echo -e "${BLUE}[INFO] Gen 1 function exists, deleting it first...${NC}"
    gcloud functions delete "$FUNCTION_NAME" --region="$REGION" --no-gen2 --quiet
    handle_error $? "Failed to delete existing Gen 1 function"
  else
    echo -e "${BLUE}[INFO] Function does not exist yet. Proceeding with deployment.${NC}"
  fi

  # Deploy the function using Gen 2 with Node.js 20
  echo -e "${YELLOW}[STEP 3] Deploying function (Gen 2, Node.js 20)...${NC}"
  gcloud functions deploy "$FUNCTION_NAME" \
    --region="$REGION" \
    --runtime="$RUNTIME" \
    --memory="$MEMORY" \
    --timeout="$TIMEOUT" \
    --entry-point="$ENTRY_POINT" \
    --source="$SOURCE_DIR" \
    --trigger-http \
    --allow-unauthenticated \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --gen2
  
  handle_error $? "Failed to deploy function"

  # Check deployment status
  echo -e "${YELLOW}[STEP 4] Verifying deployment...${NC}"
  gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --gen2 --format="json" | grep "state\|serviceConfig\|url"
  handle_error $? "Failed to retrieve function status"

  echo -e "${GREEN}[SUCCESS] Function $FUNCTION_NAME successfully deployed to $REGION${NC}"
  
  # Get the function URL
  FUNCTION_URL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --gen2 --format="value(serviceConfig.uri)")
  echo -e "${BLUE}[INFO] Function URL: ${YELLOW}$FUNCTION_URL${NC}"
  echo -e "${BLUE}[INFO] Test with: curl -X POST $FUNCTION_URL${NC}"

  # Restore the original package.json
  echo -e "${YELLOW}[STEP 5] Restoring original package.json${NC}"
  mv "${SOURCE_DIR}/package.json.backup" "${SOURCE_DIR}/package.json"
  handle_error $? "Failed to restore original package.json"
}

# Entry point
echo -e "${BLUE}Starting Dr. Claude function deployment (Gen 2, Node.js 20)...${NC}"
check_gcloud
deploy_function
echo -e "${GREEN}Deployment completed!${NC}"
