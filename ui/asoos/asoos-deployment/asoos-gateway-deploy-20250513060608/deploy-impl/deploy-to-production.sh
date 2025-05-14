#!/bin/bash

# Production Deployment Script for SallyPort Authentication
# This script packages and deploys the SallyPort authentication system to production

# Set error handling
set -e

# Color formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
PACKAGE_DIR="$(pwd)/logs"
LATEST_PACKAGE=$(ls -t ${PACKAGE_DIR}/sallyport-auth-deployment-*.tar.gz | head -1)

if [ -z "$LATEST_PACKAGE" ]; then
  echo -e "${RED}Error: No deployment package found.${NC}"
  echo "Please run the cicd-cttt-simplified.sh script first to create a deployment package."
  exit 1
fi

echo -e "${BLUE}Found deployment package: ${LATEST_PACKAGE}${NC}"

# Production server details (replace with actual values)
PROD_SERVER="asoos.2100.cool"
PROD_USER="deploy"
PROD_PATH="/var/www/asoos"
SSH_KEY="${HOME}/.ssh/id_rsa"  # Path to SSH key

# Ask for confirmation
echo -e "${YELLOW}You are about to deploy to PRODUCTION: ${PROD_SERVER}${NC}"
echo -e "${YELLOW}This will update the live website.${NC}"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

echo -e "${BLUE}Starting production deployment...${NC}"

# 1. Copy package to production server
echo -e "${BLUE}Copying deployment package to production server...${NC}"
echo "scp -i ${SSH_KEY} ${LATEST_PACKAGE} ${PROD_USER}@${PROD_SERVER}:${PROD_PATH}/deploy-${TIMESTAMP}.tar.gz"

# In a real deployment, uncomment the following:
# scp -i ${SSH_KEY} ${LATEST_PACKAGE} ${PROD_USER}@${PROD_SERVER}:${PROD_PATH}/deploy-${TIMESTAMP}.tar.gz

# 2. Run remote commands to deploy
echo -e "${BLUE}Extracting and installing on production server...${NC}"
echo "ssh -i ${SSH_KEY} ${PROD_USER}@${PROD_SERVER} \"cd ${PROD_PATH} && \\"
echo "  mkdir -p deploy-${TIMESTAMP} && \\"
echo "  tar -xzf deploy-${TIMESTAMP}.tar.gz -C deploy-${TIMESTAMP} && \\"
echo "  cd deploy-${TIMESTAMP} && \\"
echo "  npm install && \\"
echo "  pm2 stop asoos-ui || true && \\"
echo "  pm2 start gateway-server.js --name asoos-ui && \\"
echo "  pm2 save && \\"
echo "  ln -sfn ${PROD_PATH}/deploy-${TIMESTAMP} ${PROD_PATH}/current\""

# In a real deployment, uncomment the following:
# ssh -i ${SSH_KEY} ${PROD_USER}@${PROD_SERVER} "cd ${PROD_PATH} && \
#   mkdir -p deploy-${TIMESTAMP} && \
#   tar -xzf deploy-${TIMESTAMP}.tar.gz -C deploy-${TIMESTAMP} && \
#   cd deploy-${TIMESTAMP} && \
#   npm install && \
#   pm2 stop asoos-ui || true && \
#   pm2 start gateway-server.js --name asoos-ui && \
#   pm2 save && \
#   ln -sfn ${PROD_PATH}/deploy-${TIMESTAMP} ${PROD_PATH}/current"

# 3. Clean up old deployments (keep the last 5)
echo -e "${BLUE}Cleaning up old deployments on production server...${NC}"
echo "ssh -i ${SSH_KEY} ${PROD_USER}@${PROD_SERVER} \"cd ${PROD_PATH} && \\"
echo "  ls -td deploy-* | tail -n +6 | xargs rm -rf\""

# In a real deployment, uncomment the following:
# ssh -i ${SSH_KEY} ${PROD_USER}@${PROD_SERVER} "cd ${PROD_PATH} && \
#   ls -td deploy-* | tail -n +6 | xargs rm -rf"

echo -e "${GREEN}Deployment commands prepared.${NC}"
echo -e "${YELLOW}IMPORTANT: This is a simulation. In a real deployment, you would need to:${NC}"
echo "1. Ensure SSH access to the production server is configured"
echo "2. Uncomment the actual deployment commands in this script"
echo "3. Make sure PM2 or another process manager is installed on the production server"
echo ""
echo -e "${BLUE}To deploy to production for real:${NC}"
echo "1. Edit this script to uncomment the actual deployment commands"
echo "2. Ensure you have the correct SSH credentials"
echo "3. Run this script again"
echo ""
echo -e "${GREEN}Your local deployment package is here: ${LATEST_PACKAGE}${NC}"
echo "You can manually transfer this to your production server if needed."

exit 0