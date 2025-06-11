#!/bin/bash

# Deploy Dr. Claude function using Gen 2 functions with Node.js 22
# This script deploys the dr-claude function to us-west1 using gcloud commands directly

# Color definitions for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="app-2100-cool"
REGION="us-west1"
FUNCTION_NAME="drClaude"
RUNTIME="nodejs22"
MEMORY="512MB"
TIMEOUT="60s"
ENTRY_POINT="drClaude"
SOURCE_DIR="./functions"
SOURCE_FILE="${SOURCE_DIR}/dr-claude.js"  # Note: Entry point 'drClaude' is exported from file 'dr-claude.js'
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

# Main deployment function
deploy_function() {
  echo -e "${GREEN}========== Dr. Claude Function Deployment (Gen 2, Node.js 22) ==========${NC}"
  echo -e "${BLUE}Project ID:${NC} $PROJECT_ID"
  echo -e "${BLUE}Region:${NC} $REGION"
  echo -e "${BLUE}Function:${NC} $FUNCTION_NAME"
  echo -e "${BLUE}Runtime:${NC} $RUNTIME"
  echo -e "${BLUE}Memory:${NC} $MEMORY"
  echo -e "${BLUE}Timeout:${NC} $TIMEOUT"
  echo -e "${BLUE}Min Instances:${NC} $MIN_INSTANCES"
  echo -e "${BLUE}Max Instances:${NC} $MAX_INSTANCES"
  echo -e "${GREEN}=================================================================${NC}"

  # Check if we are in the correct project
  echo -e "${YELLOW}[STEP 1] Setting Google Cloud Project to $PROJECT_ID${NC}"
  gcloud config set project "$PROJECT_ID"
  handle_error $? "Failed to set Google Cloud project"

  # Verify source file exists
  echo -e "${YELLOW}[STEP 1.5] Checking for source file dr-claude.js${NC}"
  if [ ! -f "$SOURCE_FILE" ]; then
    echo -e "${RED}[ERROR] Source file $SOURCE_FILE not found!${NC}"
    echo -e "${RED}[INFO] Please ensure dr-claude.js exists in the functions directory.${NC}"
    exit 1
  fi
  echo -e "${GREEN}[SUCCESS] Source file $SOURCE_FILE found${NC}"

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

  # Set up necessary IAM permissions
  echo -e "${YELLOW}[STEP 2.5] Setting up IAM permissions...${NC}"
  # Allow public access to the function
  gcloud functions add-iam-policy-binding "$FUNCTION_NAME" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker" \
    --gen2 \
    --quiet || true

  # Deploy the function using Gen 2 with Node.js 22
  echo -e "${YELLOW}[STEP 3] Deploying function (Gen 2, Node.js 22)...${NC}"
  echo -e "${BLUE}[INFO] Using file dr-claude.js with entry point ${ENTRY_POINT}${NC}"
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

  # Now add the IAM policy binding after deployment
  echo -e "${YELLOW}[STEP 4] Setting public access...${NC}"
  gcloud functions add-iam-policy-binding "$FUNCTION_NAME" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker" \
    --gen2 || true

  # Check deployment status
  echo -e "${YELLOW}[STEP 5] Verifying deployment...${NC}"
  gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --gen2 --format="json" | grep "state\\|serviceConfig\\|url"
  handle_error $? "Failed to retrieve function status"

  echo -e "${GREEN}[SUCCESS] Function $FUNCTION_NAME successfully deployed to $REGION${NC}"
  
  # Get the function URL
  FUNCTION_URL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --gen2 --format="value(serviceConfig.uri)")
  echo -e "${BLUE}[INFO] Function URL: ${YELLOW}$FUNCTION_URL${NC}"
  echo -e "${BLUE}[INFO] Test with: curl -X POST $FUNCTION_URL${NC}"
}

# Entry point
echo -e "${BLUE}Starting Dr. Claude function deployment (Gen 2, Node.js 22)...${NC}"
check_gcloud
deploy_function
echo -e "${GREEN}Deployment completed!${NC}"
