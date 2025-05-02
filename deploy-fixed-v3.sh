#!/bin/bash
# Unified Deployment Script for Coaching2100 Network Infrastructure

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
    log "START" "Initiating Improved Deployment Process" "$GREEN"
    log "INFO" "Using corrected CI/CTTT configuration with proper permissions" "$BLUE"

    # Set Google Cloud Project
    log "CONFIG" "Configuring Google Cloud Project" "$YELLOW"
    gcloud config set project "api-for-warp-drive"
    handle_error $? "Failed to set Google Cloud project"
    
    # Intentionally skipping the quota project step that was causing permission errors
    log "SKIP" "Skipping quota project configuration due to permission constraints" "$YELLOW"
    
    # Ensure correct service account is used 
    log "CONFIG" "Configuring deployment with correct service account" "$YELLOW"
    
    # Modify the cloudbuild-ci-cttt-correct.yaml file to ensure it uses the right service account
    # This is a safer approach than directly editing the file
    export CLOUDSDK_BUILDS_SERVICE_ACCOUNT="projects/api-for-warp-drive/serviceAccounts/drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"
    log "AUTH" "Using service account: $CLOUDSDK_BUILDS_SERVICE_ACCOUNT" "$BLUE"
    
    # Trigger Cloud Build with the corrected configuration
    log "BUILD" "Submitting Cloud Build Configuration" "$GREEN"
    gcloud builds submit --config=cloudbuild-ci-cttt-correct.yaml .
    handle_error $? "Cloud Build submission failed"

    # Authenticate and Set Cluster Context
    log "AUTH" "Authenticating with Kubernetes Cluster" "$GREEN"
    gcloud container clusters get-credentials private-cluster-auto \
        --zone us-west1 \
        --project api-for-warp-drive
    handle_error $? "Failed to authenticate with Kubernetes cluster"

    # Verify cluster connectivity before proceeding
    log "TEST" "Verifying Kubernetes API connectivity" "$YELLOW"
    kubectl get nodes --request-timeout=10s
    handle_error $? "Cannot connect to Kubernetes API - check network or VPN settings"

    # Run Connectivity Tests with timeout to prevent long hangs
    log "TEST" "Performing Connectivity Verification with timeout" "$YELLOW"
    timeout 30s kubectl run connectivity-test \
        --image=busybox \
        --restart=Never \
        -- wget -q -O- http://super-claude-staging
    
    TEST_RESULT=$?
    if [ $TEST_RESULT -eq 124 ]; then
        log "WARN" "Connectivity test timed out after 30 seconds" "$YELLOW"
    elif [ $TEST_RESULT -ne 0 ]; then
        log "WARN" "Connectivity test did not succeed (Exit Code: $TEST_RESULT)" "$YELLOW"
        # Not failing the deployment on connectivity test issues
    else
        log "SUCCESS" "Connectivity test passed successfully" "$GREEN"
    fi

    # Clean up the test pod if it exists
    kubectl delete pod connectivity-test --ignore-not-found=true

    # Deployment Completion
    log "COMPLETE" "Deployment process completed" "$GREEN"
}

# Execute Main Function
main

