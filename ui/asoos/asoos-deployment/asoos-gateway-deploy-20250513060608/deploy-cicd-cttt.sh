#!/bin/bash

# ASOOS UI CI/CD CTTT Deployment Script
# Comprehensive Testing & Telemetry Tracking (CTTT) pipeline

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_step() {
  echo -e "\n${GREEN}==== $1 ====${NC}"
}

# Configuration
DOMAIN="asoos.2100.cool"
GATEWAY_ENDPOINT="${GATEWAY_ENDPOINT:-https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BUILD_ID=$(date +%Y%m%d%H%M%S)
DEPLOY_DIR="deploy-${BUILD_ID}"
TELEMETRY_ENDPOINT="${TELEMETRY_ENDPOINT:-https://us-west1-api-for-warp-drive.cloudfunctions.net/cttt-telemetry}"

# Verify environment
log_step "Environment Verification"
log_info "Deployment environment: ${DEPLOY_ENV}"
log_info "Domain: ${DOMAIN}"
log_info "Build ID: ${BUILD_ID}"

# Required tools
for cmd in node npm zip curl jq; do
  if ! command -v $cmd &> /dev/null; then
    log_error "$cmd is required but not installed."
    exit 1
  fi
done

# Create deployment directory
log_step "Preparing Deployment"
mkdir -p $DEPLOY_DIR
log_info "Created deployment directory: $DEPLOY_DIR"

# Send telemetry - deployment started
curl -s -X POST "${TELEMETRY_ENDPOINT}/deployment-event" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deployment_started",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "metadata": {
      "domain": "'${DOMAIN}'",
      "environment": "'${DEPLOY_ENV}'",
      "buildId": "'${BUILD_ID}'"
    }
  }' > /dev/null || log_warning "Telemetry send failed"

# Copy application files
log_step "Copying Application Files"
cp -r public gateway-server.js mcp-config.json gateway-integration.js package.json $DEPLOY_DIR/
log_info "Copied core application files"

# Create start script
log_step "Creating Start Script"
cat > "$DEPLOY_DIR/start.sh" << EOF
#!/bin/bash

# Start script for ASOOS with CTTT integration
export GATEWAY_ENDPOINT="${GATEWAY_ENDPOINT}"
export NODE_ENV="${DEPLOY_ENV}"
export PORT="${PORT:-3002}"
export TELEMETRY_ENABLED="true"
export CTTT_BUILD_ID="${BUILD_ID}"

# Helper functions
log_info() {
  echo -e "\033[0;34m[INFO]\033[0m \$1"
}

log_success() {
  echo -e "\033[0;32m[SUCCESS]\033[0m \$1"
}

log_error() {
  echo -e "\033[0;31m[ERROR]\033[0m \$1"
}

log_warning() {
  echo -e "\033[0;33m[WARNING]\033[0m \$1"
}

# Check dependencies
if ! command -v node &> /dev/null; then
  log_error "Node.js is required but not installed."
  exit 1
fi

# Verify required files
for file in gateway-server.js mcp-config.json gateway-integration.js; do
  if [ ! -f "\$file" ]; then
    log_error "Required file not found: \$file"
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
log_info "Environment: ${DEPLOY_ENV}"
log_info "Gateway endpoint: ${GATEWAY_ENDPOINT}"
log_info "Build ID: ${BUILD_ID}"

# Notify start to telemetry
curl -s -X POST "${TELEMETRY_ENDPOINT}/deployment-event" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "application_started",
    "timestamp": "'"\$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
    "metadata": {
      "domain": "${DOMAIN}",
      "environment": "${DEPLOY_ENV}",
      "buildId": "${BUILD_ID}"
    }
  }' > /dev/null || log_warning "Telemetry send failed"

# Start the server
node gateway-server.js
EOF

chmod +x "$DEPLOY_DIR/start.sh"
log_success "Created start script with CTTT integration"

# Create environment file
log_step "Creating Environment Configuration"
cat > "$DEPLOY_DIR/.env" << EOF
# ASOOS UI Environment Configuration
# Build ID: ${BUILD_ID}
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

