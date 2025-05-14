#!/bin/bash

# CICD CTTT Pipeline for SallyPort Authentication Implementation
# This script provides a comprehensive integration, deployment, and telemetry framework
# for the SallyPort authentication module in the ASOOS Gateway implementation.

# Set strict error handling
set -euo pipefail

# Color formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="$(pwd)"
LOGS_DIR="${DEPLOYMENT_DIR}/logs"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="${LOGS_DIR}/deployment-${TIMESTAMP}.log"
TELEMETRY_FILE="${LOGS_DIR}/telemetry-${TIMESTAMP}.json"
VERSION="1.0.0"

# Required environment variables with defaults
DOMAIN=${DOMAIN:-"asoos.2100.cool"}
NODE_ENV=${NODE_ENV:-"production"}
PORT=${PORT:-3002}
SALLYPORT_ENDPOINT=${SALLYPORT_ENDPOINT:-"https://sallyport.2100.cool/api/v1"}

# Create logs directory if it doesn't exist
mkdir -p "${LOGS_DIR}"

# Initialize log file
echo "CICD CTTT Deployment Log - ${TIMESTAMP}" > "${LOG_FILE}"
echo "----------------------------------------" >> "${LOG_FILE}"
echo "SallyPort Authentication Module Deployment" >> "${LOG_FILE}"
echo "Version: ${VERSION}" >> "${LOG_FILE}"
echo "Environment: ${NODE_ENV}" >> "${LOG_FILE}"
echo "Domain: ${DOMAIN}" >> "${LOG_FILE}"
echo "----------------------------------------" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

# Initialize telemetry file
cat > "${TELEMETRY_FILE}" << EOL
{
  "deployment": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "version": "${VERSION}",
    "environment": "${NODE_ENV}",
    "domain": "${DOMAIN}",
    "components": [],
    "status": "started",
    "events": []
  }
}
EOL

# Logging function
log() {
  local level=$1
  local message=$2
  local color=$NC
  
  case $level in
    "INFO")
      color=$BLUE
      ;;
    "SUCCESS")
      color=$GREEN
      ;;
    "WARNING")
      color=$YELLOW
      ;;
    "ERROR")
      color=$RED
      ;;
    "TELEMETRY")
      color=$PURPLE
      ;;
  esac
  
  # Log to console with color
  echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] ${message}${NC}"
  
  # Log to file without color
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] ${message}" >> "${LOG_FILE}"
}

# Add telemetry event
add_telemetry_event() {
  local event_type=$1
  local event_message=$2
  local event_data=$3
  
  # Add to deployment events array in telemetry file using jq
  # First, create a temporary file with the new event
  local temp_file="${LOGS_DIR}/temp_event_${TIMESTAMP}.json"
  
  cat > "${temp_file}" << EOL
{
  "type": "${event_type}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "message": "${event_message}",
  "data": ${event_data}
}
EOL
  
  # Use node to append the event to the telemetry file
  node -e "
    const fs = require('fs');
    const telemetry = JSON.parse(fs.readFileSync('${TELEMETRY_FILE}', 'utf8'));
    const newEvent = JSON.parse(fs.readFileSync('${temp_file}', 'utf8'));
    telemetry.deployment.events.push(newEvent);
    fs.writeFileSync('${TELEMETRY_FILE}', JSON.stringify(telemetry, null, 2));
  "
  
  # Remove temporary file
  rm -f "${temp_file}"
  
  log "TELEMETRY" "Added telemetry event: ${event_type} - ${event_message}"
}

