/**
 * GoDaddy Domain Management Commands for Aixtiv CLI
 * 
 * This module provides commands for managing GoDaddy domains, including:
 * - Listing domains from GoDaddy account
 * - Checking domain status and expiration
 * - Syncing domains between GoDaddy and Firebase
 * - Managing DNS records
 * 
 * © 2025 AI Publishing International LLP
 */

// Standard libraries
const fs = require('fs');
const path = require('path');
const util = require('util');
const { execSync } = require('child_process');

// Third-party libraries
const chalk = require('chalk');
const ora = require('ora');
const gradient = require('gradient-string');
const { Table } = require('console-table-printer');
const boxen = require('boxen');

// Internal modules
const { logAgentAction, getCurrentAgentId } = require('../../../lib/agent-tracking');
const domainAPI = require('../../../lib/api/domain-client');

// Cache configuration
const CONFIG = {
  // Directory and file paths
  CACHE_DIR: path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli'),
  GODADDY_CACHE_FILE: path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.aixtiv-cli',
    'godaddy-domains.json'
  ),
  SCRIPTS_DIR: path.join(__dirname, '../../../scripts'),
  
  // Default values
  DEFAULT_LIMIT: 100,
  DEFAULT_FIREBASE_PROJECT: 'api-for-warp-drive',
  
  // Command names for logging
  COMMANDS: {
    LIST: 'domain:godaddy:list',
    SYNC: 'domain:godaddy:sync',
    DNS: 'domain:godaddy:dns',
    STATUS: 'domain:godaddy:status',
    VERIFY: 'domain:godaddy:verify',
  },
};

// Create cache directory if it doesn't exist
try {
  fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
} catch (error) {
  // Silent fail for directory creation
}

/**
 * Load domain cache from file
 * @returns {Object} - The domain cache data
 */