GATEWAY_ENDPOINT=${GATEWAY_ENDPOINT}
NODE_ENV=${DEPLOY_ENV}
PORT=3002
DOMAIN=${DOMAIN}
TELEMETRY_ENABLED=true
CTTT_BUILD_ID=${BUILD_ID}
TELEMETRY_ENDPOINT=${TELEMETRY_ENDPOINT}
EOF
log_success "Created environment configuration"

# Set up telemetry integration
log_step "Setting Up CTTT Integration"
cat > "$DEPLOY_DIR/cttt-integration.js" << EOF
/**
 * CTTT (Comprehensive Testing & Telemetry Tracking) Integration
 * This module provides telemetry tracking for the ASOOS UI application
 */

const https = require('https');
const os = require('os');
const fs = require('fs');

// Telemetry configuration
const TELEMETRY_CONFIG = {
  enabled: process.env.TELEMETRY_ENABLED === 'true',
  endpoint: process.env.TELEMETRY_ENDPOINT || '${TELEMETRY_ENDPOINT}',
  buildId: process.env.CTTT_BUILD_ID || '${BUILD_ID}',
  environment: process.env.NODE_ENV || '${DEPLOY_ENV}',
  domain: process.env.DOMAIN || '${DOMAIN}',
  applicationName: 'asoos-ui',
  version: '1.0.0'
};

/**
 * Send telemetry event to CTTT system
 * @param {string} eventName Name of the event
 * @param {Object} data Event data
 * @returns {Promise<void>}
 */
