#!/usr/bin/env node

/**
 * Domain Management Command for Aixtiv CLI
 *
 * Provides functionality to manage domains in the Aixtiv Symphony ecosystem,
 * including listing, adding, verifying, and removing domains from the system.
 *
 * © 2025 AI Publishing International LLP
 */

const { Command } = require('commander');
const chalk = require('chalk');
const axios = require('axios');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const figlet = require('figlet');
const gradient = require('gradient-string');
const ora = require('ora');

// Domain types based on the holistic domain map
const DOMAIN_TYPES = [
  'character', // Character-based domains (e.g., drclaude.live, queenlucy.live)
  'command', // Command systems (e.g., dreamcommand.live, visioncommand.live)
  'wing', // Wing domains (e.g., wing-1.live)
  'squadron', // Squadron domains (e.g., squadron-1.live)
  'brand', // Brand domains (e.g., coaching2100.com, 2100.cool)
  'aixtiv', // Aixtiv family domains (e.g., aixtiv.com, aixtiv-symphony.com)
  'learning', // Learning domains (e.g., academy2100.com, getready2100.com)
  'commerce', // Commerce domains (e.g., giftshop2100.com, marketplace2100.com)
  'governance', // Governance domains (e.g., law2100.com, governance2100.com)
];

// Domain TLDs
const DOMAIN_TLDS = [
  'live', // Human/narrative world
  'ai', // Artificial intelligence realm
  'com', // Commercial entities
  'org', // Organizational entities
  'net', // Network entities
  'co.uk', // UK specific
  'mx', // Mexico specific
  'eu', // European Union specific
  'world', // Global presence
];

