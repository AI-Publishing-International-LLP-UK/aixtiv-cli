#!/bin/bash

# migrate-functions.sh
# Purpose: Migrate Cloud Functions from us-central1 to us-west1
# Usage: ./migrate-functions.sh [--dry-run]
# Created: 2025-05-05

set -e  # Exit immediately if a command exits with a non-zero status

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
SOURCE_REGION="us-central1"
TARGET_REGION="us-west1"
PROJECT_ID=$(gcloud config get-value project)
DRY_RUN=false
FUNCTIONS_TO_MIGRATE=(
  "authorizeAgentResource"
  "cleanupPRAccess"
  "fixPRAccess"
  "processNlpCommand"
  "sallyPortVerify"
  "syncPilotDataToPinecone"
  "validateLinkedInProfile"
  "verifyDelegateAccess"
)
LOG_FILE="migration-$(date +%Y%m%d-%H%M%S).log"
TEMP_DIR="function-temp-$(date +%Y%m%d-%H%M%S)"

# Process command line arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      echo -e "${YELLOW}Running in dry-run mode. No actual changes will be made.${NC}"
      shift
      ;;
  esac
done

# Function to log messages
log() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  
  echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Function to handle errors
handle_error() {
  local error_message="$1"
  log "${error_message}" "ERROR"
  echo -e "${RED}ERROR: ${error_message}${NC}"
  exit 1
}

# Function to check if required tools are installed
check_prerequisites() {
  log "Checking prerequisites..."
  
  # Check if gcloud is installed
  if ! command -v gcloud &> /dev/null; then
    handle_error "gcloud CLI not found. Please install Google Cloud SDK."
  fi
  
  # Check if user is authenticated
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    handle_error "Not authenticated with gcloud. Please run 'gcloud auth login' first."
  fi
  
  # Check if current project is set
  if [ -z "$PROJECT_ID" ]; then
    handle_error "No Google Cloud project selected. Please run 'gcloud config set project YOUR_PROJECT_ID'."
  fi
  
  log "Using project: ${PROJECT_ID}"
  log "Source region: ${SOURCE_REGION}"
  log "Target region: ${TARGET_REGION}"
  log "Prerequisites check passed."
}

# Function to verify if a function exists in a particular region
function_exists() {
  local function_name="$1"
  local region="$2"
  
  gcloud functions describe "${function_name}" --region="${region}" &> /dev/null
  return $?
}

# Function to check if a function is in specific list
is_in_migration_list() {
  local function_name="$1"
  
  for f in "${FUNCTIONS_TO_MIGRATE[@]}"; do
    if [ "$f" == "$function_name" ]; then
      return 0
    fi
  done
  
  return 1
}

# Function to get detailed information about a cloud function
get_function_details() {
  local function_name="$1"
  local region="$2"
  local output_file="$3"
  
  log "Getting details for function: ${function_name} in region: ${region}"
  
  if ! gcloud functions describe "${function_name}" --region="${region}" --format=json > "${output_file}"; then
    handle_error "Failed to get details for function: ${function_name} in region: ${region}"
  fi
  
  log "Function details saved to: ${output_file}"
}

# Function to download the source code of a cloud function
download_function_source() {
  local function_name="$1"
  local region="$2"
  local output_dir="$3"
  
  log "Downloading source code for function: ${function_name} from region: ${region}"
  
  mkdir -p "${output_dir}"
  
  # Get the source URL (either sourceArchiveUrl or sourceRepository)
  local source_archive_url=$(jq -r '.sourceArchiveUrl // empty' "${output_dir}/${function_name}-details.json")
  local source_repository=$(jq -r '.sourceRepository.url // empty' "${output_dir}/${function_name}-details.json")
  
  if [ -n "$source_archive_url" ]; then
    # Extract the GCS path from the URL
    local gcs_path=$(echo "$source_archive_url" | sed 's|^gs://|/|')
    
    if ! gsutil cp "$source_archive_url" "${output_dir}/${function_name}-source.zip"; then
      handle_error "Failed to download source code for function: ${function_name}"
    fi
    
    # Create a directory for the extracted source
    mkdir -p "${output_dir}/${function_name}-source"
    
    # Extract the ZIP file
    if ! unzip -q "${output_dir}/${function_name}-source.zip" -d "${output_dir}/${function_name}-source"; then
      handle_error "Failed to extract source code for function: ${function_name}"
    fi
    
    log "Source code downloaded and extracted to: ${output_dir}/${function_name}-source"
  elif [ -n "$source_repository" ]; then
    log "Function ${function_name} uses source repository: ${source_repository}" "WARNING"
    echo -e "${YELLOW}Function ${function_name} uses source repository: ${source_repository}${NC}"
    echo -e "${YELLOW}Source repositories require manual migration. Please update the deployment configuration.${NC}"
  else
    handle_error "Could not determine source code location for function: ${function_name}"
  fi
}

