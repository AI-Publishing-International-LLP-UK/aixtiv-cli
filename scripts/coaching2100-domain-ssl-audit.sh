#!/bin/bash
#
# Coaching2100 Domain SSL Certificate Audit and Fix Tool
# This script audits all Coaching2100 domains for proper SSL configuration
# and offers automated fixes for common issues
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIREBASE_PROJECT="api-for-warp-drive"
CONFIG_FILE="config/domain/coaching2100-domain-config.json"
DOMAIN_LIST_FILE="domains/coaching2100-domains.txt"
REPORT_DIR="reports/ssl-audit"
TEMP_DIR="/tmp/coaching2100-ssl-audit"

# Create directories
mkdir -p "$REPORT_DIR"
mkdir -p "$TEMP_DIR"
mkdir -p "$(dirname "$DOMAIN_LIST_FILE")"

# Display header
echo -e "${BLUE}=== Coaching2100 Domain SSL Certificate Audit ===${NC}"
echo -e "${BLUE}Started at $(date)${NC}"
echo

# Check dependencies
for cmd in firebase openssl dig curl jq; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${YELLOW}Warning: $cmd not found, some functionality may be limited${NC}"
    fi
done

# Check if firebase is logged in
echo -e "${BLUE}Checking Firebase authentication...${NC}"
if ! firebase projects:list &>/dev/null; then
    echo -e "${YELLOW}Firebase not authenticated. Attempting login...${NC}"
    firebase login
fi

# Get domains to audit
if [ -f "$DOMAIN_LIST_FILE" ]; then
    echo -e "${BLUE}Loading domains from $DOMAIN_LIST_FILE...${NC}"
    DOMAINS=$(cat "$DOMAIN_LIST_FILE")
else
    echo -e "${YELLOW}Domain list file not found. Creating sample data for testing...${NC}"
    
    # Create sample domains list
    cat > "$DOMAIN_LIST_FILE" << EOF
coaching2100.com
www.coaching2100.com
drlucy.ai
www.drlucy.ai
drgrant.ai
www.drgrant.ai
professorlee.ai
www.professorlee.ai
aixtiv-symphony.ai
www.aixtiv-symphony.ai
EOF
    
    DOMAINS=$(cat "$DOMAIN_LIST_FILE")
    echo -e "${GREEN}Created sample domain list with $(echo "$DOMAINS" | wc -l) domains${NC}"
fi

# Function to check domain SSL status
check_domain_ssl() {
    local domain=$1
    local result_file="$TEMP_DIR/$domain.json"
    
    echo -e "${BLUE}Checking SSL for $domain...${NC}"
    
    # Check if domain resolves
    if ! host "$domain" &>/dev/null; then
        echo -e "${YELLOW}Domain $domain does not resolve to an IP address${NC}"
        echo "{\"domain\":\"$domain\",\"resolves\":false,\"ssl_valid\":false,\"ssl_matches\":false,\"firebase_connected\":false,\"firebase_site_id\":\"\"}" > "$result_file"
        return
    fi
    
    # Check SSL certificate
    if command -v openssl &> /dev/null; then
        SSL_SUBJECT=$(openssl s_client -connect "$domain":443 -servername "$domain" </dev/null 2>/dev/null | grep "subject=" || echo "")
        SSL_ISSUER=$(openssl s_client -connect "$domain":443 -servername "$domain" </dev/null 2>/dev/null | grep "issuer=" || echo "")
        
        # Check if SSL is valid
        if [[ -z "$SSL_SUBJECT" ]]; then
            SSL_VALID="false"
        else
            SSL_VALID="true"
        fi
        
        # Check if certificate matches domain
        if echo "$SSL_SUBJECT" | grep -q "$domain"; then
            SSL_MATCHES="true"
        else
            SSL_MATCHES="false"
        fi
    else
        SSL_SUBJECT="[openssl not available]"
        SSL_ISSUER="[openssl not available]"
        SSL_VALID="unknown"
        SSL_MATCHES="unknown"
    fi
    
    # Check Firebase connection
    SITE_ID=$(echo "$domain" | tr '.' '-')
    if firebase hosting:sites:list --project="$FIREBASE_PROJECT" 2>/dev/null | grep -q "$SITE_ID"; then
        FIREBASE_CONNECTED="true"
        FIREBASE_STATUS=$(firebase hosting:sites:get "$SITE_ID" --project="$FIREBASE_PROJECT" 2>/dev/null)
        
        if echo "$FIREBASE_STATUS" | grep -q "DOMAIN_VERIFICATION_SUCCESSFUL"; then
            VERIFICATION_STATUS="verified"
        else
            VERIFICATION_STATUS="pending"
        fi
        
        if echo "$FIREBASE_STATUS" | grep -q "SSL_CERTIFICATE_PROVISIONED"; then
            SSL_STATUS="provisioned"
        else
            SSL_STATUS="pending"
        fi
    else
        FIREBASE_CONNECTED="false"
        VERIFICATION_STATUS="not_started"
        SSL_STATUS="not_started"
    fi
    
    # Save results to json
    cat > "$result_file" << EOF
{
  "domain": "$domain",
  "resolves": true,
  "site_id": "$SITE_ID",
  "ssl_valid": $SSL_VALID,
  "ssl_matches": $SSL_MATCHES,
  "ssl_subject": "$SSL_SUBJECT",
  "ssl_issuer": "$SSL_ISSUER",
  "firebase_connected": $FIREBASE_CONNECTED,
  "verification_status": "$VERIFICATION_STATUS",
  "ssl_status": "$SSL_STATUS"
}
EOF
}