// Config path for domain cache
const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli');
const domainCachePath = path.join(configDir, 'domain-cache.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Initialize domain cache if it doesn't exist
if (!fs.existsSync(domainCachePath)) {
  fs.writeFileSync(
    domainCachePath,
    JSON.stringify({
      domains: [],
      lastUpdated: new Date().toISOString(),
    })
  );
}

/**
 * Load domain cache from file
 */
function loadDomainCache() {
  try {
    const cacheData = fs.readFileSync(domainCachePath, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    console.error('Error loading domain cache:', error);
    return { domains: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save domain cache to file
 */
function saveDomainCache(data) {
  try {
    fs.writeFileSync(domainCachePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving domain cache:', error);
  }
}

/**
 * List domains from cache or API
 */
async function listDomains(options) {
  const spinner = ora('Fetching domains...').start();

  try {
    let domains = [];

    // If force refresh or cache is older than 1 hour, fetch from API
    const cache = loadDomainCache();
    const cacheAge = new Date() - new Date(cache.lastUpdated);
    const cacheExpired = cacheAge > 60 * 60 * 1000; // 1 hour

    if (options.refresh || cacheExpired) {
      // In a real implementation, this would make an API call to fetch domains
      // For demo purposes, we'll use mock data
      domains = await mockFetchDomains();

      // Update cache
      saveDomainCache({
        domains,
        lastUpdated: new Date().toISOString(),
      });

      spinner.succeed('Domains refreshed from server');
    } else {
      domains = cache.domains;
      spinner.succeed('Domains loaded from cache');
    }

    // Filter domains if type is specified
    if (options.type) {
      domains = domains.filter((domain) => domain.type === options.type);
    }

    // Filter domains if status is specified
    if (options.status) {
      domains = domains.filter((domain) => domain.status === options.status);
    }

    // Display domains in a table
    displayDomains(domains);

    // Show cache status
    if (!options.refresh && domains.length > 0) {
      console.log(
        chalk.dim(`\nCache last updated: ${new Date(cache.lastUpdated).toLocaleString()}`)
      );
      console.log(chalk.dim(`Use --refresh to fetch the latest data from the server`));
    }

    return domains;
  } catch (error) {
    spinner.fail('Failed to fetch domains');
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Display domains in a formatted table
 */
function displayDomains(domains) {
  if (domains.length === 0) {
    console.log(chalk.yellow('\nNo domains found matching the criteria'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('Hosting Project ID'),
      chalk.cyan('Domain'),
      chalk.cyan('Type'),
      chalk.cyan('Status'),
      chalk.cyan('Expiry Date'),
    ],
    colWidths: [25, 30, 15, 15, 15],
  });

  domains.forEach((domain) => {
    const status = getStatusColor(domain.status);

    table.push([
      domain.firebaseProject || 'N/A',
      domain.name,
      domain.type,
      status,
      domain.expiryDate || 'N/A',
    ]);
  });

  console.log(table.toString());
  console.log(`\nTotal domains: ${domains.length}`);
}

/**
 * Get colored status text
 */
function getStatusColor(status) {
  switch (status) {
    case 'active':
      return chalk.green('Active');
    case 'pending':
      return chalk.yellow('Pending');
    case 'expired':
      return chalk.red('Expired');
    case 'transferring':
      return chalk.blue('Transferring');
    default:
      return status;
  }
}

/**
 * Mock function to fetch domains (would be a real API call in production)
 */
async function mockFetchDomains() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      name: 'aixtiv.com',
      type: 'aixtiv',
      status: 'active',
      expiryDate: '2026-04-24',
      firebaseProject: 'aixtiv-symphony',
    },
    {
      name: 'coaching2100.com',
      type: 'brand',
      status: 'active',
      expiryDate: '2026-03-15',
      firebaseProject: 'coaching2100-com',
    },
    {
      name: 'drclaude.live',
      type: 'character',
      status: 'active',
      expiryDate: '2026-05-10',
      firebaseProject: 'dr-claude-live',
    },
    {
      name: 'queenlucy.live',
      type: 'character',
      status: 'active',
      expiryDate: '2026-05-10',
      firebaseProject: 'queen-lucy-live',
    },
    {
      name: 'dreamcommand.live',
      type: 'command',
      status: 'active',
      expiryDate: '2026-06-20',
      firebaseProject: 'dream-command-live',
    },
    {
      name: 'wing-1.live',
      type: 'wing',
      status: 'active',
      expiryDate: '2026-07-15',
      firebaseProject: 'wing-1-live',
    },
    {
      name: 'giftshop2100.com',
      type: 'commerce',
      status: 'pending',
      expiryDate: '2026-08-01',
      firebaseProject: 'giftshop2100-com',
    },
    {
      name: 'drmemoria.ai',
      type: 'character',
      status: 'transferring',
      expiryDate: '2026-09-12',
      firebaseProject: 'dr-memoria-ai',
    },
  ];
}

/**
 * Add a new domain
 */
async function addDomain(name, options) {
  const spinner = ora('Adding domain...').start();

  try {
    // Validate domain name
    if (!name) {
      spinner.fail('Domain name is required');
      return;
    }

    // Get additional information if not provided in options
    const domainInfo = await collectDomainInfo(name, options);

    // In a real implementation, this would make an API call to add the domain
    // For demo purposes, we'll update the local cache

    // Check if domain already exists
    const cache = loadDomainCache();
    const existingDomainIndex = cache.domains.findIndex((d) => d.name === name);

    if (existingDomainIndex !== -1) {
      spinner.fail(`Domain ${name} already exists`);

      // Ask if user wants to update the domain
      const { update } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'update',
          message: 'Do you want to update this domain?',
          default: false,
        },
      ]);

      if (!update) {
        return;
      }

      // Update domain
      cache.domains[existingDomainIndex] = {
        ...cache.domains[existingDomainIndex],
        ...domainInfo,
      };

      saveDomainCache({
        domains: cache.domains,
        lastUpdated: new Date().toISOString(),
      });

      console.log(chalk.green(`\nDomain ${name} updated successfully`));
      return;
    }

    // Add new domain
    cache.domains.push({
      name,
      ...domainInfo,
      status: 'pending',
    });

    saveDomainCache({
      domains: cache.domains,
      lastUpdated: new Date().toISOString(),
    });

    spinner.succeed(`Domain ${name} added successfully`);

    // Display the newly added domain
    displayDomains([
      {
        name,
        ...domainInfo,
        status: 'pending',
      },
    ]);
  } catch (error) {
    spinner.fail('Failed to add domain');
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Collect domain information interactively
 */
async function collectDomainInfo(name, options) {
  // If all options are provided, use them
  if (options.type && options.firebaseProject) {
    return {
      type: options.type,
      firebaseProject: options.firebaseProject,
      expiryDate: options.expiryDate || getDefaultExpiryDate(),
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
    });
  }

  if (!options.firebaseProject) {
    questions.push({
      type: 'input',
      name: 'firebaseProject',
      message: 'Enter Firebase project ID:',
      default: name.replace(/\./g, '-'),
    });
  }

  if (!options.expiryDate) {
    questions.push({
      type: 'input',
      name: 'expiryDate',
      message: 'Enter expiry date (YYYY-MM-DD):',
      default: getDefaultExpiryDate(),
      validate: (date) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(date) || 'Please enter a valid date in YYYY-MM-DD format';
      },
    });
  }

  const answers = await inquirer.prompt(questions);

  return {
    type: options.type || answers.type,
    firebaseProject: options.firebaseProject || answers.firebaseProject,
    expiryDate: options.expiryDate || answers.expiryDate,
  };
}

/**
 * Get default expiry date (1 year from now)
 */
function getDefaultExpiryDate() {
  const now = new Date();
  const nextYear = new Date(now.setFullYear(now.getFullYear() + 1));
  return nextYear.toISOString().split('T')[0];
}

/**
 * Verify a domain's DNS and Firebase configuration
 */
async function verifyDomain(name, options) {
  if (!name) {
    console.error(chalk.red('Domain name is required'));
    return;
  }

  const spinner = ora(`Verifying domain ${name}...`).start();

  try {
    // In a real implementation, this would check:
    // 1. DNS records (A, CNAME, MX, TXT)
    // 2. SSL certificate
    // 3. Firebase Hosting connection
    // 4. Domain registrar settings

    // Simulate verification process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    spinner.succeed(`Domain ${name} verified successfully`);

    // Show verification results
    console.log('\n' + chalk.bold('Verification Results:'));

    const dnsChecks = [
      { check: 'A Record', status: 'ok', value: '151.101.1.195' },
      { check: 'CNAME Record', status: 'ok', value: 'aixtiv-symphony.web.app' },
      { check: 'MX Records', status: 'ok', value: 'mx.google.com' },
      { check: 'TXT Records', status: 'ok', value: 'google-site-verification=...' },
    ];

    const table = new Table({
      head: [chalk.cyan('Check'), chalk.cyan('Status'), chalk.cyan('Value')],
    });

    dnsChecks.forEach((check) => {
      table.push([
        check.check,
        check.status === 'ok' ? chalk.green('✓ OK') : chalk.red('✗ Failed'),
        check.value,
      ]);
    });

    console.log(table.toString());
  } catch (error) {
    spinner.fail(`Failed to verify domain ${name}`);
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Remove a domain
 */
async function removeDomain(name, options) {
  if (!name) {
    console.error(chalk.red('Domain name is required'));
    return;
  }

  // Confirm removal if not forced
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove domain ${name}?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Domain removal cancelled'));
      return;
    }
  }

  const spinner = ora(`Removing domain ${name}...`).start();

  try {
    // In a real implementation, this would make an API call to remove the domain
    // For demo purposes, we'll update the local cache

    const cache = loadDomainCache();
    const existingDomainIndex = cache.domains.findIndex((d) => d.name === name);

    if (existingDomainIndex === -1) {
      spinner.fail(`Domain ${name} not found`);
      return;
    }

    // Remove domain from cache
    cache.domains.splice(existingDomainIndex, 1);

    saveDomainCache({
      domains: cache.domains,
      lastUpdated: new Date().toISOString(),
    });

    spinner.succeed(`Domain ${name} removed successfully`);
  } catch (error) {
    spinner.fail(`Failed to remove domain ${name}`);
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Set up Firebase Hosting for a domain
 */
async function setupFirebase(name, options) {
  if (!name) {
    console.error(chalk.red('Domain name is required'));
    return;
  }

  const spinner = ora(`Setting up Firebase Hosting for ${name}...`).start();

  try {
    // Get Firebase project and site ID
    const firebaseProject = options.project || (await promptForFirebaseProject());
    const siteId = options.site || (await promptForSiteId(name));

    // In a real implementation, this would:
    // 1. Connect to Firebase
    // 2. Add the domain to the specified site
    // 3. Update DNS records
    // 4. Provision SSL certificate

    // Simulate setup process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    spinner.succeed(`Firebase Hosting set up successfully for ${name}`);

    console.log('\n' + chalk.bold('Next Steps:'));
    console.log(chalk.cyan('1.') + ' Add the following DNS records to your domain:');
    console.log('   ' + chalk.bold('A Record:') + ' @ -> 151.101.1.195');
    console.log('   ' + chalk.bold('CNAME Record:') + ' www -> ' + siteId + '.web.app');

    console.log(chalk.cyan('2.') + ' Verify your domain with:');
    console.log('   ' + chalk.bold('aixtiv domain verify') + ' ' + name);

    // Update domain in cache
    updateDomainInCache(name, {
      firebaseProject,
      status: 'pending',
    });
  } catch (error) {
    spinner.fail(`Failed to set up Firebase Hosting for ${name}`);
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Prompt for Firebase project ID
 */
async function promptForFirebaseProject() {
  const { project } = await inquirer.prompt([
    {
      type: 'input',
      name: 'project',
      message: 'Enter Firebase project ID:',
      validate: (input) => !!input || 'Firebase project ID is required',
    },
  ]);

  return project;
}

/**
 * Prompt for Firebase Hosting site ID
 */
async function promptForSiteId(domain) {
  const defaultSiteId = domain.replace(/\./g, '-');

  const { siteId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'siteId',
      message: 'Enter Firebase Hosting site ID:',
      default: defaultSiteId,
    },
  ]);

  return siteId;
}

/**
 * Set up domain in GoDaddy
 */
async function setupGoDaddy(name, options) {
  if (!name) {
    console.error(chalk.red('Domain name is required'));
    return;
  }

  const spinner = ora(`Setting up domain ${name} in GoDaddy...`).start();

  try {
    // Get nameservers if provided
    let nameservers = [];

    if (options.nameservers) {
      nameservers = options.nameservers.split(',').map((ns) => ns.trim());
    } else {
      // Prompt for nameservers if not provided
      nameservers = await promptForNameservers();
    }

    // In a real implementation, this would:
    // 1. Connect to GoDaddy API
    // 2. Update nameservers or DNS records

    // Simulate setup process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    spinner.succeed(`Domain ${name} set up successfully in GoDaddy`);

    console.log('\n' + chalk.bold('Nameservers set to:'));
    nameservers.forEach((ns) => {
      console.log('  - ' + ns);
    });

    console.log('\n' + chalk.bold('Next Steps:'));
    console.log(chalk.cyan('1.') + ' Wait for DNS propagation (up to 48 hours)');
    console.log(chalk.cyan('2.') + ' Set up Firebase Hosting:');
    console.log('   ' + chalk.bold('aixtiv domain firebase-setup') + ' ' + name);

    // Update domain in cache
    updateDomainInCache(name, {
      status: 'pending',
    });
  } catch (error) {
    spinner.fail(`Failed to set up domain ${name} in GoDaddy`);
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Prompt for nameservers
 */
async function promptForNameservers() {
  const { useCustom } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useCustom',
      message: 'Do you want to use custom nameservers?',
      default: false,
    },
  ]);

  if (!useCustom) {
    // Return default nameservers for Firebase
    return [
      'ns1.googledomains.com',
      'ns2.googledomains.com',
      'ns3.googledomains.com',
      'ns4.googledomains.com',
    ];
  }

  // Prompt for custom nameservers
  const { nameservers } = await inquirer.prompt([
    {
      type: 'input',
      name: 'nameservers',
      message: 'Enter comma-separated list of nameservers:',
      validate: (input) => !!input || 'At least one nameserver is required',
    },
  ]);

  return nameservers.split(',').map((ns) => ns.trim());
}

/**
 * Update domain in cache
 */
function updateDomainInCache(name, updates) {
  const cache = loadDomainCache();
  const existingDomainIndex = cache.domains.findIndex((d) => d.name === name);

  if (existingDomainIndex !== -1) {
    // Update existing domain
    cache.domains[existingDomainIndex] = {
      ...cache.domains[existingDomainIndex],
      ...updates,
    };
  } else {
    // Add new domain
    cache.domains.push({
      name,
      ...updates,
    });
  }

  saveDomainCache({
    domains: cache.domains,
    lastUpdated: new Date().toISOString(),
  });
}

// Export functions
module.exports = {
  listDomains,
  addDomain,
  verifyDomain,
  removeDomain,
  setupFirebase,
  setupGoDaddy,
};
