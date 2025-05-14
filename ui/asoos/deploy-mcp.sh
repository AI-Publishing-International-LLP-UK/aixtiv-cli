#!/bin/bash

# ASOOS Deployment Script for MCP Integration
# This script prepares the ASOOS UI deployment package for use with the MCP

echo "🚀 Starting ASOOS UI deployment preparation with MCP integration"

# Step 1: Environment setup
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DEPLOY_DIR="asoos-deploy-${TIMESTAMP}"
SOURCE_DIR=$(pwd)
CONFIG_FILE="config.json"

# Check for config file
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: Config file not found: $CONFIG_FILE"
  exit 1
fi

echo "✅ Using configuration from $CONFIG_FILE"

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
mkdir -p $DEPLOY_DIR
cp -R $SOURCE_DIR/public $DEPLOY_DIR/
cp $SOURCE_DIR/$CONFIG_FILE $DEPLOY_DIR/
cp $SOURCE_DIR/mcp-integration.js $DEPLOY_DIR/
cp $SOURCE_DIR/server.js $DEPLOY_DIR/

# Step 3: Create a deployment info file
echo "📄 Creating deployment info file..."
cat > $DEPLOY_DIR/deployment-info.txt << EOF
ASOOS UI Deployment Package
===========================
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Package ID: asoos-${TIMESTAMP}

Deployment Instructions for MCP
-------------------------------
1. Upload this entire folder to your MCP server
2. Configure the MCP endpoint in config.json if needed
3. Set the MCP_API_KEY environment variable
4. Start the server with: node server.js

This deployment package is configured for integration with:
- Domain: $(grep -o '"domain": "[^"]*"' $CONFIG_FILE | cut -d'"' -f4)
- MCP Region: $(grep -o '"region": "[^"]*"' $CONFIG_FILE | cut -d'"' -f4)
- Symphony Mode: $(grep -o '"mode": "[^"]*"' $CONFIG_FILE | cut -d'"' -f4)

For assistance, contact the ASOOS development team.
EOF

# Step 4: Create an MCP setup script
echo "📝 Creating MCP setup script..."
cat > $DEPLOY_DIR/setup-mcp.sh << EOF
#!/bin/bash

# Setup script for MCP integration
# Run this on your MCP server to configure ASOOS integration

echo "🚀 Setting up MCP integration for ASOOS"

# Variables
DOMAIN=\$(grep -o '"domain": "[^"]*"' config.json | cut -d'"' -f4)
MCP_PORT=3002

# Step 1: Configure MCP API key
if [ -z "\$MCP_API_KEY" ]; then
  echo "❌ Error: MCP_API_KEY environment variable not set"
  echo "Please set it with: export MCP_API_KEY=your_api_key"
  exit 1
fi

echo "✅ MCP API key configured"

# Step 2: Start the server
echo "🚀 Starting ASOOS server on port \$MCP_PORT..."
node server.js &

echo "✅ ASOOS server started with MCP integration"
echo "✅ Your ASOOS UI should now be accessible at: https://\$DOMAIN"
echo "✅ MCP integration is active"
EOF

chmod +x $DEPLOY_DIR/setup-mcp.sh

# Step 5: Package everything into a ZIP file
echo "📦 Creating final deployment ZIP..."
zip -r "${DEPLOY_DIR}.zip" $DEPLOY_DIR

# Step 6: Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf $DEPLOY_DIR

echo "🎉 Deployment package created: ${DEPLOY_DIR}.zip"
echo ""
echo "To deploy with MCP integration:"
echo "1. Transfer the ZIP file to your MCP server"
echo "2. Unzip the package: unzip ${DEPLOY_DIR}.zip"
echo "3. Navigate to the directory: cd ${DEPLOY_DIR}"
echo "4. Run the setup script: ./setup-mcp.sh"
echo ""
echo "✨ Deployment preparation complete! ✨"