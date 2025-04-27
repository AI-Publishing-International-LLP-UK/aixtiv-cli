#!/usr/bin/env node

/**
 * Script to remove specific domains from the AIXTIV CLI domain cache
 */

const fs = require('fs');
const path = require('path');

// List of domains to remove
const domainsToRemove = [
  'kennedyryan.com',
  'byfabrizio.live',
  'byfabrizio.design',
  'philliproark.com'
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
  
  // Find and remove specified domains
  const initialCount = cache.domains.length;
  cache.domains = cache.domains.filter(domain => !domainsToRemove.includes(domain.name));
  const removedCount = initialCount - cache.domains.length;
  
  // Update timestamp
  cache.lastUpdated = new Date().toISOString();
  
  // Save updated cache
  fs.writeFileSync(domainCachePath, JSON.stringify(cache, null, 2));
  
  console.log(`Removed ${removedCount} domains from cache.`);
  console.log(`Cache now has ${cache.domains.length} domains.`);
  
  // List the domains that were removed
  console.log('\nRemoved domains:');
  domainsToRemove.forEach(domain => {
    console.log(`- ${domain}`);
  });
  
} catch (error) {
  console.error('Error processing domain cache:', error);
  process.exit(1);
}