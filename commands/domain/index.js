/**
 * Domain Management Command Module for Aixtiv CLI
 * 
 * This enterprise-grade module integrates domain management functionality into the Aixtiv CLI,
 * providing commands for listing, importing, verifying domains, managing SSL certificates,
 * and cleaning domain cache.
 * 
 * @module domain
 * @author AI Publishing International LLP
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

// Standard library imports
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const util = require('util');

// Convert exec to Promise-based for async/await
const execAsync = util.promisify(require('child_process').exec);

// Constants and configuration
const CONFIG = {
  // Directory and file paths
  CACHE_DIR: path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli'),
  CACHE_FILE: path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli', 'domain-cache.json'),
  SCRIPTS_DIR: path.join(__dirname, '../../scripts'),
  TEMP_DIR: path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli', 'temp'),
  
  // Default values
  DEFAULT_DOMAIN_TYPE: 'brand',
  DEFAULT_FIREBASE_PROJECT: 'api-for-warp-drive',
  
  // Script names
  SCRIPTS: {
    BULK_IMPORT: 'bulk-domain-import.sh',
    SSL_CHECK: 'domain-ssl-check.sh',
    SSL_PROVISION: 'batch-ssl-provision.sh',
    VERIFY_OWNERSHIP: 'verify-domain-ownership.js',
    CLEAN_CACHE: 'clean-domain-cache.sh'
  },
  
  // Command names for logging
  COMMANDS: {
    LIST: 'domain:list',
    IMPORT: 'domain:import',
    VERIFY: 'domain:verify',
    SSL_CHECK: 'domain:ssl-check',
    SSL_PROVISION: 'domain:provision-ssl',
    CLEAN_CACHE: 'domain:clean-cache'
  }
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
  dim: '\x1b[2m'
};

// Create necessary directories
try {
  fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
  fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
} catch (error) {
  // Silent fail for directory creation
}

/**
 * Logger utility for consistent output formatting
 */
const logger = {
  /**
   * Log an info message
   * @param {string} message - The message to log
   */
  info: (message) => {
    console.log(`${COLORS.blue}${message}${COLORS.reset}`);
  },
  
  /**
   * Log a success message
   * @param {string} message - The message to log
   */
  success: (message) => {
    console.log(`${COLORS.green}${message}${COLORS.reset}`);
  },
  
  /**
   * Log a warning message
   * @param {string} message - The message to log
   */
  warn: (message) => {
    console.log(`${COLORS.yellow}${message}${COLORS.reset}`);
  },
  
  /**
   * Log an error message
   * @param {string} message - The message to log
   */
  error: (message) => {
    console.error(`${COLORS.red}${message}${COLORS.reset}`);
  },
  
  /**
   * Log a section header
   * @param {string} title - The section title
   */
  section: (title) => {
    console.log(`\n${COLORS.magenta}=== ${title} ===${COLORS.reset}`);
  },
  
  /**
   * Log a command that will be executed
   * @param {string} command - The command being executed
   */
  command: (command) => {
    console.log(`${COLORS.cyan}Running: ${command}${COLORS.reset}\n`);
  },
  
  /**
   * Log a parameter value
   * @param {string} name - Parameter name
   * @param {string} value - Parameter value
   */
  param: (name, value) => {
    console.log(`${COLORS.cyan}${name}: ${COLORS.white}${value}${COLORS.reset}`);
  }
};

/**
 * Utility functions for common operations
 */
