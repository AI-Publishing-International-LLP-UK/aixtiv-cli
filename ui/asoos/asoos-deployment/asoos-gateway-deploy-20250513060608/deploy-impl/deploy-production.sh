#!/bin/bash

# Production deployment script for ASOOS with SallyPort
# This script prepares and deploys the application to the production server

# Configuration
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DEPLOY_PACKAGE="asoos-deploy-${TIMESTAMP}.tar.gz"
PROD_SERVER="asoos.2100.cool"  # Change to your actual production server
PROD_USER="deploy"  # Change to your production server username
PROD_PATH="/var/www/asoos"  # Change to your production deployment path
SSH_KEY="~/.ssh/id_rsa"  # Path to SSH key for the production server

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

# Create deployment package
log_info "Creating deployment package..."
mkdir -p deploy-tmp
cp -r gateway-server.js gateway-integration.js sallyport-auth.js cttt-*.js mcp-config.json package.json public deploy-tmp/
cp -r node_modules deploy-tmp/ 2>/dev/null || true

# Create environment file for production
cat > deploy-tmp/.env << EOF
GATEWAY_ENDPOINT=https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway
NODE_ENV=production
PORT=80
TELEMETRY_ENABLED=true
CTTT_BUILD_ID=${TIMESTAMP}
EOF

# Create a production start script
cat > deploy-tmp/start-prod.sh << EOF
#!/bin/bash
source .env
node gateway-server.js
EOF
chmod +x deploy-tmp/start-prod.sh

# Package everything for deployment
log_info "Packaging files..."
tar -czf ${DEPLOY_PACKAGE} -C deploy-tmp .
rm -rf deploy-tmp

log_success "Deployment package created: ${DEPLOY_PACKAGE}"

# Deployment commands to execute on production server
# IMPORTANT: These commands are for reference only and will NOT be executed automatically
# You should manually review and execute them on your production server

log_info "Production Deployment Steps (manual execution required):"
echo "------------------------"
echo "1. Copy deployment package to production server:"
echo "   scp -i ${SSH_KEY} ${DEPLOY_PACKAGE} ${PROD_USER}@${PROD_SERVER}:${PROD_PATH}/"
echo ""
echo "2. SSH to production server and extract package:"
echo "   ssh -i ${SSH_KEY} ${PROD_USER}@${PROD_SERVER}"
echo "   cd ${PROD_PATH}"
echo "   mkdir -p deploy-${TIMESTAMP}"
echo "   tar -xzf ${DEPLOY_PACKAGE} -C deploy-${TIMESTAMP}"
echo "   cd deploy-${TIMESTAMP}"
echo ""
echo "3. Install dependencies and start the service:"
echo "   npm install --production"
echo "   pm2 stop asoos-ui || true"
echo "   pm2 start start-prod.sh --name asoos-ui"
echo "   pm2 save"
echo ""
echo "4. Update the current symlink to the new deployment:"
echo "   ln -sfn ${PROD_PATH}/deploy-${TIMESTAMP} ${PROD_PATH}/current"
echo ""
echo "5. Clean up old deployments (optional):"
echo "   find ${PROD_PATH}/deploy-* -maxdepth 0 -type d -mtime +30 -exec rm -rf {} \;"
echo "------------------------"

log_info "Deployment package ${DEPLOY_PACKAGE} created successfully."
log_info "Follow the steps above to complete the deployment to production."