# Exit handler
cleanup() {
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    log "SUCCESS" "Deployment completed successfully"
    # Update telemetry file with success status
    node -e "
      const fs = require('fs');
      const telemetry = JSON.parse(fs.readFileSync('${TELEMETRY_FILE}', 'utf8'));
      telemetry.deployment.status = 'success';
      telemetry.deployment.completedAt = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
      fs.writeFileSync('${TELEMETRY_FILE}', JSON.stringify(telemetry, null, 2));
    "
  else
    log "ERROR" "Deployment failed with exit code ${exit_code}"
    # Update telemetry file with error status
    node -e "
      const fs = require('fs');
      const telemetry = JSON.parse(fs.readFileSync('${TELEMETRY_FILE}', 'utf8'));
      telemetry.deployment.status = 'failed';
      telemetry.deployment.failedAt = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
      telemetry.deployment.errorCode = ${exit_code};
      fs.writeFileSync('${TELEMETRY_FILE}', JSON.stringify(telemetry, null, 2));
    "
  fi
}

# Register cleanup handler
trap cleanup EXIT

# Step 1: Verify environment
log "INFO" "Verifying environment..."

# Check for required tools
REQUIRED_TOOLS=("node" "npm" "jq")
for tool in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v $tool &> /dev/null; then
    log "ERROR" "Required tool ${tool} is not installed"
    exit 1
  fi
done

# Check node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
log "INFO" "Node version: ${NODE_VERSION}"

# Check npm version
NPM_VERSION=$(npm -v)
log "INFO" "NPM version: ${NPM_VERSION}"

# Add component information to telemetry
node -e "
  const fs = require('fs');
  const telemetry = JSON.parse(fs.readFileSync('${TELEMETRY_FILE}', 'utf8'));
  telemetry.deployment.components.push({
    name: 'node',
    version: '${NODE_VERSION}'
  });
  telemetry.deployment.components.push({
    name: 'npm',
    version: '${NPM_VERSION}'
  });
  fs.writeFileSync('${TELEMETRY_FILE}', JSON.stringify(telemetry, null, 2));
"

add_telemetry_event "environment_check" "Environment verified successfully" "{\"nodeVersion\": \"${NODE_VERSION}\", \"npmVersion\": \"${NPM_VERSION}\"}"

# Step 2: Verify files exist
log "INFO" "Verifying required files..."

REQUIRED_FILES=("sallyport-auth.js" "gateway-server.js" "mcp-config.json")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "${DEPLOYMENT_DIR}/${file}" ]; then
    log "ERROR" "Required file ${file} not found"
    add_telemetry_event "file_check_failure" "Required file ${file} not found" "{\"file\": \"${file}\"}"
    exit 1
  fi
done

log "SUCCESS" "All required files found"
add_telemetry_event "file_check_success" "All required files verified" "{\"files\": [\"sallyport-auth.js\", \"gateway-server.js\", \"mcp-config.json\"]}"

# Step 3: Install dependencies
log "INFO" "Installing dependencies..."

# Create a backup of package.json if it exists
if [ -f "package.json" ]; then
  cp package.json package.json.bak.${TIMESTAMP}
  log "INFO" "Backed up package.json to package.json.bak.${TIMESTAMP}"
fi

# Make sure we have the required dependencies
REQUIRED_DEPS=("winston" "helmet" "compression" "cors" "express")
MISSING_DEPS=()

for dep in "${REQUIRED_DEPS[@]}"; do
  # Check if the dependency is already installed
  if ! npm list --depth=0 | grep -q "$dep"; then
    MISSING_DEPS+=("$dep")
  fi
done

# Install missing dependencies
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  log "INFO" "Installing missing dependencies: ${MISSING_DEPS[*]}"
  npm install --save "${MISSING_DEPS[@]}" >> "${LOG_FILE}" 2>&1

  # Check for installation errors
  if [ $? -ne 0 ]; then
    log "ERROR" "Failed to install dependencies"
    add_telemetry_event "dependency_installation_failure" "Failed to install dependencies" "{\"dependencies\": [\"${MISSING_DEPS[*]}\"]}"
    exit 1
  fi
  
  log "SUCCESS" "Dependencies installed successfully"
  add_telemetry_event "dependency_installation_success" "Dependencies installed successfully" "{\"dependencies\": [\"${MISSING_DEPS[*]}\"]}"