# Function to fix domain SSL issues
fix_domain_ssl() {
    local domain=$1
    local site_id=$(echo "$domain" | tr '.' '-')
    
    echo -e "${BLUE}Fixing SSL for $domain (site ID: $site_id)...${NC}"
    
    # Create site if it doesn't exist
    if ! firebase hosting:sites:list --project="$FIREBASE_PROJECT" 2>/dev/null | grep -q "$site_id"; then
        echo -e "${YELLOW}Creating Firebase site: $site_id${NC}"
        firebase hosting:sites:create "$site_id" --project="$FIREBASE_PROJECT"
    fi
    
    # Connect domain
    echo -e "${YELLOW}Connecting domain to Firebase site...${NC}"
    firebase hosting:sites:update "$site_id" --project="$FIREBASE_PROJECT" --add-domain="$domain"
    
    # Get verification record
    VERIFICATION_INFO=$(firebase hosting:sites:get "$site_id" --project="$FIREBASE_PROJECT" | grep -A 5 "Domain verification status" || echo "")
    echo -e "${YELLOW}Verification information:${NC}"
    echo "$VERIFICATION_INFO"
    
    # Deploy minimal content to site
    echo -e "${YELLOW}Deploying minimal content to trigger SSL provisioning...${NC}"
    mkdir -p "$TEMP_DIR/firebase-$site_id"
    cat > "$TEMP_DIR/firebase-$site_id/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
  <title>$domain</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>$domain</h1>
  <p>Coaching2100 domain - Site under construction</p>
  <p>Last updated: $(date)</p>
</body>
</html>
EOF
    
    cat > "$TEMP_DIR/firebase-$site_id/firebase.json" << EOF
{
  "hosting": {
    "site": "$site_id",
    "public": "."
  }
}
EOF
    
    (cd "$TEMP_DIR/firebase-$site_id" && firebase deploy --only hosting:"$site_id" --project="$FIREBASE_PROJECT")
    
    echo -e "${GREEN}SSL provisioning has been initiated for $domain${NC}"
    echo -e "${YELLOW}Note: SSL provisioning can take up to 24 hours to complete.${NC}"
    
    # Generate DNS instructions
    domain_parts=(${domain//./ })
    if [[ ${#domain_parts[@]} -eq 2 ]]; then
        # Root domain
        echo -e "${YELLOW}DNS Configuration Instructions for $domain (root domain):${NC}"
        echo "Please add the following A records to your GoDaddy DNS configuration:"
        echo "@ IN A 151.101.1.195"
        echo "@ IN A 151.101.65.195"
    else
        # Subdomain
        subdomain=${domain_parts[0]}
        root_domain="${domain_parts[1]}.${domain_parts[2]}"
        echo -e "${YELLOW}DNS Configuration Instructions for $domain (subdomain):${NC}"
        echo "Please add the following CNAME record to your GoDaddy DNS configuration:"
        echo "$subdomain IN CNAME $root_domain.firebaseapp.com."
    fi
    
    # Extract verification TXT record if available
    TXT_RECORD=$(echo "$VERIFICATION_INFO" | grep -o "TXT record.*" || echo "")
    if [[ ! -z "$TXT_RECORD" ]]; then
        echo "Also add the following TXT record for domain verification:"
        echo "$TXT_RECORD"
    fi
}

# Process all domains
echo -e "${BLUE}Processing ${#DOMAINS[@]} domains...${NC}"
for domain in $DOMAINS; do
    # Skip empty lines
    if [ -z "$domain" ]; then
        continue
    fi
    
    check_domain_ssl "$domain"
done

# Generate audit report
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/ssl-audit-$TIMESTAMP.json"
REPORT_HTML="$REPORT_DIR/ssl-audit-$TIMESTAMP.html"
REPORT_CSV="$REPORT_DIR/ssl-audit-$TIMESTAMP.csv"
LATEST_REPORT="$REPORT_DIR/latest-ssl-audit.json"

echo -e "${BLUE}Generating audit report...${NC}"
echo "[" > "$REPORT_FILE"
FIRST=true
for domain in $DOMAINS; do
    # Skip empty lines
    if [ -z "$domain" ]; then
        continue
    fi
    
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$REPORT_FILE"
    fi
    
    cat "$TEMP_DIR/$domain.json" >> "$REPORT_FILE"
done
echo "]" >> "$REPORT_FILE"

# Copy to latest report
cp "$REPORT_FILE" "$LATEST_REPORT"

# Generate HTML report
cat > "$REPORT_HTML" << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Coaching2100 Domain SSL Audit</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .success { color: green; }
    .warning { color: orange; }
    .error { color: red; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .actions button { margin: 5px; padding: 5px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Coaching2100 Domain SSL Audit</h1>
    <p>Timestamp: $TIMESTAMP</p>
    
    <div class="summary">
      <h2>Summary</h2>
      <script>
        // Load and parse the JSON data
        const auditData = JSON.parse(\`$(cat "$REPORT_FILE")\`);
        
        // Calculate summary statistics
        const totalDomains = auditData.length;
        const resolving = auditData.filter(d => d.resolves).length;
        const sslValid = auditData.filter(d => d.ssl_valid === true).length;
        const sslMatches = auditData.filter(d => d.ssl_matches === true).length;
        const firebaseConnected = auditData.filter(d => d.firebase_connected === true).length;
        const verified = auditData.filter(d => d.verification_status === "verified").length;
        const sslProvisioned = auditData.filter(d => d.ssl_status === "provisioned").length;
        
        // Display summary
        document.write(\`
          <p><strong>Total Domains:</strong> \${totalDomains}</p>
          <p><strong>Resolving:</strong> \${resolving} (\${Math.round(resolving/totalDomains*100)}%)</p>
          <p><strong>SSL Valid:</strong> \${sslValid} (\${Math.round(sslValid/totalDomains*100)}%)</p>
          <p><strong>SSL Matches Domain:</strong> \${sslMatches} (\${Math.round(sslMatches/totalDomains*100)}%)</p>
          <p><strong>Firebase Connected:</strong> \${firebaseConnected} (\${Math.round(firebaseConnected/totalDomains*100)}%)</p>
          <p><strong>Verified:</strong> \${verified} (\${Math.round(verified/totalDomains*100)}%)</p>
          <p><strong>SSL Provisioned:</strong> \${sslProvisioned} (\${Math.round(sslProvisioned/totalDomains*100)}%)</p>
        \`);
      </script>
    </div>
    
    <h2>Domain Details</h2>
    <table>
      <thead>
        <tr>
          <th>Domain</th>
          <th>Resolves</th>
          <th>SSL Valid</th>
          <th>SSL Matches</th>
          <th>Firebase Connected</th>
          <th>Verification</th>
          <th>SSL Status</th>
        </tr>
      </thead>
      <tbody>
        <script>
          // Generate table rows
          auditData.forEach(domain => {
            document.write(\`
              <tr>
                <td>\${domain.domain}</td>
                <td class="\${domain.resolves ? 'success' : 'error'}">\${domain.resolves ? '✓' : '✗'}</td>
                <td class="\${domain.ssl_valid === true ? 'success' : domain.ssl_valid === false ? 'error' : 'warning'}">\${domain.ssl_valid === true ? '✓' : domain.ssl_valid === false ? '✗' : '?'}</td>
                <td class="\${domain.ssl_matches === true ? 'success' : domain.ssl_matches === false ? 'error' : 'warning'}">\${domain.ssl_matches === true ? '✓' : domain.ssl_matches === false ? '✗' : '?'}</td>
                <td class="\${domain.firebase_connected ? 'success' : 'error'}">\${domain.firebase_connected ? '✓' : '✗'}</td>
                <td class="\${domain.verification_status === 'verified' ? 'success' : domain.verification_status === 'pending' ? 'warning' : 'error'}">\${domain.verification_status}</td>
                <td class="\${domain.ssl_status === 'provisioned' ? 'success' : domain.ssl_status === 'pending' ? 'warning' : 'error'}">\${domain.ssl_status}</td>
              </tr>
            \`);
          });
        </script>
      </tbody>
    </table>
  </div>
</body>
</html>
EOF

# Generate CSV report
echo "Domain,Resolves,SSL Valid,SSL Matches,Firebase Connected,Verification,SSL Status" > "$REPORT_CSV"
for domain in $DOMAINS; do
    # Skip empty lines
    if [ -z "$domain" ]; then
        continue
    fi
    
    # Extract values from JSON
    RESOLVES=$(jq -r .resolves "$TEMP_DIR/$domain.json")
    SSL_VALID=$(jq -r .ssl_valid "$TEMP_DIR/$domain.json")
    SSL_MATCHES=$(jq -r .ssl_matches "$TEMP_DIR/$domain.json")
    FIREBASE_CONNECTED=$(jq -r .firebase_connected "$TEMP_DIR/$domain.json")
    VERIFICATION_STATUS=$(jq -r .verification_status "$TEMP_DIR/$domain.json")
    SSL_STATUS=$(jq -r .ssl_status "$TEMP_DIR/$domain.json")
    
    echo "$domain,$RESOLVES,$SSL_VALID,$SSL_MATCHES,$FIREBASE_CONNECTED,$VERIFICATION_STATUS,$SSL_STATUS" >> "$REPORT_CSV"
done

# Display summary
echo -e "${GREEN}Audit completed. Reports saved to:${NC}"
echo "- JSON: $REPORT_FILE"
echo "- HTML: $REPORT_HTML"
echo "- CSV: $REPORT_CSV"
echo

# Ask if user wants to fix issues
echo -e "${BLUE}The following domains have SSL issues:${NC}"
jq -r '.[] | select(.ssl_valid == false or .ssl_matches == false or .firebase_connected == false) | .domain' "$REPORT_FILE" | while read domain; do
    echo "- $domain"
done

read -p "Do you want to fix these issues? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Fix issues
    jq -r '.[] | select(.ssl_valid == false or .ssl_matches == false or .firebase_connected == false) | .domain' "$REPORT_FILE" | while read domain; do
        fix_domain_ssl "$domain"
    done
    
    echo -e "${GREEN}Fixes applied. Please allow up to 24 hours for SSL certificates to provision.${NC}"
    echo -e "${YELLOW}You can run this script again later to verify the fixes.${NC}"
else
    echo -e "${YELLOW}No fixes applied.${NC}"
fi

# Clean up
rm -rf "$TEMP_DIR"

echo -e "${GREEN}Done!${NC}"
exit 0