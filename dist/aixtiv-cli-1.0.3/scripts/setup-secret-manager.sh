#!/bin/bash
# Setup script for GCP Secret Manager integration
# Part of Phase III: Agent Autonomy + Platform Automation

set -e

# Configuration
GCP_PROJECT="api-for-warp-drive"
REGION="us-west1"
SERVICE_ACCOUNT_NAME="aixtiv-secret-manager"
SERVICE_ACCOUNT_DISPLAY_NAME="Aixtiv Secret Manager Service Account"
LOG_DIR="logs"
SECRET_PREFIX="aixtiv"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "============================================="
echo "  Aixtiv CLI - Secret Manager Setup"
echo "  Phase III: Agent Autonomy + Platform Automation"
echo "============================================="
echo -e "${NC}"

# Check for gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is required but not installed.${NC}"
    echo "Please install the Google Cloud SDK from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check current gcloud configuration
echo -e "${YELLOW}Checking gcloud configuration...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project)

if [ "$CURRENT_PROJECT" != "$GCP_PROJECT" ]; then
    echo -e "${YELLOW}Current project is set to: $CURRENT_PROJECT${NC}"
    echo -e "${YELLOW}Switching to project: $GCP_PROJECT${NC}"
    gcloud config set project $GCP_PROJECT
fi

# Check if service account exists
echo -e "${YELLOW}Checking for service account...${NC}"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &> /dev/null; then
    echo -e "${GREEN}Service account $SERVICE_ACCOUNT_EMAIL already exists.${NC}"
else
    echo -e "${YELLOW}Creating service account $SERVICE_ACCOUNT_EMAIL...${NC}"
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="$SERVICE_ACCOUNT_DISPLAY_NAME" \
        --description="Service account for Aixtiv CLI Secret Management"
    
    # Wait for service account creation to propagate
    sleep 5
    echo -e "${GREEN}Service account created successfully.${NC}"
fi

# Grant required permissions to the service account
echo -e "${YELLOW}Setting up IAM permissions...${NC}"
gcloud projects add-iam-policy-binding $GCP_PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/iam.serviceAccountKeyAdmin"

gcloud projects add-iam-policy-binding $GCP_PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/serviceusage.serviceUsageAdmin"

echo -e "${GREEN}IAM permissions set up successfully.${NC}"

# Check if Secret Manager API is enabled
echo -e "${YELLOW}Checking if Secret Manager API is enabled...${NC}"
if gcloud services list --enabled --filter="name:secretmanager.googleapis.com" | grep -q "secretmanager.googleapis.com"; then
    echo -e "${GREEN}Secret Manager API is already enabled.${NC}"
else
    echo -e "${YELLOW}Enabling Secret Manager API...${NC}"
    gcloud services enable secretmanager.googleapis.com
    echo -e "${GREEN}Secret Manager API enabled successfully.${NC}"
fi

# Create service account key for local development
echo -e "${YELLOW}Creating service account key...${NC}"
KEY_FILE="config/secret-manager-sa-key.json"
mkdir -p config

if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}Service account key already exists at $KEY_FILE${NC}"
    read -p "Do you want to create a new key? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Keeping existing key.${NC}"
    else
        echo -e "${YELLOW}Creating new service account key...${NC}"
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL
        echo -e "${GREEN}Service account key created at $KEY_FILE${NC}"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL
    echo -e "${GREEN}Service account key created at $KEY_FILE${NC}"
fi

# Create log directory for audit logs
echo -e "${YELLOW}Setting up audit logging...${NC}"
mkdir -p $LOG_DIR
touch $LOG_DIR/secret-audit.log
echo -e "${GREEN}Audit log initialized at $LOG_DIR/secret-audit.log${NC}"

# Create initial test secret
echo -e "${YELLOW}Creating test secret...${NC}"
TEST_SECRET_ID="${SECRET_PREFIX}-test-secret"
TEST_SECRET_VALUE="This is a test secret created $(date)"

# Check if secret already exists
if gcloud secrets describe $TEST_SECRET_ID &> /dev/null; then
    echo -e "${YELLOW}Test secret $TEST_SECRET_ID already exists.${NC}"
else
    echo -e "${YELLOW}Creating new test secret...${NC}"
    echo -n "$TEST_SECRET_VALUE" | gcloud secrets create $TEST_SECRET_ID \
        --replication-policy="user-managed" \
        --locations=$REGION \
        --data-file=- \
        --labels="environment=test,managed-by=aixtiv-cli"
    echo -e "${GREEN}Test secret created successfully.${NC}"
fi

# Create a sample rotation schedule
echo -e "${YELLOW}Creating sample rotation schedule...${NC}"
SCHEDULE_FILE="config/rotation-schedule.json"
cat > $SCHEDULE_FILE << EOF
[
  {
    "type": "service-account-key",
    "secretId": "aixtiv-service-account-key",
    "serviceAccountEmail": "${SERVICE_ACCOUNT_EMAIL}",
    "interval": "90d",
    "keyType": "json",
    "deleteOldKey": true
  },
  {
    "type": "api-key",
    "secretId": "aixtiv-api-key",
    "apiKeyName": "aixtiv-api-key",
    "interval": "30d"
  }
]
EOF
echo -e "${GREEN}Sample rotation schedule created at $SCHEDULE_FILE${NC}"

# Set up environment variables
echo -e "${YELLOW}Setting up environment variables...${NC}"
ENV_FILE=".env.secret-manager"
cat > $ENV_FILE << EOF
# Aixtiv CLI Secret Manager Environment Variables
# Generated on $(date)

# GCP Configuration
GOOGLE_APPLICATION_CREDENTIALS="$PWD/$KEY_FILE"
GCP_PROJECT="$GCP_PROJECT"
GCP_REGION="$REGION"

# Secret Manager Configuration
SECRET_MANAGER_SERVICE_ACCOUNT="$SERVICE_ACCOUNT_EMAIL"
SECRET_PREFIX="$SECRET_PREFIX"
SECRET_AUDIT_LOG="$PWD/$LOG_DIR/secret-audit.log"
ROTATION_SCHEDULE_PATH="$PWD/$SCHEDULE_FILE"
EOF
echo -e "${GREEN}Environment variables configured in $ENV_FILE${NC}"

# Final instructions
echo
echo -e "${BLUE}====== Setup Complete ======${NC}"
echo
echo -e "${GREEN}The GCP Secret Manager integration has been successfully set up.${NC}"
echo
echo "To activate the environment variables, run:"
echo -e "${YELLOW}source $ENV_FILE${NC}"
echo
echo "Test the installation with:"
echo -e "${YELLOW}aixtiv claude:secrets -a list -p $GCP_PROJECT${NC}"
echo
echo "Review the integration documentation at:"
echo -e "${YELLOW}docs/GCP_SECRET_MANAGER.md${NC}"
echo
echo -e "${BLUE}============================${NC}"