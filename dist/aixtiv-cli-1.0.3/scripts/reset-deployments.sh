#!/bin/bash

# Reset script for early deployments
# Super admin: pr@coaching2100.com

set -euo pipefail

PROJECT_ID="api-for-warp-drive"
BUCKET_PREFIX="859242575175-us-central1-blueprint-config"
LOCATION="us-west1"
SERVICE_ACCOUNT="goog-sc-generative-ai-docu-147@api-for-warp-drive.iam.gserviceaccount.com"

# Color coding for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting deployment reset process...${NC}"

# Backup existing configurations
backup_configs() {
    local deployment=$1
    echo -e "${GREEN}Backing up configuration for ${deployment}...${NC}"
    
    gsutil cp -r gs://${BUCKET_PREFIX}/${deployment} \
        gs://${BUCKET_PREFIX}/backups/${deployment}_$(date +%Y%m%d_%H%M%S)/
}

# Clean up resources
cleanup_resources() {
    local deployment=$1
    echo -e "${GREEN}Cleaning up resources for ${deployment}...${NC}"
    
    # Remove Cloud Run services
    gcloud run services list --platform managed \
        --region=${LOCATION} \
        --filter="metadata.name:${deployment}" \
        --format="get(name)" | while read service; do
        gcloud run services delete $service \
            --region=${LOCATION} \
            --quiet || true
    done
    
    # Remove Cloud Build triggers
    gcloud builds triggers list \
        --filter="name:${deployment}" \
        --format="get(name)" | while read trigger; do
        gcloud builds triggers delete $trigger \
            --region=${LOCATION} \
            --quiet || true
    done
    
    # Clean up AI Platform endpoints
    gcloud ai endpoints list \
        --region=${LOCATION} \
        --filter="displayName:${deployment}" \
        --format="get(name)" | while read endpoint; do
        gcloud ai endpoints delete $endpoint \
            --region=${LOCATION} \
            --quiet || true
    done
}

# Reset Terraform state
reset_state() {
    local deployment=$1
    echo -e "${GREEN}Resetting Terraform state for ${deployment}...${NC}"
    
    # Move current state to backup
    gsutil mv \
        gs://${BUCKET_PREFIX}/${deployment}/state/default.tfstate \
        gs://${BUCKET_PREFIX}/backups/${deployment}_$(date +%Y%m%d_%H%M%S)/default.tfstate || true
}

# Main reset sequence
main() {
    # List of deployments to reset
    local deployments=(
        "generative-ai-kb"
        "rag-cloudsql"
        "dynamic-web-apps"
    )
    
    for deployment in "${deployments[@]}"; do
        echo -e "${YELLOW}Processing ${deployment}...${NC}"
        
        # Execute reset sequence
        backup_configs $deployment
        cleanup_resources $deployment
        reset_state $deployment
        
        echo -e "${GREEN}Reset completed for ${deployment}${NC}"
    done
}

# Execute with error handling
if main; then
    echo -e "${GREEN}Reset process completed successfully${NC}"
else
    echo -e "${RED}Reset process encountered errors${NC}"
    exit 1
fi