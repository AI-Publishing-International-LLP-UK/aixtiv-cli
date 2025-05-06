#!/usr/bin/env node
/**
 * GoDaddy Domain Migration Status Report
 * 
 * This script counts domains in GoDaddy account and compares with domains
 * that have already been migrated to Firebase.
 */

const fs = require('fs');
const path = require('path');
const { listDomains } = require('./lib/api/providers/godaddy');
const { execSync } = require('child_process');

// Configuration
const DOMAIN_CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli', 'domain-cache.json');
const DOMAINS_FILE_PATH = path.join(__dirname, 'domains', 'all-domains.txt');
const EXCLUDED_DOMAINS = ['godaddysites.com', 'secureserver.net', 'hostingplatform.com', 'pantheonsite.io'];

// ANSI color codes for output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Main function to generate domain migration report
 */
async function generateDomainReport() {
  console.log(`${COLORS.blue}=== GoDaddy Domain Migration Status Report ===${COLORS.reset}`);
  console.log(`${COLORS.blue}Date: ${new Date().toISOString()}${COLORS.reset}\n`);
  
  try {
    // Step 1: Get all domains from GoDaddy account
    console.log(`${COLORS.cyan}Fetching domains from GoDaddy account...${COLORS.reset}`);
    const godaddyDomains = await listDomains({ statuses: 'ACTIVE' });
    
    // Filter out excluded domains
    const filteredGodaddyDomains = godaddyDomains.filter(domain => 
      !EXCLUDED_DOMAINS.some(excluded => domain.domain.endsWith(excluded))
    );
    
    console.log(`${COLORS.green}Found ${filteredGodaddyDomains.length} active domains in GoDaddy account${COLORS.reset}`);
    
    // Step 2: Get domains from all-domains.txt file
    console.log(`\n${COLORS.cyan}Reading domains from ${DOMAINS_FILE_PATH}...${COLORS.reset}`);
    let allDomainsFile = [];
    
    if (fs.existsSync(DOMAINS_FILE_PATH)) {
      const fileContent = fs.readFileSync(DOMAINS_FILE_PATH, 'utf8');
      allDomainsFile = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      console.log(`${COLORS.green}Found ${allDomainsFile.length} domains in all-domains.txt file${COLORS.reset}`);
    } else {
      console.log(`${COLORS.red}Domains file not found: ${DOMAINS_FILE_PATH}${COLORS.reset}`);
    }
    
    // Step 3: Get domains from domain cache (already migrated to Firebase)
    console.log(`\n${COLORS.cyan}Checking domains in Firebase (domain cache)...${COLORS.reset}`);
    let cachedDomains = [];
    
    if (fs.existsSync(DOMAIN_CACHE_PATH)) {
      const cacheData = JSON.parse(fs.readFileSync(DOMAIN_CACHE_PATH, 'utf8'));
      cachedDomains = cacheData.domains.map(domain => domain.name);
      
      console.log(`${COLORS.green}Found ${cachedDomains.length} domains in Firebase domain cache${COLORS.reset}`);
    } else {
      console.log(`${COLORS.red}Domain cache not found: ${DOMAIN_CACHE_PATH}${COLORS.reset}`);
    }
    
    // Step 4: Check Firebase sites using Firebase CLI
    console.log(`\n${COLORS.cyan}Checking Firebase Hosting sites...${COLORS.reset}`);
    let firebaseSites = [];
    
    try {
      const firebaseOutput = execSync('firebase hosting:sites:list --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      
      firebaseSites = JSON.parse(firebaseOutput);
      console.log(`${COLORS.green}Found ${firebaseSites.length} sites in Firebase Hosting${COLORS.reset}`);
    } catch (error) {
      console.log(`${COLORS.red}Could not fetch Firebase Hosting sites: ${error.message}${COLORS.reset}`);
      console.log(`${COLORS.yellow}Make sure you are logged in to Firebase CLI${COLORS.reset}`);
    }
    
    // Step 5: Calculate domains that need to be migrated
    console.log(`\n${COLORS.magenta}=== Migration Status Summary ===${COLORS.reset}`);
    
    // Domains in GoDaddy but not in cache
    const notMigratedDomains = filteredGodaddyDomains
      .map(domain => domain.domain)
      .filter(domain => !cachedDomains.includes(domain));
    
    // Domains in all-domains.txt but not in cache
    const pendingDomainsFromFile = allDomainsFile
      .filter(domain => !cachedDomains.includes(domain));
    
    // Generate report
    console.log(`${COLORS.cyan}Total GoDaddy active domains:       ${COLORS.white}${filteredGodaddyDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains in all-domains.txt:         ${COLORS.white}${allDomainsFile.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains migrated to Firebase:       ${COLORS.white}${cachedDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains pending migration (GoDaddy): ${COLORS.white}${notMigratedDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains pending migration (file):   ${COLORS.white}${pendingDomainsFromFile.length}${COLORS.reset}`);
    
    // Step 6: Domain families report
    console.log(`\n${COLORS.magenta}=== Domain Families ===${COLORS.reset}`);
    const domainFamilies = {};
    
    // Group domains by their families (top-level domains)
    cachedDomains.forEach(domain => {
      const match = domain.match(/([^.]+)\.[^.]+$/);
      if (match) {
        const family = match[1];
        if (!domainFamilies[family]) {
          domainFamilies[family] = [];
        }
        domainFamilies[family].push(domain);
      }
    });
    
    // Print domain families
    Object.keys(domainFamilies).sort().forEach(family => {
      console.log(`${COLORS.yellow}${family}: ${COLORS.white}${domainFamilies[family].length} domains${COLORS.reset}`);
    });
    
    // Step 7: Print detailed list of domains
    if (notMigratedDomains.length > 0) {
      console.log(`\n${COLORS.magenta}=== Domains Not Yet Migrated ===${COLORS.reset}`);
      
      // Sort domains by TLD for better readability
      notMigratedDomains.sort().forEach(domain => {
        console.log(`${COLORS.white}- ${domain}${COLORS.reset}`);
      });
    }
    
    // Provide next steps guidance
    console.log(`\n${COLORS.magenta}=== Recommended Actions ===${COLORS.reset}`);
    if (notMigratedDomains.length > 0) {
      console.log(`${COLORS.green}Run the following command to import domains into cache:${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/bulk-domain-import.sh ${DOMAINS_FILE_PATH} brand api-for-warp-drive false${COLORS.reset}`);
      
      console.log(`\n${COLORS.green}Then provision SSL certificates with:${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/batch-ssl-provision.sh ${DOMAINS_FILE_PATH} firebase api-for-warp-drive false${COLORS.reset}`);
    } else {
      console.log(`${COLORS.green}All domains from GoDaddy appear to be migrated to Firebase.${COLORS.reset}`);
      console.log(`${COLORS.green}Verify they are properly set up with:${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/domain-ssl-check.sh${COLORS.reset}`);
    }
    
    return {
      godaddyCount: filteredGodaddyDomains.length,
      fileCount: allDomainsFile.length,
      migratedCount: cachedDomains.length,
      pendingCount: notMigratedDomains.length,
      pendingFileCount: pendingDomainsFromFile.length,
      domainFamilies
    };
    
  } catch (error) {
    console.error(`${COLORS.red}Error generating domain report: ${error.message}${COLORS.reset}`);
    if (error.stack) {
      console.error(`${COLORS.red}${error.stack}${COLORS.reset}`);
    }
    
    return {
      error: error.message
    };
  }
}

// Execute if run directly
if (require.main === module) {
  (async () => {
    await generateDomainReport();
  })();
}

// Export for use in other scripts
module.exports = { generateDomainReport };