function loadDomainCache() {
  try {
    if (!fs.existsSync(CONFIG.GODADDY_CACHE_FILE)) {
      return { domains: [], lastUpdated: new Date().toISOString() };
    }
    
    const cacheData = fs.readFileSync(CONFIG.GODADDY_CACHE_FILE, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    console.error(chalk.red(`Error loading domain cache: ${error.message}`));
    return { domains: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save domain cache to file
 * @param {Object} data - The domain cache data to save
 */
function saveDomainCache(data) {
  try {
    fs.writeFileSync(CONFIG.GODADDY_CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(chalk.red(`Error saving domain cache: ${error.message}`));
  }
}

/**
 * Calculate days remaining until expiration
 * @param {string} expirationDate - Expiration date in ISO format
 * @returns {number} - Days remaining
 */
function getDaysRemaining(expirationDate) {
  const expDate = new Date(expirationDate);
  const now = new Date();
  const diffTime = expDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format expiration date with color based on urgency
 * @param {string} expirationDate - Expiration date in ISO format
 * @returns {string} - Formatted date with color
 */
function formatExpirationDate(expirationDate) {
  const daysRemaining = getDaysRemaining(expirationDate);
  
  if (daysRemaining <= 7) {
    return chalk.red(expirationDate.split('T')[0] + ` (${daysRemaining} days)`);
  } else if (daysRemaining <= 30) {
    return chalk.yellow(expirationDate.split('T')[0] + ` (${daysRemaining} days)`);
  } else {
    return chalk.green(expirationDate.split('T')[0] + ` (${daysRemaining} days)`);
  }
}

/**
 * Command implementations
 */
const commands = {
  /**
   * List domains from GoDaddy account
   * @param {Object} options - Command options
   * @param {string} [options.status] - Filter by domain status (ACTIVE, PENDING, CANCELLED)
   * @param {boolean} [options.refresh] - Force refresh domain list from API
   * @param {string} [options.search] - Search term for domain names
   * @param {boolean} [options.expired] - Show only expired or expiring domains
   * @param {boolean} [options.expiring] - Show domains expiring within 30 days
   * @param {number} [options.limit] - Maximum number of domains to return
   */
  list: async (options = {}) => {
    console.log(boxen(gradient.pastel(' GoDaddy Domains '), 
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
    
    const spinner = ora('Loading domains from GoDaddy...').start();
    
    try {
      // Check if we should use cached data
      let domains = [];
      let fromCache = false;
      
      if (!options.refresh && fs.existsSync(CONFIG.GODADDY_CACHE_FILE)) {
        const cache = loadDomainCache();
        domains = cache.domains;
        fromCache = true;
        
        spinner.succeed(`Loaded ${domains.length} domains from cache (last updated: ${cache.lastUpdated.split('T')[0]})`);
        
        if (options.refresh) {
          spinner.text = 'Refreshing domains from GoDaddy API...';
          spinner.start();
        }
      }
      
      // Fetch domains from API if refresh requested or no cache
      if (options.refresh || !fromCache) {
        try {
          const apiDomains = await domainAPI.godaddy.listDomains({
            statuses: options.status || 'ACTIVE',
            limit: options.limit || CONFIG.DEFAULT_LIMIT
          });
          
          domains = apiDomains;
          
          // Save to cache
          saveDomainCache({
            domains,
            lastUpdated: new Date().toISOString()
          });
          
          spinner.succeed(`Fetched ${domains.length} domains from GoDaddy API`);
        } catch (error) {
          spinner.fail(`Error fetching domains from GoDaddy API: ${error.message}`);
          if (fromCache) {
            console.log(chalk.yellow(`Using cached data instead (${domains.length} domains)`));
          } else {
            throw error;
          }
        }
      }
      
      // Apply filters if provided
      let filteredDomains = domains;
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredDomains = filteredDomains.filter(domain => 
          domain.domain.toLowerCase().includes(searchTerm)
        );
      }
      
      if (options.expired) {
        filteredDomains = filteredDomains.filter(domain => 
          domain.expires && getDaysRemaining(domain.expires) <= 0
        );
      } else if (options.expiring) {
        filteredDomains = filteredDomains.filter(domain => 
          domain.expires && getDaysRemaining(domain.expires) <= 30 && getDaysRemaining(domain.expires) > 0
        );
      }
      
      // Display results
      console.log(`\nShowing ${filteredDomains.length} of ${domains.length} domains`);
      
      if (filteredDomains.length === 0) {
        console.log(chalk.yellow('No domains found matching your criteria'));
        return;
      }
      
      // Create a table
      const table = new Table({
        columns: [
          { name: 'domain', title: 'Domain Name', alignment: 'left' },
          { name: 'status', title: 'Status', alignment: 'center' },
          { name: 'expires', title: 'Expiration', alignment: 'left' },
          { name: 'autoRenew', title: 'Auto-Renew', alignment: 'center' },
          { name: 'locked', title: 'Locked', alignment: 'center' }
        ]
      });
      
      // Add data to table
      filteredDomains.forEach(domain => {
        table.addRow({
          domain: domain.domain,
          status: domain.status === 'ACTIVE' ? chalk.green(domain.status) : chalk.yellow(domain.status),
          expires: domain.expires ? formatExpirationDate(domain.expires) : chalk.gray('N/A'),
          autoRenew: domain.autoRenew ? chalk.green('✓') : chalk.red('✗'),
          locked: domain.locked ? chalk.green('✓') : chalk.red('✗')
        });
      });
      
      // Print the table
      table.printTable();
      
      // Log additional information
      if (fromCache && !options.refresh) {
        console.log(chalk.dim(`\nNote: Data is from cache. Use --refresh to fetch latest data.`));
      }
      
      // Log action
      logAgentAction('godaddy-list-domains', { 
        count: filteredDomains.length,
        fromCache,
        filters: {
          status: options.status,
          search: options.search,
          expired: options.expired,
          expiring: options.expiring
        }
      });
    } catch (error) {
      spinner.fail(`Error listing GoDaddy domains: ${error.message}`);
      console.error(chalk.red(error.stack));
    }
  },
  
  /**
   * Show detailed status for a specific domain
   * @param {string} domainName - Domain name to check
   * @param {Object} options - Command options
   */
  status: async (domainName, options = {}) => {
    if (!domainName) {
      console.error(chalk.red('Error: Domain name is required'));
      console.log(chalk.yellow('Usage: aixtiv domain:godaddy:status <domain-name>'));
      return;
    }
    
    const spinner = ora(`Fetching status for ${domainName}...`).start();
    
    try {
      // Get domain details
      const domain = await domainAPI.godaddy.getDomain(domainName);
      spinner.succeed(`Domain ${domainName} found`);
      
      // Display domain information
      console.log(boxen(gradient.pastel(` Domain Status: ${domainName} `), 
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
      
      // Create info table
      const table = new Table({
        columns: [
          { name: 'property', title: 'Property', alignment: 'left' },
          { name: 'value', title: 'Value', alignment: 'left' }
        ]
      });
      
      // Basic domain information
      table.addRow({ property: 'Status', value: domain.status === 'ACTIVE' ? chalk.green(domain.status) : chalk.yellow(domain.status) });
      table.addRow({ property: 'Creation Date', value: new Date(domain.createdAt).toLocaleDateString() });
      
      if (domain.expires) {
        table.addRow({ property: 'Expiration Date', value: formatExpirationDate(domain.expires) });
      }
      
      table.addRow({ property: 'Auto-Renew', value: domain.autoRenew ? chalk.green('Enabled') : chalk.red('Disabled') });
      table.addRow({ property: 'Privacy', value: domain.privacy ? chalk.green('Enabled') : chalk.red('Disabled') });
      table.addRow({ property: 'Locked', value: domain.locked ? chalk.green('Yes') : chalk.red('No') });
      table.addRow({ property: 'Transfer Protected', value: domain.transferProtected ? chalk.green('Yes') : chalk.red('No') });
      
      if (domain.nameServers && domain.nameServers.length > 0) {
        table.addRow({ property: 'Nameservers', value: domain.nameServers.join(', ') });
      }
      
      // Print tables
      table.printTable();
      
      // Get DNS records if requested
      if (options.dns) {
        const dnsSpinner = ora('Fetching DNS records...').start();
        
        try {
          const records = await domainAPI.godaddy.getDnsRecords(domainName);
          dnsSpinner.succeed(`Found ${records.length} DNS records`);
          
          console.log(chalk.cyan('\nDNS Records:'));
          
          // Create DNS records table
          const dnsTable = new Table({
            columns: [
              { name: 'type', title: 'Type', alignment: 'center' },
              { name: 'name', title: 'Name', alignment: 'left' },
              { name: 'value', title: 'Value', alignment: 'left' },
              { name: 'ttl', title: 'TTL', alignment: 'right' }
            ]
          });
          
          // Add records to table
          records.forEach(record => {
            dnsTable.addRow({
              type: record.type,
              name: record.name === '@' ? domainName : `${record.name}.${domainName}`,
              value: record.data,
              ttl: record.ttl
            });
          });
          
          dnsTable.printTable();
        } catch (error) {
          dnsSpinner.fail(`Error fetching DNS records: ${error.message}`);
        }
      }
      
      // Log action
      logAgentAction('godaddy-domain-status', { 
        domain: domainName,
        status: domain.status,
        withDns: options.dns
      });
    } catch (error) {
      spinner.fail(`Error getting domain status: ${error.message}`);
      if (error.message.includes('not found')) {
        console.log(chalk.yellow(`Domain ${domainName} not found in GoDaddy account`));
      } else {
        console.error(chalk.red(error.stack));
      }
    }
  },
  
  /**
   * Synchronize domains between GoDaddy and Firebase
   * @param {Object} options - Command options
   * @param {string} [options.project] - Firebase project ID
   * @param {boolean} [options.dryRun] - Perform a dry run without making changes
   * @param {boolean} [options.all] - Sync all domains (default is only active domains)
   */
  sync: async (options = {}) => {
    console.log(boxen(gradient.pastel(' GoDaddy to Firebase Sync '), 
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
    
    const project = options.project || CONFIG.DEFAULT_FIREBASE_PROJECT;
    const dryRun = options.dryRun || false;
    
    console.log(chalk.cyan('Firebase Project:'), project);
    console.log(chalk.cyan('Dry Run:'), dryRun ? 'Yes' : 'No');
    console.log(chalk.cyan('Include All Domains:'), options.all ? 'Yes' : 'No');
    console.log('');
    
    const spinner = ora('Loading domains from GoDaddy...').start();
    
    try {
      // Get domains from GoDaddy
      const status = options.all ? undefined : 'ACTIVE';
      const domains = await domainAPI.godaddy.listDomains({ statuses: status });
      
      spinner.succeed(`Loaded ${domains.length} domains from GoDaddy`);
      
      // Save to cache
      saveDomainCache({
        domains,
        lastUpdated: new Date().toISOString()
      });
      
      // Prepare domains for Firebase
      const domainList = domains.map(domain => domain.domain);
      
      // Write domains to a temporary file
      const tempFile = path.join(CONFIG.CACHE_DIR, 'firebase-domains-sync.txt');
      fs.writeFileSync(tempFile, domainList.join('\n'));
      
      console.log(chalk.cyan(`\nPrepared ${domainList.length} domains for synchronization`));
      
      if (dryRun) {
        console.log(chalk.yellow('\nDRY RUN - No changes will be made'));
        console.log(chalk.yellow(`\nWould import the following domains to Firebase project ${project}:`));
        domainList.slice(0, 10).forEach(domain => console.log(`- ${domain}`));
        
        if (domainList.length > 10) {
          console.log(chalk.yellow(`... and ${domainList.length - 10} more`));
        }
        
        console.log(chalk.yellow('\nDomain list saved to:'), tempFile);
        return;
      }
      
      // Run the bulk-domain-import.sh script
      const scriptPath = path.join(CONFIG.SCRIPTS_DIR, 'bulk-domain-import.sh');
      
      if (!fs.existsSync(scriptPath)) {
        spinner.fail(`Script not found: ${scriptPath}`);
        return;
      }
      
      const syncSpinner = ora('Synchronizing domains with Firebase...').start();
      
      try {
        const command = `"${scriptPath}" "${tempFile}" "godaddy" "${project}" "false"`;
        execSync(command, { stdio: 'inherit' });
        
        syncSpinner.succeed('Domains synchronized successfully with Firebase');
        
        // Log action
        logAgentAction('godaddy-firebase-sync', { 
          count: domainList.length,
          project,
          allDomains: options.all
        });
      } catch (error) {
        syncSpinner.fail(`Error synchronizing domains: ${error.message}`);
        console.error(chalk.red(error.stack));
      }
    } catch (error) {
      spinner.fail(`Error loading domains from GoDaddy: ${error.message}`);
      console.error(chalk.red(error.stack));
    }
  },
  
  /**
   * Manage DNS records for a domain
   * @param {string} domainName - Domain name
   * @param {Object} options - Command options
   * @param {string} [options.type] - Record type (A, AAAA, CNAME, MX, TXT, etc.)
   * @param {string} [options.name] - Record name (e.g., 'www', '@')
   * @param {string} [options.value] - Record value (e.g., IP address)
   * @param {string} [options.action] - Action to perform (list, add, update, delete)
   */
  dns: async (domainName, options = {}) => {
    if (!domainName) {
      console.error(chalk.red('Error: Domain name is required'));
      console.log(chalk.yellow('Usage: aixtiv domain:godaddy:dns <domain-name> [options]'));
      return;
    }
    
    // Default to list action
    const action = options.action || 'list';
    
    console.log(boxen(gradient.pastel(` DNS Management: ${domainName} `), 
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
    
    console.log(chalk.cyan('Action:'), action.toUpperCase());
    console.log('');
    
    const spinner = ora(`Loading DNS records for ${domainName}...`).start();
    
    try {
      // Actions that require fetching DNS records
      if (['list', 'update', 'delete'].includes(action)) {
        // Get DNS records
        const filters = {};
        if (options.type) filters.type = options.type;
        if (options.name) filters.name = options.name;
        
        const records = await domainAPI.godaddy.getDnsRecords(domainName, filters);
        
        spinner.succeed(`Found ${records.length} DNS records`);
        
        // List DNS records
        if (action === 'list') {
          if (records.length === 0) {
            console.log(chalk.yellow('No DNS records found matching your criteria'));
            return;
          }
          
          // Create DNS records table
          const dnsTable = new Table({
            columns: [
              { name: 'type', title: 'Type', alignment: 'center' },
              { name: 'name', title: 'Name', alignment: 'left' },
              { name: 'value', title: 'Value', alignment: 'left' },
              { name: 'ttl', title: 'TTL', alignment: 'right' }
            ]
          });
          
          // Add records to table
          records.forEach(record => {
            dnsTable.addRow({
              type: record.type,
              name: record.name === '@' ? domainName : `${record.name}.${domainName}`,
              value: record.data,
              ttl: record.ttl
            });
          });
          
          dnsTable.printTable();
          
          // Log action
          logAgentAction('godaddy-dns-list', { 
            domain: domainName,
            count: records.length,
            filters
          });
        }
        
        // TODO: Implement update and delete actions
        if (action === 'update' || action === 'delete') {
          console.log(chalk.yellow(`The ${action} action is not yet implemented`));
        }
      } else if (action === 'add') {
        // TODO: Implement add action
        console.log(chalk.yellow('The add action is not yet implemented'));
      } else {
        spinner.fail(`Unknown action: ${action}`);
        console.log(chalk.yellow('Valid actions: list, add, update, delete'));
      }
    } catch (error) {
      spinner.fail(`Error managing DNS records: ${error.message}`);
      console.error(chalk.red(error.stack));
    }
  }
};

/**
 * Register GoDaddy domain management commands with the CLI
 * @param {import('commander').Command} program - The Commander program instance
 */
function registerGoDaddyCommands(program) {
  console.log(chalk.blue('Registering GoDaddy domain management commands...'));

  // GoDaddy domains list command
  program
    .command('domain:godaddy:list')
    .description('List domains from your GoDaddy account')
    .option('-s, --status <status>', 'Filter by domain status (ACTIVE, PENDING, CANCELLED)', 'ACTIVE')
    .option('-r, --refresh', 'Force refresh domain list from API')
    .option('--search <search>', 'Search term for domain names')
    .option('--expired', 'Show only expired domains')
    .option('--expiring', 'Show domains expiring within 30 days')
    .option('-l, --limit <limit>', 'Maximum number of domains to return')
    .action(commands.list);

  // Domain status command
  program
    .command('domain:godaddy:status <domain-name>')
    .description('Show detailed status for a specific domain')
    .option('--dns', 'Include DNS records in output')
    .action(commands.status);

  // Domain sync command
  program
    .command('domain:godaddy:sync')
    .description('Synchronize domains between GoDaddy and Firebase')
    .option('-p, --project <project>', 'Firebase project ID', CONFIG.DEFAULT_FIREBASE_PROJECT)
    .option('-d, --dry-run', 'Perform a dry run without making changes')
    .option('-a, --all', 'Sync all domains (default is only active domains)')
    .action(commands.sync);

  // DNS management command
  program
    .command('domain:godaddy:dns <domain-name>')
    .description('Manage DNS records for a domain')
    .option('-t, --type <type>', 'Record type (A, AAAA, CNAME, MX, TXT, etc.)')
    .option('-n, --name <name>', 'Record name (e.g., "www", "@")')
    .option('-v, --value <value>', 'Record value (e.g., IP address)')
    .option('-a, --action <action>', 'Action to perform (list, add, update, delete)', 'list')
    .option('--ttl <ttl>', 'Time to live in seconds')
    .action(commands.dns);

  // Family organization command
  const organizeDomains = require('./organize');
  program
    .command('domain:godaddy:organize')
    .description('Organize domains by family and assign to hosting projects')
    .option('-r, --refresh', 'Force refresh domain list from API')
    .option('-i, --interactive', 'Interactive mode for manual assignments')
    .option('-d, --dry-run', 'Perform a dry run without making changes')
    .option('-o, --output <path>', 'Path to save domain organization map')
    .action(organizeDomains);

  return program;
}

module.exports = registerGoDaddyCommands;