#!/bin/bash

# Start script for ASOOS with CTTT integration
export GATEWAY_ENDPOINT="https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway"
export NODE_ENV="production"
export PORT="3009"
export TELEMETRY_ENABLED="true"
export CTTT_BUILD_ID="20250513065718"
export MOCK_GATEWAY="true"

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

# Check dependencies
if ! command -v node &> /dev/null; then
  log_error "Node.js is required but not installed."
  exit 1
fi

# Verify required files
for file in gateway-server.js mcp-config.json gateway-integration.js; do
  if [ ! -f "$file" ]; then
    log_error "Required file not found: $file"
    exit 1
  fi
done

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log_info "Installing dependencies..."
  npm install --production
fi

# Start the application
log_info "Starting ASOOS UI application..."
log_info "Environment: production"
log_info "Gateway endpoint: https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway"
log_info "Build ID: 20250513065718"

# Notify start to telemetry
curl -s -X POST "https://us-west1-api-for-warp-drive.cloudfunctions.net/cttt-telemetry/deployment-event" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "application_started",
    "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
    "metadata": {
      "domain": "asoos.2100.cool",
      "environment": "production",
      "buildId": "20250513065718"
    }
  }' > /dev/null || log_warning "Telemetry send failed"

# Clear any process.pid file if it exists
if [ -f "process.pid" ]; then
  log_info "Removing stale process.pid file"
  rm process.pid
fi

# Test if port is already in use
if lsof -i :3009 > /dev/null 2>&1; then
  log_error "Port 3009 is already in use. Please free the port or change PORT in this script."
  exit 1
fi

# Start the server with proper error handling
log_info "Starting server on port 3009 in mock gateway mode..."
node gateway-server.js
