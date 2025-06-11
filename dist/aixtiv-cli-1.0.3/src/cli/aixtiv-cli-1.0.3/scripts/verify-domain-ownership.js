#!/usr/bin/env node
/**
 * Domain Ownership Verification Script
 * 
 * This script verifies which domains in the cache are actually owned in GoDaddy.
 * It takes a file of verified GoDaddy domains and compares with the domain cache.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOMAIN_CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli', 'domain-cache.json');
const VERIFIED_DOMAINS_OUTPUT = path.join(__dirname, '..', 'domains', 'verified-domains.txt');
const UNVERIFIED_DOMAINS_OUTPUT = path.join(__dirname, '..', 'domains', 'unverified-domains.txt');

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
 * Extract the base domain from a domain name
 * e.g., "subdomain.example.com" -> "example.com"
 */
function getBaseDomain(domain) {
  // Handle special cases like co.uk, com.mx, etc.
  const specialTlds = ['co.uk', 'com.mx', 'com.au', 'co.nz', 'org.uk', 'net.au'];
  
  for (const specialTld of specialTlds) {
    if (domain.endsWith('.' + specialTld)) {
      const parts = domain.split('.');
      if (parts.length > 2) {
        return parts.slice(parts.length - 3).join('.');
      }
      return domain;
    }
  }

  // Standard case
  const parts = domain.split('.');
  if (parts.length > 2) {
    return parts.slice(parts.length - 2).join('.');
  }
  return domain;
}

/**
 * Verify domains ownership by comparing with GoDaddy domains
 */
