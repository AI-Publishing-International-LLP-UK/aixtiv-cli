#!/bin/bash

# ASOOS UI Update Script
# This script updates the ASOOS UI while preserving configuration

# Helper functions
log_info() {
  echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
  echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_error() {
  echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_warning() {
  echo -e "\033[0;33m[WARNING]\033[0m $1"
}

# Check for required tools
if ! command -v curl &> /dev/null; then
  log_error "curl is not installed. Please install curl before running this script."
  exit 1
fi

if ! command -v unzip &> /dev/null; then
  log_error "unzip is not installed. Please install unzip before running this script."
  exit 1
fi

# Configuration
UPDATE_URL="${1:-https://asoos.2100.cool/updates/latest.zip}"
BACKUP_DIR="./backups/$(date +%Y%m%d%H%M%S)"
TEMP_DIR="./temp_update"

# Create backup directory
log_info "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Backup current configuration
log_info "Backing up current configuration..."
cp mcp-config.json "$BACKUP_DIR/"
cp gateway-server.js "$BACKUP_DIR/"
cp start.sh "$BACKUP_DIR/"
cp package.json "$BACKUP_DIR/"

# Check if there are custom files that should be preserved
if [ -f ".preserve-files" ]; then
  log_info "Backing up custom files listed in .preserve-files..."
  while IFS= read -r file; do
    # Skip comments and empty lines
    [[ "$file" =~ ^#.*$ || -z "$file" ]] && continue
    
    if [ -f "$file" ]; then
      # Create directory structure in backup
      mkdir -p "$BACKUP_DIR/$(dirname "$file")"
      cp "$file" "$BACKUP_DIR/$file"
      log_info "Backed up custom file: $file"
    else
      log_warning "Custom file not found: $file"
    fi
  done < ".preserve-files"
fi

# Create temp directory
log_info "Creating temporary directory for update..."
mkdir -p "$TEMP_DIR"

# Download update
log_info "Downloading update from $UPDATE_URL..."
if ! curl -sSL "$UPDATE_URL" -o "$TEMP_DIR/update.zip"; then
  log_error "Failed to download update. Please check your internet connection and the update URL."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Extract update
log_info "Extracting update..."
if ! unzip -q "$TEMP_DIR/update.zip" -d "$TEMP_DIR"; then
  log_error "Failed to extract update. The update file may be corrupted."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Update the UI files (public directory)
log_info "Updating UI files..."
if [ -d "$TEMP_DIR/public" ]; then
  # Backup current UI
  mkdir -p "$BACKUP_DIR/public"
  cp -r public/* "$BACKUP_DIR/public/" 2>/dev/null || true
  
  # Replace with new UI
  rm -rf public
  mkdir -p public
  cp -r "$TEMP_DIR/public"/* public/
  log_success "UI files updated successfully."
else
  log_warning "No UI files found in update. Skipping UI update."
fi

# Restore configuration files
log_info "Restoring configuration files..."
for file in mcp-config.json start.sh; do
  if [ ! -f "$TEMP_DIR/$file" ]; then
    log_info "Keeping existing $file..."
  elif [ -f "$file" ]; then
    log_info "Restoring $file from backup..."
    cp "$BACKUP_DIR/$file" .
  fi
done

# Update server code if present in update
if [ -f "$TEMP_DIR/gateway-server.js" ]; then
  log_info "Updating server code..."
  cp "$TEMP_DIR/gateway-server.js" .
  log_success "Server code updated."
else
  log_warning "No server code found in update. Keeping existing server code."
fi

# Update package.json if present in update
if [ -f "$TEMP_DIR/package.json" ]; then
  log_info "Updating package.json..."
  cp "$TEMP_DIR/package.json" .
  log_info "Installing dependencies..."
  npm install --no-fund --no-audit --loglevel=error
  log_success "Dependencies updated."
fi

# Restore custom files if any
if [ -f ".preserve-files" ]; then
  log_info "Restoring custom files..."
  while IFS= read -r file; do
    # Skip comments and empty lines
    [[ "$file" =~ ^#.*$ || -z "$file" ]] && continue
    
    if [ -f "$BACKUP_DIR/$file" ]; then
      # Create directory structure
      mkdir -p "$(dirname "$file")"
      cp "$BACKUP_DIR/$file" "$file"
      log_info "Restored custom file: $file"
    fi
  done < ".preserve-files"
fi

# Clean up
log_info "Cleaning up..."
rm -rf "$TEMP_DIR"

log_success "Update completed successfully!"
log_info "A backup of your previous configuration is stored in $BACKUP_DIR"
log_info "To start the updated server, run: ./start.sh"

# Offer to restart the server
read -p "Would you like to restart the server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log_info "Restarting server..."
  ./start.sh
fi