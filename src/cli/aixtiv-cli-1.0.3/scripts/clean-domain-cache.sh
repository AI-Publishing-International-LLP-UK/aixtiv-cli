#!/bin/bash
# clean-domain-cache.sh - Domain Cache Cleanup Script
# 
# This script cleans up the domain cache by verifying domains against GoDaddy
# and reimporting only verified domains.

set -e

# Color output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CACHE_DIR="$HOME/.aixtiv-cli"
CACHE_FILE="$CACHE_DIR/domain-cache.json"
BACKUP_DIR="$CACHE_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/domain-cache-$(date +"%Y%m%d%H%M%S").json"
VERIFIED_DOMAINS_FILE="../domains/verified-domains.txt"
FIREBASE_PROJECT="api-for-warp-drive"
DOMAIN_TYPE="brand"

# Check for required arguments
if [ $# -lt 1 ]; then
  echo -e "${RED}Error: Missing GoDaddy domains file argument${NC}"
  echo -e "\nUsage: $0 [godaddy-domains-file]"
  echo -e "  godaddy-domains-file: Path to file containing verified GoDaddy domains (one per line)"
  echo -e "\nExample:"
  echo -e "  $0 ../domains/godaddy/my-godaddy-domains.txt"
  exit 1
fi

GODADDY_DOMAINS_FILE=$1

# Check if required files exist
if [ ! -f "$CACHE_FILE" ]; then
  echo -e "${RED}Error: Domain cache not found: $CACHE_FILE${NC}"
  echo -e "Please run 'aixtiv domain list' to initialize the cache first."
  exit 1
fi

if [ ! -f "$GODADDY_DOMAINS_FILE" ]; then
  echo -e "${RED}Error: GoDaddy domains file not found: $GODADDY_DOMAINS_FILE${NC}"
  exit 1
fi

if [ ! -f "verify-domain-ownership.js" ]; then
  echo -e "${RED}Error: verify-domain-ownership.js script not found${NC}"
  echo -e "Please make sure you're running this script from the scripts directory."
  exit 1
fi

if [ ! -f "bulk-domain-import.sh" ]; then
  echo -e "${RED}Error: bulk-domain-import.sh script not found${NC}"
  echo -e "Please make sure you're running this script from the scripts directory."
  exit 1
fi

# Display banner and information
echo -e "${BLUE}=== Domain Cache Cleanup Utility ===${NC}"
echo -e "${BLUE}Date: $(date)${NC}\n"

# Step 1: Backup current domain cache
echo -e "\n${BLUE}Step 1: Backing up current domain cache...${NC}"
mkdir -p "$BACKUP_DIR"
cp "$CACHE_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created at: ${YELLOW}$BACKUP_FILE${NC}"

# Step 2: Run domain verification
echo -e "\n${BLUE}Step 2: Verifying domains against GoDaddy...${NC}"
node verify-domain-ownership.js "$GODADDY_DOMAINS_FILE"

if [ ! -f "$VERIFIED_DOMAINS_FILE" ]; then
  echo -e "${RED}Error: Verified domains file not created: $VERIFIED_DOMAINS_FILE${NC}"
  echo -e "Verification process failed. Your backup is at: $BACKUP_FILE"
  exit 1
fi

# Count verified domains
VERIFIED_COUNT=$(grep -c -v '^$\|^#' "$VERIFIED_DOMAINS_FILE" || echo 0)
if [ "$VERIFIED_COUNT" -eq 0 ]; then
  echo -e "${RED}Error: No verified domains found${NC}"
  echo -e "Verification process did not find any matching domains. Your backup is at: $BACKUP_FILE"
  exit 1
fi

# Step 3: Clear existing domain cache
echo -e "\n${BLUE}Step 3: Clearing domain cache...${NC}"
rm "$CACHE_FILE"
echo '{
  "domains": [],
  "lastUpdated": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
}' > "$CACHE_FILE"
echo -e "${GREEN}✓ Domain cache cleared${NC}"

# Step 4: Import verified domains
echo -e "\n${BLUE}Step 4: Importing verified domains...${NC}"
chmod +x ./bulk-domain-import.sh

# Run the bulk import with the verified domains
if ./bulk-domain-import.sh "$VERIFIED_DOMAINS_FILE" "$DOMAIN_TYPE" "$FIREBASE_PROJECT" "false"; then
  echo -e "${GREEN}✓ Verified domains imported successfully${NC}"
else
  echo -e "${RED}Error: Failed to import verified domains${NC}"
  echo -e "Your backup is at: $BACKUP_FILE"
  echo -e "${YELLOW}To restore your backup, run:${NC}"
  echo -e "cp \"$BACKUP_FILE\" \"$CACHE_FILE\""
  exit 1
fi

# Step 5: Summary
echo -e "\n${BLUE}=== Domain Cache Cleanup Summary ===${NC}"
CURRENT_COUNT=$(grep -o '"name":' "$CACHE_FILE" | wc -l | tr -d ' ')
echo -e "Previous domains in cache: ${YELLOW}$(grep -o '"name":' "$BACKUP_FILE" | wc -l | tr -d ' ')${NC}"
echo -e "Verified domains: ${GREEN}$VERIFIED_COUNT${NC}"
echo -e "Current domains in cache: ${GREEN}$CURRENT_COUNT${NC}"
echo -e "Backup location: ${YELLOW}$BACKUP_FILE${NC}"

# Step 6: Next steps
echo -e "\n${BLUE}=== Next Steps ===${NC}"
echo -e "1. Verify the import was successful: ${YELLOW}aixtiv domain list${NC}"
echo -e "2. Provision SSL certificates: ${YELLOW}./batch-ssl-provision.sh $VERIFIED_DOMAINS_FILE firebase $FIREBASE_PROJECT false${NC}"
echo -e "3. Check SSL certificate status: ${YELLOW}aixtiv domain ssl-check --all${NC}"

# Provide recovery instructions
echo -e "\n${BLUE}=== Recovery Instructions ===${NC}"
echo -e "If you need to restore the original domain cache, run:"
echo -e "${YELLOW}cp \"$BACKUP_FILE\" \"$CACHE_FILE\"${NC}"

exit 0

