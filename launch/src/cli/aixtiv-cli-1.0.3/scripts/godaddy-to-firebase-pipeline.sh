#!/bin/bash
# GoDaddy to Firebase Direct Pipeline
# This script automates the process of migrating domains from GoDaddy to Firebase Hosting
# and configuring SSL certificates automatically

set -e

# Import agent tracking utilities
source "$(dirname "$0")/../bin/agent-tracking.sh"

# Set default values
AGENT_ID=${AGENT_ID:-"DOMAIN_MIGRATION_AGENT"}
DOMAINS_FILE=${1:-"domains/custom-domains.txt"}
FIREBASE_PROJECT="api-for-warp-drive"
GODADDY_API_KEY=${GODADDY_API_KEY:-""}
GODADDY_API_SECRET=${GODADDY_API_SECRET:-""}

# Validate inputs
if [ ! -f "$DOMAINS_FILE" ]; then
  echo "❌ Error: Domains file not found: $DOMAINS_FILE"
  exit 1
fi

if [ -z "$GODADDY_API_KEY" ] || [ -z "$GODADDY_API_SECRET" ]; then
  echo "❌ Error: GoDaddy API credentials not set. Please set GODADDY_API_KEY and GODADDY_API_SECRET."
  exit 1
fi

log_agent_action "migration_start" "Starting domain migration process for $(wc -l < $DOMAINS_FILE) domains"

# Function to verify Firebase CLI is installed
verify_firebase_cli() {
  log_agent_action "check_firebase_cli" "Verifying Firebase CLI installation"
  if ! command -v firebase &> /dev/null; then
    echo "⚙️ Installing Firebase CLI..."
    npm install -g firebase-tools
  fi
  
  # Ensure Firebase CLI is authenticated
  firebase login:ci --no-localhost
}

# Function to verify GoDaddy API connection
verify_godaddy_api() {
  log_agent_action "check_godaddy_api" "Verifying GoDaddy API connection"
  
  # Test API connection
  TEST_RESPONSE=$(curl -s -X GET \
    -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
    "https://api.godaddy.com/v1/domains")
  
  if [[ "$TEST_RESPONSE" == *"domains"* ]]; then
    echo "✅ GoDaddy API connection successful"
  else
    echo "❌ GoDaddy API connection failed"
    exit 1
  fi
}

# Function to add domain to Firebase Hosting
add_domain_to_firebase() {
  local domain=$1
  log_agent_action "add_domain_firebase" "Adding domain to Firebase: $domain"
  
  # Add domain to Firebase project
  firebase hosting:channel:deploy production \
    --project=$FIREBASE_PROJECT \
    --site=$domain
  
  # Configure custom domain in Firebase
  firebase hosting:sites:create $domain --project=$FIREBASE_PROJECT
  firebase hosting:sites:update $domain --project=$FIREBASE_PROJECT --site=$domain
  
  echo "✅ Domain added to Firebase: $domain"
}

# Function to update DNS records in GoDaddy
update_godaddy_dns() {
  local domain=$1
  log_agent_action "update_godaddy_dns" "Updating DNS records in GoDaddy for: $domain"
  
  # Get domain verification record
  VERIFICATION_TXT=$(firebase hosting:sites:get $domain --json | jq -r '.verification.txt')
  FIREBASE_DNS=$(firebase hosting:sites:get $domain --json | jq -r '.verification.dns')
  
  # Extract base domain (without subdomain)
  BASE_DOMAIN=$(echo $domain | awk -F. '{print $(NF-1)"."$NF}')
  
  # Create TXT record for domain verification
  curl -X PUT \
    -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$VERIFICATION_TXT\", \"name\": \"_firebase\", \"ttl\": 600, \"type\": \"TXT\"}]" \
    "https://api.godaddy.com/v1/domains/$BASE_DOMAIN/records/TXT/_firebase"
  
  # Create A records for Firebase hosting
  curl -X PUT \
    -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$FIREBASE_DNS\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"}]" \
    "https://api.godaddy.com/v1/domains/$BASE_DOMAIN/records/A/@"
  
  # Create CNAME record for www subdomain
  curl -X PUT \
    -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$domain\", \"name\": \"www\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
    "https://api.godaddy.com/v1/domains/$BASE_DOMAIN/records/CNAME/www"
  
  echo "✅ DNS records updated for: $domain"
}

# Function to verify domain and provision SSL
verify_and_provision_ssl() {
  local domain=$1
  log_agent_action "verify_provision_ssl" "Verifying domain and provisioning SSL: $domain"
  
  # Check domain verification status
  echo "⏳ Waiting for domain verification..."
  
  while true; do
    VERIFICATION_STATUS=$(firebase hosting:sites:get $domain --json | jq -r '.verification.verified')
    if [ "$VERIFICATION_STATUS" == "true" ]; then
      echo "✅ Domain verified: $domain"
      break
    fi
    echo "⏳ Verification in progress..."
    sleep 30
  done
  
  # Provision SSL certificate
  firebase hosting:sites:update $domain --ssl auto
  
  # Wait for SSL provisioning
  echo "⏳ Waiting for SSL provisioning..."
  while true; do
    SSL_STATUS=$(firebase hosting:sites:get $domain --json | jq -r '.ssl.status')
    if [ "$SSL_STATUS" == "PROVISIONED" ]; then
      echo "✅ SSL certificate provisioned for: $domain"
      break
    fi
    echo "⏳ SSL provisioning in progress..."
    sleep 30
  done
}

# Function to verify deployment
verify_deployment() {
  local domain=$1
  log_agent_action "verify_deployment" "Verifying deployment for: $domain"
  
  # Try to connect to the domain with HTTPS
  HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$domain)
  
  if [ "$HTTPS_STATUS" -eq 200 ]; then
    echo "✅ Domain successfully deployed with HTTPS: $domain"
    return 0
  else
    echo "⚠️ Domain verification failed for: $domain (HTTP status: $HTTPS_STATUS)"
    return 1
  fi
}

# Main execution
main() {
  verify_firebase_cli
  verify_godaddy_api
  
  # Process each domain in the file
  while IFS= read -r domain || [[ -n "$domain" ]]; do
    domain=$(echo "$domain" | tr -d '[:space:]')
    
    # Skip empty lines
    [ -z "$domain" ] && continue
    
    echo "🔄 Processing domain: $domain"
    log_agent_action "process_domain" "Processing domain: $domain"
    
    # Step 1: Add domain to Firebase
    add_domain_to_firebase "$domain"
    
    # Step 2: Update DNS in GoDaddy
    update_godaddy_dns "$domain"
    
    # Step 3: Verify domain and provision SSL
    verify_and_provision_ssl "$domain"
    
    # Step 4: Verify deployment
    if verify_deployment "$domain"; then
      log_agent_action "domain_success" "Domain successfully migrated: $domain"
    else
      log_agent_action "domain_failed" "Domain migration failed: $domain"
    fi
    
    echo "-----------------------------------"
  done < "$DOMAINS_FILE"
  
  # Report completion
  TOTAL_DOMAINS=$(wc -l < "$DOMAINS_FILE")
  echo "🎉 Migration completed for $TOTAL_DOMAINS domains"
  log_agent_action "migration_complete" "Domain migration process completed for $TOTAL_DOMAINS domains"
}

# Execute main function
main