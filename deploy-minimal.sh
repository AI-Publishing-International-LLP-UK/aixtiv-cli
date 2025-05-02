#!/bin/bash
# Minimal Deployment Script for Coaching2100 Network Infrastructure

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error handling function
handle_error() {
    local exit_code=$1
    local error_msg=$2
    
    if [ $exit_code -ne 0 ]; then
        log "ERROR" "$error_msg (Exit Code: $exit_code)" "$RED"
        log "ABORT" "Deployment aborted due to errors" "$RED"
        exit $exit_code
    fi
}

# Logging Utility with Color
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    
    echo -e "${color}[DEPLOY:${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Main Deployment Workflow
main() {
    # Start Deployment
    log "START" "Initiating Minimal Deployment Process" "$GREEN"
    log "INFO" "Using simplified deployment configuration" "$BLUE"

    # Verify required files exist
    if [ ! -f "cloudbuild-minimal.yaml" ]; then
        log "ERROR" "Required file cloudbuild-minimal.yaml not found" "$RED"
        exit 1
    fi

    # Set Google Cloud Project
    log "CONFIG" "Configuring Google Cloud Project" "$YELLOW"
    gcloud config set project "api-for-warp-drive"
    handle_error $? "Failed to set Google Cloud project"
    
    # Check that user is authenticated
    log "AUTH" "Verifying authentication status" "$BLUE"
    gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"
    handle_error $? "Not authenticated with gcloud. Run 'gcloud auth login' first"
    
    # Set service account for build
    log "CONFIG" "Configuring deployment with correct service account" "$YELLOW"
    export CLOUDSDK_BUILDS_SERVICE_ACCOUNT="projects/api-for-warp-drive/serviceAccounts/drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"
    log "AUTH" "Using service account: $CLOUDSDK_BUILDS_SERVICE_ACCOUNT" "$BLUE"
    
    # Deploy via Cloud Build - minimal configuration
    log "BUILD" "Submitting Cloud Build with minimal configuration" "$GREEN"
    gcloud builds submit --config=cloudbuild-minimal.yaml --timeout=10m .
    handle_error $? "Cloud Build submission failed"
    
    # Direct Kubernetes verification
    log "VERIFY" "Directly verifying deployment status" "$YELLOW"
    
    # Connect to cluster
    log "AUTH" "Connecting to Kubernetes cluster" "$BLUE"
    gcloud container clusters get-credentials private-cluster-auto \
        --zone us-west1 \
        --project api-for-warp-drive
    handle_error $? "Failed to connect to Kubernetes cluster"
    
    # Check pod status with timeout
    log "TEST" "Checking pod status" "$YELLOW"
    kubectl get pods -n anthology-ai-staging --selector=app=aixtiv-cli -o wide --request-timeout=15s
    
    # Clean up any lingering resources
    log "CLEANUP" "Deployment process complete" "$GREEN"
}

# Execute Main Function
main

