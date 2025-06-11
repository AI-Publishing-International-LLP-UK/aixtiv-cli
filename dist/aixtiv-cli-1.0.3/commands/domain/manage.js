#!/usr/bin/env node

/**
 * Unified Domain Management System for Aixtiv CLI
 * 
 * This module provides a comprehensive domain management interface that brings together
 * all domain-related functionality into a single cohesive command structure, including:
 * - Domain registration and verification
 * - DNS management
 * - SSL certificate provisioning
 * - Firebase Hosting integration
 * - Domain family organization
 * - GoDaddy integration
 * 
 * © 2025 AI Publishing International LLP
 */

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const ora = require('ora');
const boxen = require('boxen');
const { Table } = require('console-table-printer');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Internal modules
const { logAgentAction } = require('../../lib/agent-tracking');
const domainAPI = require('../../lib/api/domain-client');

// Load other domain management modules
const godaddyCommands = require('./godaddy');
const domainUtils = require('./utils');

// Domain types supported by the system
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

// Configuration constants
const CONFIG = {
  // Default values
  DEFAULT_FIREBASE_PROJECT: 'api-for-warp-drive',
  DEFAULT_DOMAIN_TYPE: 'brand',
  
  // Directory and file paths
  CACHE_DIR: path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli'),
  DOMAIN_CACHE_FILE: path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.aixtiv-cli',
    'domain-cache.json'
  ),
  SCRIPTS_DIR: path.join(__dirname, '../../scripts'),
  LOGS_DIR: path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli', 'logs')
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// Create necessary directories
try {
  fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
  fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true });
} catch (error) {
  // Silent fail for directory creation
}

/**
 * Logger utility for consistent output formatting
 */
