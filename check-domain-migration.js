#!/usr/bin/env node
/**
 * Domain Migration Status Check
 * 
 * This script compares domains in all-domains.txt with domains in the cache
 * to determine how many domains still need to be migrated to Firebase.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOMAIN_CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli', 'domain-cache.json');
const ALL_DOMAINS_FILE_PATH = path.join(__dirname, 'domains', 'all-domains.txt');
const CUSTOM_DOMAINS_FILE_PATH = path.join(__dirname, 'domains', 'custom-domains.txt');

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
 * Main function to check domain migration status
 */
function checkDomainMigrationStatus() {
  console.log(`${COLORS.blue}=== Domain Migration Status Check ===${COLORS.reset}`);
  console.log(`${COLORS.blue}Date: ${new Date().toISOString()}${COLORS.reset}\n`);
  
  try {
    // Read domains from a file, handling special characters properly
    const readDomainsFromFile = (filePath) => {
      if (!fs.existsSync(filePath)) {
        console.log(`${COLORS.red}Domains file not found: ${filePath}${COLORS.reset}`);
        return [];
      }
      
      // Read file with UTF-8 encoding to properly handle special characters
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    };
    
    // Step 1: Read domains from all-domains.txt file
    console.log(`${COLORS.cyan}Reading domains from ${ALL_DOMAINS_FILE_PATH}...${COLORS.reset}`);
    const allDomainsFile = readDomainsFromFile(ALL_DOMAINS_FILE_PATH);
    console.log(`${COLORS.green}Found ${allDomainsFile.length} domains in all-domains.txt file${COLORS.reset}`);
    
    // Step 2: Read domains from custom-domains.txt file
    console.log(`${COLORS.cyan}Reading domains from ${CUSTOM_DOMAINS_FILE_PATH}...${COLORS.reset}`);
    const customDomainsFile = readDomainsFromFile(CUSTOM_DOMAINS_FILE_PATH);
    console.log(`${COLORS.green}Found ${customDomainsFile.length} domains in custom-domains.txt file${COLORS.reset}`);
    
    // Combine domains from both files and remove duplicates
    const allDomains = [...new Set([...allDomainsFile, ...customDomainsFile])];
    console.log(`${COLORS.green}Total unique domains across both files: ${allDomains.length}${COLORS.reset}`);
    
    // Step 3: Read domains from domain cache (already migrated to Firebase)
    console.log(`\n${COLORS.cyan}Checking domains in Firebase (domain cache)...${COLORS.reset}`);
    let cachedDomains = [];
    
    if (fs.existsSync(DOMAIN_CACHE_PATH)) {
      const cacheData = JSON.parse(fs.readFileSync(DOMAIN_CACHE_PATH, 'utf8'));
      cachedDomains = cacheData.domains.map(domain => domain.name);
      
      console.log(`${COLORS.green}Found ${cachedDomains.length} domains in Firebase domain cache${COLORS.reset}`);
    } else {
      console.log(`${COLORS.red}Domain cache not found: ${DOMAIN_CACHE_PATH}${COLORS.reset}`);
      return {
        error: `Domain cache not found: ${DOMAIN_CACHE_PATH}`
      };
    }
    
    // Step 4: Calculate domains that need to be migrated
    const pendingDomainsFromFile = allDomains
      .filter(domain => !cachedDomains.includes(domain));
    
    // Generate summary report
    console.log(`\n${COLORS.magenta}=== Migration Status Summary ===${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains in all-domains.txt:       ${COLORS.white}${allDomainsFile.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains in custom-domains.txt:    ${COLORS.white}${customDomainsFile.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Total unique domains:             ${COLORS.white}${allDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains migrated to Firebase:     ${COLORS.white}${cachedDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains pending migration:        ${COLORS.white}${pendingDomainsFromFile.length}${COLORS.reset}`);
    
    // Step 4: Domain families report
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
    
    // Step 5: Print detailed list of pending domains
    if (pendingDomainsFromFile.length > 0) {
      console.log(`\n${COLORS.magenta}=== Domains Not Yet Migrated ===${COLORS.reset}`);
      
      // Show only first 20 domains if there are many
      const displayLimit = pendingDomainsFromFile.length > 20 ? 20 : pendingDomainsFromFile.length;
      
      // Sort domains for better readability
      pendingDomainsFromFile.sort().slice(0, displayLimit).forEach(domain => {
        console.log(`${COLORS.white}- ${domain}${COLORS.reset}`);
      });
      
      if (pendingDomainsFromFile.length > 20) {
        console.log(`${COLORS.yellow}... and ${pendingDomainsFromFile.length - 20} more${COLORS.reset}`);
      }
    }
    
    // Provide next steps guidance
    console.log(`\n${COLORS.magenta}=== Recommended Actions ===${COLORS.reset}`);
    if (pendingDomainsFromFile.length > 0) {
      console.log(`${COLORS.green}Run the following commands to import ${pendingDomainsFromFile.length} domains into cache:${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/bulk-domain-import.sh ${ALL_DOMAINS_FILE_PATH} brand api-for-warp-drive false${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/bulk-domain-import.sh ${CUSTOM_DOMAINS_FILE_PATH} brand api-for-warp-drive false${COLORS.reset}`);
      
      console.log(`\n${COLORS.green}Then provision SSL certificates with:${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/batch-ssl-provision.sh ${ALL_DOMAINS_FILE_PATH} firebase api-for-warp-drive false${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/batch-ssl-provision.sh ${CUSTOM_DOMAINS_FILE_PATH} firebase api-for-warp-drive false${COLORS.reset}`);
    } else {
      console.log(`${COLORS.green}All domains from both domain files appear to be migrated to Firebase.${COLORS.reset}`);
      console.log(`${COLORS.green}Verify they are properly set up with:${COLORS.reset}`);
      console.log(`${COLORS.yellow}./scripts/domain-ssl-check.sh${COLORS.reset}`);
    }
    
    return {
      allDomainsFileCount: allDomainsFile.length,
      customDomainsFileCount: customDomainsFile.length,
      totalUniqueCount: allDomains.length,
      migratedCount: cachedDomains.length,
      pendingCount: pendingDomainsFromFile.length,
      domainFamilies
    };
    
  } catch (error) {
    console.error(`${COLORS.red}Error checking domain migration status: ${error.message}${COLORS.reset}`);
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
  checkDomainMigrationStatus();
}

// Export for use in other scripts
module.exports = { checkDomainMigrationStatus };

