#!/bin/bash
# batch-ssl-provision.sh - Batch SSL Certificate Provisioner
# Part of the AIXTIV CLI domain management suite
# 
# This script handles batch provisioning of SSL certificates for multiple domains
# using either Firebase Hosting or GCP Load Balancer

set -e

# Configuration
LOG_FILE="/tmp/aixtiv-batch-ssl-provision.log"
DOMAINS_FILE="${1:-domains.txt}"
PROVISION_TYPE="${2:-firebase}"
PROJECT_ID="${3:-api-for-warp-drive}"
DRY_RUN="${4:-false}"

# Color output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Make sure log directory exists
mkdir -p $(dirname "$LOG_FILE")

echo "=============================================" >> "$LOG_FILE"
echo "Batch SSL Certificate Provisioning - $(date)" >> "$LOG_FILE"
echo "Provisioning Type: $PROVISION_TYPE" >> "$LOG_FILE"
echo "Project ID: $PROJECT_ID" >> "$LOG_FILE"
echo "Domains File: $DOMAINS_FILE" >> "$LOG_FILE"
echo "=============================================" >> "$LOG_FILE"

# Check if domains file exists
if [ ! -f "$DOMAINS_FILE" ]; then
  echo -e "${RED}ERROR: Domains file '$DOMAINS_FILE' not found${NC}"
  echo "ERROR: Domains file '$DOMAINS_FILE' not found" >> "$LOG_FILE"
  echo -e "\nUsage: $0 [domains_file] [provision_type] [project_id] [dry_run]"
  echo -e "  domains_file: Path to file containing domains (one per line)"
  echo -e "  provision_type: 'firebase' or 'gcp' (default: firebase)"
  echo -e "  project_id: Firebase or GCP project ID (default: aixtiv-symphony)"
  echo -e "  dry_run: 'true' or 'false' - if true, just print commands without executing (default: false)"
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

if [ "$PROVISION_TYPE" == "firebase" ]; then
  check_command firebase
elif [ "$PROVISION_TYPE" == "gcp" ]; then
  check_command gcloud
else
  echo -e "${RED}ERROR: Invalid provision type. Must be 'firebase' or 'gcp'${NC}"
  echo "ERROR: Invalid provision type. Must be 'firebase' or 'gcp'" >> "$LOG_FILE"
  exit 1
fi

# Print configuration
echo -e "${BLUE}Batch SSL Certificate Provisioning${NC}"
echo -e "Provisioning Type: ${YELLOW}$PROVISION_TYPE${NC}"
echo -e "Project ID: ${YELLOW}$PROJECT_ID${NC}"
echo -e "Domains File: ${YELLOW}$DOMAINS_FILE${NC}"
echo -e "Dry Run: ${YELLOW}$DRY_RUN${NC}"
echo -e "Log File: ${YELLOW}$LOG_FILE${NC}"
echo ""

# Count domains
DOMAIN_COUNT=$(wc -l < "$DOMAINS_FILE")
echo -e "Found ${GREEN}$DOMAIN_COUNT${NC} domains to process"
echo ""

# Process domains
process_firebase() {
  local domain=$1
  local site_name=$(echo "$domain" | sed 's/\./-/g')
  
  echo -e "\n${BLUE}Processing domain: ${YELLOW}$domain${NC}"
  echo "Processing domain: $domain (Firebase)" >> "$LOG_FILE"
  
  # Create Firebase commands
  CMD_CHECK_SITE="firebase hosting:sites:list --project $PROJECT_ID | grep -q \"$site_name\" || firebase hosting:sites:create $site_name --project $PROJECT_ID"
  
  # Updated command for domain setup - using proper syntax for current Firebase CLI
  # First deploy a basic site to the production channel, then connect domain
  CMD_ADD_DOMAIN="mkdir -p temp_public && echo '<html><body>Domain Setup</body></html>' > temp_public/index.html && firebase deploy --only hosting:$site_name --project $PROJECT_ID"
  
  # Execute or print commands
  if [ "$DRY_RUN" == "true" ]; then
    echo -e "${GREEN}Would execute:${NC}"
    echo -e "${YELLOW}$CMD_CHECK_SITE${NC}"
    echo -e "${YELLOW}$CMD_ADD_DOMAIN${NC}"
    echo "DRY RUN - Commands not executed" >> "$LOG_FILE"
  else
    echo -e "${GREEN}Executing:${NC}"
    echo -e "${YELLOW}$CMD_CHECK_SITE${NC}"
    
    # Create site if it doesn't exist
    if eval "$CMD_CHECK_SITE"; then
      echo "Site $site_name created or already exists" >> "$LOG_FILE"
    else
      echo -e "${YELLOW}Warning: Could not create site $site_name${NC}"
      echo "Warning: Could not create site $site_name" >> "$LOG_FILE"
    fi
    
    echo -e "${YELLOW}$CMD_ADD_DOMAIN${NC}"
    
    # Deploy basic site to hosting
    if eval "$CMD_ADD_DOMAIN"; then
      echo -e "${GREEN}Basic site deployed for $domain${NC}"
      echo "Basic site deployed for $domain" >> "$LOG_FILE"
      
      # Instructions for manual domain connection
      echo -e "${YELLOW}Note: You need to manually connect the domain in Firebase console${NC}"
      echo -e "${YELLOW}Go to: https://console.firebase.google.com/project/$PROJECT_ID/hosting/sites/$site_name${NC}"
      echo -e "${YELLOW}Then click 'Add custom domain' and follow the instructions${NC}"
      echo "Manual domain connection required for $domain" >> "$LOG_FILE"
    else
      echo -e "${RED}Warning: Could not deploy basic site for $domain${NC}"
      echo "Warning: Could not deploy basic site for $domain" >> "$LOG_FILE"
      echo "You may need to manually create and connect this domain."
    fi
    
    # Clean up the temporary public directory
    rm -rf temp_public
  fi
}

