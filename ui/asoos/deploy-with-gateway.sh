#!/bin/bash

# ASOOS Deployment Script for Integration Gateway
# This script prepares the ASOOS UI deployment package for use with the Integration Gateway

echo "🚀 Starting ASOOS UI deployment preparation with Integration Gateway"

# Step 1: Environment setup
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DEPLOY_DIR="asoos-gateway-deploy-${TIMESTAMP}"
SOURCE_DIR=$(pwd)
DOMAIN="asoos.2100.cool"
GATEWAY_ENDPOINT=${GATEWAY_ENDPOINT:-"https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway"}

echo "✅ Using Integration Gateway at: $GATEWAY_ENDPOINT"
echo "✅ Deploying to domain: $DOMAIN"

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
mkdir -p $DEPLOY_DIR
cp -R $SOURCE_DIR/public $DEPLOY_DIR/
cp $SOURCE_DIR/server.js $DEPLOY_DIR/
cp $SOURCE_DIR/integration-gateway-config.js $DEPLOY_DIR/

# Step 3: Update the server.js file to use the integration gateway
echo "🔄 Configuring server to use integration gateway..."
cat > $DEPLOY_DIR/gateway-server.js << EOF
const express = require('express');
const path = require('path');
const { 
  GATEWAY_CONFIG, 
  initGatewayConnection, 
  requestApiKey,
  validateGatewayConnection
} = require('./integration-gateway-config');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Gateway connection status
let gatewayConnected = false;
let gatewayConnectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Initialize gateway connection
async function connectToGateway() {
  if (gatewayConnectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.error('Maximum gateway connection attempts reached');
    return false;
  }
  
  try {
    gatewayConnectionAttempts++;
    const result = await initGatewayConnection();
    console.log('Gateway connection result:', result);
    gatewayConnected = result.status === 'connected';
    return gatewayConnected;
  } catch (error) {
    console.error('Gateway connection error:', error);
    return false;
  }
}

// API endpoint to check gateway status
app.get('/api/gateway-status', async (req, res) => {
  try {
    const isValid = await validateGatewayConnection();
    res.json({
      connected: gatewayConnected,
      valid: isValid,
      endpoint: GATEWAY_CONFIG.endpoint,
      serviceId: GATEWAY_CONFIG.serviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      connected: gatewayConnected,
      valid: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to request a temporary key
app.post('/api/request-key', async (req, res) => {
  try {
    if (!gatewayConnected) {
      const connected = await connectToGateway();
      if (!connected) {
        return res.status(503).json({
          status: 'error',
          message: 'Gateway connection unavailable',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const keyInfo = await requestApiKey();
    res.json({
      status: 'success',
      keyInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint for status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'ASOOS UI API is running with Integration Gateway',
    gateway: {
      connected: gatewayConnected,
      endpoint: GATEWAY_CONFIG.endpoint,
      serviceId: GATEWAY_CONFIG.serviceId
    },
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize gateway connection and start server
connectToGateway().then(connected => {
  console.log(\`Gateway connection ${connected ? 'succeeded' : 'failed'}\`);
  
  // Start the server
  app.listen(PORT, () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
    console.log(\`Gateway integration: \${connected ? 'ACTIVE' : 'INACTIVE'}\`);
  });
});
EOF

# Step 4: Create a gateway integration instruction file
echo "📄 Creating gateway integration instructions..."
cat > $DEPLOY_DIR/GATEWAY_INTEGRATION.md << EOF
# ASOOS Integration Gateway Setup

This document provides instructions for deploying ASOOS UI with the Integration Gateway.

## What is the Integration Gateway?

The Integration Gateway manages API keys and key swapping for the ASOOS application.
It provides a secure way to handle API keys and integration with the Claude API.

## Deployment Steps

1. **Upload this package to your web server**
   - Copy all files to your web root directory for $DOMAIN

2. **Set up environment variables**
   \`\`\`
   export GATEWAY_ENDPOINT="$GATEWAY_ENDPOINT"
   export NODE_ENV="production"
   export PORT="3002"
   \`\`\`

3. **Install dependencies**
   \`\`\`
   npm install express
   \`\`\`

4. **Start the server**
   \`\`\`
   node gateway-server.js
   \`\`\`

5. **Set up web server configuration**
   - Configure your web server (Nginx/Apache) to proxy API requests to the Node.js server
   - Serve static files directly from the \`public\` directory
   - Ensure SSL is properly configured for HTTPS

## Testing the Integration

Once deployed, test the integration with these endpoints:

- **Gateway Status**: \`https://$DOMAIN/api/gateway-status\`
- **API Status**: \`https://$DOMAIN/api/status\`
- **Request Key**: \`https://$DOMAIN/api/request-key\` (POST)

These endpoints should return information about the gateway connection and status.

## Troubleshooting

If you encounter issues with the gateway integration:

1. Verify the GATEWAY_ENDPOINT environment variable is set correctly
2. Check that your web server has outbound access to the gateway endpoint
3. Verify that the gateway service is running in your GCP project
4. Check the server logs for connection errors

For assistance, contact the ASOOS development team.
EOF

# Step 5: Package everything into a ZIP file
echo "📦 Creating final deployment ZIP..."
zip -r "${DEPLOY_DIR}.zip" $DEPLOY_DIR

# Step 6: Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf $DEPLOY_DIR

echo "🎉 Deployment package created: ${DEPLOY_DIR}.zip"
echo ""
echo "To deploy with Integration Gateway:"
echo "1. Transfer ${DEPLOY_DIR}.zip to your web server"
echo "2. Unzip the package: unzip ${DEPLOY_DIR}.zip"
echo "3. Follow the instructions in GATEWAY_INTEGRATION.md"
echo ""
echo "✨ Deployment preparation complete! ✨"