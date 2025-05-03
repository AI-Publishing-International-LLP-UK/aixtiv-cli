#!/bin/bash
# Direct Deployment Script for Coaching2100 Network Infrastructure

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

# Function to verify manifest files exist
verify_manifests() {
    local manifest_dir="infrastructure/staging"
    
    if [ ! -d "$manifest_dir" ]; then
        log "ERROR" "Manifest directory $manifest_dir does not exist" "$RED"
        return 1
    fi
    
    if [ ! -f "$manifest_dir/deployment.yaml" ]; then
        log "ERROR" "Deployment manifest $manifest_dir/deployment.yaml not found" "$RED"
        return 1
    fi
    
    if [ ! -f "$manifest_dir/service.yaml" ]; then
        log "ERROR" "Service manifest $manifest_dir/service.yaml not found" "$RED"
        return 1
    fi
    
    log "INFO" "All required manifest files exist" "$BLUE"
    return 0
}

# Function to check if pods are running
wait_for_pods() {
    local namespace="anthology-ai-staging"
    local app_selector="app=aixtiv-cli"
    local max_attempts=10
    local attempt=1
    local delay=5
    
    log "INFO" "Waiting for pods to be ready (max $max_attempts attempts)" "$BLUE"
    
    while [ $attempt -le $max_attempts ]; do
        log "INFO" "Checking pod status (attempt $attempt/$max_attempts)" "$BLUE"
        
        # Count running pods
        local running_pods=$(kubectl get pods -n $namespace --selector=$app_selector -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' 2>/dev/null | wc -w | tr -d ' ')
        
        if [ "$running_pods" -gt 0 ]; then
            log "SUCCESS" "Found $running_pods running pods" "$GREEN"
            return 0
        fi
        
        log "INFO" "No running pods found, waiting $delay seconds..." "$YELLOW"
        sleep $delay
        
        attempt=$((attempt + 1))
    done
    
    log "ERROR" "Timed out waiting for pods to be ready" "$RED"
    return 1
}

# Main Deployment Workflow
main() {
    # Start Deployment
    log "START" "Initiating Direct Deployment Process" "$GREEN"
    log "INFO" "Bypassing Cloud Build and deploying directly" "$BLUE"

    # Verify manifest files
    log "CHECK" "Verifying manifest files" "$YELLOW"
    verify_manifests
    handle_error $? "Manifest verification failed"
    
    # Set Google Cloud Project
    log "CONFIG" "Configuring Google Cloud Project" "$YELLOW"
    gcloud config set project "api-for-warp-drive"
    handle_error $? "Failed to set Google Cloud project"
    
    # Check that user is authenticated
    log "AUTH" "Verifying authentication status" "$BLUE"
    local current_user=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
    if [ -z "$current_user" ]; then
        log "ERROR" "Not authenticated with gcloud" "$RED"
        log "INFO" "Please run 'gcloud auth login' and try again" "$BLUE"
        exit 1
    fi
    log "AUTH" "Authenticated as $current_user" "$GREEN"
    
    # Connect to GKE cluster
    log "AUTH" "Connecting to Kubernetes cluster" "$BLUE"
    gcloud container clusters get-credentials private-cluster-auto \
        --zone us-west1 \
        --project api-for-warp-drive
    handle_error $? "Failed to connect to Kubernetes cluster"
    
    # Verify cluster connectivity
    log "TEST" "Verifying Kubernetes connectivity" "$YELLOW"
    kubectl get nodes --request-timeout=10s > /dev/null
    handle_error $? "Cannot connect to Kubernetes API - check network or VPN settings"
    
    # Apply Kubernetes manifests
    log "DEPLOY" "Applying deployment manifest" "$GREEN"
    kubectl apply -f infrastructure/staging/deployment.yaml
    handle_error $? "Failed to apply deployment manifest"
    
    log "DEPLOY" "Applying service manifest" "$GREEN"
    kubectl apply -f infrastructure/staging/service.yaml
    handle_error $? "Failed to apply service manifest"
    
    # Monitor deployment rollout
    log "MONITOR" "Monitoring deployment rollout" "$YELLOW"
    kubectl rollout status deployment/aixtiv-cli-staging -n anthology-ai-staging --timeout=90s
    handle_error $? "Deployment rollout failed or timed out"
    
    # Wait for pods to be running
    log "MONITOR" "Waiting for pods to be running" "$YELLOW"
    wait_for_pods
    handle_error $? "Pods did not reach running state"
    
    # Display deployment status
    log "STATUS" "Displaying deployment status" "$BLUE"
    kubectl get deployment,svc,pods -n anthology-ai-staging --selector=app=aixtiv-cli
    
    # Print success message
    log "SUCCESS" "Direct deployment completed successfully" "$GREEN"
    log "INFO" "Deployment status can be checked with:" "$BLUE"
    echo "  kubectl get deployment,svc,pods -n anthology-ai-staging --selector=app=aixtiv-cli"
}

# Execute Main Function
main

