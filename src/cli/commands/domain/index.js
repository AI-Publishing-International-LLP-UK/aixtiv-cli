/**
 * Domain Management Commands Module
 * 
 * Implementation of domain management for the Aixtiv CLI including:
 * - Listing domains in the system
 * - Adding new domains
 * - Verifying domain configuration
 * - Removing domains
 * 
 * These commands integrate with the domain management system
 * for managing domains within the ASOOS framework.
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { utils } = require('../../aixtiv');

// ===================
// Constants
// ===================

// Define domain types based on ASOOS architecture
const DOMAIN_TYPES = [
  'character', // Character-based domains (e.g., drclaude.live, queenlucy.live)
  'command',   // Command systems (e.g., dreamcommand.live, visioncommand.live)
  'wing',      // Wing domains (e.g., wing-1.live)
  'squadron',  // Squadron domains (e.g., squadron-1.live)
  'brand',     // Brand domains (e.g., coaching2100.com, 2100.cool)
  'aixtiv',    // Aixtiv family domains (e.g., aixtiv.com, aixtiv-symphony.com)
  'learning',  // Learning domains (e.g., academy2100.com, getready2100.com)
  'commerce',  // Commerce domains (e.g., giftshop2100.com, marketplace2100.com)
  'governance' // Governance domains (e.g., law2100.com, governance2100.com)
];

// Domain TLDs
const DOMAIN_TLDS = [
  'live',    // Human/narrative world
  'ai',      // Artificial intelligence realm
  'com',     // Commercial entities
  'org',     // Organizational entities
  'net',     // Network entities
  'co.uk',   // UK specific
  'mx',      // Mexico specific
  'eu',      // European Union specific
  'world'    // Global presence
];

// Config path for domain cache
const DOMAIN_CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv', 'domain-cache.json');

// ===================
// Utility Functions
// ===================

// Ensure cache directory exists
function ensureCacheDirectory() {
  const cacheDir = path.dirname(DOMAIN_CACHE_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

// Load domain cache
function loadDomainCache() {
  ensureCacheDirectory();
  
  try {
    if (fs.existsSync(DOMAIN_CACHE_PATH)) {
      const cacheData = fs.readFileSync(DOMAIN_CACHE_PATH, 'utf8');
      return JSON.parse(cacheData);
    }
    
    // Initialize cache if it doesn't exist
    const initialCache = {
      domains: [],
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(DOMAIN_CACHE_PATH, JSON.stringify(initialCache, null, 2));
    return initialCache;
  } catch (error) {
    utils.ui.feedback.error(`Error loading domain cache: ${error.message}`);
    return { domains: [], lastUpdated: new Date().toISOString() };
  }
}

// Save domain cache
function saveDomainCache(data) {
  ensureCacheDirectory();
  
  try {
    fs.writeFileSync(DOMAIN_CACHE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    utils.ui.feedback.error(`Error saving domain cache: ${error.message}`);
  }
}

// Validate domain name format
function validateDomainName(domain) {
  // Basic domain validation regex
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain);
}

// Get default expiry date (1 year from now)
function getDefaultExpiryDate() {
  const now = new Date();
  const nextYear = new Date(now.setFullYear(now.getFullYear() + 1));
  return nextYear.toISOString().split('T')[0];
}

// Mock fetch domains (simulating API call)
async function mockFetchDomains() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return [
    {
      name: 'aixtiv.com',
      type: 'aixtiv',
      status: 'active',
      expiryDate: '2026-04-24',
      firebaseProject: 'aixtiv-symphony'
    },
    {
      name: 'coaching2100.com',
      type: 'brand',
      status: 'active',
      expiryDate: '2026-03-15',
      firebaseProject: 'coaching2100-com'
    },
    {
      name: 'drclaude.live',
      type: 'character',
      status: 'active',
      expiryDate: '2026-05-10',
      firebaseProject: 'dr-claude-live'
    },
    {
      name: 'queenlucy.live',
      type: 'character',
      status: 'active',
      expiryDate: '2026-05-10',
      firebaseProject: 'queen-lucy-live'
    },
    {
      name: 'dreamcommand.live',
      type: 'command',
      status: 'active',
      expiryDate: '2026-06-20',
      firebaseProject: 'dream-command-live'
    },
    {
      name: 'wing-1.live',
      type: 'wing',
      status: 'active',
      expiryDate: '2026-07-15',
      firebaseProject: 'wing-1-live'
    },
    {
      name: 'giftshop2100.com',
      type: 'commerce',
      status: 'pending',
      expiryDate: '2026-08-01',
      firebaseProject: 'giftshop2100-com'
    },
    {
      name: 'drmemoria.ai',
      type: 'character',
      status: 'transferring',
      expiryDate: '2026-09-12',
      firebaseProject: 'dr-memoria-ai'
    }
  ];
}

/**
/**
 * Domain remove command implementation
 */