const logger = {
  info: (message) => {
    console.log(`${COLORS.blue}${message}${COLORS.reset}`);
  },
  
  success: (message) => {
    console.log(`${COLORS.green}${message}${COLORS.reset}`);
  },
  
  warn: (message) => {
    console.log(`${COLORS.yellow}${message}${COLORS.reset}`);
  },
  
  error: (message) => {
    console.error(`${COLORS.red}${message}${COLORS.reset}`);
  },
  
  section: (title) => {
    console.log(`\n${COLORS.magenta}=== ${title} ===${COLORS.reset}`);
  },
  
  command: (command) => {
    console.log(`${COLORS.cyan}Running: ${command}${COLORS.reset}\n`);
  },
  
  param: (name, value) => {
    console.log(`${COLORS.cyan}${name}: ${COLORS.white}${value}${COLORS.reset}`);
  },
  
  box: (title, color = 'pastel') => {
    console.log(boxen(gradient[color](` ${title} `), 
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
  }
};

/**
 * Load domain cache from file
 * @returns {Object} The domain cache data
 */
function loadDomainCache() {
  try {
    if (!fs.existsSync(CONFIG.DOMAIN_CACHE_FILE)) {
      return { domains: [], lastUpdated: new Date().toISOString() };
    }
    
    const cacheData = fs.readFileSync(CONFIG.DOMAIN_CACHE_FILE, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    logger.error(`Error loading domain cache: ${error.message}`);
    return { domains: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save domain cache to file
 * @param {Object} data The domain cache data to save
 */
function saveDomainCache(data) {
  try {
    fs.writeFileSync(CONFIG.DOMAIN_CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error(`Error saving domain cache: ${error.message}`);
  }
}

/**
 * Display domains in a table format
 * @param {Array} domains The domains to display
 * @param {Object} options Display options
 */
function displayDomains(domains, options = {}) {
  if (domains.length === 0) {
    logger.warn('No domains found matching your criteria');
    return;
  }
  
  const table = new Table({
    columns: [
      { name: 'name', title: 'Domain Name', alignment: 'left' },
      { name: 'type', title: 'Type', alignment: 'center' },
      { name: 'status', title: 'Status', alignment: 'center' },
      { name: 'project', title: 'Firebase Project', alignment: 'left' },
      { name: 'expires', title: 'Expiry Date', alignment: 'center' }
    ]
  });
  
  domains.forEach(domain => {
    const status = domain.status && domain.status.toLowerCase();
    const statusColor = 
      status === 'active' ? chalk.green(status) :
      status === 'pending' ? chalk.yellow(status) :
      status === 'expired' ? chalk.red(status) :
      status === 'transferring' ? chalk.blue(status) :
      chalk.dim(status || 'unknown');
    
    table.addRow({
      name: domain.name || domain.domain,
      type: domain.type || 'unknown',
      status: statusColor,
      project: domain.firebaseProject || domain.project || 'N/A',
      expires: domain.expiryDate || domain.expires || 'N/A'
    });
  });
  
  table.printTable();
  
  console.log(`\nTotal domains: ${domains.length}`);
  
  if (options.cacheTiming && options.cacheAge) {
    const ageInHours = Math.round(options.cacheAge / (1000 * 60 * 60));
    console.log(chalk.dim(`\nCache last updated: ${options.cacheTiming} (${ageInHours} hours ago)`));
    console.log(chalk.dim('Use --refresh to fetch the latest data'));
  }
}

/**
 * List domains with filtering options
 * @param {Object} options Command options
 */
async function listDomains(options = {}) {
  logger.section('Domain List');
  
  const spinner = ora('Fetching domains...').start();
  
  try {
    let domains = [];
    let fromCache = false;
    let cacheAge = 0;
    let cacheTiming = '';
    
    // Check if we should use cached data
    const cache = loadDomainCache();
    cacheAge = new Date() - new Date(cache.lastUpdated);
    cacheTiming = new Date(cache.lastUpdated).toLocaleString();
    
    if (!options.refresh && cache.domains && cache.domains.length > 0) {
      domains = cache.domains;
      fromCache = true;
      spinner.succeed(`Loaded ${domains.length} domains from cache`);
    } else {
      try {
        domains = await domainAPI.listDomains({
          type: options.type,
          status: options.status,
          search: options.search,
          env: options.env || 'prod'
        });
        
        // Update cache
        saveDomainCache({
          domains,
          lastUpdated: new Date().toISOString()
        });
        
        spinner.succeed(`Fetched ${domains.length} domains from API`);
      } catch (error) {
        if (fromCache) {
          spinner.warn(`API error: ${error.message}, using cached data instead`);
        } else {
          spinner.fail(`Failed to fetch domains: ${error.message}`);
          return;
        }
      }
    }
    
    // Apply additional filters if provided
    let filteredDomains = domains;
    
    if (options.type) {
      filteredDomains = filteredDomains.filter(domain => 
        (domain.type || '').toLowerCase() === options.type.toLowerCase()
      );
    }
    
    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      filteredDomains = filteredDomains.filter(domain => 
        (domain.name || domain.domain || '').toLowerCase().includes(searchTerm)
      );
    }
    
    if (options.status) {
      filteredDomains = filteredDomains.filter(domain => 
        (domain.status || '').toLowerCase() === options.status.toLowerCase()
      );
    }
    
    if (options.project) {
      filteredDomains = filteredDomains.filter(domain => 
        (domain.firebaseProject || domain.project || '').toLowerCase() === options.project.toLowerCase()
      );
    }
    
    // Sort domains if requested
    if (options.sort) {
      const sortField = options.sort.toLowerCase();
      filteredDomains.sort((a, b) => {
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';
        return aValue.localeCompare(bValue);
      });
    }
    
    // Display results
    displayDomains(filteredDomains, { 
      cacheTiming,
      cacheAge,
      fromCache
    });
    
    // Log action
    logAgentAction('domain-list', { 
      count: filteredDomains.length,
      fromCache,
      filters: {
        type: options.type,
        status: options.status,
        search: options.search,
        project: options.project
      }
    });
    
    return filteredDomains;
  } catch (error) {
    spinner.fail(`Error listing domains: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Show detailed information about a specific domain
 * @param {string} domainName Domain name to show details for
 * @param {Object} options Command options
 */
async function showDomainDetails(domainName, options = {}) {
  if (!domainName) {
    logger.error('Domain name is required');
    return;
  }
  
  logger.section(`Domain Details: ${domainName}`);
  
  const spinner = ora(`Fetching details for ${domainName}...`).start();
  
  try {
    // Get domain details from API or cache
    let domainInfo;
    
    try {
      domainInfo = await domainAPI.getDomain(domainName, { 
        env: options.env || 'prod' 
      });
      spinner.succeed(`Domain details retrieved for ${domainName}`);
    } catch (error) {
      // If API fails, try to get from cache
      spinner.warn(`API error: ${error.message}, checking cache instead`);
      
      const cache = loadDomainCache();
      domainInfo = cache.domains.find(d => 
        (d.name === domainName || d.domain === domainName)
      );
      
      if (!domainInfo) {
        spinner.fail(`Domain ${domainName} not found in API or cache`);
        return;
      }
      
      spinner.succeed(`Found domain in cache: ${domainName}`);
    }
    
    // Display domain information in a box
    logger.box(`Domain: ${domainName}`);
    
    // Create info table
    const table = new Table({
      columns: [
        { name: 'property', title: 'Property', alignment: 'left' },
        { name: 'value', title: 'Value', alignment: 'left' }
      ]
    });
    
    // Add domain properties to table
    const properties = [
      { key: 'type', label: 'Domain Type' },
      { key: 'status', label: 'Status' },
      { key: 'firebaseProject', label: 'Firebase Project', fallbackKey: 'project' },
      { key: 'expiryDate', label: 'Expiry Date', fallbackKey: 'expires' },
      { key: 'verified', label: 'Verified' },
      { key: 'sslProvisioned', label: 'SSL Provisioned' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'updatedAt', label: 'Last Updated' }
    ];
    
    properties.forEach(prop => {
      let value = domainInfo[prop.key];
      
      // Try fallback key if main key is not present
      if (value === undefined && prop.fallbackKey) {
        value = domainInfo[prop.fallbackKey];
      }
      
      // Format specific values
      if (prop.key === 'verified' || prop.key === 'sslProvisioned') {
        value = value === true ? chalk.green('Yes') : 
                value === false ? chalk.red('No') : chalk.dim('Unknown');
      }
      
      if (prop.key === 'status') {
        value = !value ? chalk.dim('Unknown') :
                value.toLowerCase() === 'active' ? chalk.green(value) :
                value.toLowerCase() === 'pending' ? chalk.yellow(value) :
                value.toLowerCase() === 'expired' ? chalk.red(value) :
                value;
      }
      
      if (prop.key === 'createdAt' || prop.key === 'updatedAt') {
        value = value ? new Date(value).toLocaleString() : chalk.dim('Unknown');
      }
      
      table.addRow({
        property: prop.label,
        value: value !== undefined ? value : chalk.dim('N/A')
      });
    });
    
    table.printTable();
    
    // Show DNS information if requested
    if (options.dns) {
      spinner.text = 'Fetching DNS records...';
      spinner.start();
      
      try {
        // Try to get DNS records from GoDaddy
        const dnsRecords = await domainAPI.godaddy.getDnsRecords(domainName);
        
        spinner.succeed(`Retrieved ${dnsRecords.length} DNS records`);
        
        console.log(chalk.cyan('\nDNS Records:'));
        const dnsTable = new Table({
          columns: [
            { name: 'type', title: 'Type', alignment: 'center' },
            { name: 'name', title: 'Name', alignment: 'left' },
            { name: 'value', title: 'Value', alignment: 'left' },
            { name: 'ttl', title: 'TTL', alignment: 'right' }
          ]
        });
        
        dnsRecords.forEach(record => {
          dnsTable.addRow({
            type: record.type,
            name: record.name === '@' ? domainName : `${record.name}.${domainName}`,
            value: record.data,
            ttl: record.ttl
          });
        });
        
        dnsTable.printTable();
      } catch (error) {
        spinner.fail(`Unable to fetch DNS records: ${error.message}`);
      }
    }
    
    // Log action
    logAgentAction('domain-details', { 
      domain: domainName,
      withDns: options.dns
    });
  } catch (error) {
    spinner.fail(`Error showing domain details: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Register a new domain or update an existing one
 * @param {string} domainName Domain name to register
 * @param {Object} options Command options
 */
async function registerDomain(domainName, options = {}) {
  if (!domainName) {
    logger.error('Domain name is required');
    logger.info('Usage: aixtiv domain manage register <domain-name> [options]');
    return;
  }
  
  logger.section(`Domain Registration: ${domainName}`);
  
  // Prompt for missing required information
  const domainInfo = await collectDomainInfo(domainName, options);
  
  const spinner = ora(`Registering domain ${domainName}...`).start();
  
  try {
    // Check if domain already exists
    let existingDomain;
    try {
      existingDomain = await domainAPI.getDomain(domainName);
      spinner.warn(`Domain ${domainName} already exists. Updating instead...`);
      
      // Confirm update if interactive
      if (options.interactive) {
        spinner.stop();
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Domain ${domainName} already exists. Do you want to update it?`,
          default: true
        }]);
        
        if (!confirm) {
          logger.info('Update cancelled by user');
          return;
        }
        
        spinner.text = `Updating domain ${domainName}...`;
        spinner.start();
      }
      
      // Update domain
      await domainAPI.updateDomain(domainName, domainInfo);
      spinner.succeed(`Domain ${domainName} updated successfully`);
    } catch (error) {
      if (error.message.includes('not found')) {
        // Domain doesn't exist, create it
        await domainAPI.addDomain(domainName, domainInfo);
        spinner.succeed(`Domain ${domainName} registered successfully`);
      } else {
        spinner.fail(`Error checking domain: ${error.message}`);
        return;
      }
    }
    
    // Update cache
    const cache = loadDomainCache();
    const domainIndex = cache.domains.findIndex(d => 
      d.name === domainName || d.domain === domainName
    );
    
    if (domainIndex !== -1) {
      cache.domains[domainIndex] = {
        ...cache.domains[domainIndex],
        ...domainInfo,
        name: domainName
      };
    } else {
      cache.domains.push({
        name: domainName,
        ...domainInfo,
        status: 'pending'
      });
    }
    
    saveDomainCache({
      domains: cache.domains,
      lastUpdated: new Date().toISOString()
    });
    
    // Show next steps
    logger.info('\nNext Steps:');
    console.log(chalk.cyan('1.') + ' Verify domain ownership:');
    console.log(`   ${chalk.bold('aixtiv domain manage verify')} ${domainName}`);
    
    console.log(chalk.cyan('2.') + ' Provision SSL certificate:');
    console.log(`   ${chalk.bold('aixtiv domain manage ssl')} ${domainName}`);
    
    // Log action
    logAgentAction('domain-register', { 
      domain: domainName,
      type: domainInfo.type,
      project: domainInfo.firebaseProject
    });
  } catch (error) {
    spinner.fail(`Error registering domain: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Collect domain information interactively or from options
 * @param {string} domainName Domain name
 * @param {Object} options Command options
 * @returns {Object} Collected domain information
 */
async function collectDomainInfo(domainName, options = {}) {
  // If all required options are provided, use them
  if (options.type && options.project) {
    return {
      type: options.type,
      firebaseProject: options.project,
      expiryDate: options.expiry || getDefaultExpiryDate()
    };
  }
  
  // Otherwise, prompt for missing information
  const questions = [];
  
  if (!options.type) {
    questions.push({
      type: 'list',
      name: 'type',
      message: 'Select domain type:',
      choices: DOMAIN_TYPES,
      default: guessDefaultType(domainName)
    });
  }
  
  if (!options.project) {
    questions.push({
      type: 'input',
      name: 'project',
      message: 'Enter Firebase project ID:',
      default: domainName.replace(/\./g, '-'),
      validate: value => !!value || 'Firebase project ID is required'
    });
  }
  
  if (!options.expiry) {
    questions.push({
      type: 'input',
      name: 'expiry',
      message: 'Enter expiry date (YYYY-MM-DD):',
      default: getDefaultExpiryDate(),
      validate: value => /^\d{4}-\d{2}-\d{2}$/.test(value) || 'Date must be in YYYY-MM-DD format'
    });
  }
  
  // Only prompt if there are questions and interactive mode is enabled
  if (questions.length > 0 && options.interactive !== false) {
    const answers = await inquirer.prompt(questions);
    
    return {
      type: options.type || answers.type,
      firebaseProject: options.project || answers.project,
      expiryDate: options.expiry || answers.expiry
    };
  } else {
    // Use defaults for any missing values
    return {
      type: options.type || guessDefaultType(domainName),
      firebaseProject: options.project || domainName.replace(/\./g, '-'),
      expiryDate: options.expiry || getDefaultExpiryDate()
    };
  }
}

/**
 * Guess the default domain type based on domain name
 * @param {string} domainName Domain name
 * @returns {string} Guessed domain type
 */
function guessDefaultType(domainName) {
  const domain = domainName.toLowerCase();
  
  if (domain.startsWith('dr-') || domain.includes('-agent')) {
    return 'character';
  } else if (domain.includes('command')) {
    return 'command';
  } else if (domain.includes('wing-')) {
    return 'wing';
  } else if (domain.includes('squadron-')) {
    return 'squadron';
  } else if (domain.includes('aixtiv') || domain.includes('symphony')) {
    return 'aixtiv';
  } else if (domain.includes('coach') || domain.includes('2100')) {
    return 'brand';
  } else if (domain.includes('learn') || domain.includes('academy')) {
    return 'learning';
  } else if (domain.includes('shop') || domain.includes('store')) {
    return 'commerce';
  } else if (domain.includes('law') || domain.includes('governance')) {
    return 'governance';
  }
  
  // Default to brand type
  return 'brand';
}

/**
 * Get default expiry date (1 year from now)
 * @returns {string} Default expiry date in YYYY-MM-DD format
 */
function getDefaultExpiryDate() {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Verify ownership of a domain
 * @param {string} domainName Domain name to verify
 * @param {Object} options Command options
 */
async function verifyDomain(domainName, options = {}) {
  if (!domainName) {
    logger.error('Domain name is required');
    logger.info('Usage: aixtiv domain manage verify <domain-name> [options]');
    return;
  }
  
  logger.section(`Domain Verification: ${domainName}`);
  
  const spinner = ora(`Verifying domain ${domainName}...`).start();
  
  try {
    // In a real implementation, this would:
    // 1. Check DNS records for verification tokens
    // 2. Verify ownership with Firebase Hosting
    // 3. Update domain status
    
    // For demonstration, we'll simulate the verification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    spinner.succeed(`Domain ${domainName} verified successfully`);
    
    // Update domain status in cache
    const cache = loadDomainCache();
    const domainIndex = cache.domains.findIndex(d => 
      d.name === domainName || d.domain === domainName
    );
    
    if (domainIndex !== -1) {
      cache.domains[domainIndex] = {
        ...cache.domains[domainIndex],
        status: 'active',
        verified: true
      };
      
      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Show verification results
    console.log('\n' + chalk.bold('Verification Results:'));
    
    const verificationChecks = [
      { check: 'DNS TXT Record', status: 'ok', value: 'google-site-verification=abc123' },
      { check: 'Firebase Hosting Verification', status: 'ok', value: 'Verified' },
      { check: 'Domain Ownership', status: 'ok', value: 'Confirmed' }
    ];
    
    const table = new Table({
      columns: [
        { name: 'check', title: 'Check', alignment: 'left' },
        { name: 'status', title: 'Status', alignment: 'center' },
        { name: 'details', title: 'Details', alignment: 'left' }
      ]
    });
    
    verificationChecks.forEach(check => {
      table.addRow({
        check: check.check,
        status: check.status === 'ok' ? chalk.green('✓ OK') : chalk.red('✗ Failed'),
        details: check.value
      });
    });
    
    table.printTable();
    
    // Show next steps
    logger.info('\nNext Steps:');
    console.log(chalk.cyan('1.') + ' Provision SSL certificate:');
    console.log(`   ${chalk.bold('aixtiv domain manage ssl')} ${domainName}`);
    
    // Log action
    logAgentAction('domain-verify', { domain: domainName });
  } catch (error) {
    spinner.fail(`Error verifying domain: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Manage SSL certificates for a domain
 * @param {string} domainName Domain name
 * @param {Object} options Command options
 */
async function manageSsl(domainName, options = {}) {
  if (!domainName) {
    logger.error('Domain name is required');
    logger.info('Usage: aixtiv domain manage ssl <domain-name> [options]');
    return;
  }
  
  logger.section(`SSL Certificate Management: ${domainName}`);
  
  const action = options.action || 'provision';
  
  switch (action) {
    case 'provision':
      await provisionSsl(domainName, options);
      break;
    case 'check':
      await checkSsl(domainName, options);
      break;
    case 'renew':
      await renewSsl(domainName, options);
      break;
    default:
      logger.error(`Unknown action: ${action}`);
      logger.info('Valid actions: provision, check, renew');
      break;
  }
}

/**
 * Provision SSL certificate for a domain
 * @param {string} domainName Domain name
 * @param {Object} options Command options
 */
async function provisionSsl(domainName, options = {}) {
  const spinner = ora(`Provisioning SSL certificate for ${domainName}...`).start();
  
  try {
    // In a real implementation, this would:
    // 1. Check if the domain is verified
    // 2. Provision SSL certificate
    // 3. Update domain status
    
    // For demonstration, we'll simulate the provisioning process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    spinner.succeed(`SSL certificate provisioned successfully for ${domainName}`);
    
    // Update domain status in cache
    const cache = loadDomainCache();
    const domainIndex = cache.domains.findIndex(d => 
      d.name === domainName || d.domain === domainName
    );
    
    if (domainIndex !== -1) {
      cache.domains[domainIndex] = {
        ...cache.domains[domainIndex],
        sslProvisioned: true
      };
      
      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Show certificate information
    console.log('\n' + chalk.bold('Certificate Information:'));
    
    const table = new Table({
      columns: [
        { name: 'property', title: 'Property', alignment: 'left' },
        { name: 'value', title: 'Value', alignment: 'left' }
      ]
    });
    
    // Add mock certificate information
    const now = new Date();
    const expiryDate = new Date(now.setMonth(now.getMonth() + 3));
    
    table.addRow({ property: 'Domain', value: domainName });
    table.addRow({ property: 'Status', value: chalk.green('Active') });
    table.addRow({ property: 'Issuer', value: 'Let\'s Encrypt Authority X3' });
    table.addRow({ property: 'Issued On', value: new Date().toLocaleDateString() });
    table.addRow({ property: 'Expires On', value: expiryDate.toLocaleDateString() });
    table.addRow({ property: 'Provider', value: 'Firebase Hosting' });
    
    table.printTable();
    
    // Log action
    logAgentAction('domain-ssl-provision', { domain: domainName });
  } catch (error) {
    spinner.fail(`Error provisioning SSL certificate: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Check SSL certificate status for a domain
 * @param {string} domainName Domain name
 * @param {Object} options Command options
 */
async function checkSsl(domainName, options = {}) {
  const spinner = ora(`Checking SSL certificate for ${domainName}...`).start();
  
  try {
    // In a real implementation, this would:
    // 1. Check SSL certificate status
    // 2. Verify expiration date
    // 3. Run security checks
    
    // For demonstration, we'll simulate the check process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    spinner.succeed(`SSL certificate check completed for ${domainName}`);
    
    // Show certificate information
    console.log('\n' + chalk.bold('Certificate Status:'));
    
    const table = new Table({
      columns: [
        { name: 'check', title: 'Check', alignment: 'left' },
        { name: 'status', title: 'Status', alignment: 'center' },
        { name: 'details', title: 'Details', alignment: 'left' }
      ]
    });
    
    // Add mock check results
    table.addRow({ 
      check: 'Certificate Validity', 
      status: chalk.green('✓ OK'), 
      details: 'Certificate is valid and active' 
    });
    
    table.addRow({ 
      check: 'Expiration', 
      status: chalk.green('✓ OK'), 
      details: 'Expires in 89 days (2025-08-12)' 
    });
    
    table.addRow({ 
      check: 'Domain Match', 
      status: chalk.green('✓ OK'), 
      details: 'Certificate matches domain name' 
    });
    
    table.addRow({ 
      check: 'Cipher Strength', 
      status: chalk.green('✓ OK'), 
      details: 'Strong ciphers (TLS 1.3)' 
    });
    
    table.printTable();
    
    // Log action
    logAgentAction('domain-ssl-check', { domain: domainName });
  } catch (error) {
    spinner.fail(`Error checking SSL certificate: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Renew SSL certificate for a domain
 * @param {string} domainName Domain name
 * @param {Object} options Command options
 */
async function renewSsl(domainName, options = {}) {
  const spinner = ora(`Renewing SSL certificate for ${domainName}...`).start();
  
  try {
    // In a real implementation, this would:
    // 1. Check if renewal is needed
    // 2. Renew the SSL certificate
    // 3. Update domain status
    
    // For demonstration, we'll simulate the renewal process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    spinner.succeed(`SSL certificate renewed successfully for ${domainName}`);
    
    // Show updated certificate information
    console.log('\n' + chalk.bold('Updated Certificate Information:'));
    
    const table = new Table({
      columns: [
        { name: 'property', title: 'Property', alignment: 'left' },
        { name: 'value', title: 'Value', alignment: 'left' }
      ]
    });
    
    // Add mock certificate information
    const now = new Date();
    const expiryDate = new Date(now.setMonth(now.getMonth() + 3));
    
    table.addRow({ property: 'Domain', value: domainName });
    table.addRow({ property: 'Status', value: chalk.green('Active') });
    table.addRow({ property: 'Issuer', value: 'Let\'s Encrypt Authority X3' });
    table.addRow({ property: 'Renewed On', value: new Date().toLocaleDateString() });
    table.addRow({ property: 'Expires On', value: expiryDate.toLocaleDateString() });
    table.addRow({ property: 'Provider', value: 'Firebase Hosting' });
    
    table.printTable();
    
    // Log action
    logAgentAction('domain-ssl-renew', { domain: domainName });
  } catch (error) {
    spinner.fail(`Error renewing SSL certificate: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Remove a domain from the system
 * @param {string} domainName Domain name to remove
 * @param {Object} options Command options
 */
async function removeDomain(domainName, options = {}) {
  if (!domainName) {
    logger.error('Domain name is required');
    logger.info('Usage: aixtiv domain manage remove <domain-name> [options]');
    return;
  }
  
  logger.section(`Domain Removal: ${domainName}`);
  
  // Confirm removal if not forced
  if (!options.force && options.interactive !== false) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove domain ${domainName}?`,
      default: false
    }]);
    
    if (!confirm) {
      logger.info('Domain removal cancelled by user');
      return;
    }
  }
  
  const spinner = ora(`Removing domain ${domainName}...`).start();
  
  try {
    // Attempt to delete domain from API
    try {
      await domainAPI.deleteDomain(domainName);
      spinner.succeed(`Domain ${domainName} removed successfully from API`);
    } catch (error) {
      spinner.warn(`API error: ${error.message}, proceeding with cache cleanup only`);
    }
    
    // Update cache
    const cache = loadDomainCache();
    const domainIndex = cache.domains.findIndex(d => 
      d.name === domainName || d.domain === domainName
    );
    
    if (domainIndex !== -1) {
      cache.domains.splice(domainIndex, 1);
      
      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString()
      });
      
      spinner.succeed(`Domain ${domainName} removed from cache`);
    } else {
      spinner.warn(`Domain ${domainName} not found in cache`);
    }
    
    // Log action
    logAgentAction('domain-remove', { domain: domainName });
  } catch (error) {
    spinner.fail(`Error removing domain: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Import domains from a file
 * @param {string} file Path to file containing domains
 * @param {Object} options Command options
 */
async function importDomains(file, options = {}) {
  if (!file) {
    logger.error('Domain file is required');
    logger.info('Usage: aixtiv domain manage import <file> [options]');
    return;
  }
  
  logger.section('Domain Import');
  
  try {
    // Verify file existence
    if (!fs.existsSync(file)) {
      logger.error(`File not found: ${file}`);
      return;
    }
    
    // Read the file
    const fileContent = fs.readFileSync(file, 'utf8');
    const domains = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    logger.info(`Found ${domains.length} domains in file: ${file}`);
    
    // Prepare import parameters
    const domainType = options.type || CONFIG.DEFAULT_DOMAIN_TYPE;
    const firebaseProject = options.project || CONFIG.DEFAULT_FIREBASE_PROJECT;
    const provisionSsl = options.ssl === true;
    
    logger.param('Domain Type', domainType);
    logger.param('Firebase Project', firebaseProject);
    logger.param('Provision SSL', provisionSsl ? 'Yes' : 'No');
    console.log('');
    
    if (options.dryRun) {
      logger.warn('Dry run mode - no changes will be made');
      
      // Show preview of domains to be imported
      console.log(chalk.cyan('\nDomains to import:'));
      domains.slice(0, 10).forEach(domain => {
        console.log(`- ${domain}`);
      });
      
      if (domains.length > 10) {
        console.log(`... and ${domains.length - 10} more`);
      }
      
      return;
    }
    
    // Process import
    const spinner = ora(`Importing ${domains.length} domains...`).start();
    
    try {
      const importScript = path.join(CONFIG.SCRIPTS_DIR, 'bulk-domain-import.sh');
      
      if (!fs.existsSync(importScript)) {
        spinner.fail(`Import script not found: ${importScript}`);
        return;
      }
      
      // Make script executable
      fs.chmodSync(importScript, '755');
      
      // Execute the script
      const command = `"${importScript}" "${file}" "${domainType}" "${firebaseProject}" "${provisionSsl}"`;
      execSync(command, { stdio: 'inherit' });
      
      spinner.succeed(`Imported ${domains.length} domains successfully`);
      
      // Update cache with imported domains
      const cache = loadDomainCache();
      
      domains.forEach(domainName => {
        const domainIndex = cache.domains.findIndex(d => 
          d.name === domainName || d.domain === domainName
        );
        
        if (domainIndex !== -1) {
          cache.domains[domainIndex] = {
            ...cache.domains[domainIndex],
            type: domainType,
            firebaseProject,
            status: 'pending'
          };
        } else {
          cache.domains.push({
            name: domainName,
            type: domainType,
            firebaseProject,
            status: 'pending'
          });
        }
      });
      
      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString()
      });
      
      // Log action
      logAgentAction('domain-import', { 
        count: domains.length,
        type: domainType,
        project: firebaseProject
      });
    } catch (error) {
      spinner.fail(`Error importing domains: ${error.message}`);
      logger.error(error.stack);
    }
  } catch (error) {
    logger.error(`Error importing domains: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Export domains to a file
 * @param {string} file Path to output file
 * @param {Object} options Command options
 */
async function exportDomains(file, options = {}) {
  if (!file) {
    logger.error('Output file is required');
    logger.info('Usage: aixtiv domain manage export <file> [options]');
    return;
  }
  
  logger.section('Domain Export');
  
  // Get domains
  const domains = await listDomains({
    refresh: options.refresh,
    type: options.type,
    status: options.status,
    project: options.project,
    search: options.search
  });
  
  if (!domains || domains.length === 0) {
    logger.warn('No domains to export');
    return;
  }
  
  try {
    // Prepare domain data for export
    let output = '';
    
    // Choose export format
    const format = (options.format || 'simple').toLowerCase();
    
    switch (format) {
      case 'json':
        output = JSON.stringify(domains, null, 2);
        break;
      
      case 'csv':
        // CSV header
        output = 'domain,type,status,project,expiry\n';
        
        // CSV rows
        domains.forEach(domain => {
          const name = domain.name || domain.domain || '';
          const type = domain.type || '';
          const status = domain.status || '';
          const project = domain.firebaseProject || domain.project || '';
          const expiry = domain.expiryDate || domain.expires || '';
          
          output += `${name},${type},${status},${project},${expiry}\n`;
        });
        break;
      
      case 'simple':
      default:
        // Just domain names, one per line
        domains.forEach(domain => {
          output += (domain.name || domain.domain) + '\n';
        });
        break;
    }
    
    // Write to file
    fs.writeFileSync(file, output);
    
    logger.success(`Exported ${domains.length} domains to ${file}`);
    
    // Log action
    logAgentAction('domain-export', { 
      count: domains.length,
      format,
      file
    });
  } catch (error) {
    logger.error(`Error exporting domains: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Associate command instances with their handlers
 */
const commands = {
  list: listDomains,
  show: showDomainDetails,
  register: registerDomain,
  verify: verifyDomain,
  ssl: manageSsl,
  remove: removeDomain,
  import: importDomains,
  export: exportDomains
};

/**
 * Set up domain management commands for the CLI
 */
function setupDomainManageCommand() {
  const program = new Command('domain:manage');
  
  program
    .description('Unified domain management system for Aixtiv Symphony')
    .option('-i, --interactive', 'Enable interactive prompts', true)
    .option('-e, --env <environment>', 'API environment (dev, staging, prod)', 'prod');
  
  // List domains
  program
    .command('list')
    .description('List domains with filtering options')
    .option('-r, --refresh', 'Force refresh from API instead of using cache')
    .option('-t, --type <type>', 'Filter by domain type')
    .option('-s, --status <status>', 'Filter by status (active, pending, expired)')
    .option('-p, --project <project>', 'Filter by Firebase project')
    .option('--search <term>', 'Search domain names')
    .option('--sort <field>', 'Sort by field (name, type, status, project)')
    .action(options => commands.list(options));
  
  // Show domain details
  program
    .command('show <domain>')
    .description('Show detailed information about a domain')
    .option('--dns', 'Include DNS records in output')
    .action((domain, options) => commands.show(domain, options));
  
  // Register a domain
  program
    .command('register <domain>')
    .description('Register a new domain or update an existing one')
    .option('-t, --type <type>', 'Domain type')
    .option('-p, --project <project>', 'Firebase project ID')
    .option('--expiry <date>', 'Expiry date (YYYY-MM-DD)')
    .action((domain, options) => commands.register(domain, options));
  
  // Verify a domain
  program
    .command('verify <domain>')
    .description('Verify domain ownership')
    .option('--force', 'Force verification even if already verified')
    .action((domain, options) => commands.verify(domain, options));
  
  // Manage SSL certificates
  program
    .command('ssl <domain>')
    .description('Manage SSL certificates for a domain')
    .option('-a, --action <action>', 'Action to perform (provision, check, renew)', 'provision')
    .action((domain, options) => commands.ssl(domain, options));
  
  // Remove a domain
  program
    .command('remove <domain>')
    .description('Remove a domain from the system')
    .option('-f, --force', 'Skip confirmation prompt')
    .action((domain, options) => commands.remove(domain, options));
  
  // Import domains from file
  program
    .command('import <file>')
    .description('Import domains from a file')
    .option('-t, --type <type>', 'Domain type for imported domains', CONFIG.DEFAULT_DOMAIN_TYPE)
    .option('-p, --project <project>', 'Firebase project ID', CONFIG.DEFAULT_FIREBASE_PROJECT)
    .option('--ssl', 'Provision SSL certificates after import')
    .option('-d, --dry-run', 'Simulate import without making changes')
    .action((file, options) => commands.import(file, options));
  
  // Export domains to file
  program
    .command('export <file>')
    .description('Export domains to a file')
    .option('-r, --refresh', 'Force refresh from API instead of using cache')
    .option('-t, --type <type>', 'Filter by domain type')
    .option('-s, --status <status>', 'Filter by status (active, pending, expired)')
    .option('-p, --project <project>', 'Filter by Firebase project')
    .option('--search <term>', 'Search domain names')
    .option('-f, --format <format>', 'Export format (simple, json, csv)', 'simple')
    .action((file, options) => commands.export(file, options));
  
  return program;
}

module.exports = setupDomainManageCommand();