const utils = {
  /**
   * Ensure a script is executable
   * @param {string} scriptPath - Path to the script
   * @returns {boolean} - True if successful, false otherwise
   */
  makeExecutable: (scriptPath) => {
    try {
      execSync(`chmod +x "${scriptPath}"`);
      return true;
    } catch (error) {
      logger.error(`Error making script executable: ${error.message}`);
      return false;
    }
  },
  
  /**
   * Check if the domain cache exists
   * @returns {boolean} - True if cache exists, false otherwise
   */
  cacheExists: () => {
    return fs.existsSync(CONFIG.CACHE_FILE);
  },
  
  /**
   * Get the full path to a script
   * @param {string} scriptName - Name of the script
   * @returns {string} - Full path to the script
   */
  getScriptPath: (scriptName) => {
    return path.join(CONFIG.SCRIPTS_DIR, scriptName);
  },
  
  /**
   * Execute a shell command
   * @param {string} command - Command to execute
   * @param {boolean} [silent=false] - Whether to suppress console output
   * @returns {Promise<{stdout: string, stderr: string}>} - Command output
   */
  executeCommand: async (command, silent = false) => {
    if (!silent) {
      logger.command(command);
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        shell: true,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
      
      if (!silent && stdout) {
        console.log(stdout);
      }
      
      if (!silent && stderr) {
        logger.warn('Warnings/Errors:');
        console.error(stderr);
      }
      
      return { stdout, stderr };
    } catch (error) {
      if (!silent) {
        logger.error(`Command execution failed: ${error.message}`);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
      }
      throw error;
    }
  },
  
  /**
   * Extract the base domain from a domain name
   * @param {string} domain - Domain name (e.g., "subdomain.example.com")
   * @returns {string} - Base domain (e.g., "example.com")
   */
  getBaseDomain: (domain) => {
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
  },
  
  /**
   * Group domains by family
   * @param {Array<Object>} domains - List of domain objects
   * @returns {Object} - Domains grouped by family
   */
  groupByFamily: (domains) => {
    const families = {};
    
    domains.forEach(domain => {
      const match = domain.name.match(/([^.]+)\.[^.]+$/);
      if (match) {
        const family = match[1];
        if (!families[family]) {
          families[family] = [];
        }
        families[family].push(domain);
      }
    });
    
    return families;
  }
};

/**
 * Command implementations
 */
