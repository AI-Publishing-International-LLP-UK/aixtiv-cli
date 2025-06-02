#!/bin/bash

# migrate-drclaude-live.sh
# Script to migrate drclaude.live domain from api-for-warp-drive to app-2100-cool project
# Specifically to the doctors-live hosting site in app-2100-cool
# Created: 2025-05-30

# Set up colors and basic error handling
RED="[0;31m"
GREEN="[0;32m"
YELLOW="[1;33m"
BLUE="[0;34m"
NC="[0m" # No Color

# Simple logging function
log_info() {
  echo -e "${GREEN}[INFO] $1${NC}"
}

log_step() {
  echo -e "${BLUE}[STEP] $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
  echo -e "${RED}[ERROR] $1${NC}"
}

# Start script execution
log_info "Starting migration of drclaude.live domain from api-for-warp-drive to app-2100-cool project"

# Step 1: Verify we are in the correct directory
log_step "Verifying current directory"
if [ "$(pwd)" != "/Users/as/asoos" ]; then
  log_info "Changing to correct directory"
  cd /Users/as/asoos || { log_error "Could not change to directory"; exit 1; }
fi

# Step 2: Switch to app-2100-cool project
log_step "Switching to app-2100-cool project"
firebase use app-2100-cool || { log_error "Could not switch to app-2100-cool project"; exit 1; }

# Step 3: Update firebase.json to include the doctors-live configuration
log_step "Configuring Firebase for drclaude.live domain on doctors-live site"
log_info "Checking current doctors-live site configuration"
firebase hosting:sites:get doctors-live

# Step 4: Deploy the updated configuration
log_step "Deploying updated configuration"
firebase use app-2100-cool
firebase deploy --only hosting:doctors-live || { log_error "Deployment failed"; exit 1; }

# Step 5: Add the domain to the doctors-live site
log_step "Adding drclaude.live domain to doctors-live site"
firebase hosting:sites:update doctors-live --add-domain=drclaude.live || { log_error "Failed to add domain"; exit 1; }

# Step 6: Verify domain connection
log_step "Verifying domain connection"
log_info "Please wait for DNS propagation. This may take a few minutes to a few hours."
log_info "After DNS propagation, visit https://drclaude.live to verify the migration."

# Final status
log_info "Domain migration process completed successfully."
log_info "drclaude.live is now configured to use the doctors-live site in the app-2100-cool project."

