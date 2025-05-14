#!/bin/bash
#
# Firebase Domain Certificate Manager
# 
# This script diagnoses and fixes SSL certificate issues for domains hosted on Firebase,
# specifically addressing the ERR_CERT_COMMON_NAME_INVALID error.
#
# Created for Coaching2100 domain management system
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_PROJECT_ID="api-for-warp-drive"
REPORT_DIR="reports/certificates"
mkdir -p "$REPORT_DIR"

# Banner
echo -e "${BLUE}"
echo "============================================="
echo "  Firebase Domain Certificate Manager"
echo "  Coaching2100 Domain Management System"
echo "============================================="
echo -e "${NC}"

# Check for required tools
for cmd in firebase openssl dig; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${YELLOW}Warning: $cmd is not installed. Some functionality may be limited.${NC}"
  fi
done

# Function to check if Firebase CLI is authenticated
check_firebase_auth() {
  if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}Firebase CLI is not authenticated. Attempting to login...${NC}"
    firebase login
    if ! firebase projects:list &> /dev/null; then
      echo -e "${RED}Failed to authenticate with Firebase. Please run 'firebase login' manually.${NC}"
      return 1
    fi
  fi
  return 0
}

# Function to diagnose SSL issues for a domain
diagnose_ssl() {
  local domain=$1
  local project_id=$2
  local site_id=$(echo $domain | tr '.' '-')
  
  echo -e "${BLUE}Diagnosing SSL issues for $domain...${NC}"
  
  # Check if domain resolves
  echo -e "${YELLOW}Checking if domain resolves...${NC}"
  if ! host $domain &> /dev/null; then
    echo -e "${RED}Domain does not resolve to an IP address.${NC}"
    ISSUES+=("$domain: Does not resolve to an IP address")
    return 1
  else
    echo -e "${GREEN}Domain resolves successfully.${NC}"
  fi
  
  # Check DNS configuration
  echo -e "${YELLOW}Checking DNS configuration...${NC}"
  if [[ $domain == www.* ]]; then
    # This is a www subdomain
    echo -e "${YELLOW}Checking CNAME record for $domain...${NC}"
    root_domain=$(echo $domain | sed 's/^www\.//')
    root_site_id=$(echo $root_domain | tr '.' '-')
    
    expected_cname="${root_site_id}.firebaseapp.com."
    actual_cname=$(dig +short CNAME $domain || echo "Failed to check CNAME")
    
    echo -e "${YELLOW}Expected CNAME: $expected_cname${NC}"
    echo -e "${YELLOW}Actual CNAME: $actual_cname${NC}"
    
    if [[ "$actual_cname" != *"$expected_cname"* ]]; then
      echo -e "${RED}CNAME record is incorrect.${NC}"
      ISSUES+=("$domain: Incorrect CNAME record. Expected $expected_cname, got $actual_cname")
    else
      echo -e "${GREEN}CNAME record is correct.${NC}"
    fi
  else
    # This is a root domain
    echo -e "${YELLOW}Checking A records for $domain...${NC}"
    expected_ips=("151.101.1.195" "151.101.65.195")
    actual_ips=$(dig +short A $domain || echo "Failed to check A records")
    
    echo -e "${YELLOW}Expected A records: ${expected_ips[*]}${NC}"
    echo -e "${YELLOW}Actual A records: $actual_ips${NC}"
    
    missing_ips=()
    for ip in "${expected_ips[@]}"; do
      if [[ "$actual_ips" != *"$ip"* ]]; then
        missing_ips+=("$ip")
      fi
    done
    
    if [ ${#missing_ips[@]} -gt 0 ]; then
      echo -e "${RED}Missing expected A records: ${missing_ips[*]}${NC}"
      ISSUES+=("$domain: Missing A records: ${missing_ips[*]}")
    else
      echo -e "${GREEN}A records are correct.${NC}"
    fi
  fi
  
  # Check if site exists in Firebase
  echo -e "${YELLOW}Checking if site exists in Firebase...${NC}"
  if ! firebase hosting:sites:list --project=$project_id | grep -q "$site_id"; then
    echo -e "${RED}Site $site_id does not exist in Firebase project $project_id.${NC}"
    ISSUES+=("$domain: Site $site_id does not exist in Firebase project $project_id")
    return 1
  else
    echo -e "${GREEN}Site exists in Firebase.${NC}"
  fi
  
  # Check domain verification status
  echo -e "${YELLOW}Checking domain verification status...${NC}"
  verification_status=$(firebase hosting:sites:get $site_id --project=$project_id 2>/dev/null | grep -A 5 "Domain verification" || echo "Failed to get verification status")
  
  if [[ "$verification_status" == *"DOMAIN_VERIFICATION_SUCCESSFUL"* ]]; then
    echo -e "${GREEN}Domain verification successful.${NC}"
  else
    echo -e "${RED}Domain verification not successful.${NC}"
    ISSUES+=("$domain: Domain verification not successful")
    
    # Extract TXT record information
    txt_record_info=$(echo "$verification_status" | grep "TXT record" || echo "")
    if [ ! -z "$txt_record_info" ]; then
      echo -e "${YELLOW}TXT Record required for verification:${NC}"
      echo "$txt_record_info"
    fi
  fi
  
  # Check SSL certificate provisioning status
  echo -e "${YELLOW}Checking SSL certificate status...${NC}"
  ssl_status=$(firebase hosting:sites:get $site_id --project=$project_id 2>/dev/null | grep -A 5 "Custom domain SSL certificate" || echo "Failed to get SSL status")
  
  if [[ "$ssl_status" == *"SSL_CERTIFICATE_PROVISIONED"* ]]; then
    echo -e "${GREEN}SSL certificate provisioned successfully.${NC}"
  else
    echo -e "${RED}SSL certificate not provisioned.${NC}"
    ISSUES+=("$domain: SSL certificate not provisioned")
  fi
  
  # Check SSL certificate directly
  echo -e "${YELLOW}Checking SSL certificate directly...${NC}"
  ssl_info=$(openssl s_client -servername $domain -connect $domain:443 </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer 2>/dev/null || echo "Failed to connect")
  
  if [ -z "$ssl_info" ]; then
    echo -e "${RED}Could not connect to $domain:443 for SSL check.${NC}"
    ISSUES+=("$domain: Could not connect to port 443 for SSL check")
  else
    echo -e "${YELLOW}SSL certificate information:${NC}"
    echo "$ssl_info"
    
    # Check if the certificate is issued for this domain
    if [[ "$ssl_info" == *"$domain"* ]]; then
      echo -e "${GREEN}SSL certificate matches domain name.${NC}"
    else
      echo -e "${RED}SSL certificate does not match domain name.${NC}"
      ISSUES+=("$domain: SSL certificate does not match domain name")
    fi
    
    # Check if certificate is from Firebase/Google
    if [[ "$ssl_info" == *"Google"* || "$ssl_info" == *"GTS CA"* ]]; then
      echo -e "${GREEN}SSL certificate is issued by Google.${NC}"
    else
      echo -e "${YELLOW}SSL certificate is not issued by Google. This might be fine if using a custom certificate.${NC}"
    fi
  fi
  
  echo -e "${BLUE}Diagnosis complete for $domain.${NC}"
  echo
}

# Function to fix SSL issues for a domain
fix_ssl() {
  local domain=$1
  local project_id=$2
  local site_id=$(echo $domain | tr '.' '-')
  
  echo -e "${BLUE}Applying SSL fixes for $domain...${NC}"
  
  # Check if site exists
  if ! firebase hosting:sites:list --project=$project_id | grep -q "$site_id"; then
    echo -e "${YELLOW}Creating site $site_id in Firebase project $project_id...${NC}"
    firebase hosting:sites:create $site_id --project=$project_id
  fi
  
  # Check if domain is connected to site
  if ! firebase hosting:sites:get $site_id --project=$project_id 2>/dev/null | grep -q "$domain"; then
    echo -e "${YELLOW}Connecting domain $domain to site $site_id...${NC}"
    firebase hosting:sites:update $site_id --project=$project_id --add-domain=$domain
    
    # Extract verification information
    verification_info=$(firebase hosting:sites:get $site_id --project=$project_id 2>/dev/null | grep -A 5 "Domain verification" || echo "")
    txt_record_info=$(echo "$verification_info" | grep "TXT record" || echo "")
    
    if [ ! -z "$txt_record_info" ]; then
      echo -e "${YELLOW}Please add the following TXT record for domain verification:${NC}"
      echo "$txt_record_info"
    fi
  fi
  
  # Create a temporary deploy folder for the site
  temp_dir=$(mktemp -d)
  
  echo -e "${YELLOW}Creating temporary site content...${NC}"
  cat > $temp_dir/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <title>$domain</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>$domain</h1>
  <p>Coaching2100 domain - SSL certificate provisioning</p>
  <p>Last updated: $(date)</p>
</body>
</html>
EOF
  
  cat > $temp_dir/firebase.json << EOF
{
  "hosting": {
    "site": "$site_id",
    "public": "."
  }
}
EOF
  
  # Deploy to site to trigger SSL provisioning
  echo -e "${YELLOW}Deploying to site to trigger SSL provisioning...${NC}"
  (cd $temp_dir && firebase deploy --only hosting:$site_id --project=$project_id)
  
  # Force SSL provisioning
  echo -e "${YELLOW}Forcing SSL certificate provisioning...${NC}"
  firebase hosting:sites:update $site_id --project=$project_id --ssl=force
  
  # Clean up
  rm -rf $temp_dir
  
  echo -e "${GREEN}SSL fixes applied for $domain.${NC}"
  echo -e "${YELLOW}Note: SSL certificate provisioning can take up to 24 hours to complete.${NC}"
  echo
  
  # Generate DNS instructions
  if [[ $domain == www.* ]]; then
    # www subdomain
    root_domain=$(echo $domain | sed 's/^www\.//')
    root_site_id=$(echo $root_domain | tr '.' '-')
    
    echo -e "${YELLOW}DNS Configuration Instructions for $domain:${NC}"
    echo -e "${BLUE}Add the following CNAME record to your DNS configuration:${NC}"
    echo "www IN CNAME ${root_site_id}.firebaseapp.com."
  else
    # Root domain
    echo -e "${YELLOW}DNS Configuration Instructions for $domain:${NC}"
    echo -e "${BLUE}Add the following A records to your DNS configuration:${NC}"
    echo "@ IN A 151.101.1.195"
    echo "@ IN A 151.101.65.195"
  fi
  
  echo
}

# Main function
main() {
  local ACTION="diagnose"
  local DOMAINS=()
  local PROJECT_ID="$DEFAULT_PROJECT_ID"
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --fix)
        ACTION="fix"
        shift
        ;;
      --project)
        PROJECT_ID="$2"
        shift 2
        ;;
      --all-coaching2100)
        if [ -f "domains/coaching2100-domains.txt" ]; then
          readarray -t DOMAINS < "domains/coaching2100-domains.txt"
        else
          echo -e "${YELLOW}Coaching2100 domains file not found. Using sample domains instead.${NC}"
          DOMAINS+=("coaching2100.com" "www.coaching2100.com" "drlucy.ai" "www.drlucy.ai")
        fi
        shift
        ;;
      --help)
        echo -e "${BLUE}Firebase Domain Certificate Manager${NC}"
        echo
        echo "Usage: $0 [options] [domains...]"
        echo
        echo "Options:"
        echo "  --fix                Fix SSL issues (default: diagnose only)"
        echo "  --project ID         Firebase project ID (default: $DEFAULT_PROJECT_ID)"
        echo "  --all-coaching2100   Process all Coaching2100 domains"
        echo "  --help               Show this help message"
        echo
        echo "Examples:"
        echo "  $0 coaching2100.com www.coaching2100.com"
        echo "  $0 --fix --project my-project-id coaching2100.com"
        echo "  $0 --all-coaching2100 --fix"
        echo
        exit 0
        ;;
      *)
        DOMAINS+=("$1")
        shift
        ;;
    esac
  done
  
  # Check if no domains specified
  if [ ${#DOMAINS[@]} -eq 0 ]; then
    echo -e "${YELLOW}No domains specified. Please provide at least one domain.${NC}"
    echo -e "${YELLOW}Example: $0 coaching2100.com www.coaching2100.com${NC}"
    echo -e "${YELLOW}Use --help for more options.${NC}"
    exit 1
  fi
  
  # Check Firebase authentication
  check_firebase_auth || exit 1
  
  ISSUES=()
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  
  # Process domains
  for domain in "${DOMAINS[@]}"; do
    # Skip empty lines
    if [ -z "$domain" ]; then
      continue
    fi
    
    echo -e "${BLUE}Processing domain: $domain${NC}"
    
    # Diagnose SSL issues
    diagnose_ssl "$domain" "$PROJECT_ID"
    
    # Fix SSL issues if requested
    if [ "$ACTION" = "fix" ]; then
      echo -e "${YELLOW}Applying fixes for $domain...${NC}"
      fix_ssl "$domain" "$PROJECT_ID"
    fi
    
    echo
  done
  
  # Generate report
  REPORT_FILE="$REPORT_DIR/certificate-report-$TIMESTAMP.txt"
  
  echo -e "${BLUE}Generating report: $REPORT_FILE${NC}"
  
  cat > "$REPORT_FILE" << EOF
=================================================
Firebase Domain Certificate Report ($TIMESTAMP)
=================================================

Project ID: $PROJECT_ID
Action: $ACTION
Domains: ${DOMAINS[@]}

Issues Found:
EOF
  
  if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "No issues found." >> "$REPORT_FILE"
  else
    for issue in "${ISSUES[@]}"; do
      echo "- $issue" >> "$REPORT_FILE"
    done
  fi
  
  cat >> "$REPORT_FILE" << EOF

Recommendations:
================
EOF
  
  if [ ${#ISSUES[@]} -gt 0 ]; then
    cat >> "$REPORT_FILE" << EOF
1. Fix DNS configurations as indicated above.
2. Run this script with --fix option to attempt automatic repair.
3. Allow 24 hours for SSL certificates to provision after fixes.
4. Verify certificates using a browser or openssl:
   openssl s_client -servername DOMAIN -connect DOMAIN:443
EOF
  else
    cat >> "$REPORT_FILE" << EOF
All domains appear to be properly configured.
Continue monitoring for any certificate expiration issues.
EOF
  fi
  
  echo -e "${GREEN}Report generated: $REPORT_FILE${NC}"
  
  # Summary
  echo -e "${BLUE}=== Summary ===${NC}"
  echo -e "${BLUE}Domains processed: ${#DOMAINS[@]}${NC}"
  echo -e "${BLUE}Issues found: ${#ISSUES[@]}${NC}"
  
  if [ ${#ISSUES[@]} -gt 0 ]; then
    echo -e "${YELLOW}Issues:${NC}"
    for issue in "${ISSUES[@]}"; do
      echo -e "${YELLOW}- $issue${NC}"
    done
    
    if [ "$ACTION" = "diagnose" ]; then
      echo -e "${YELLOW}Run with --fix option to attempt automatic repair:${NC}"
      echo -e "${YELLOW}$0 --fix ${DOMAINS[@]}${NC}"
    else
      echo -e "${YELLOW}Fixes applied. Allow 24 hours for SSL certificates to provision.${NC}"
    fi
  else
    echo -e "${GREEN}No issues found. All domains appear to be properly configured.${NC}"
  fi
}

# Run main function with all arguments
main "$@"