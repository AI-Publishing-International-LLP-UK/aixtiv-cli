/**
 * Domain management commands for aixtiv CLI
 * 
 * This module provides commands for managing domains, including:
 * - Listing domains
 * - Importing domains
 * - Verifying domain ownership
 * - Checking SSL certificates
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Constants
const CACHE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli');
const CACHE_FILE = path.join(CACHE_DIR, 'domain-cache.json');
const SCRIPTS_DIR = path.join(__dirname, '../../scripts');

// Color output
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
 * List domains from the domain cache
 */
async function list(options) {
  try {
    console.log(`${COLORS.blue}=== Domain List ===${COLORS.reset}`);
    
    // Check if cache exists
    if (!fs.existsSync(CACHE_FILE)) {
      console.error(`${COLORS.red}Domain cache not found. No domains have been imported yet.${COLORS.reset}`);
      return;
    }
    
    // Read cache
    const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const domains = cacheData.domains || [];
    
    if (domains.length === 0) {
      console.log(`${COLORS.yellow}No domains found in cache.${COLORS.reset}`);
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
      const families = {};
      
      filteredDomains.forEach(domain => {
        const match = domain.name.match(/([^.]+)\.[^.]+$/);
        if (match) {
          const family = match[1];
          if (!families[family]) {
            families[family] = [];
          }
          families[family].push(domain);
        }
      });
      
      // Display domains grouped by family
      console.log(`${COLORS.cyan}Found ${filteredDomains.length} domains in ${Object.keys(families).length} families${COLORS.reset}\n`);
      
      Object.keys(families).sort().forEach(family => {
        console.log(`${COLORS.magenta}${family} (${families[family].length})${COLORS.reset}`);
        families[family].forEach(domain => {
          console.log(`  ${domain.name}`);
        });
        console.log('');
      });
    } else {
      // Display domains as a simple list
      console.log(`${COLORS.cyan}Found ${filteredDomains.length} domains${COLORS.reset}\n`);
      
      filteredDomains.forEach(domain => {
        console.log(`${domain.name} (${domain.type || 'unknown type'})`);
      });
    }
    
    console.log(`\n${COLORS.blue}Last Updated: ${cacheData.lastUpdated || 'Unknown'}${COLORS.reset}`);
    
  } catch (error) {
    console.error(`${COLORS.red}Error listing domains: ${error.message}${COLORS.reset}`);
  }
}

/**
 * Import domains from a file
 */
async function importDomains(file, options) {
  try {
    if (!file) {
      console.error(`${COLORS.red}Error: Domain file is required${COLORS.reset}`);
      console.log(`Usage: aixtiv domain:import <file> [options]`);
      return;
    }
    
    const domainType = options.type || 'brand';
    const firebaseProject = options.project || 'api-for-warp-drive';
    const provisionSsl = options.ssl ? 'true' : 'false';
    
    console.log(`${COLORS.blue}=== Domain Import ===${COLORS.reset}`);
    console.log(`${COLORS.cyan}File: ${file}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Type: ${domainType}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Project: ${firebaseProject}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Provision SSL: ${provisionSsl}${COLORS.reset}\n`);
    
    // Run the bulk-domain-import.sh script
    const scriptPath = path.join(SCRIPTS_DIR, 'bulk-domain-import.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${COLORS.red}Error: Script not found: ${scriptPath}${COLORS.reset}`);
      return;
    }
    
    // Make the script executable
    try {
      execSync(`chmod +x "${scriptPath}"`);
    } catch (error) {
      console.error(`${COLORS.red}Error making script executable: ${error.message}${COLORS.reset}`);
      return;
    }
    
    // Run the script
    try {
      const command = `"${scriptPath}" "${file}" "${domainType}" "${firebaseProject}" "${provisionSsl}"`;
      console.log(`${COLORS.cyan}Running: ${command}${COLORS.reset}\n`);
      
      const { stdout, stderr } = await execAsync(command, { shell: true });
      console.log(stdout);
      
      if (stderr) {
        console.error(`${COLORS.yellow}Warnings/Errors:${COLORS.reset}\n${stderr}`);
      }
      
      console.log(`${COLORS.green}Domains imported successfully${COLORS.reset}`);
    } catch (error) {
      console.error(`${COLORS.red}Error importing domains: ${error.message}${COLORS.reset}`);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
    }
  } catch (error) {
    console.error(`${COLORS.red}Error importing domains: ${error.message}${COLORS.reset}`);
  }
}

/**
 * Verify domain ownership against GoDaddy
 */
