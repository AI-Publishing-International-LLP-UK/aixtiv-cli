#!/bin/bash
# Unified Network Deployment Script
# Streamlined Infrastructure Deployment for Coaching2100

set -euo pipefail

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Deployment Configuration
CLUSTER_NAME="private-cluster-auto"
CLUSTER_ZONE="us-west1"
PROJECT_ID="api-for-warp-drive"

# Logging Utility with Color
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    
    echo -e "${color}[NETWORK-DEPLOY:${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Validate Prerequisites
validate_prerequisites() {
    log "PREREQ" "Checking deployment prerequisites" "$YELLOW"
    
    # Check Required Tools
    for tool in gcloud kubectl; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "${tool} is not installed" "$RED"
            exit 1
        fi
    done
}

# Authenticate and Set Cluster Context
setup_cluster_context() {
    log "AUTH" "Authenticating with Google Cloud" "$GREEN"
    
    gcloud auth activate-service-account \
        --project="$PROJECT_ID" \
        --key-file="${GCP_SERVICE_ACCOUNT_KEY}"
    
    gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --zone "$CLUSTER_ZONE" \
        --project "$PROJECT_ID"
}

# Deploy Network Configurations
deploy_network_config() {
    log "DEPLOY" "Applying Network Configurations" "$GREEN"
    
    # Apply Network Policies and Configurations
    kubectl apply -f infrastructure/network/network-evolution.yaml
    kubectl apply -f infrastructure/network/network-policy.yaml
    
    # Deploy Staging Configurations
    kubectl apply -f infrastructure/staging/deployment.yaml
    kubectl apply -f infrastructure/staging/service.yaml
}

# Perform Connectivity Tests
run_connectivity_tests() {
    log "TEST" "Running Connectivity Verification" "$YELLOW"
    
    kubectl run connectivity-test \
        --image=busybox \
        --rm -it \
        --restart=Never \
        -- wget -q -O- http://super-claude-staging || \
        log "ERROR" "Connectivity Test Failed" "$RED"
}

# Main Deployment Workflow
main() {
    log "START" "Network Deployment Initiated" "$GREEN"
    
    validate_prerequisites
    setup_cluster_context
    deploy_network_config
    run_connectivity_tests
    
    log "COMPLETE" "Network Deployment Successfully Completed" "$GREEN"
}

# Execute Main Function
main