function verifyDomainOwnership(godaddyDomainsFile) {
  console.log(`${COLORS.blue}=== Domain Ownership Verification ===${COLORS.reset}`);
  console.log(`${COLORS.blue}Date: ${new Date().toISOString()}${COLORS.reset}\n`);

  try {
    // Step 1: Read the domain cache
    console.log(`${COLORS.cyan}Reading domain cache from ${DOMAIN_CACHE_PATH}...${COLORS.reset}`);
    
    if (!fs.existsSync(DOMAIN_CACHE_PATH)) {
      console.error(`${COLORS.red}Domain cache not found: ${DOMAIN_CACHE_PATH}${COLORS.reset}`);
      return {
        error: `Domain cache not found: ${DOMAIN_CACHE_PATH}`
      };
    }
    
    const cacheData = JSON.parse(fs.readFileSync(DOMAIN_CACHE_PATH, 'utf8'));
    const cachedDomains = cacheData.domains.map(domain => domain.name);
    
    console.log(`${COLORS.green}Found ${cachedDomains.length} domains in cache${COLORS.reset}`);
    
    // Step 2: Read the GoDaddy domains file
    console.log(`\n${COLORS.cyan}Reading GoDaddy domains from ${godaddyDomainsFile}...${COLORS.reset}`);
    
    if (!fs.existsSync(godaddyDomainsFile)) {
      console.error(`${COLORS.red}GoDaddy domains file not found: ${godaddyDomainsFile}${COLORS.reset}`);
      return {
        error: `GoDaddy domains file not found: ${godaddyDomainsFile}`
      };
    }
    
    const fileContent = fs.readFileSync(godaddyDomainsFile, 'utf8');
    const godaddyDomains = fileContent
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line && !line.startsWith('#'));
    
    console.log(`${COLORS.green}Found ${godaddyDomains.length} domains in GoDaddy file${COLORS.reset}`);
    
    // Step 3: Compare domains to determine which ones are verified
    console.log(`\n${COLORS.cyan}Comparing domains...${COLORS.reset}`);
    
    // Prepare base domain lookups for faster comparison
    const godaddyBaseDomains = new Set();
    const godaddyExactDomains = new Set(godaddyDomains);
    
    godaddyDomains.forEach(domain => {
      const baseDomain = getBaseDomain(domain);
      godaddyBaseDomains.add(baseDomain);
    });
    
    // Check each cached domain against GoDaddy domains
    const verifiedDomains = [];
    const unverifiedDomains = [];
    
    cachedDomains.forEach(domain => {
      // First try exact match
      if (godaddyExactDomains.has(domain.toLowerCase())) {
        verifiedDomains.push(domain);
        return;
      }
      
      // Try base domain match for subdomains
      const baseDomain = getBaseDomain(domain.toLowerCase());
      if (godaddyBaseDomains.has(baseDomain)) {
        verifiedDomains.push(domain);
        return;
      }
      
      // Not found in GoDaddy
      unverifiedDomains.push(domain);
    });
    
    // Step 4: Generate report
    console.log(`\n${COLORS.magenta}=== Domain Verification Results ===${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains in cache:          ${COLORS.white}${cachedDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Domains in GoDaddy:        ${COLORS.white}${godaddyDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Verified domains (keep):   ${COLORS.green}${verifiedDomains.length}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Unverified domains (remove): ${COLORS.red}${unverifiedDomains.length}${COLORS.reset}`);
    
    // Step 5: Save verified and unverified domains to files
    console.log(`\n${COLORS.cyan}Saving results to files...${COLORS.reset}`);
    
    fs.writeFileSync(VERIFIED_DOMAINS_OUTPUT, verifiedDomains.join('\n') + '\n');
    fs.writeFileSync(UNVERIFIED_DOMAINS_OUTPUT, unverifiedDomains.join('\n') + '\n');
    
    console.log(`${COLORS.green}Verified domains saved to: ${VERIFIED_DOMAINS_OUTPUT}${COLORS.reset}`);
    console.log(`${COLORS.green}Unverified domains saved to: ${UNVERIFIED_DOMAINS_OUTPUT}${COLORS.reset}`);
    
    // Step 6: Recommendations
    console.log(`\n${COLORS.magenta}=== Recommendations ===${COLORS.reset}`);
    
    if (unverifiedDomains.length > 0) {
      console.log(`${COLORS.yellow}Found ${unverifiedDomains.length} domains in the cache that are not verified in GoDaddy.${COLORS.reset}`);
      console.log(`${COLORS.yellow}Consider removing these domains from the cache.${COLORS.reset}`);
      
      // Show sample of unverified domains
      const sampleSize = Math.min(10, unverifiedDomains.length);
      console.log(`\n${COLORS.cyan}Sample of unverified domains:${COLORS.reset}`);
      
      for (let i = 0; i < sampleSize; i++) {
        console.log(`${COLORS.red}- ${unverifiedDomains[i]}${COLORS.reset}`);
      }
      
      if (unverifiedDomains.length > sampleSize) {
        console.log(`${COLORS.yellow}... and ${unverifiedDomains.length - sampleSize} more${COLORS.reset}`);
      }
      
      console.log(`\n${COLORS.green}To cleanup the cache and keep only verified domains, you can:${COLORS.reset}`);
      console.log(`${COLORS.white}1. Make a backup of your current domain cache${COLORS.reset}`);
      console.log(`${COLORS.white}2. Use the verified-domains.txt file with bulk-domain-import.sh${COLORS.reset}`);
    } else {
      console.log(`${COLORS.green}All domains in the cache are verified in GoDaddy!${COLORS.reset}`);
    }
    
    return {
      totalCached: cachedDomains.length,
      totalGodaddy: godaddyDomains.length,
      verified: verifiedDomains.length,
      unverified: unverifiedDomains.length,
      verifiedFile: VERIFIED_DOMAINS_OUTPUT,
      unverifiedFile: UNVERIFIED_DOMAINS_OUTPUT
    };
    
  } catch (error) {
    console.error(`${COLORS.red}Error verifying domain ownership: ${error.message}${COLORS.reset}`);
    if (error.stack) {
      console.error(`${COLORS.red}${error.stack}${COLORS.reset}`);
    }
    
    return {
      error: error.message
    };
  }
}

// Main execution
if (require.main === module) {
  // Check for arguments
  if (process.argv.length < 3) {
    console.error(`${COLORS.red}Error: Missing GoDaddy domains file argument${COLORS.reset}`);
    console.error(`${COLORS.yellow}Usage: node verify-domain-ownership.js [godaddy-domains-file]${COLORS.reset}`);
    process.exit(1);
  }
  
  const godaddyDomainsFile = process.argv[2];
  verifyDomainOwnership(godaddyDomainsFile);
}

// Export for use in other scripts
module.exports = { verifyDomainOwnership, getBaseDomain };

