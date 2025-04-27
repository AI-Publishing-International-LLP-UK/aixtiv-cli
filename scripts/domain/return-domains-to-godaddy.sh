#!/bin/bash
# return-domains-to-godaddy.sh
# Script to prepare domains for return to GoDaddy management
# Steps:
# 1. Remove domains from Firebase hosting
# 2. Remove domains from CLI cache
# 3. Output DNS restoration instructions

DOMAINS_FILE="${1:-domains-to-return.txt}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="domain-return-log-$TIMESTAMP.txt"

if [ ! -f "$DOMAINS_FILE" ]; then
  echo "Domain list file not found: $DOMAINS_FILE"
  echo "Creating example file: $DOMAINS_FILE"
  echo "# List of domains to return to GoDaddy" > "$DOMAINS_FILE"
  echo "# One domain per line" >> "$DOMAINS_FILE"
  echo "byfabrizio.live" >> "$DOMAINS_FILE"
  echo "byfabrizio.design" >> "$DOMAINS_FILE"
  echo "philliproark.com" >> "$DOMAINS_FILE"
  echo "kennedyryan.com" >> "$DOMAINS_FILE"
  echo ""
  echo "Please edit $DOMAINS_FILE and run the script again."
  exit 1
fi

echo "Domain Return to GoDaddy Preparation" | tee "$LOG_FILE"
echo "Domains from: $DOMAINS_FILE" | tee -a "$LOG_FILE"
echo "Start: $(date)" | tee -a "$LOG_FILE"
echo "------------------------------" | tee -a "$LOG_FILE"

SUCCESS=()
FAILED=()

# Step 1: Remove domains from Firebase Hosting
echo "STEP 1: Removing domains from Firebase Hosting" | tee -a "$LOG_FILE"
echo "------------------------------" | tee -a "$LOG_FILE"

while IFS= read -r DOMAIN; do
  # Skip comments and empty lines
  if [[ -z "$DOMAIN" || "$DOMAIN" =~ ^# ]]; then
    continue
  fi
  
  echo "Processing domain: $DOMAIN" | tee -a "$LOG_FILE"
  
  # Convert domain to site ID format (replace dots with hyphens)
  SITE_ID=$(echo "$DOMAIN" | sed 's/\./-/g')
  
  echo "  Checking for Firebase site: $SITE_ID" | tee -a "$LOG_FILE"
  
  # Check if site exists in Firebase
  if firebase hosting:sites:list --project api-for-warp-drive | grep -q "$SITE_ID"; then
    echo "  Site exists, deleting..." | tee -a "$LOG_FILE"
    
    if firebase hosting:sites:delete "$SITE_ID" --force >> "$LOG_FILE" 2>&1; then
      echo "  => Firebase site deleted successfully" | tee -a "$LOG_FILE"
    else
      echo "  => WARNING: Failed to delete Firebase site" | tee -a "$LOG_FILE"
    fi
  else
    echo "  => No Firebase site found" | tee -a "$LOG_FILE"
  fi
  
  # Step 2: Remove domain from AIXTIV CLI cache
  echo "  Removing from AIXTIV CLI domain cache..." | tee -a "$LOG_FILE"
  
  # Create temporary JavaScript to remove domain from cache
  TEMP_JS=$(mktemp)
  cat > "$TEMP_JS" <<EOL
const fs = require('fs');
const path = require('path');

// Config path for domain cache
const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli');
const domainCachePath = path.join(configDir, 'domain-cache.json');

// Check if cache file exists
if (!fs.existsSync(domainCachePath)) {
  console.log('Domain cache file not found.');
  process.exit(0);
}

// Read current cache
try {
  const cacheData = fs.readFileSync(domainCachePath, 'utf8');
  const cache = JSON.parse(cacheData);
  
  const domainName = '$DOMAIN';
  const initialCount = cache.domains.length;
  
  // Remove domain from cache
  cache.domains = cache.domains.filter(domain => domain.name !== domainName);
  const finalCount = cache.domains.length;
  
  // Update timestamp
  cache.lastUpdated = new Date().toISOString();
  
  // Save updated cache
  fs.writeFileSync(domainCachePath, JSON.stringify(cache, null, 2));
  
  if (initialCount > finalCount) {
    console.log(\`Domain \${domainName} removed from cache.\`);
  } else {
    console.log(\`Domain \${domainName} not found in cache.\`);
  }
  
} catch (error) {
  console.error('Error processing domain cache:', error);
  process.exit(1);
}
EOL

  # Execute the script
  NODE_RESULT=$(node "$TEMP_JS")
  echo "  $NODE_RESULT" | tee -a "$LOG_FILE"
  
  # Clean up temp file
  rm -f "$TEMP_JS"
  
  # Record success
  SUCCESS+=("$DOMAIN")
  echo "  Completed processing for $DOMAIN" | tee -a "$LOG_FILE"
  echo "------------------------------" | tee -a "$LOG_FILE"
done < "$DOMAINS_FILE"

# Step 3: Output DNS restoration instructions
echo "STEP 3: DNS Restoration Instructions" | tee -a "$LOG_FILE"
echo "------------------------------" | tee -a "$LOG_FILE"
echo "To complete the domain return to GoDaddy, perform these steps:" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "1. Login to your GoDaddy account" | tee -a "$LOG_FILE"
echo "2. For each domain, restore default DNS settings:" | tee -a "$LOG_FILE"
echo "   - Go to the domain's DNS management page" | tee -a "$LOG_FILE"
echo "   - Remove any Firebase/Google verification TXT records" | tee -a "$LOG_FILE"
echo "   - Remove any A/CNAME records pointing to Firebase/Google services" | tee -a "$LOG_FILE"
echo "   - Set up default DNS records as needed" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "3. Domains to update in GoDaddy:" | tee -a "$LOG_FILE"
printf "   - %s\n" "${SUCCESS[@]}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Summary
echo "SUMMARY" | tee -a "$LOG_FILE"
echo "------------------------------" | tee -a "$LOG_FILE"
echo "Domains processed: ${#SUCCESS[@]}" | tee -a "$LOG_FILE"
printf "- %s\n" "${SUCCESS[@]}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "These domains have been removed from Firebase hosting" | tee -a "$LOG_FILE"
echo "and the AIXTIV CLI domain cache." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "End: $(date)" | tee -a "$LOG_FILE"

echo ""
echo "🛫 Lucy1Bomb RIX Operations Report:"
echo "Domain return preparation completed successfully."
echo "- Domains processed: ${#SUCCESS[@]}"
echo "- Log file: $LOG_FILE"
echo ""
echo "GoDaddy DNS restoration instructions are available in the log file."
echo "RIX Command: Domain return preparation complete."