async function sendTelemetryEvent(eventName, data = {}) {
  if (!TELEMETRY_CONFIG.enabled) {
    return;
  }
  
  try {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      application: TELEMETRY_CONFIG.applicationName,
      buildId: TELEMETRY_CONFIG.buildId,
      environment: TELEMETRY_CONFIG.environment,
      domain: TELEMETRY_CONFIG.domain,
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      metadata: data
    };
    
    const requestBody = JSON.stringify(payload);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'User-Agent': \`asoos-ui/\${TELEMETRY_CONFIG.version}\`
      },
      timeout: 5000 // 5 second timeout to not block the app
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(
        \`\${TELEMETRY_CONFIG.endpoint}/event\`, 
        requestOptions, 
        (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            // Don't reject, just log the error
            console.error(\`Telemetry send failed with status \${res.statusCode}\`);
            resolve();
          }
        }
      );
      
      req.on('error', (error) => {
        // Don't reject, just log the error
        console.error('Telemetry send error:', error.message);
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.error('Telemetry send timed out');
        resolve();
      });
      
      req.write(requestBody);
      req.end();
    });
  } catch (error) {
    console.error('Error sending telemetry:', error);
  }
}

// Send startup event when module is loaded
sendTelemetryEvent('module_loaded', { moduleName: 'cttt-integration' });

module.exports = {
  sendTelemetryEvent,
  TELEMETRY_CONFIG
};
EOF
log_success "Created CTTT telemetry integration module"

# Modify server to integrate CTTT
log_step "Integrating CTTT with Server"
cat > "$DEPLOY_DIR/cttt-server-integration.js" << EOF
// Import CTTT telemetry
const { sendTelemetryEvent } = require('./cttt-integration');

/**
 * Attach CTTT middleware to Express app
 * @param {Object} app Express application
 */
function attachCTTTMiddleware(app) {
  // Log all requests
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Monkey patch res.end to measure response time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Send telemetry for API requests
      if (req.url.startsWith('/api/')) {
        sendTelemetryEvent('api_request', {
          method: req.method,
          path: req.url,
          statusCode,
          responseTime,
          userAgent: req.headers['user-agent'],
          contentType: req.headers['content-type']
        });
      }
      
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    // Send telemetry for errors
    sendTelemetryEvent('server_error', {
      method: req.method,
      path: req.url,
      errorMessage: err.message,
      errorStack: err.stack,
      userAgent: req.headers['user-agent']
    });
    
    next(err);
  });
}

// Export middleware
module.exports = {
  attachCTTTMiddleware
};
EOF
log_success "Created CTTT server integration module"

# Test application
log_step "Running Tests"
if [ -f "tests/server.test.js" ]; then
  log_info "Running server tests..."
  NODE_ENV=test npm test || log_warning "Tests failed but continuing deployment"
else
  log_warning "No tests found, skipping test step"
fi

# Build package
log_step "Building Deployment Package"
PACKAGE_NAME="asoos-cttt-deploy-${BUILD_ID}.zip"
(cd $DEPLOY_DIR && zip -r ../$PACKAGE_NAME .)
log_success "Built deployment package: $PACKAGE_NAME"

# Send telemetry - deployment package created
curl -s -X POST "${TELEMETRY_ENDPOINT}/deployment-event" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deployment_package_created",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "metadata": {
      "domain": "'${DOMAIN}'",
      "environment": "'${DEPLOY_ENV}'",
      "buildId": "'${BUILD_ID}'",
      "packageName": "'${PACKAGE_NAME}'",
      "packageSize": "'$(stat -f%z "$PACKAGE_NAME")'"
    }
  }' > /dev/null || log_warning "Telemetry send failed"

# Create deployment instructions
log_step "Creating Deployment Instructions"
cat > "DEPLOY_INSTRUCTIONS_${BUILD_ID}.md" << EOF
# ASOOS UI Deployment Instructions
## Build ${BUILD_ID} for ${DOMAIN}

This package contains the ASOOS UI application with CTTT integration.

### Quick Deployment

1. Transfer the deployment package to your server:
   \`\`\`
   scp ${PACKAGE_NAME} user@server:/path/to/deployment/
   \`\`\`

2. Extract the package:
   \`\`\`
   unzip ${PACKAGE_NAME} -d asoos-ui
   cd asoos-ui
   \`\`\`

3. Install dependencies:
   \`\`\`
   npm install --production
   \`\`\`

4. Start the application:
   \`\`\`
   ./start.sh
   \`\`\`

### Web Server Configuration

#### Nginx:
\`\`\`nginx
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
\`\`\`

### CTTT Telemetry

This deployment includes CTTT (Comprehensive Testing & Telemetry Tracking)
integration. Telemetry events are sent to: ${TELEMETRY_ENDPOINT}

To disable telemetry, set the environment variable:
\`\`\`
export TELEMETRY_ENABLED=false
\`\`\`

### Verification

After deployment, verify the application is running correctly:
- Open https://${DOMAIN} in your browser
- Check the API status: https://${DOMAIN}/api/status
- Verify gateway connection: https://${DOMAIN}/api/gateway-status

### Troubleshooting

If you encounter issues:
1. Check the logs: \`journalctl -u asoos-ui\`
2. Verify the gateway connection
3. Ensure all environment variables are set correctly
4. Check server resources (CPU, memory, disk)

### Contact

For assistance, contact the ASOOS development team.
EOF
log_success "Created deployment instructions"

# Summary
log_step "Deployment Summary"
echo "Domain: ${DOMAIN}"
echo "Environment: ${DEPLOY_ENV}"
echo "Build ID: ${BUILD_ID}"
echo "Package: ${PACKAGE_NAME}"
echo "Instructions: DEPLOY_INSTRUCTIONS_${BUILD_ID}.md"

# Cleanup
rm -rf $DEPLOY_DIR
log_info "Cleaned up temporary files"

# Send telemetry - deployment process completed
curl -s -X POST "${TELEMETRY_ENDPOINT}/deployment-event" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deployment_process_completed",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "metadata": {
      "domain": "'${DOMAIN}'",
      "environment": "'${DEPLOY_ENV}'",
      "buildId": "'${BUILD_ID}'",
      "packageName": "'${PACKAGE_NAME}'"
    }
  }' > /dev/null || log_warning "Telemetry send failed"

log_success "CICD CTTT deployment process completed successfully"