async function verify(godaddyFile, options) {
  try {
    if (!godaddyFile) {
      console.error(`${COLORS.red}Error: GoDaddy domains file is required${COLORS.reset}`);
      console.log(`Usage: aixtiv domain:verify <godaddy-domains-file> [options]`);
      return;
    }
    
    console.log(`${COLORS.blue}=== Domain Ownership Verification ===${COLORS.reset}`);
    console.log(`${COLORS.cyan}GoDaddy File: ${godaddyFile}${COLORS.reset}\n`);
    
    const scriptPath = path.join(SCRIPTS_DIR, 'verify-domain-ownership.js');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${COLORS.red}Error: Script not found: ${scriptPath}${COLORS.reset}`);
      return;
    }
    
    // Make the script executable
    try {
      execSync(`chmod +x "${scriptPath}"`);
    } catch (error) {
      console.error(`${COLORS.red}Error making script executable: ${error.message}${COLORS.reset}`);
      return;
    }
    
    // Run the script
    try {
      const command = `node "${scriptPath}" "${godaddyFile}"`;
      console.log(`${COLORS.cyan}Running: ${command}${COLORS.reset}\n`);
      
      const { stdout, stderr } = await execAsync(command, { shell: true });
      console.log(stdout);
      
      if (stderr) {
        console.error(`${COLORS.yellow}Warnings/Errors:${COLORS.reset}\n${stderr}`);
      }
    } catch (error) {
      console.error(`${COLORS.red}Error verifying domains: ${error.message}${COLORS.reset}`);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
    }
  } catch (error) {
    console.error(`${COLORS.red}Error verifying domains: ${error.message}${COLORS.reset}`);
  }
}

/**
 * Check SSL certificates for domains
 */
async function checkSsl(options) {
  try {
    console.log(`${COLORS.blue}=== SSL Certificate Check ===${COLORS.reset}`);
    
    const scriptPath = path.join(SCRIPTS_DIR, 'domain-ssl-check.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${COLORS.red}Error: Script not found: ${scriptPath}${COLORS.reset}`);
      return;
    }
    
    // Make the script executable
    try {
      execSync(`chmod +x "${scriptPath}"`);
    } catch (error) {
      console.error(`${COLORS.red}Error making script executable: ${error.message}${COLORS.reset}`);
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
      console.log(`${COLORS.cyan}Running: ${command}${COLORS.reset}\n`);
      
      const { stdout, stderr } = await execAsync(command, { shell: true });
      console.log(stdout);
      
      if (stderr) {
        console.error(`${COLORS.yellow}Warnings/Errors:${COLORS.reset}\n${stderr}`);
      }
    } catch (error) {
      console.error(`${COLORS.red}Error checking SSL certificates: ${error.message}${COLORS.reset}`);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
    }
  } catch (error) {
    console.error(`${COLORS.red}Error checking SSL certificates: ${error.message}${COLORS.reset}`);
  }
}

/**
 * Clean domain cache by verifying against GoDaddy domains
 */
async function cleanCache(godaddyFile, options) {
  try {
    if (!godaddyFile) {
      console.error(`${COLORS.red}Error: GoDaddy domains file is required${COLORS.reset}`);
      console.log(`Usage: aixtiv domain:clean-cache <godaddy-domains-file> [options]`);
      return;
    }
    
    console.log(`${COLORS.blue}=== Domain Cache Cleanup ===${COLORS.reset}`);
    console.log(`${COLORS.cyan}GoDaddy File: ${godaddyFile}${COLORS.reset}\n`);
    
    const scriptPath = path.join(SCRIPTS_DIR, 'clean-domain-cache.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${COLORS.red}Error: Script not found: ${scriptPath}${COLORS.reset}`);
      return;
    }
    
    // Make the script executable
    try {
      execSync(`chmod +x "${scriptPath}"`);
    } catch (error) {
      console.error(`${COLORS.red}Error making script executable: ${error.message}${COLORS.reset}`);
      return;
    }
    
    // Run the script
    try {
      const command = `"${scriptPath}" "${godaddyFile}"`;
      console.log(`${COLORS.cyan}Running: ${command}${COLORS.reset}\n`);
      
      const { stdout, stderr } = await execAsync(command, { shell: true });
      console.log(stdout);
      
      if (stderr) {
        console.error(`${COLORS.yellow}Warnings/Errors:${COLORS.reset}\n${stderr}`);
      }
    } catch (error) {
      console.error(`${COLORS.red}Error cleaning domain cache: ${error.message}${COLORS.reset}`);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
    }
  } catch (error) {
    console.error(`${COLORS.red}Error cleaning domain cache: ${error.message}${COLORS.reset}`);
  }
}

/**
 * Provision SSL certificates for domains
 */
