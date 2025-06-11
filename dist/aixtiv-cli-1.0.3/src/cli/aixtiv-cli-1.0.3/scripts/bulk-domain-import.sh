#!/bin/bash
# bulk-domain-import.sh - Bulk Domain Importer for AIXTIV CLI
# Part of the AIXTIV CLI domain management suite
# 
# This script imports a list of domains into the AIXTIV CLI domain cache
# and can optionally provision SSL certificates for all imported domains

set -e

# Configuration
LOG_FILE="/tmp/aixtiv-bulk-domain-import.log"
DOMAINS_FILE="${1:-domains.txt}"
DOMAIN_TYPE="${2:-brand}"
FIREBASE_PROJECT="${3:-aixtiv-symphony}"
PROVISION_SSL="${4:-false}"

# Color output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Make sure log directory exists
mkdir -p $(dirname "$LOG_FILE")

echo "=============================================" >> "$LOG_FILE"
echo "Bulk Domain Import - $(date)" >> "$LOG_FILE"
echo "Domain Type: $DOMAIN_TYPE" >> "$LOG_FILE"
echo "Firebase Project: $FIREBASE_PROJECT" >> "$LOG_FILE"
echo "Domains File: $DOMAINS_FILE" >> "$LOG_FILE"
echo "Provision SSL: $PROVISION_SSL" >> "$LOG_FILE"
echo "=============================================" >> "$LOG_FILE"

# Check if domains file exists
if [ ! -f "$DOMAINS_FILE" ]; then
  echo -e "${RED}ERROR: Domains file '$DOMAINS_FILE' not found${NC}"
  echo "ERROR: Domains file '$DOMAINS_FILE' not found" >> "$LOG_FILE"
  echo -e "\nUsage: $0 [domains_file] [domain_type] [firebase_project] [provision_ssl]"
  echo -e "  domains_file: Path to file containing domains (one per line)"
  echo -e "  domain_type: Domain type (default: brand)"
  echo -e "  firebase_project: Firebase project ID (default: aixtiv-symphony)"
  echo -e "  provision_ssl: 'true' or 'false' - provision SSL after import (default: false)"
  exit 1
fi

# Check for required tools
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}ERROR: Required command '$1' not found${NC}"
    echo "ERROR: Required command '$1' not found" >> "$LOG_FILE"
    exit 1
  fi
}

check_command node

# Print configuration
echo -e "${BLUE}Bulk Domain Import${NC}"
echo -e "Domain Type: ${YELLOW}$DOMAIN_TYPE${NC}"
echo -e "Firebase Project: ${YELLOW}$FIREBASE_PROJECT${NC}"
echo -e "Domains File: ${YELLOW}$DOMAINS_FILE${NC}"
echo -e "Provision SSL: ${YELLOW}$PROVISION_SSL${NC}"
echo -e "Log File: ${YELLOW}$LOG_FILE${NC}"
echo ""

# Count domains
DOMAIN_COUNT=$(wc -l < "$DOMAINS_FILE")
echo -e "Found ${GREEN}$DOMAIN_COUNT${NC} domains to import"
echo ""

# Cache file path
CACHE_DIR="$HOME/.aixtiv-cli"
CACHE_FILE="$CACHE_DIR/domain-cache.json"

# Ensure cache directory exists
mkdir -p "$CACHE_DIR"

# Initialize cache file if it doesn't exist
if [ ! -f "$CACHE_FILE" ]; then
  echo -e "${YELLOW}Creating new domain cache file${NC}"
  echo "{\"domains\": [], \"lastUpdated\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$CACHE_FILE"
  echo "Created new domain cache file" >> "$LOG_FILE"
fi

# Process domains
COUNTER=0
IMPORTED=0
SKIPPED=0

