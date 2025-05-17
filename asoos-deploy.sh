#!/bin/bash
# 
# ASOOS Deployment Script
# This script simplifies the deployment of the ASOOS UI to asoos.2100.cool
#

# Color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print script header
echo -e "${GREEN}====================================================${NC}"
echo -e "${BLUE}       ASOOS Deployment to asoos.2100.cool           ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""

# Define the target directory
TARGET_DIR="/Users/as/asoos/aixtiv-cli"

# Check if we're already in the correct directory
CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" != "$TARGET_DIR" && "$CURRENT_DIR" != "$TARGET_DIR/" ]]; then
    echo -e "${YELLOW}Currently in: ${CURRENT_DIR}${NC}"
    echo -e "${BLUE}Changing to: ${TARGET_DIR}${NC}"
    cd "$TARGET_DIR" || {
        echo -e "${RED}ERROR: Failed to change to directory: ${TARGET_DIR}${NC}"
        exit 1
    }
fi

# Check if deploy-2100-cool.sh exists and is executable
if [[ ! -x "./ui/asoos/deploy-2100-cool.sh" ]]; then
    echo -e "${RED}ERROR: deploy-2100-cool.sh not found or not executable${NC}"
    echo -e "${YELLOW}Checking if file exists...${NC}"
    
    if [[ -f "./ui/asoos/deploy-2100-cool.sh" ]]; then
        echo -e "${BLUE}File exists. Setting execute permission...${NC}"
        chmod +x "./ui/asoos/deploy-2100-cool.sh" || {
            echo -e "${RED}Failed to set execute permission.${NC}"
            exit 1
        }
    else
        echo -e "${RED}File does not exist. Cannot proceed.${NC}"
        exit 1
    fi
fi

# Parse command line arguments
DEPLOY_ENV="staging"
CUSTOM_OUTPUT=""

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --env)
            DEPLOY_ENV="$2"
            shift
            shift
            ;;
        --output)
            CUSTOM_OUTPUT="$2"
            shift
            shift
            ;;
        --help)
            echo -e "${BLUE}Usage:${NC} $0 [options]"
            echo ""
            echo -e "${YELLOW}Options:${NC}"
            echo -e "  ${BLUE}--env <environment>${NC}    Deployment environment (staging/production)"
            echo -e "  ${BLUE}--output <directory>${NC}   Custom output directory for deployment package"
            echo -e "  ${BLUE}--help${NC}                 Display this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo -e "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Deployment environment: ${YELLOW}${DEPLOY_ENV}${NC}"
if [[ -n "$CUSTOM_OUTPUT" ]]; then
    echo -e "${BLUE}Custom output directory: ${YELLOW}${CUSTOM_OUTPUT}${NC}"
fi

# Execute the deploy-2100-cool.sh script
echo -e "${GREEN}Running deployment script...${NC}"
echo ""

# Execute the deployment script
cd ./ui/asoos && ./deploy-2100-cool.sh || {
    echo -e "${RED}ERROR: Deployment script failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}====================================================${NC}"
echo -e "${BLUE}             Deployment Instructions                 ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""
echo -e "${YELLOW}1. The deployment package has been created${NC}"
echo -e "${YELLOW}2. Follow the instructions above to upload it to your web server${NC}"
echo -e "${YELLOW}3. After uploading, extract it to the web root directory${NC}"
echo -e "${YELLOW}4. Verify the deployment by visiting https://asoos.2100.cool${NC}"
echo ""
echo -e "${BLUE}For assistance, contact the ASOOS development team.${NC}"
echo ""

exit 0