async function provisionSsl(file, options) {
  try {
    if (!file) {
      console.error(`${COLORS.red}Error: Domain file is required${COLORS.reset}`);
      console.log(`Usage: aixtiv domain:provision-ssl <file> [options]`);
      return;
    }
    
    const provisionType = options.type || 'firebase';
    const projectId = options.project || 'api-for-warp-drive';
    const dryRun = options.dryRun ? 'true' : 'false';
    
    console.log(`${COLORS.blue}=== SSL Certificate Provisioning ===${COLORS.reset}`);
    console.log(`${COLORS.cyan}File: ${file}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Type: ${provisionType}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Project: ${projectId}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Dry Run: ${dryRun}${COLORS.reset}\n`);
    
    // Run the batch-ssl-provision.sh script
    const scriptPath = path.join(SCRIPTS_DIR, 'batch-ssl-provision.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${COLORS.red}Error: Script not found: ${scriptPath}${COLORS.reset}`);
      return;
    }
    
    // Make the script executable
    try {
      execSync(`chmod +x "${scriptPath}"`);
    

#!/usr/bin/env node

/**
 * Domain Management Commands for Aixtiv CLI
 *
 * Registers domain management commands with the CLI application
 *
 * © 2025 AI Publishing International LLP
 */

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

/**
 * Register domain management commands with the CLI
 * @param {Command} program The Commander program instance
 */
function registerCommands(program) {
  // Create a domain command group
  const domainCommand = program
    .command('domain')
    .description('Domain management commands for the Aixtiv Symphony ecosystem');

  // Domain list command
  domainCommand
    .command('list')
    .description('List domains in the Aixtiv Symphony ecosystem')
    .option('-r, --refresh', 'Force refresh domains from server')
    .option('-t, --type <type>', 'Filter domains by type')
    .option('-s, --status <status>', 'Filter domains by status')
    .action(async (options) => {
      const { listDomains } = require('./manage');
      await listDomains(options);
    });

  // Domain add command
  domainCommand
    .command('add <domain>')
    .description('Add a new domain to the Aixtiv Symphony ecosystem')
    .option('-t, --type <type>', 'Domain type')
    .option('-f, --firebase-project <projectId>', 'Firebase project ID')
    .option('-e, --expiry-date <date>', 'Expiry date (YYYY-MM-DD)')
    .action(async (domain, options) => {
      const { addDomain } = require('./manage');
      await addDomain(domain, options);
    });

  // Domain verify command
  domainCommand
    .command('verify <domain>')
    .description("Verify a domain's DNS and Firebase configuration")
    .option('-d, --dns-only', 'Verify DNS records only')
    .option('-f, --firebase-only', 'Verify Firebase hosting only')
    .option('-s, --ssl-only', 'Verify SSL certificate only')
    .action(async (domain, options) => {
      const { verifyDomain } = require('./manage');
      await verifyDomain(domain, options);
    });

  // Domain remove command
  domainCommand
    .command('remove <domain>')
    .description('Remove a domain from the Aixtiv Symphony ecosystem')
    .option('-f, --force', 'Force removal without confirmation')
    .action(async (domain, options) => {
      const { removeDomain } = require('./manage');
      await removeDomain(domain, options);
    });

  // Domain Firebase setup command
  domainCommand
    .command('firebase-setup <domain>')
    .description('Set up Firebase Hosting for a domain')
    .option('-p, --project <projectId>', 'Firebase project ID')
    .option('-s, --site <siteId>', 'Firebase Hosting site ID')
    .action(async (domain, options) => {
      const { setupFirebase } = require('./manage');
      await setupFirebase(domain, options);
    });

  // Domain GoDaddy setup command
  domainCommand
    .command('godaddy-setup <domain>')
    .description('Set up domain in GoDaddy')
    .option('-n, --nameservers <nameservers>', 'Custom nameservers (comma-separated)')
    .action(async (domain, options) => {
      const { setupGoDaddy } = require('./manage');
      await setupGoDaddy(domain, options);
    });

  // SSL certificate check command
  domainCommand
    .command('ssl-check [domain]')
    .description('Check SSL certificate status for domain(s)')
    .option('-a, --all', 'Check all domains')
    .option('-v, --verbose', 'Show detailed certificate information')
    .action(async (domain, options) => {
      const { checkSSL, checkAllSSL } = require('./ssl');
      if (options.all || !domain) {
        await checkAllSSL(options);
      } else {
        await checkSSL(domain, options);
      }
    });

  // SSL certificate provision command
  domainCommand
    .command('ssl-provision <domain>')
    .description('Provision a new SSL certificate for a domain')
    .option('-t, --type <type>', 'Hosting type (firebase or gcp)')
    .option('-p, --project <projectId>', 'Project ID (Firebase or GCP)')
    .action(async (domain, options) => {
      const { provisionSSL } = require('./ssl');
      await provisionSSL(domain, options);
    });

  // SSL certificate renew command
  domainCommand
    .command('ssl-renew <domain>')
    .description('Renew SSL certificate for a domain')
    .option('-t, --type <type>', 'Hosting type (firebase or gcp)')
    .option('-p, --project <projectId>', 'Project ID (Firebase or GCP)')
    .action(async (domain, options) => {
      const { renewSSL } = require('./ssl');
      await renewSSL(domain, options);
    });

  return program;
}

module.exports = registerCommands;