while IFS= read -r domain || [ -n "$domain" ]; do
  # Skip empty lines and comments
  if [[ -z "$domain" || "$domain" =~ ^# ]]; then
    continue
  fi
  
  COUNTER=$((COUNTER + 1))
  echo -e "${BLUE}[$COUNTER/$DOMAIN_COUNT] Processing ${YELLOW}$domain${NC}"
  
  # Check if domain already exists in cache
  if grep -q "\"name\": \"$domain\"" "$CACHE_FILE"; then
    echo -e "${YELLOW}Domain $domain already exists in cache, skipping${NC}"
    echo "Domain $domain already exists in cache, skipping" >> "$LOG_FILE"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  # Set default expiry date (1 year from now)
  EXPIRY_DATE=$(date -v+1y +"%Y-%m-%d")
  
  # Create Firebase project ID based on domain
  SITE_NAME=$(echo "$domain" | sed 's/\./-/g')
  
  # Import domain using node script
  echo -e "${GREEN}Importing domain $domain...${NC}"
  NODE_SCRIPT=$(cat <<EOF
const fs = require('fs');
const path = require('path');

// Load domain cache
const cachePath = path.join(process.env.HOME, '.aixtiv-cli', 'domain-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// Add domain to cache
const domain = {
  name: '$domain',
  type: '$DOMAIN_TYPE',
  status: 'pending',
  expiryDate: '$EXPIRY_DATE',
  firebaseProject: '$FIREBASE_PROJECT',
  siteId: '$SITE_NAME'
};

cache.domains.push(domain);
cache.lastUpdated = new Date().toISOString();

// Save updated cache
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log("Domain $domain imported successfully");
EOF
)
  
  if node -e "$NODE_SCRIPT"; then
    echo "Domain $domain imported successfully" >> "$LOG_FILE"
    IMPORTED=$((IMPORTED + 1))
  else
    echo -e "${RED}Failed to import domain $domain${NC}"
    echo "Failed to import domain $domain" >> "$LOG_FILE"
  fi
  
  # Small delay
  sleep 0.5
done < "$DOMAINS_FILE"

# Print summary
echo -e "\n${GREEN}=== Import Summary ===${NC}"
echo -e "Total domains: ${YELLOW}$DOMAIN_COUNT${NC}"
echo -e "Successfully imported: ${GREEN}$IMPORTED${NC}"
echo -e "Skipped (already existed): ${YELLOW}$SKIPPED${NC}"
echo -e "Cache file: ${YELLOW}$CACHE_FILE${NC}"

# Log summary
echo "=== Import Summary ===" >> "$LOG_FILE"
echo "Total domains: $DOMAIN_COUNT" >> "$LOG_FILE"
echo "Successfully imported: $IMPORTED" >> "$LOG_FILE"
echo "Skipped (already existed): $SKIPPED" >> "$LOG_FILE"
echo "Completed at: $(date)" >> "$LOG_FILE"

# Provision SSL if requested
if [ "$PROVISION_SSL" == "true" ]; then
  echo -e "\n${BLUE}Provisioning SSL certificates for imported domains...${NC}"
  echo "Provisioning SSL certificates for imported domains..." >> "$LOG_FILE"
  
  # Create temporary file with just the imported domains
  TEMP_DOMAINS_FILE="/tmp/aixtiv-imported-domains.txt"
  
  # Extract just the domains we imported
  while IFS= read -r domain || [ -n "$domain" ]; do
    # Skip empty lines and comments
    if [[ -z "$domain" || "$domain" =~ ^# ]]; then
      continue
    fi
    
    # Check if domain was imported (not skipped)
    if ! grep -q "\"name\": \"$domain\"" "$CACHE_FILE"; then
      continue
    fi
    
    echo "$domain" >> "$TEMP_DOMAINS_FILE"
  done < "$DOMAINS_FILE"
  
  # Run batch SSL provisioning script
  if [ -f "$(dirname "$0")/batch-ssl-provision.sh" ]; then
    bash "$(dirname "$0")/batch-ssl-provision.sh" "$TEMP_DOMAINS_FILE" "firebase" "$FIREBASE_PROJECT" "false"
  else
    echo -e "${YELLOW}Warning: Could not find batch-ssl-provision.sh script${NC}"
    echo "Warning: Could not find batch-ssl-provision.sh script" >> "$LOG_FILE"
    echo -e "${YELLOW}Run batch-ssl-provision.sh manually to provision SSL certificates${NC}"
  fi
  
  # Clean up
  rm -f "$TEMP_DOMAINS_FILE"
fi

# Additional instructions
echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Verify imported domains with: ${YELLOW}aixtiv domain list${NC}"
if [ "$PROVISION_SSL" != "true" ]; then
  echo -e "2. Provision SSL certificates with: ${YELLOW}$(dirname "$0")/batch-ssl-provision.sh $DOMAINS_FILE firebase $FIREBASE_PROJECT${NC}"
fi
echo -e "3. Check SSL certificate status with: ${YELLOW}aixtiv domain ssl-check --all${NC}"

chmod +x "$(dirname "$0")/batch-ssl-provision.sh" 2>/dev/null || true

exit 0