else
  log "SUCCESS" "All dependencies already installed"
  add_telemetry_event "dependency_check_success" "All dependencies already installed" "{}"
fi

# Step 4: Static code analysis using ESLint
log "INFO" "Running static code analysis..."

# Check if ESLint is installed, if not install it
if ! npm list -g eslint &> /dev/null && ! npm list eslint &> /dev/null; then
  log "INFO" "ESLint not found, installing temporarily..."
  npm install --no-save eslint eslint-plugin-node >> "${LOG_FILE}" 2>&1
fi

# Create a temporary ESLint config if it doesn't exist
if [ ! -f ".eslintrc.js" ]; then
  cat > ".eslintrc.js" << EOL
module.exports = {
  env: {
    node: true,
    es6: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn'
  }
};
EOL
  log "INFO" "Created temporary ESLint config"
fi

# Run ESLint on our files
ESLINT_CMD="npx eslint"
if command -v eslint &> /dev/null; then
  ESLINT_CMD="eslint"
fi

${ESLINT_CMD} --no-eslintrc --config .eslintrc.js sallyport-auth.js gateway-server.js --quiet > "${LOGS_DIR}/eslint-report-${TIMESTAMP}.txt" 2>&1
ESLINT_EXIT_CODE=$?

if [ $ESLINT_EXIT_CODE -eq 0 ]; then
  log "SUCCESS" "No linting errors found"
  add_telemetry_event "linting_success" "No linting errors found" "{\"lintReport\": \"eslint-report-${TIMESTAMP}.txt\"}"
else
  log "WARNING" "Linting found issues, see ${LOGS_DIR}/eslint-report-${TIMESTAMP}.txt for details"
  add_telemetry_event "linting_warnings" "Linting found issues" "{\"lintReport\": \"eslint-report-${TIMESTAMP}.txt\", \"exitCode\": ${ESLINT_EXIT_CODE}}"
  # Continue despite linting issues
fi

# Step 5: Check for required environment variables
log "INFO" "Checking environment variables..."

# Create a .env file if it doesn't exist
if [ ! -f ".env" ]; then
  cat > ".env" << EOL
# SallyPort Authentication Configuration
NODE_ENV=${NODE_ENV}
PORT=${PORT}
DOMAIN=${DOMAIN}
SALLYPORT_ENDPOINT=${SALLYPORT_ENDPOINT}
# For production, set these securely:
# SALLYPORT_API_KEY=your-api-key-here
EOL
  log "INFO" "Created .env file with default values"
  add_telemetry_event "env_file_created" "Created .env file with default values" "{}"
else
  log "INFO" "Using existing .env file"
fi

# Step 6: Run tests for the SallyPort module
log "INFO" "Running tests for SallyPort authentication module..."

# Create a basic test file if it doesn't exist
TESTS_DIR="${DEPLOYMENT_DIR}/tests"
mkdir -p "${TESTS_DIR}"

# Check if the test file already exists
if [ ! -f "${TESTS_DIR}/sallyport-auth.test.js" ]; then
  cat > "${TESTS_DIR}/sallyport-auth.test.js" << EOL
/**
 * Basic tests for SallyPort authentication module
 */
const assert = require('assert');
const SallyPortAuth = require('../sallyport-auth');

// Create a mock logger for testing
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
};