const commands = {
  /**
   * List domains from the domain cache
   * @param {Object} options - Command options
   * @param {string} [options.type] - Filter by domain type
   * @param {string} [options.search] - Search term for domain names
   * @param {boolean} [options.family] - Group domains by family
   */
  list: async (options = {}) => {
    logger.section('Domain List');
    
    try {
      // Check if cache exists
      if (!utils.cacheExists()) {
        logger.error('Domain cache not found. No domains have been imported yet.');
        logger.info('Run "aixtiv domain:import" to import domains first.');
        return;
      }
      
      // Read cache
      const cacheData = JSON.parse(fs.readFileSync(CONFIG.CACHE_FILE, 'utf8'));
      const domains = cacheData.domains || [];
      
      if (domains.length === 0) {
        logger.warn('No domains found in cache.');
        return;
      }
      
      // Apply filters if provided
      let filteredDomains = domains;
      
      if (options.type) {
        filteredDomains = filteredDomains.filter(domain => 
          domain.type && domain.type.toLowerCase() === options.type.toLowerCase()
        );
      }
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredDomains = filteredDomains.filter(domain => 
          domain.name.toLowerCase().includes(searchTerm)
        );
      }
      
      // Group domains by family if requested
      if (options.family) {
        const families = utils.groupByFamily(filteredDomains);
        
        // Display domains grouped by family
        logger.info(`Found ${filteredDomains.length} domains in ${Object.keys(families).length} families\n`);
        
        Object.keys(families).sort().forEach(family => {
          console.log(`${COLORS.magenta}${family} (${families[family].length})${COLORS.reset}`);
          families[family].forEach(domain => {
            console.log(`  ${domain.name}`);
          });
          console.log('');
        });
      } else {
        // Display domains as a simple list
        logger.info(`Found ${filteredDomains.length} domains\n`);
        
        filteredDomains.forEach(domain => {
          console.log(`${domain.name} (${domain.type || 'unknown type'})`);
        });
      }
      
      console.log(`\n${COLORS.blue}Last Updated: ${cacheData.lastUpdated || 'Unknown'}${COLORS.reset}`);
      
    } catch (error) {
      logger.error(`Error listing domains: ${error.message}`);
      if (error.stack) {
        console.error(COLORS.dim, error.stack, COLORS.reset);
      }
    }
  },
  
  /**
   * Import domains from a file
   * @param {string} file - Path to the domains file
   * @param {Object} options - Command options
   * @param {string} [options.type] - Domain type
   * @param {string} [options.project] - Firebase project ID
   * @param {boolean} [options.ssl] - Whether to provision SSL certificates
   */
  import: async (file, options = {}) => {
    logger.section('Domain Import');
    
    try {
      if (!file) {
        logger.error('Error: Domain file is required');
        logger.info('Usage: aixtiv domain:import <file> [options]');
        return;
      }
      
      const domainType = options.type || CONFIG.DEFAULT_DOMAIN_TYPE;
      const firebaseProject = options.project || CONFIG.DEFAULT_FIREBASE_PROJECT;
      const provisionSsl = options.ssl ? 'true' : 'false';
      
      logger.param('File', file);
      logger.param('Type', domainType);
      logger.param('Project', firebaseProject);
      logger.param('Provision SSL', provisionSsl);
      console.log('');
      
      // Run the bulk-domain-import.sh script
      const scriptPath = utils.getScriptPath(CONFIG.SCRIPTS.BULK_IMPORT);
      
      if (!fs.existsSync(scriptPath)) {
        logger.error(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Make the script executable
      if (!utils.makeExecutable(scriptPath)) {
        return;
      }
      
      // Run the script
      try {
        const command = `"${scriptPath}" "${file}" "${domainType}" "${firebaseProject}" "${provisionSsl}"`;
        await utils.executeCommand(command);
        
        logger.success('Domains imported successfully');
      } catch (error) {
        logger.error(`Error importing domains: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error importing domains: ${error.message}`);
      if (error.stack) {
        console.error(COLORS.dim, error.stack, COLORS.reset);
      }
    }
  },
  
  /**
   * Verify domain ownership against GoDaddy
   * @param {string} godaddyFile - Path to the GoDaddy domains file
   * @param {Object} options - Command options
   */
  verify: async (godaddyFile, options = {}) => {
    logger.section('Domain Ownership Verification');
    
    try {
      if (!godaddyFile) {
        logger.error('Error: GoDaddy domains file is required');
        logger.info('Usage: aixtiv domain:verify <godaddy-domains-file> [options]');
        return;
      }
      
      logger.param('GoDaddy File', godaddyFile);
      console.log('');
      
      const scriptPath = utils.getScriptPath(CONFIG.SCRIPTS.VERIFY_OWNERSHIP);
      
      if (!fs.existsSync(scriptPath)) {
        logger.error(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Make the script executable
      if (!utils.makeExecutable(scriptPath)) {
        return;
      }
      
      // Run the script
      try {
        const command = `node "${scriptPath}" "${godaddyFile}"`;
        await utils.executeCommand(command);
        logger.success('Domain verification completed');
      } catch (error) {
        logger.error(`Error verifying domains: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error verifying domains: ${error.message}`);
      if (error.stack) {
        console.error(COLORS.dim, error.stack, COLORS.reset);
      }
    }
  },
  
  /**
   * Check SSL certificates for domains
   * @param {Object} options - Command options
   * @param {boolean} [options.all] - Check all domains
   * @param {string} [options.domain] - Specific domain to check
   * @param {boolean} [options.debug] - Show debug information
   */
  checkSsl: async (options = {}) => {
    logger.section('SSL Certificate Check');
    
    try {
      const scriptPath = utils.getScriptPath(CONFIG.SCRIPTS.SSL_CHECK);
      
      if (!fs.existsSync(scriptPath)) {
        logger.error(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Make the script executable
      if (!utils.makeExecutable(scriptPath)) {
        return;
      }
      
      // Build arguments
      let args = '';
      if (options.debug) {
        args += ' --debug';
      }
      if (options.all) {
        args += ' --all';
      }
      if (options.domain) {
        args += ` "${options.domain}"`;
      }
      
      // Run the script
      try {
        const command = `"${scriptPath}"${args}`;
        await utils.executeCommand(command);
        logger.success('SSL certificate check completed');
      } catch (error) {
        logger.error(`Error checking SSL certificates: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error checking SSL certificates: ${error.message}`);
      if (error.stack) {
        console.error(COLORS.dim, error.stack, COLORS.reset);
      }
    }
  },
  
  /**
   * Provision SSL certificates for domains
   * @param {string} file - Path to the domains file
   * @param {Object} options - Command options
   * @param {string} [options.type] - Provision type (firebase or gcp)
   * @param {string} [options.project] - Project ID
   * @param {boolean} [options.dryRun] - Whether to perform a dry run
   */
  provisionSsl: async (file, options = {}) => {
    logger.section('SSL Certificate Provisioning');
    
    try {
      if (!file) {
        logger.error('Error: Domain file is required');
        logger.info('Usage: aixtiv domain:provision-ssl <file> [options]');
        return;
      }
      
      const provisionType = options.type || 'firebase';
      const projectId = options.project || CONFIG.DEFAULT_FIREBASE_PROJECT;
      const dryRun = options.dryRun ? 'true' : 'false';
      
      logger.param('File', file);
      logger.param('Type', provisionType);
      logger.param('Project', projectId);
      logger.param('Dry Run', dryRun);
      console.log('');
      
      // Run the batch-ssl-provision.sh script
      const scriptPath = utils.getScriptPath(CONFIG.SCRIPTS.SSL_PROVISION);
      
      if (!fs.existsSync(scriptPath)) {
        logger.error(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Make the script executable
      if (!utils.makeExecutable(scriptPath)) {
        return;
      }
      
      // Run the script
      try {
        const command = `"${scriptPath}" "${file}" "${provisionType}" "${projectId}" "${dryRun}"`;
        await utils.executeCommand(command);
        
        logger.success('SSL certificates provisioned successfully');
      } catch (error) {
        logger.error(`Error provisioning SSL certificates: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error provisioning SSL certificates: ${error.message}`);
      if (error.stack) {
        console.error(COLORS.dim, error.stack, COLORS.reset);
      }
    }
  },
  
  /**
   * Clean domain cache by verifying against GoDaddy domains
   * @param {string} godaddyFile - Path to the GoDaddy domains file
   * @param {Object} options - Command options
   */
  cleanCache: async (godaddyFile, options = {}) => {
    logger.section('Domain Cache Cleanup');
    
    try {
      if (!godaddyFile) {
        logger.error('Error: GoDaddy domains file is required');
        logger.info('Usage: aixtiv domain:clean-cache <godaddy-domains-file> [options]');
        return;
      }
      
      logger.param('GoDaddy File', godaddyFile);
      console.log('');
      
      const scriptPath = utils.getScriptPath(CONFIG.SCRIPTS.CLEAN_CACHE);
      
      if (!fs.existsSync(scriptPath)) {
        logger.error(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Make the script executable
      if (!utils.makeExecutable(scriptPath)) {
        return;
      }
      
      // Run the script
      try {
        const command = `"${scriptPath}" "${godaddyFile}"`;
        await utils.executeCommand(command);
        
        logger.success('Domain cache cleaned successfully');
      } catch (error) {
        logger.error(`Error cleaning domain cache: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error cleaning domain cache: ${error.message}`);
      if (error.stack) {
        console.error(COLORS.dim, error.stack, COLORS.reset);
      }
    }
  }
};

/**
 * Register domain management commands with the CLI
 * @param {import('commander').Command} program - The Commander program instance
 */
function registerDomainCommands(program) {
  logger.info('Registering domain management commands...');
  
  // Domain list command
  program
    .command('domain:list')
    .description('List domains from the domain cache')
    .option('-t, --type <type>', 'Filter by domain type')
    .option('-s, --search <search>', 'Search term for domain names')
    .option('-f, --family', 'Group domains by family')
    .action(commands.list);
  
  // Domain import command
  program
    .command('domain:import <file>')
    .description('Import domains from a file')
    .option('-t, --type <type>', 'Domain type', CONFIG.DEFAULT_DOMAIN_TYPE)
    .option('-p, --project <project>', 'Firebase project ID', CONFIG.DEFAULT_FIREBASE_PROJECT)
    .option('-s, --ssl', 'Provision SSL certificates after import')
    .action(commands.import);
  
  // Domain verify command
  program
    .command('domain:verify <godaddy-file>')
    .description('Verify domain ownership against GoDaddy domains')
    .action(commands.verify);
  
  // Domain SSL check command
  program
    .command('domain:ssl-check')
    .description('Check SSL certificates for domains')
    .option('-a, --all', 'Check all domains')
    .option('-d, --domain <domain>', 'Check specific domain')
    .option('--debug', 'Show debug information')
    .action(commands.checkSsl);
  
  // Domain SSL provision command
  program
    .command('domain:provision-ssl <file>')
    .description('Provision SSL certificates for domains')
    .option('-t, --type <type>', 'Provision type (firebase or gcp)', 'firebase')
    .option('-p, --project <project>', 'Project ID', CONFIG.DEFAULT_FIREBASE_PROJECT)
    .option('--dry-run', 'Perform a dry run without executing actions')
    .action(commands.provisionSsl);
  
  // Domain cache cleanup command
  program
    .command('domain:clean-cache <godaddy-file>')
    .description('Clean domain cache by verifying against GoDaddy domains')
    .action(commands.cleanCache);

  // Domain autoscale verification command
  program
    .command('domain:autoscale-verify')
    .description('Verify and connect domains to Firebase during autoscaling')
    .option('-f, --force', 'Force verification of all domains, including already verified ones')
    .option('-d, --dry-run', 'Simulate verification without making changes')
    .option('-v, --verbose', 'Enable verbose logging')
    .action((options) => {
      const autoscaleCommand = require('./autoscale');
      autoscaleCommand(program);
      program.parseAsync(process.argv);
    });

  return program;
}

module.exports = registerDomainCommands;
