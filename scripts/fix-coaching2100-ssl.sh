#!/bin/bash
# Script to fix SSL certificate for coaching2100.com
# The issue is that the domain is using a certificate from firebaseapp.com instead of a proper custom domain certificate

set -e

# Configuration
DOMAIN="coaching2100.com"
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
FIREBASE_SITE="${DOMAIN//./-}" # Replace dots with hyphens

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "============================================="
echo "  SSL Certificate Fix for ${DOMAIN}"
echo "  Region: ${REGION}, Zone: ${ZONE}"
echo "============================================="
echo -e "${NC}"

# Check for required tools
for cmd in gcloud firebase dig; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}Error: $cmd is required but not installed.${NC}"
    if [ "$cmd" == "firebase" ]; then
      echo "Install Firebase CLI with: npm install -g firebase-tools"
    elif [ "$cmd" == "gcloud" ]; then
      echo "Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install"
    elif [ "$cmd" == "dig" ]; then
      echo "Install dig with: apt-get install dnsutils (Ubuntu/Debian) or brew install bind (macOS)"
    fi
    exit 1
  fi
done

# Step 1: Check current Firebase hosting configuration
echo -e "${YELLOW}Step 1: Checking current Firebase hosting configuration for ${DOMAIN}...${NC}"
firebase hosting:sites:list --project ${PROJECT_ID}

# Step 2: Verify DNS settings
echo -e "${YELLOW}Step 2: Verifying DNS settings for ${DOMAIN}...${NC}"
echo "Current DNS records:"
dig +short ${DOMAIN}
dig +short CNAME www.${DOMAIN}
dig +short TXT ${DOMAIN}

# Step 3: Check SSL certificate
echo -e "${YELLOW}Step 3: Checking current SSL certificate for ${DOMAIN}...${NC}"
echo | openssl s_client -servername ${DOMAIN} -connect ${DOMAIN}:443 2>/dev/null | openssl x509 -noout -issuer -subject || echo -e "${RED}Could not connect to ${DOMAIN} on port 443${NC}"

# Step 4: Remove domain from Firebase site
echo -e "${YELLOW}Step 4: Removing domain from Firebase site...${NC}"
echo -e "${BLUE}This step will remove the domain from Firebase Hosting temporarily.${NC}"
read -p "Do you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Operation cancelled by user.${NC}"
  exit 0
fi

firebase hosting:domain:delete ${DOMAIN} --site ${FIREBASE_SITE} --project ${PROJECT_ID} || echo -e "${YELLOW}Domain not found on Firebase or could not be removed. Continuing...${NC}"

# Step 5: Add domain back to Firebase with SSL certificate
echo -e "${YELLOW}Step 5: Adding domain back to Firebase with proper SSL certificate...${NC}"
firebase hosting:domain:add ${DOMAIN} --site ${FIREBASE_SITE} --project ${PROJECT_ID}

# Step 6: Wait for SSL provisioning
echo -e "${YELLOW}Step 6: Waiting for SSL certificate provisioning...${NC}"
echo -e "${BLUE}SSL certificate provisioning can take 15-60 minutes.${NC}"
echo -e "${BLUE}You can check the status with:${NC}"
echo -e "${GREEN}  firebase hosting:domain:list --site ${FIREBASE_SITE} --project ${PROJECT_ID}${NC}"

# Step 7: Instructions for verification
echo -e "${YELLOW}Step 7: Verification instructions${NC}"
echo -e "${BLUE}To verify the SSL certificate after provisioning:${NC}"
echo -e "${GREEN}  openssl s_client -servername ${DOMAIN} -connect ${DOMAIN}:443 | openssl x509 -noout -issuer -subject${NC}"
echo
echo -e "${BLUE}If you need to force SSL certificate renewal:${NC}"
echo -e "${GREEN}  firebase hosting:domain:update ${DOMAIN} --site ${FIREBASE_SITE} --project ${PROJECT_ID} --ssl=force${NC}"
echo
echo -e "${BLUE}To verify through the Firebase console:${NC}"
echo -e "${GREEN}  https://console.firebase.google.com/project/${PROJECT_ID}/hosting/sites/${FIREBASE_SITE}/domains${NC}"
echo

# Provide instructions for DNS validation if needed
echo -e "${YELLOW}DNS Validation Instructions:${NC}"
echo -e "${BLUE}If Firebase asks for DNS validation, you need to add TXT records to your domain.${NC}"
echo -e "${BLUE}For example:${NC}"
echo -e "${GREEN}  TXT Record: @, Value: firebase-site-verification=VERIFICATION_CODE${NC}"
echo
echo -e "${BLUE}After adding DNS records, wait a few minutes and then run:${NC}"
echo -e "${GREEN}  firebase hosting:domain:update ${DOMAIN} --site ${FIREBASE_SITE} --project ${PROJECT_ID} --refresh${NC}"

# Final summary
echo
echo -e "${BLUE}====== SSL Certificate Update Summary ======${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}Firebase Site: ${FIREBASE_SITE}${NC}"
echo -e "${BLUE}Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}Zone: ${ZONE}${NC}"
echo -e "${BLUE}==========================================${NC}"
echo
echo -e "${YELLOW}Remember: SSL certificate provisioning can take up to an hour.${NC}"
echo -e "${YELLOW}Check the domain status in the Firebase console periodically.${NC}"