describe('SallyPort Authentication Module', () => {
  let sallyPort;
  
  before(() => {
    // Initialize SallyPort with test configuration
    sallyPort = new SallyPortAuth({
      serviceId: 'test-service',
      apiEndpoint: 'https://test-endpoint.example.com',
      logger: mockLogger
    });
  });
  
  it('should create a challenge for authentication', async () => {
    const challenge = await sallyPort.createChallenge('test@example.com');
    assert.ok(challenge.challengeId, 'Challenge ID should be present');
    assert.strictEqual(challenge.status, 'pending', 'Challenge status should be pending');
    assert.ok(challenge.expiresAt, 'Challenge expiration should be set');
  });
  
  it('should verify a challenge and create a session', async () => {
    // First create a challenge
    const challenge = await sallyPort.createChallenge('test@example.com');
    
    // Then verify it
    const result = await sallyPort.verifyChallenge(challenge.challengeId, {
      biometricResponse: 'test-biometric-response',
      deviceInfo: { deviceId: 'test-device' }
    });
    
    assert.strictEqual(result.success, true, 'Authentication should succeed');
    assert.ok(result.token, 'Session token should be present');
    assert.ok(result.user, 'User object should be present');
    assert.strictEqual(result.user.email, 'test@example.com', 'User email should match');
  });
  
  it('should verify a valid session', async () => {
    // First create a challenge and authenticate
    const challenge = await sallyPort.createChallenge('test@example.com');
    const authResult = await sallyPort.verifyChallenge(challenge.challengeId, {
      biometricResponse: 'test-biometric-response'
    });
    
    // Then verify the session
    const verification = await sallyPort.verifySession(authResult.token);
    
    assert.strictEqual(verification.valid, true, 'Session verification should succeed');
    assert.ok(verification.userId, 'User ID should be present');
    assert.ok(verification.expiresAt, 'Session expiration should be present');
  });
  
  it('should logout successfully', async () => {
    // First create a challenge and authenticate
    const challenge = await sallyPort.createChallenge('test@example.com');
    const authResult = await sallyPort.verifyChallenge(challenge.challengeId, {});
    
    // Then logout
    const logoutResult = await sallyPort.logout(authResult.token);
    
    assert.strictEqual(logoutResult.success, true, 'Logout should succeed');
    
    // Verify the session is no longer valid
    try {
      const verification = await sallyPort.verifySession(authResult.token);
      assert.strictEqual(verification.valid, false, 'Session should be invalid after logout');
    } catch (error) {
      // Expected error because the session doesn't exist
      assert.ok(error.message.includes('not found'), 'Error message should indicate session not found');
    }
  });
});
EOL
  log "INFO" "Created basic test file for SallyPort authentication module"
fi

# Run the tests
log "INFO" "Running SallyPort authentication tests..."

# Check if Mocha is installed, if not install it
if ! npm list -g mocha &> /dev/null && ! npm list mocha &> /dev/null; then
  log "INFO" "Mocha not found, installing temporarily..."
  npm install --no-save mocha >> "${LOG_FILE}" 2>&1
fi

# Run the tests
TEST_CMD="npx mocha"
if command -v mocha &> /dev/null; then
  TEST_CMD="mocha"
fi

${TEST_CMD} "${TESTS_DIR}/sallyport-auth.test.js" --reporter spec > "${LOGS_DIR}/test-report-${TIMESTAMP}.txt" 2>&1
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  log "SUCCESS" "All tests passed"
  add_telemetry_event "tests_success" "All tests passed" "{\"testReport\": \"test-report-${TIMESTAMP}.txt\"}"
else
  log "ERROR" "Tests failed, see ${LOGS_DIR}/test-report-${TIMESTAMP}.txt for details"
  add_telemetry_event "tests_failure" "Tests failed" "{\"testReport\": \"test-report-${TIMESTAMP}.txt\", \"exitCode\": ${TEST_EXIT_CODE}}"
  # Don't exit here, we'll still try to deploy
fi

# Step 7: Create deployment artifacts
log "INFO" "Creating deployment artifacts..."

# Create a deployment directory
ARTIFACTS_DIR="${DEPLOYMENT_DIR}/artifacts-${TIMESTAMP}"
mkdir -p "${ARTIFACTS_DIR}"

