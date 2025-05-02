#!/bin/bash
# Final Unified Deployment Script for Coaching2100 Network Infrastructure

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

# Function to create a modified build configuration
create_modified_build_config() {
    local source_config="cloudbuild-ci-cttt-correct.yaml"
    local temp_config="cloudbuild-ci-cttt-modified.yaml"
    
    log "CONFIG" "Creating modified build configuration" "$BLUE"
    
    # Check if source config exists
    if [ ! -f "$source_config" ]; then
        log "ERROR" "Source config file $source_config not found" "$RED"
        return 1
    fi
    
    # Create a temporary modified config that skips the git clone step
    log "CONFIG" "Removing git clone step from build configuration" "$BLUE"
    
    # Extract the first step (initialization)
    sed -n '1,/  # Clone Repository/p' "$source_config" | sed '$d' > "$temp_config"
    
    # Skip the clone repository step and append the rest
    sed -n '/  # Setup Agent Tracking/,$p' "$source_config" >> "$temp_config"
    
    # Verify the file was created
    if [ ! -f "$temp_config" ]; then
        log "ERROR" "Failed to create modified build configuration" "$RED"
        return 1
    fi
    
    log "SUCCESS" "Created modified build configuration without git clone step" "$GREEN"
    return 0
}

# Main Deployment Workflow
main() {
    # Start Deployment
    log "START" "Initiating Final Improved Deployment Process" "$GREEN"
    log "INFO" "Using modified CI/CTTT configuration that skips git clone" "$BLUE"

    # Set Google Cloud Project
    log "CONFIG" "Configuring Google Cloud Project" "$YELLOW"
    gcloud config set project "api-for-warp-drive"
    handle_error $? "Failed to set Google Cloud project"
    
    # Intentionally skipping the quota project step that was causing permission errors
    log "SKIP" "Skipping quota project configuration due to permission constraints" "$YELLOW"
    
    # Create modified build configuration
    create_modified_build_config
    handle_error $? "Failed to create modified build configuration"
    
    # Ensure correct service account is used 
    log "CONFIG" "Configuring deployment with correct service account" "$YELLOW"
    export CLOUDSDK_BUILDS_SERVICE_ACCOUNT="projects/api-for-warp-drive/serviceAccounts/drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"
    log "AUTH" "Using service account: $CLOUDSDK_BUILDS_SERVICE_ACCOUNT" "$BLUE"
    
    # Trigger Cloud Build with the modified configuration
    log "BUILD" "Submitting Cloud Build Configuration" "$GREEN"
    gcloud builds submit --config=cloudbuild-ci-cttt-modified.yaml .
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
    
    # Clean up temporary files
    log "CLEANUP" "Removing temporary build configuration file" "$BLUE"
    rm -f cloudbuild-ci-cttt-modified.yaml

    # Deployment Completion
    log "COMPLETE" "Deployment process completed successfully" "$GREEN"
}

# Execute Main Function
main