process_gcp() {
  local domain=$1
  local cert_name=$(echo "$domain" | sed 's/\./-/g')-ssl
  
  echo -e "\n${BLUE}Processing domain: ${YELLOW}$domain${NC}"
  echo "Processing domain: $domain (GCP)" >> "$LOG_FILE"
  
  # Create GCP commands
  CMD_CHECK_CERT="gcloud compute ssl-certificates describe $cert_name --global --project $PROJECT_ID 2>/dev/null || echo 'Certificate not found'"
  CMD_CREATE_CERT="gcloud compute ssl-certificates create $cert_name --domains=$domain --global --project $PROJECT_ID"
  
  # Execute or print commands
  if [ "$DRY_RUN" == "true" ]; then
    echo -e "${GREEN}Would execute:${NC}"
    echo -e "${YELLOW}$CMD_CHECK_CERT${NC}"
    echo -e "${YELLOW}$CMD_CREATE_CERT${NC}"
    echo "DRY RUN - Commands not executed" >> "$LOG_FILE"
  else
    echo -e "${GREEN}Executing:${NC}"
    echo -e "${YELLOW}$CMD_CHECK_CERT${NC}"
    
    # Check if certificate exists
    CERT_CHECK=$(eval "$CMD_CHECK_CERT")
    if [[ "$CERT_CHECK" == *"Certificate not found"* ]]; then
      echo "Certificate $cert_name not found, creating..." >> "$LOG_FILE"
      
      echo -e "${YELLOW}$CMD_CREATE_CERT${NC}"
      
      # Create certificate
      if eval "$CMD_CREATE_CERT"; then
        echo -e "${GREEN}Certificate for $domain created successfully${NC}"
        echo "Certificate for $domain created successfully" >> "$LOG_FILE"
      else
        echo -e "${RED}Error: Could not create certificate for $domain${NC}"
        echo "Error: Could not create certificate for $domain" >> "$LOG_FILE"
      fi
    else
      echo -e "${GREEN}Certificate for $domain already exists${NC}"
      echo "Certificate for $domain already exists" >> "$LOG_FILE"
    fi
  fi
}

# Main processing loop
COUNTER=0
PROCESSED=0
FAILED=0

while IFS= read -r domain || [ -n "$domain" ]; do
  # Skip empty lines and comments
  if [[ -z "$domain" || "$domain" =~ ^# ]]; then
    continue
  fi
  
  COUNTER=$((COUNTER + 1))
  echo -e "${BLUE}[$COUNTER/$DOMAIN_COUNT] Processing ${YELLOW}$domain${NC}"
  
  # Process domain based on provision type
  if [ "$PROVISION_TYPE" == "firebase" ]; then
    if process_firebase "$domain"; then
      PROCESSED=$((PROCESSED + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  else
    if process_gcp "$domain"; then
      PROCESSED=$((PROCESSED + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  fi
  
  # Add small delay to avoid rate limiting
  sleep 2
done < "$DOMAINS_FILE"

# Print summary
echo -e "\n${GREEN}=== Processing Summary ===${NC}"
echo -e "Total domains: ${YELLOW}$DOMAIN_COUNT${NC}"
echo -e "Successfully processed: ${GREEN}$PROCESSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Log file: ${YELLOW}$LOG_FILE${NC}"

# Log summary
echo "=== Processing Summary ===" >> "$LOG_FILE"
echo "Total domains: $DOMAIN_COUNT" >> "$LOG_FILE"
echo "Successfully processed: $PROCESSED" >> "$LOG_FILE"
echo "Failed: $FAILED" >> "$LOG_FILE"
echo "Completed at: $(date)" >> "$LOG_FILE"

# Additional instructions
echo -e "\n${BLUE}Next Steps:${NC}"
if [ "$PROVISION_TYPE" == "firebase" ]; then
  echo -e "1. Complete domain setup in Firebase console:"
  echo -e "   ${YELLOW}https://console.firebase.google.com/project/$PROJECT_ID/hosting/sites${NC}"
  echo -e "2. For each site:"
  echo -e "   a. Click on the site name"
  echo -e "   b. Click 'Add custom domain'"
  echo -e "   c. Follow the verification process"
  echo -e "3. Set up DNS records for each domain as instructed in Firebase Console"
  echo -e "4. Run ${YELLOW}aixtiv domain ssl-check --all${NC} to verify certificate status"
else
  echo -e "1. Update your load balancer to use these certificates"
  echo -e "2. Ensure DNS records point to your load balancer IP"
  echo -e "3. Run ${YELLOW}aixtiv domain ssl-check --all${NC} to verify certificate status"
fi

exit 0