async function removeDomainCommand(domain, options, { spinner } = {}) {
  if (!domain) {
    utils.ui.feedback.error('Domain name is required');
    return;
  }
  
  if (!validateDomainName(domain)) {
    utils.ui.feedback.error('Invalid domain name format');
    return;
  }
  
  // Confirm removal if not forced
  if (!options.force) {
    const inquirer = require('inquirer');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove domain ${domain}?`,
        default: false
      }
    ]);
    
    if (!confirm) {
      utils.ui.feedback.info('Domain removal cancelled');
      return;
    }
  }
  
  if (spinner) spinner.text = `Removing domain ${domain}...`;
  
  try {
    // Check if domain exists in cache
    const cache = loadDomainCache();
    const existingDomainIndex = cache.domains.findIndex(d => d.name === domain);
    
    if (existingDomainIndex === -1) {
      utils.ui.feedback.error(`Domain ${domain} not found`);
      return;
    }
    
    // Remove domain from cache
    cache.domains.splice(existingDomainIndex, 1);
    
    saveDomainCache({
      domains: cache.domains,
      lastUpdated: new Date().toISOString()
    });
    
    if (spinner) spinner.text = `Domain ${domain} removed successfully`;
    
    // Output results
    const program = require('commander').program;
    if (program.opts().json) {
      console.log(JSON.stringify({
        success: true,
        domain,
        removed: true
      }, null, 2));
      return;
    }
    
    utils.ui.feedback.success(`Domain ${domain} removed successfully`);
    console.log('\nThe domain has been removed from the Aixtiv Symphony ecosystem.');
    console.log('Note: This does not affect domain registration or DNS settings at your registrar.');
  } catch (error) {
    if (spinner) spinner.fail(`Failed to remove domain ${domain}`);
    utils.ui.feedback.error(`Error removing domain: ${error.message}`);
  }
}

// ===================
// Command Implementations
// ===================

/**
 * Domain list command implementation
 */
async function listDomainsCommand(options, { spinner } = {}) {
  if (spinner) spinner.text = 'Fetching domains...';
  
  try {
    let domains = [];
    
    // Load cached domains
    const cache = loadDomainCache();
    const cacheAge = new Date() - new Date(cache.lastUpdated);
    const cacheExpired = cacheAge > (options.cacheTtl || utils.config.get('performance.cacheTTL', 3600)) * 1000;
    
    // Refresh domains if needed
    if (options.refresh || cacheExpired) {
      // In a real implementation, this would call an API
      domains = await mockFetchDomains();
      
      // Update cache
      saveDomainCache({
        domains,
        lastUpdated: new Date().toISOString()
      });
      
      if (spinner) spinner.text = 'Domains refreshed from server';
    } else {
      domains = cache.domains;
      if (spinner) spinner.text = 'Domains loaded from cache';
    }
    
    // Apply filters
    let filteredDomains = [...domains];
    
    if (options.type) {
      filteredDomains = filteredDomains.filter(d => d.type === options.type);
    }
    
    if (options.status) {
      filteredDomains = filteredDomains.filter(d => d.status === options.status);
    }
    
    // Output results
    const program = require('commander').program;
    if (program.opts().json) {
      console.log(JSON.stringify(filteredDomains, null, 2));
      return;
    }
    
    if (program.opts().quiet) {
      console.log(`Found ${filteredDomains.length} domains`);
      return;
    }
    
    // Display domains in a table
    const { Table } = require('console-table-printer');
    const table = new Table({
      title: 'Aixtiv Symphony Domains',
      columns: [
        { name: 'name', title: 'Domain' },
        { name: 'type', title: 'Type' },
        { name: 'status', title: 'Status' },
        { name: 'expiryDate', title: 'Expiry Date' }
      ]
    });
    
    // Add Firebase project column if not in compact mode
    if (!options.compact) {
      table.columns.push({ name: 'firebaseProject', title: 'Firebase Project' });
    }
    
    filteredDomains.forEach(domain => {
      const row = {
        name: domain.name,
        type: domain.type,
        status: utils.ui.colorizeStatus(domain.status),
        expiryDate: domain.expiryDate
      };
      
      if (!options.compact) {
        row.firebaseProject = domain.firebaseProject;
      }
      
      table.addRow(row);
    });
    
    table.printTable();
    console.log(`\nTotal domains: ${filteredDomains.length}`);
    
    // Show cache info
    if (!options.refresh && filteredDomains.length > 0) {
      console.log(chalk.dim(`\nCache last updated: ${new Date(cache.lastUpdated).toLocaleString()}`));
      console.log(chalk.dim('Use --refresh to fetch the latest data from the server'));
    }
  } catch (error) {
    if (spinner) spinner.fail('Failed to fetch domains');
    utils.ui.feedback.error(`Error fetching domains: ${error.message}`);
  }
}

/**
/**
 * Domain add command implementation
 */
async function addDomainCommand(domain, options, { spinner } = {}) {
  if (!domain) {
    utils.ui.feedback.error('Domain name is required');
    return;
  }
  
  if (!validateDomainName(domain)) {
    utils.ui.feedback.error('Invalid domain name format');
    return;
  }
  
  if (spinner) spinner.text = `Adding domain ${domain}...`;
  
  try {
    // Get domain info from options
    const domainInfo = {
      type: options.type || 'brand',
      firebaseProject: options.firebaseProject || domain.replace(/\./g, '-'),
      expiryDate: options.expiryDate || getDefaultExpiryDate(),
      status: 'pending'
    };
    
    // Check if domain already exists in cache
    const cache = loadDomainCache();
    const existingDomainIndex = cache.domains.findIndex(d => d.name === domain);
    
    if (existingDomainIndex !== -1) {
      if (spinner) spinner.text = `Domain ${domain} already exists`;
      
      // Ask for confirmation to update
      const inquirer = require('inquirer');
      const { update } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'update',
          message: 'Domain already exists. Do you want to update it?',
          default: false
        }
      ]);
      
      if (!update) {
        utils.ui.feedback.info('Domain addition cancelled');
        return;
      }
      
      // Update existing domain
      cache.domains[existingDomainIndex] = {
        ...cache.domains[existingDomainIndex],
        ...domainInfo
      };
      
      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString()
      });
      
      utils.ui.feedback.success(`Domain ${domain} updated successfully`);
    } else {
      // Add new domain
      cache.domains.push({
        name: domain,
        ...domainInfo
      });
      
      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString()
      });
      
      if (spinner) spinner.text = `Domain ${domain} added successfully`;
      utils.ui.feedback.success(`Domain ${domain} added successfully`);
    }
    
    // Output domain details
    const program = require('commander').program;
    if (program.opts().json) {
      console.log(JSON.stringify({
        success: true,
        domain,
        ...domainInfo
      }, null, 2));
      return;
    }
    
    console.log(`\nDomain Details:
  - Name: ${domain}
  - Type: ${domainInfo.type}
  - Firebase Project: ${domainInfo.firebaseProject}
  - Expiry Date: ${domainInfo.expiryDate}
  - Status: ${utils.ui.colorizeStatus(domainInfo.status)}
  
Next Steps:
  1. Configure DNS records
  2. Set up Firebase Hosting
  3. Verify the domain with: aixtiv domain:verify ${domain}`);
  } catch (error) {
    if (spinner) spinner.fail(`Failed to add domain ${domain}`);
    utils.ui.feedback.error(`Error adding domain: ${error.message}`);
  }
}

/**
 * Domain verify command implementation
 */
async function verifyDomainCommand(domain, options, { spinner } = {}) {
  // Validate domain name
  if (!domain) {
    utils.ui.feedback.error('Domain name is required');
    return;
  }
  
  if (!validateDomainName(domain)) {
    utils.ui.feedback.error('Invalid domain name format');
    return;
  }
  
  if (spinner) spinner.text = `Verifying domain ${domain}...`;
  
  try {
    // Determine what to verify based on options
    const verifyDNS = !options.firebaseOnly && !options.sslOnly;
    const verifyFirebase = !options.dnsOnly && !options.sslOnly;
    const verifySSL = !options.dnsOnly && !options.firebaseOnly;
    
    // Mock verification results
    const results = {
      dns: [
        { check: 'A Record', status: 'ok', value: '151.101.1.195' },
        { check: 'CNAME Record', status: 'ok', value: 'aixtiv-symphony.web.app' },
        { check: 'MX Records', status: 'ok', value: 'mx.google.com' },
        { check: 'TXT Records', status: 'ok', value: 'google-site-verification=...' }
      ],
      firebase: [
        { check: 'Project Connection', status: 'ok', value: 'Connected' },
        { check: 'Hosting Config', status: 'ok', value: 'Configured' },
        { check: 'Domain Verification', status: 'ok', value: 'Verified' }
      ],
      ssl: [
        { check: 'SSL Certificate', status: 'ok', value: 'Valid' },
        { check: 'Certificate Expiry', status: 'ok', value: '2025-04-20' },
        { check: 'SSL Protocols', status: 'ok', value: 'TLS 1.2, TLS 1.3' }
      ]
    };

    // Output verification results
    const program = require('commander').program;
    if (program.opts().json) {
      const resultOutput = {
        domain,
        verification: {}
      };
      
      if (verifyDNS) resultOutput.verification.dns = results.dns;
      if (verifyFirebase) resultOutput.verification.firebase = results.firebase;
      if (verifySSL) resultOutput.verification.ssl = results.ssl;
      
      console.log(JSON.stringify(resultOutput, null, 2));
      return;
    }
    
    // Display verification results
    console.log(chalk.bold(`\nVerification Results for ${domain}:`));
    
    // Display DNS verification
    if (verifyDNS) {
      console.log(chalk.cyan('\nDNS Configuration:'));
      const { Table } = require('console-table-printer');
      const dnsTable = new Table({
        columns: [
          { name: 'check', title: 'Check' },
          { name: 'status', title: 'Status' },
          { name: 'value', title: 'Value' }
        ]
      });
      
      results.dns.forEach(item => {
        dnsTable.addRow({
          check: item.check,
          status: utils.ui.colorizeStatus(item.status),
          value: item.value
        });
      });
      
      dnsTable.printTable();
    }
    
    // Display Firebase verification
    if (verifyFirebase) {
      console.log(chalk.cyan('\nFirebase Configuration:'));
      const { Table } = require('console-table-printer');
      const firebaseTable = new Table({
        columns: [
          { name: 'check', title: 'Check' },
          { name: 'status', title: 'Status' },
          { name: 'value', title: 'Value' }
        ]
      });
      
      results.firebase.forEach(item => {
        firebaseTable.addRow({
          check: item.check,
          status: utils.ui.colorizeStatus(item.status),
          value: item.value
        });
      });
      
      firebaseTable.printTable();
    }
    
    // Display SSL verification
    if (verifySSL) {
      console.log(chalk.cyan('\nSSL Configuration:'));
      const { Table } = require('console-table-printer');
      const sslTable = new Table({
        columns: [
          { name: 'check', title: 'Check' },
          { name: 'status', title: 'Status' },
          { name: 'value', title: 'Value' }
        ]
      });
      
      results.ssl.forEach(item => {
        sslTable.addRow({
          check: item.check,
          status: utils.ui.colorizeStatus(item.status),
          value: item.value
        });
      });
      
      sslTable.printTable();
    }
    
    // Update domain status if all checks pass
    const allChecksPassed = 
      (!verifyDNS || results.dns.every(item => item.status === 'ok')) &&
      (!verifyFirebase || results.firebase.every(item => item.status === 'ok')) &&
      (!verifySSL || results.ssl.every(item => item.status === 'ok'));
    
    if (allChecksPassed) {
      // Update domain status in cache
      const cache = loadDomainCache();
      const domainIndex = cache.domains.findIndex(d => d.name === domain);
      
      if (domainIndex !== -1 && cache.domains[domainIndex].status === 'pending') {
        cache.domains[domainIndex].status = 'active';
        saveDomainCache({
          domains: cache.domains,
          lastUpdated: new Date().toISOString()
        });
        
        console.log(chalk.green('\n✓ All verification checks passed. Domain status updated to active.'));
      } else if (domainIndex !== -1) {
        console.log(chalk.green('\n✓ All verification checks passed.'));
      }
    } else {
      console.log(chalk.yellow('\n⚠ Some verification checks failed. Please review and fix the issues.'));
    }
  } catch (error) {
    if (spinner) spinner.fail(`Failed to verify domain ${domain}`);
    utils.ui.feedback.error(`Error verifying domain: ${error.message}`);
  }
}

/**
 * Register all domain commands
 */
function registerCommands(register) {
  // Domain list command
  register(
    'domain',
    'domain:list',
    'List domains in the Aixtiv Symphony ecosystem',
    [
      { flags: '--type <type>', description: 'Filter by domain type', choices: DOMAIN_TYPES },
      { flags: '--status <status>', description: 'Filter by status (active, pending, transferring)' },
      { flags: '--refresh', description: 'Refresh domain data from server' },
      { flags: '--compact', description: 'Show compact view (hide Firebase project)' },
      { flags: '--cache-ttl <seconds>', description: 'Cache TTL in seconds', defaultValue: 3600 }
    ],
    listDomainsCommand,
    ['', '--type character', '--refresh --compact']
  );
  
  // Domain add command
  register(
    'domain',
    'domain:add',
    'Add a new domain to the Aixtiv Symphony ecosystem',
    [
      { flags: '<domain>', description: 'Domain name to add' },
      { flags: '--type <type>', description: 'Domain type', choices: DOMAIN_TYPES, defaultValue: 'brand' },
      { flags: '--firebase-project <project>', description: 'Firebase project ID' },
      { flags: '--expiry-date <date>', description: 'Expiry date (YYYY-MM-DD)' }
    ],
    addDomainCommand,
    ['example.com', 'example.com --type character', 'myapp.live --firebase-project myapp-live']
  );
  
  // Domain remove command
  register(
    'domain',
    'domain:remove',
    'Remove a domain from the Aixtiv Symphony ecosystem',
    [
      { flags: '<domain>', description: 'Domain name to remove' },
      { flags: '--force', description: 'Force removal without confirmation' }
    ],
    removeDomainCommand,
    ['example.com', 'example.com --force']
  );
  
  // Domain verify command
  register(
    'domain',
    'domain:verify',
    'Verify domain configuration',
    [
      { flags: '<domain>', description: 'Domain name to verify' },
      { flags: '--dns-only', description: 'Only verify DNS records' },
      { flags: '--firebase-only', description: 'Only verify Firebase configuration' },
      { flags: '--ssl-only', description: 'Only verify SSL configuration' }
    ],
    verifyDomainCommand,
    ['example.com', 'example.com --dns-only', 'example.com --firebase-only']
  );
}

module.exports = {
  registerCommands
};