# Copy necessary files
cp sallyport-auth.js gateway-server.js mcp-config.json package.json .env "${ARTIFACTS_DIR}/"
mkdir -p "${ARTIFACTS_DIR}/public"
cp -R public/* "${ARTIFACTS_DIR}/public/" 2>/dev/null || true

# Create a deployment README
cat > "${ARTIFACTS_DIR}/README.md" << EOL
# SallyPort Authentication Deployment

This deployment package includes the SallyPort authentication module for ASOOS Gateway.

## Components

- \`sallyport-auth.js\`: SallyPort authentication module
- \`gateway-server.js\`: Main gateway server with SallyPort integration
- \`mcp-config.json\`: MCP configuration

## Deployment Instructions

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Set environment variables in .env or use environment:
   - NODE_ENV: Environment (production, development)
   - PORT: Server port
   - DOMAIN: Service domain
   - SALLYPORT_ENDPOINT: SallyPort API endpoint
   - SALLYPORT_API_KEY: API key for SallyPort (secure)

3. Start the server:
   \`\`\`
   node gateway-server.js
   \`\`\`

## Deployment Date

Deployed on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Version

${VERSION}
EOL

# Create a deployment package
PACKAGE_NAME="sallyport-auth-deployment-${TIMESTAMP}.tar.gz"
tar -czf "${LOGS_DIR}/${PACKAGE_NAME}" -C "${ARTIFACTS_DIR}" .

log "SUCCESS" "Deployment artifacts created: ${LOGS_DIR}/${PACKAGE_NAME}"
add_telemetry_event "artifacts_created" "Deployment artifacts created" "{\"packageName\": \"${PACKAGE_NAME}\"}"

# Step 8: Deploy (or simulate deployment)
log "INFO" "Deploying SallyPort authentication module..."

# For demonstration, we'll just check if the server starts correctly
log "INFO" "Testing server startup..."

# Run the server in the background and wait a short time to see if it starts
node -e "
try {
  // Simulate server startup without actually starting a server
  const SallyPortAuth = require('./sallyport-auth');
  const express = require('express');
  const app = express();
  
  // Import required modules to check they load correctly
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('./mcp-config.json', 'utf8'));
  
  // Initialize SallyPort
  const sallyPort = new SallyPortAuth({
    serviceId: config.gateway.serviceId,
    apiEndpoint: process.env.SALLYPORT_ENDPOINT || 'https://sallyport.2100.cool/api/v1'
  });
  
  // Check SallyPort has the required methods
  if (!sallyPort.createChallenge || !sallyPort.verifyChallenge || 
      !sallyPort.verifySession || !sallyPort.logout || !sallyPort.refreshSession) {
    throw new Error('SallyPort module is missing required methods');
  }
  
  console.log('Server startup check successful');
  process.exit(0);
} catch (error) {
  console.error('Server startup check failed:', error.message);
  process.exit(1);
}
" > "${LOGS_DIR}/server-check-${TIMESTAMP}.log" 2>&1

SERVER_CHECK_EXIT_CODE=$?

if [ $SERVER_CHECK_EXIT_CODE -eq 0 ]; then
  log "SUCCESS" "Server startup check passed"
  add_telemetry_event "server_startup_check_success" "Server startup check passed" "{\"log\": \"server-check-${TIMESTAMP}.log\"}"
else
  log "ERROR" "Server startup check failed, see ${LOGS_DIR}/server-check-${TIMESTAMP}.log for details"
  add_telemetry_event "server_startup_check_failure" "Server startup check failed" "{\"log\": \"server-check-${TIMESTAMP}.log\", \"exitCode\": ${SERVER_CHECK_EXIT_CODE}}"
  # Don't exit here, we'll create a deployment summary anyway
fi

# Step 9: Create deployment summary
log "INFO" "Creating deployment summary..."

# Create a deployment summary file
SUMMARY_FILE="${LOGS_DIR}/deployment-summary-${TIMESTAMP}.md"

cat > "${SUMMARY_FILE}" << EOL
# SallyPort Authentication Deployment Summary

## Deployment Details

- **Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Version**: ${VERSION}
- **Environment**: ${NODE_ENV}
- **Domain**: ${DOMAIN}

## Components

- SallyPort Authentication Module
- Gateway Server with SallyPort Integration
- MCP Configuration

## Deployment Results

- **Static Analysis**: ${ESLINT_EXIT_CODE -eq 0 ? "Passed" : "Warnings (see report)"}
- **Tests**: ${TEST_EXIT_CODE -eq 0 ? "Passed" : "Failed (see report)"}
- **Server Check**: ${SERVER_CHECK_EXIT_CODE -eq 0 ? "Passed" : "Failed (see report)"}
- **Deployment Package**: ${PACKAGE_NAME}

## Logs and Reports

- Deployment Log: deployment-${TIMESTAMP}.log
- Telemetry Data: telemetry-${TIMESTAMP}.json
- ESLint Report: eslint-report-${TIMESTAMP}.txt
- Test Report: test-report-${TIMESTAMP}.txt
- Server Check Log: server-check-${TIMESTAMP}.log

## Next Steps

1. Deploy the package to the target environment
2. Verify SallyPort authentication is working correctly
3. Set up monitoring for authentication events
4. Set up alerts for authentication failures

## Notes

The SallyPort Authentication Module provides a secure, passwordless authentication system with challenge-based verification, session management, and secure logout functionality.
EOL

log "SUCCESS" "Deployment summary created: ${SUMMARY_FILE}"
add_telemetry_event "summary_created" "Deployment summary created" "{\"summaryFile\": \"deployment-summary-${TIMESTAMP}.md\"}"

# Final step: Output summary
log "INFO" "Deployment process completed"
log "INFO" "Deployment summary: ${SUMMARY_FILE}"
log "INFO" "Deployment package: ${LOGS_DIR}/${PACKAGE_NAME}"
log "INFO" "Telemetry data: ${TELEMETRY_FILE}"

# Print nice ASCII art success message
echo -e "\n${GREEN}"
echo "  ____                            _____       _ _            "
echo " / ___|  __ _ _ __ _   _ ______ |_   _|__   (_) |_ ___  ___ "
echo " \___ \ / _\` | '__| | | |______|  | |/ _ \  | | __/ _ \/ _ \\"
echo "  ___) | (_| | |  | |_| |         | | (_) | | | ||  __/  __/"
echo " |____/ \__,_|_|   \__, |         |_|\___/  |_|\__\___|\___|"
echo "                   |___/                                     "
echo -e "${NC}\n"

echo -e "${GREEN}SallyPort Authentication Module CICD CTTT Deployment ${VERSION}${NC}"
echo -e "${GREEN}----------------------------------------------------------${NC}"
echo -e "${BLUE}Deployment completed on:${NC} $(date)"
echo -e "${BLUE}Environment:${NC} ${NODE_ENV}"
echo -e "${BLUE}Domain:${NC} ${DOMAIN}"
echo -e "${BLUE}Status:${NC} ${SERVER_CHECK_EXIT_CODE -eq 0 ? "${GREEN}SUCCESS${NC}" : "${YELLOW}COMPLETED WITH WARNINGS${NC}"}"
echo ""
echo -e "${BLUE}Deployment Summary:${NC} ${SUMMARY_FILE}"
echo -e "${BLUE}Deployment Package:${NC} ${LOGS_DIR}/${PACKAGE_NAME}"
echo -e "${BLUE}Telemetry Data:${NC} ${TELEMETRY_FILE}"
echo ""

# Check if any step failed and exit with appropriate code
if [ $ESLINT_EXIT_CODE -ne 0 ] || [ $TEST_EXIT_CODE -ne 0 ] || [ $SERVER_CHECK_EXIT_CODE -ne 0 ]; then
  echo -e "${YELLOW}Deployment completed with warnings or errors. See logs for details.${NC}"
  exit 1
else
  echo -e "${GREEN}Deployment completed successfully!${NC}"
  exit 0
fi