# Function to deploy a function to the target region
deploy_function() {
  local function_name="$1"
  local source_region="$2"
  local target_region="$3"
  local details_file="$4"
  local source_dir="$5"
  
  log "Deploying function: ${function_name} to region: ${target_region}"
  
  # Extract function properties from details file
  local runtime=$(jq -r '.runtime' "${details_file}")
  local memory=$(jq -r '.availableMemoryMb' "${details_file}")
  local timeout=$(jq -r '.timeout' "${details_file}")
  local entry_point=$(jq -r '.entryPoint' "${details_file}")
  local service_account=$(jq -r '.serviceAccountEmail' "${details_file}")
  local environment_variables=$(jq -r '.environmentVariables // {}' "${details_file}")
  
  # Determine trigger type and parameters
  local trigger_http=$(jq -r '.httpsTrigger != null' "${details_file}")
  local event_trigger_type=$(jq -r '.eventTrigger.eventType // ""' "${details_file}")
  local event_trigger_resource=$(jq -r '.eventTrigger.resource // ""' "${details_file}")
  
  # Prepare the deploy command
  local deploy_cmd="gcloud functions deploy ${function_name} --region=${target_region} --runtime=${runtime} --memory=${memory} --timeout=${timeout} --entry-point=${entry_point}"
  
  # Add service account if present
  if [ "$service_account" != "null" ]; then
    deploy_cmd="${deploy_cmd} --service-account=${service_account}"
  fi
  
  # Add environment variables if present
  if [ "$environment_variables" != "{}" ] && [ "$environment_variables" != "null" ]; then
    # Convert JSON to env-vars format
    local env_vars_str=""
    local env_vars_json="${source_dir}/${function_name}-env-vars.json"
    echo "$environment_variables" > "$env_vars_json"
    
    env_vars_str=$(jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")' "$env_vars_json")
    if [ -n "$env_vars_str" ]; then
      deploy_cmd="${deploy_cmd} --set-env-vars=${env_vars_str}"
    fi
  fi
  
  # Add appropriate trigger
  if [ "$trigger_http" = "true" ]; then
    deploy_cmd="${deploy_cmd} --trigger-http"
    
    # Check for additional HTTP trigger settings
    local allow_unauthenticated=$(jq -r '.httpsTrigger.securityLevel // "" | contains("SECURE_ALWAYS") | not' "${details_file}")
    if [ "$allow_unauthenticated" = "true" ]; then
      deploy_cmd="${deploy_cmd} --allow-unauthenticated"
    fi
  elif [ -n "$event_trigger_type" ]; then
    deploy_cmd="${deploy_cmd} --trigger-event=${event_trigger_type} --trigger-resource=${event_trigger_resource}"
    
    # Check for additional event trigger settings
    local event_trigger_service=$(jq -r '.eventTrigger.service // ""' "${details_file}")
    if [ -n "$event_trigger_service" ] && [ "$event_trigger_service" != "null" ]; then
      deploy_cmd="${deploy_cmd} --trigger-event-service=${event_trigger_service}"
    fi
  else
    handle_error "Could not determine trigger type for function: ${function_name}"
  fi
  
  # Add source code path
  deploy_cmd="${deploy_cmd} --source=${source_dir}/${function_name}-source"
  
  # Execute the deployment command
  if [ "$DRY_RUN" = "true" ]; then
    log "DRY RUN: Would execute: ${deploy_cmd}"
    echo -e "${YELLOW}DRY RUN: Would deploy function ${function_name} to ${target_region}${NC}"
  else
    log "Executing: ${deploy_cmd}"
    if ! eval "${deploy_cmd}"; then
      handle_error "Failed to deploy function: ${function_name} to region: ${target_region}"
    fi
    log "Function ${function_name} successfully deployed to ${target_region}"
    echo -e "${GREEN}Function ${function_name} successfully deployed to ${target_region}${NC}"
  fi
}

# Function to verify deployment
verify_function() {
  local function_name="$1"
  local region="$2"
  
  log "Verifying function: ${function_name} in region: ${region}"
  
  if [ "$DRY_RUN" = "true" ]; then
    log "DRY RUN: Would verify function ${function_name} in region ${region}"
    return 0
  fi
  
  # Attempt to describe the function to ensure it exists
  if ! gcloud functions describe "${function_name}" --region="${region}" &> /dev/null; then
    handle_error "Function verification failed: ${function_name} not found in region: ${region}"
  fi
  
  # Get the status of the function
  local status=$(gcloud functions describe "${function_name}" --region="${region}" --format="value(status)")
  
  if [ "$status" != "ACTIVE" ]; then
    handle_error "Function verification failed: ${function_name} in region ${region} has status: ${status}"
  fi
  
  log "Function ${function_name} successfully verified in region ${region}"
  echo -e "${GREEN}Function ${function_name} is active in region ${region}${NC}"
}

# Main migration procedure
main() {
  log "Starting Cloud Functions migration from ${SOURCE_REGION} to ${TARGET_REGION}" "INFO"
  echo -e "${BLUE}=== Starting Cloud Functions Migration ===${NC}"
  echo -e "${BLUE}From: ${SOURCE_REGION}${NC}"
  echo -e "${BLUE}To: ${TARGET_REGION}${NC}"
  echo -e "${BLUE}================================================${NC}"
  
  # Check prerequisites
  check_prerequisites
  
  # Create temporary directory for function data
  mkdir -p "${TEMP_DIR}"
  log "Created temporary directory: ${TEMP_DIR}"
  
  # Get list of functions in source region
  log "Listing functions in ${SOURCE_REGION}..."
  local function_list=$(gcloud functions list --region="${SOURCE_REGION}" --format="value(name)")
  
  if [ -z "$function_list" ]; then
    log "No functions found in region: ${SOURCE_REGION}" "WARNING"
    echo -e "${YELLOW}No functions found in region: ${SOURCE_REGION}${NC}"
    exit 0
  fi
  
  # Filterable list for showing progress
  local total_functions_to_migrate=0
  local functions_processed=0
  
  # Find specified functions to migrate
  local functions_to_process=()
  for func in $function_list; do
    if is_in_migration_list "$func"; then
      functions_to_process+=("$func")
      ((total_functions_to_migrate++))
    fi
  done
  
  if [ ${#functions_to_process[@]} -eq 0 ]; then
    log "None of the specified functions found in region: ${SOURCE_REGION}" "WARNING"
    echo -e "${YELLOW}None of the specified functions found in region: ${SOURCE_REGION}${NC}"
    exit 0
  fi
  
  log "Found ${total_functions_to_migrate} functions to migrate."
  echo -e "${BLUE}Found ${total_functions_to_migrate} functions to migrate.${NC}"
  
  # Process each function
  for function_name in "${functions_to_process[@]}"; do
    ((functions_processed++))
    echo -e "${BLUE}[${functions_processed}/${total_functions_to_migrate}] Processing: ${function_name}${NC}"
    
    # Check if function already exists in target region
    if function_exists "${function_name}" "${TARGET_REGION}"; then
      log "Function ${function_name} already exists in ${TARGET_REGION}. Skipping." "WARNING"
      echo -e "${YELLOW}Function ${function_name} already exists in ${TARGET_REGION}. Skipping.${NC}"
      continue
    fi
    
    # Get function details
    get_function_details "${function_name}" "${SOURCE_REGION}" "${TEMP_DIR}/${function_name}-details.json"
    
    # Download source code
    download_function_source "${function_name}" "${SOURCE_REGION}" "${TEMP_DIR}"
    
    # Deploy function to target region
    deploy_function "${function_name}" "${SOURCE_REGION}" "${TARGET_REGION}" "${TEMP_DIR}/${function_name}-details.json" "${TEMP_DIR}"
    
    # Verify the function deployment
    verify_function "${function_name}" "${TARGET_REGION}"
    
    log "Function ${function_name} successfully migrated from ${SOURCE_REGION} to ${TARGET_REGION}"
    echo -e "${GREEN}Function ${function_name} successfully migrated from ${SOURCE_REGION} to ${TARGET_REGION}${NC}"
  done
  
  # Summary
  log "Migration completed. ${functions_processed} of ${total_functions_to_migrate} functions processed."
  echo -e "${GREEN}Migration completed. ${functions_processed} of ${total_functions_to_migrate} functions processed.${NC}"
  
  # Cleanup temporary directory
  if [ "$DRY_RUN" = "false" ]; then
    log "Cleaning up temporary directory: ${TEMP_DIR}"
    rm -rf "${TEMP_DIR}"
    log "Temporary directory removed."
  fi
  
  log "Migration process completed successfully."
  echo -e "${GREEN}Migration process completed successfully.${NC}"
}

# Make the script executable
chmod +x "$0"

# Execute the main function
main "$@"

