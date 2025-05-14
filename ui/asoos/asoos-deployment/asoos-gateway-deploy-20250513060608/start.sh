#!/bin/bash

# Start script for ASOOS with MCP integration
export GATEWAY_ENDPOINT="https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway"
export NODE_ENV="production"
export PORT="3002"

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

# Check if dependencies are installed
if ! command -v node &> /dev/null; then
  log_error "Node.js is not installed. Please install Node.js before running this script."
  exit 1
fi

# Check if required files exist
if [ ! -f "gateway-server.js" ]; then
  log_error "gateway-server.js not found. Please make sure you're in the right directory."
  exit 1
fi

if [ ! -f "mcp-config.json" ]; then
  log_error "mcp-config.json not found. Configuration is missing."
  exit 1
fi

# Check if public directory exists
if [ ! -d "public" ]; then
  log_warning "public directory not found. UI may not be available."
fi

# Verify configuration
log_info "Verifying configuration..."
if ! node -e "try { JSON.parse(require('fs').readFileSync('mcp-config.json')); console.log('Valid JSON'); } catch(e) { console.error(e); process.exit(1); }"; then
  log_error "Invalid configuration in mcp-config.json"
  exit 1
fi

# Check for required npm modules
log_info "Checking dependencies..."
if [ ! -d "node_modules/express" ]; then
  log_warning "Express module not found. Attempting to install..."
  npm install express --no-fund --no-audit --loglevel=error
  
  if [ $? -ne 0 ]; then
    log_error "Failed to install express. Please run 'npm install express' manually."
    exit 1
  else
    log_success "Express installed successfully."
  fi
fi

# Start the server
log_info "Starting ASOOS server with MCP integration..."
log_info "Gateway endpoint: $GATEWAY_ENDPOINT"
log_info "Server port: $PORT"

# Find the process ID of any already running server on this port
EXISTING_PID=$(lsof -t -i:$PORT)
if [ ! -z "$EXISTING_PID" ]; then
  log_warning "A process is already running on port $PORT. Attempting to stop it..."
  kill -15 $EXISTING_PID
  sleep 2
fi

# Start the server
node gateway-server.js

# Capture the exit code
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  log_error "Server failed to start with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi