#!/usr/bin/env node

/**
 * Script to update domain status in AIXTIV CLI domain cache
 * - Removes specific domains completely
 * - Updates special domains to keep with us
 */

const fs = require('fs');
const path = require('path');

// Domains to completely remove
const domainsToRemove = [
  'byfabrizio.design',
  'philliproark.com',
  'kennedyryan.com',
  '2100.group'
];

// Special domains to keep and update
const domainsToKeep = [
  'byfabrizio.live' // This one stays
];

// Config path for domain cache
const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli');
const domainCachePath = path.join(configDir, 'domain-cache.json');

// Check if cache file exists
if (!fs.existsSync(domainCachePath)) {
  console.error('Domain cache file not found.');
  process.exit(1);
}

// Read current cache
try {
  const cacheData = fs.readFileSync(domainCachePath, 'utf8');
  const cache = JSON.parse(cacheData);
  
  console.log(`Current cache has ${cache.domains.length} domains.`);
  
  // Remove specific domains
  const initialCount = cache.domains.length;
  cache.domains = cache.domains.filter(domain => !domainsToRemove.includes(domain.name));
  const removedCount = initialCount - cache.domains.length;
  
  // Update status for domains to keep
  let updatedCount = 0;
  for (const domain of cache.domains) {
    if (domainsToKeep.includes(domain.name)) {
      domain.status = 'active';
      domain.expiryDate = getDefaultExpiryDate();
      domain.notes = 'Special domain - retained per instructions';
      updatedCount++;
    }
  }
  
  // Update timestamp
  cache.lastUpdated = new Date().toISOString();
  
  // Save updated cache
  fs.writeFileSync(domainCachePath, JSON.stringify(cache, null, 2));
  
  console.log(`Domain cache cleanup complete.`);
  console.log(`- Removed domains: ${removedCount}`);
  console.log(`- Updated domains: ${updatedCount}`);
  console.log(`- Cache now has ${cache.domains.length} domains.`);
  
  // List the domains that were removed
  console.log('\nRemoved domains:');
  domainsToRemove.forEach(domain => {
    console.log(`- ${domain}`);
  });
  
  // List the domains that were kept and updated
  console.log('\nKept domains:');
  domainsToKeep.forEach(domain => {
    console.log(`- ${domain}`);
  });
  
} catch (error) {
  console.error('Error processing domain cache:', error);
  process.exit(1);
}

/**
 * Get default expiry date (1 year from now)
 */
function getDefaultExpiryDate() {
  const now = new Date();
  const nextYear = new Date(now.setFullYear(now.getFullYear() + 1));
  return nextYear.toISOString().split('T')[0];
}