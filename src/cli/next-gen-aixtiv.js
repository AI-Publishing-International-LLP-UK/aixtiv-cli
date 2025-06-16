#!/usr/bin/env node

/**
 * Next Generation Aixtiv CLI
 * 
 * An enhanced CLI for the Aixtiv Symphony Orchestrating Operating System (ASOOS)
 * with improved performance, intuitive interface, and ASOOS architecture integration.
 * 
 * Features:
 * - Optimized performance with lazy loading and metrics
 * - Organized by ASOOS solution domains
 * - Interactive wizard interface
 * - Color-coded command groups
 * - Rich help system with examples
 * - Configurable user preferences
 * - Backward compatible with existing commands
 * 
 * © 2025 AI Publishing International LLP
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { Table } = require('console-table-printer');
const gradient = require('gradient-string');

// ====================
// Performance Tracking
// ====================

const metrics = {
  startTime: performance.now(),
  commandLoadTime: 0,
  moduleLoadTimes: {},
  executionTime: 0,
  totalTime: 0
};

// ===================
// Config Management
// ===================

const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv', 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  ui: {
    colorMode: 'full',     // 'full', 'minimal', 'none'
    showBanner: true,      // Show ASCII banner
    showDomainIcons: true, // Show icons for different domains
    compactMode: false     // Compact output mode
  },
  performance: {
    lazyLoading: true,     // Use lazy loading for commands
    showMetrics: false,    // Show performance metrics by default
    cacheTTL: 3600         // Cache TTL in seconds
  },
  domains: {
    enabledDomains: ['sallyport', 'wing', 'claude', 'domain'] // Enabled solution domains
  },
  user: {
    defaultAgent: '',      // Default agent for operations
    defaultEmail: '',      // Default email for auth
    defaultFormat: 'table' // Default output format ('table', 'json', 'compact')
  }
};

// Load user configuration
function loadConfig() {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
    
    // If config doesn't exist, create it with defaults
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error(chalk.red('Error loading config:'), error.message);
    return DEFAULT_CONFIG;
  }
}

// Save user configuration
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Error saving config:'), error.message);
  }
}

// User configuration
const userConfig = loadConfig();

// ===================
// UI Elements
// ===================

// Pre-rendered ASCII banner with ASOOS branding
const ASOOS_BANNER = `
${gradient.rainbow('     _      _          _     _              ____                          _                           ')}
${gradient.rainbow('    / \\    (_) __  __ | |_  (_) __   __    / ___|  _   _  _ __ ___  _ __ | |__    ___   _ __   _   _ ')}
${gradient.rainbow('   / _ \\   | | \\ \\/ / | __| | | \\ \\ / /    \\___ \\ | | | || \'_ ` _ \\| \'_ \\| \'_ \\  / _ \\ | \'_ \\ | | | |')}
${gradient.rainbow('  / ___ \\  | |  >  <  | |_  | |  \\ V /      ___) || |_| || | | | | | |_) | | | || (_) || | | || |_| |')}
${gradient.rainbow(' /_/   \\_\\ |_| /_/\\_\\  \\__| |_|   \\_/      |____/  \\__, ||_| |_| |_| .__/|_| |_| \\___/ |_| |_| \\__, |')}
${gradient.rainbow('                                                    |___/            |_|                        |___/ ')}

${chalk.bold('ASOOS Orchestration CLI')} ${chalk.dim('v1.1.0')}
${chalk.blue('➤ Intelligent. Secure. Fast.')}
`;

// Domain icons and colors
const DOMAIN_STYLES = {
  sallyport: {
    icon: '🔒',
    color: chalk.hex('#0066FF'),
    name: 'SallyPort'
  },
  wing: {
    icon: '✈️',
    color: chalk.hex('#00FF88'),
    name: 'Wing'
  },
  claude: {
    icon: '🧠',
    color: chalk.hex('#FF6600'),
    name: 'Dr. Claude'
  },
  domain: {
    icon: '🌐',
    color: chalk.hex('#9900CC'),
    name: 'Domain'
  },
  system: {
    icon: '⚙️',
    color: chalk.gray,
    name: 'System'
  }
};

// Helper for feedback UI
const feedback = {
  success: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`✓ ${message}`);
    } else {
      console.log(`${chalk.green('✓')} ${chalk.green(message)}`);
    }
  },
  error: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.error(`✗ ${message}`);
    } else {
      console.error(`${chalk.red('✗')} ${chalk.red(message)}`);
    }
  },
  info: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`ℹ ${message}`);
    } else {
      console.log(`${chalk.blue('ℹ')} ${chalk.blue(message)}`);
    }
  },
  warning: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`⚠ ${message}`);
    } else {
      console.log(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
    }
  }
};

// Helper function to format time
function formatTime(ms) {
  return `${ms.toFixed(2)}ms`;
}

// Helper for status coloring
function colorizeStatus(status) {
  switch (status) {
    case 'active':
      return chalk.green('Active');
    case 'offline':
      return chalk.red('Offline');
    case 'pending':
      return chalk.yellow('Pending');
    case 'in-progress':
      return chalk.blue('In Progress');
    default:
      return status;
  }
}

// Helper for priority coloring
function colorizeByPriority(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return chalk.red('High');
    case 'medium':
      return chalk.yellow('Medium');
    case 'low':
      return chalk.green('Low');
    default:
      return priority;
  }
}

// Display banner based on configuration
function displayBanner() {
  if (userConfig.ui.showBanner && !program.opts().quiet && !program.opts().json) {
    if (userConfig.ui.colorMode === 'none') {
      // Plain text version for terminals without color support
      console.log('\nAixtiv Symphony ASOOS CLI\n');
    } else {
      console.log(ASOOS_BANNER);
    }
  }
}

// Display timing information
function displayTiming() {
  if (program.opts().timing || userConfig.performance.showMetrics) {
    console.log('\nPerformance Metrics:');
    console.log(`Initial CLI load time: ${formatTime(metrics.commandLoadTime)}`);
    
    // Show module load times
    if (Object.keys(metrics.moduleLoadTimes).length > 0) {
      console.log('\nModule Load Times:');
      Object.entries(metrics.moduleLoadTimes).forEach(([module, time]) => {
        console.log(`  ${module}: ${formatTime(time)}`);
      });
    }
    
    console.log(`Command execution time: ${formatTime(metrics.executionTime)}`);
    console.log(`Total time: ${formatTime(metrics.totalTime)}`);
  }
}

// ===================
// Command Registration
// ===================

// Track registered commands by domain
const registeredCommands = {
  sallyport: [],
  wing: [],
  claude: [],
  domain: [],
  system: []
};

// Lazy load a module
async function lazyLoadModule(modulePath, moduleName) {
  const startTime = performance.now();
  
  try {
    // In production, this would use dynamic import for true lazy loading
    // For simplicity in this demo, we're using require, but in a real impl would use:
    // const module = await import(modulePath);
    
    const loadedModule = require(modulePath);
    const loadTime = performance.now() - startTime;
    metrics.moduleLoadTimes[moduleName] = loadTime;
    
    return loadedModule;
  } catch (error) {
    feedback.error(`Failed to load module ${moduleName}: ${error.message}`);
    throw error;
  }
}

// Register a command with lazy loading and performance tracking
function registerCommand(domainKey, commandName, description, options, actionFn, examples = []) {
  // Only register commands from enabled domains
  if (!userConfig.domains.enabledDomains.includes(domainKey) && domainKey !== 'system') {
    return;
  }
  
  // Use domain styling for command
  const domainStyle = DOMAIN_STYLES[domainKey] || DOMAIN_STYLES.system;
  const formattedDescription = userConfig.ui.colorMode !== 'none'
    ? `${domainStyle.color(description)}`
    : description;
  
  const cmd = program
    .command(commandName)
    .description(formattedDescription);
    
  // Add options if provided
  if (options && Array.isArray(options)) {
    options.forEach(opt => {
      cmd.option(opt.flags, opt.description, opt.defaultValue);
    });
  }
  
  // Add command to domain registry for help grouping
  registeredCommands[domainKey].push({
    name: commandName,
    description,
    examples
  });
  
  // Add examples if provided
  if (examples && examples.length > 0) {
    let exampleText = '\nExamples:\n';
    examples.forEach((example, i) => {
      exampleText += `  ${commandName} ${example}\n`;
    });
    cmd.addHelpText('after', exampleText);
  }
  
  // Wrap the action function to measure performance
  cmd.action(async (...args) => {
    const commandStartTime = performance.now();
    
    try {
      // Show spinner for command execution
      const spinner = !program.opts().quiet && !program.opts().json
        ? ora(`Executing ${domainStyle.icon} ${commandName}...`).start()
        : null;
      
      // Execute the function
      await actionFn(...args, { spinner });
      
      // Stop spinner if it exists
      if (spinner) {
        spinner.succeed(`Completed ${domainStyle.icon} ${commandName}`);
      }
    } catch (error) {
      feedback.error(`Error in ${commandName}: ${error.message}`);
    } finally {
      metrics.executionTime = performance.now() - commandStartTime;
      metrics.totalTime = performance.now() - metrics.startTime;
      
      // Show timing information
      displayTiming();
    }
  });
}

// ===================
// Wizard Interface
// ===================

// Helper for creating interactive wizards
class WizardBuilder {
  constructor(title) {
    this.title = title;
    this.steps = [];
    this.currentStep = 0;
    this.data = {};
  }
  
  addStep(title, questions) {
    this.steps.push({ title, questions });
    return this;
  }
  
  async run() {
    if (this.steps.length === 0) {
      return {};
    }
    
    console.log(chalk.bold(`\n📋 ${this.title}`));
    
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      const step = this.steps[i];
      
      console.log(chalk.dim(`\nStep ${i + 1}/${this.steps.length}: ${step.title}`));
      
      const answers = await inquirer.prompt(step.questions);
      this.data = { ...this.data, ...answers };
    }
    
    return this.data;
  }
}

// ===================
// Command Registration (Core)
// ===================

// Global CLI options
program
  .version('1.1.0')
  .description('Aixtiv Symphony Orchestrating Operating System CLI')
  .option('-j, --json', 'Output as JSON')
  .option('-q, --quiet', 'Suppress all non-essential output')
  .option('-t, --timing', 'Show performance timing information')
  .option('-c, --config <path>', 'Path to custom configuration file')
  .option('--no-banner', 'Hide the banner')
  .option('--no-color', 'Disable colors');

// ===================
// System Commands
// ===================

// Config management command
registerCommand(
  'system',
  'config',
  'Manage CLI configuration',
  [
    { flags: 'list', description: 'List current configuration' },
    { flags: 'set <key> <value>', description: 'Set configuration value' },
    { flags: 'reset', description: 'Reset to default configuration' }
  ],
  async (cmd, options) => {
    if (cmd === 'list') {
      const table = new Table({
        title: 'Aixtiv CLI Configuration',
        columns: [
          { name: 'setting', title: 'Setting' },
          {

#!/usr/bin/env node

/**
 * Next Generation Aixtiv CLI
 * 
 * An enhanced CLI for the Aixtiv Symphony Orchestrating Operating System (ASOOS)
 * with improved performance, intuitive interface, and ASOOS architecture integration.
 * 
 * Features:
 * - Optimized performance with lazy loading and metrics
 * - Organized by ASOOS solution domains
 * - Interactive wizard interface
 * - Color-coded command groups
 * - Rich help system with examples
 * - Configurable user preferences
 * - Backward compatible with existing commands
 * 
 * © 2025 AI Publishing International LLP
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { Table } = require('console-table-printer');
const gradient = require('gradient-string');

// ===================
// Config Management
// ===================

const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv', 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  ui: {
    colorMode: 'full',     // 'full', 'minimal', 'none'
    showBanner: true,      // Show ASCII banner
    showDomainIcons: true, // Show icons for different domains
    compactMode: false     // Compact output mode
  },
  performance: {
    lazyLoading: true,     // Use lazy loading for commands
    showMetrics: false,    // Show performance metrics by default
    cacheTTL: 3600         // Cache TTL in seconds
  },
  domains: {
    enabledDomains: ['sallyport', 'wing', 'claude', 'domain'] // Enabled solution domains
  },
  user: {
    defaultAgent: '',      // Default agent for operations
    defaultEmail: '',      // Default email for auth
    defaultFormat: 'table' // Default output format ('table', 'json', 'compact')
  }
};

// Load user configuration
function loadConfig() {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
    
    // If config doesn't exist, create it with defaults
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error(chalk.red('Error loading config:'), error.message);
    return DEFAULT_CONFIG;
  }
}

// Save user configuration
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Error saving config:'), error.message);
  }
}

// User configuration
const userConfig = loadConfig();

// This section integrates with the existing domain management code for backward compatibility
// while adding enhanced UI and performance optimizations

// Domain list command
registerCommand(
  'domain',
  'domain:list',
  'List domains in the Aixtiv Symphony ecosystem',
  [
    { flags: '-r, --refresh', description: 'Force refresh domains from server' },
    { flags: '-t, --type <type>', description: 'Filter domains by type' },
    { flags: '-s, --status <status>', description: 'Filter domains by status' },
    { flags: '--cache-ttl <seconds>', description: 'Cache time-to-live in seconds' }
  ],
  async (options, { spinner }) => {
    if (spinner) spinner.text = 'Connecting to Dr. Claude Orchestration...';
    await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    // Output based on format options
    if (program.opts().json) {
      console.log(JSON.stringify(filteredDomains, null, 2));
    } else if (program.opts().quiet) {
      console.log(`Found ${filteredDomains.length} domains`);
    } else {
      // Table output
      const table = new Table({
        title: 'Aixtiv Symphony Domains',
        columns: [
          { name: 'name', title: 'Domain' },
          { name: 'type', title: 'Type' },
          { name: 'status', title: 'Status' },
          { name: 'expiryDate', title: 'Expiry Date' }
        ]
      });
      
      if (!options.compact) {
        table.columns.push({ name: 'firebaseProject', title: 'Firebase Project' });
      }
      
      filteredDomains.forEach(domain => {
        const row = {
          name: domain.name,
          type: domain.type,
          status: colorizeStatus(domain.status),
          expiryDate: domain.expiryDate
        };
        
        if (!options.compact) {
          row.firebaseProject = domain.firebaseProject;
        }
        
        table.addRow(row);
      });
      
      table.printTable();
      console.log(`\nTotal domains: ${filteredDomains.length}`);
      
      // Show cache timestamp if not refreshed
      if (!options.refresh && filteredDomains.length > 0) {
        console.log(chalk.dim(`\nCache last updated: ${new Date().toLocaleString()}`));
        console.log(chalk.dim('Use --refresh to fetch the latest data from the server'));
      }
    }
  },
  ['-t character', '-s active --detailed', '--refresh']
);

// Domain add command
registerCommand(
  'domain',
  'domain:add',
  'Add a new domain to the Aixtiv Symphony ecosystem',
  [
    { flags: '<domain>', description: 'Domain name to add' },
    { flags: '-t, --type <type>', description: 'Domain type' },
    { flags: '-f, --firebase-project <projectId>', description: 'Firebase project ID' },
    { flags: '-e, --expiry-date <date>', description: 'Expiry date (YYYY-MM-DD)' },
    { flags: '--wizard', description: 'Use interactive wizard interface' }
  ],
  async (domain, options, { spinner }) => {
    // If wizard mode, use interactive interface
    if (options.wizard) {
      const wizard = new WizardBuilder('Add Domain to Aixtiv Symphony')
        .addStep('Domain Information', [
          {
            type: 'input',
            name: 'domain',
            message: 'Enter domain name:',
            default: domain || '',
            validate: input => !!input || 'Domain name is required'
          }
        ])
        .addStep('Domain Configuration', [
          {
            type: 'list',
            name: 'type',
            message: 'Select domain type:',
            choices: [
              'character',
              'command',
              'wing',
              'squadron',
              'brand',
              'aixtiv',
              'learning',
              'commerce',
              'governance'
            ],
            default: 'brand'
          },
          {
            type: 'input',
            name: 'firebaseProject',
            message: 'Enter Firebase project ID:',
            default: (answers) => answers.domain.replace(/\./g, '-')
          },
          {
            type: 'input',
            name: 'expiryDate',
            message: 'Enter expiry date (YYYY-MM-DD):',
            default: (() => {
              const date = new Date();
              date.setFullYear(date.getFullYear() + 1);
              return date.toISOString().split('T')[0];
            })(),
            validate: input => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter a valid date in YYYY-MM-DD format'
          }
        ]);
      
      const result = await wizard.run();
      domain = result.domain;
      options = { ...options, ...result };
    }
    
    // Validate domain name
    if (!domain) {
      feedback.error('Domain name is required');
      return;
    }
    
    // Validate domain format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain)) {
      feedback.error('Invalid domain format');
      return;
    }
    
    if (spinner) spinner.text = `Adding domain ${domain}...`;
    
    // This would normally lazy load the existing domain management module
    // const domainModule = await lazyLoadModule('../commands/domain/manage', 'Domain Management');
    // const { addDomain } = domainModule;
    
    // For demo, simulate adding domain
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Extract domain info
    const type = options.type || 'brand';
    const firebaseProject = options.firebaseProject || domain.replace(/\./g, '-');
    const expiryDate = options.expiryDate || (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().split('T')[0];
    })();
    
    // Simulate success
    if (program.opts().json) {
      console.log(JSON.stringify({
        success: true,
        domain,
        type,
        firebaseProject,
        expiryDate,
        status: 'pending'
      }, null, 2));
    } else {
      feedback.success(`Domain ${domain} added successfully`);
      
      console.log(`\nDomain Details:
  - Name: ${domain}
  - Type: ${type}
  - Firebase Project: ${firebaseProject}
  - Expiry Date: ${expiryDate}
  - Status: ${chalk.yellow('Pending')}
  
Next Steps:
  1. Configure DNS records
  2. Set up Firebase Hosting
  3. Verify the domain with: aixtiv domain:verify ${domain}`);
    }
  },
  ['example.com -t brand', 'drlucinda.live -t character', '--wizard']
);

// Domain verify command
registerCommand(
  'domain',
  'domain:verify',
  'Verify a domain\'s DNS and Firebase configuration',
  [
    { flags: '<domain>', description: 'Domain name to verify' },
    { flags: '-d, --dns-only', description: 'Verify DNS records only' },
    { flags: '-f, --firebase-only', description: 'Verify Firebase hosting only' },
    { flags: '-s, --ssl-only', description: 'Verify SSL certificate only' }
  ],
  async (domain, options, { spinner }) => {
    // Validate domain name
    if (!domain) {
      feedback.error('Domain name is required');
      return;
    }
    
    if (spinner) spinner.text = `Verifying domain ${domain}...`;
    
    // This would normally lazy load the existing domain management module
    // const domainModule = await lazyLoadModule('../commands/domain/manage', 'Domain Management');
    // const { verifyDomain } = domainModule;
    
    // For demo, simulate verification steps
    
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
        { check: 'Site Deployment', status: 'ok', value: 'Deployed' }
      ],
      ssl: [
        { check: 'Certificate', status: 'ok', value: 'Valid' },
        { check: 'Expiry', status: 'ok', value: '2026-04-26' },
        { check: 'HTTPS Redirect', status: 'ok', value: 'Enabled' }
      ]
    };
    
    // Simulate verification process
    if (verifyDNS) {
      if (spinner) spinner.text = `Checking DNS records for ${domain}...`;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (verifyFirebase) {
      if (spinner) spinner.text = `Checking Firebase configuration for ${domain}...`;
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    
    if (verifySSL) {
      if (spinner) spinner.text = `Checking SSL certificate for ${domain}...`;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    // Output results based on format
    if (program.opts().json) {
      const output = {
        domain,
        success: true,
        verification: {}
      };
      
      if (verifyDNS) output.verification.dns = results.dns;
      if (verifyFirebase) output.verification.firebase = results.firebase;
      if (verifySSL) output.verification.ssl = results.ssl;
      
      console.log(JSON.stringify(output, null, 2));
    } else {
      feedback.success(`Domain ${domain} verified successfully`);
      
      console.log('\n' + chalk.bold('Verification Results:'));
      
      const table = new Table({
        columns: [
          { name: 'category', title: 'Category' },
          { name: 'check', title: 'Check' },
          { name: 'status', title: 'Status' },
          { name: 'value', title: 'Value' }
        ]
      });
      
      if (verifyDNS) {
        results.dns.forEach(check => {
          table.addRow({
            category: 'DNS',
            check: check.check,
            status: check.status === 'ok' ? chalk.green('✓ OK') : chalk.red('✗ Failed'),
            value: check.value
          });
        });
      }
      
      if (verifyFirebase) {
        results.firebase.forEach(check => {
          table.addRow({
            category: 'Firebase',
            check: check.check,
            status: check.status === 'ok' ? chalk.green('✓ OK') : chalk.red('✗ Failed'),
            value: check.value
          });
        });
      }
      
      if (verifySSL) {
        results.ssl.forEach(check => {
          table.addRow({
            category: 'SSL',
            check: check.check,
            status: check.status === 'ok' ? chalk.green('✓ OK') : chalk.red('✗ Failed'),
            value: check.value
          });
        });
      }
      
      table.printTable();
    }
  },
  ['example.com', 'coaching2100.com --dns-only', 'aixtiv.com --firebase-only']
);

// Domain remove command
registerCommand(
  'domain',
  'domain:remove',
  'Remove a domain from the Aixtiv Symphony ecosystem',
  [
    { flags: '<domain>', description: 'Domain name to remove' },
    { flags: '-f, --force', description: 'Force removal without confirmation' }
  ],
  async (domain, options, { spinner }) => {
    // Validate domain name
    if (!domain) {
      feedback.error('Domain name is required');
      return;
    }
    
    // Confirm removal if not forced
    if (!options.force) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove domain ${domain}?`,
        default: false
      }]);
      
      if (!confirm) {
        feedback.info('Domain removal cancelled');
        return;
      }
    }
    
    if (spinner) spinner.text = `Removing domain ${domain}...`;
    
    // This would normally lazy load the existing domain management module
    // const domainModule = await lazyLoadModule('../commands/domain/manage', 'Domain Management');
    // const { removeDomain } = domainModule;
    
    // For demo, simulate removal
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Output results based on format
    if (program.opts().json) {
      console.log(JSON.stringify({
        success: true,
        domain,
        removed: true
      }, null, 2));
    } else {
      feedback.success(`Domain ${domain} removed successfully`);
      console.log('\nThe domain has been removed from the Aixtiv Symphony ecosystem.');
      console.log('Note: This does not affect domain registration or DNS settings at your registrar.');
    }
  },
  ['example.com', 'test-domain.org --force']
);

// ===================
// Main Execution
// ===================

// Main execution function
async function main() {
  try {
    // Display banner (conditionally)
    displayBanner();
    
    // Record time after CLI is initialized but before command execution
    metrics.commandLoadTime = performance.now() - metrics.startTime;
    
    // Parse arguments and execute command
    await program.parseAsync(process.argv);
    
    // If no command specified, show help
    if (process.argv.length <= 2) {
      program.help();
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (program.opts().timing || userConfig.performance.showMetrics) {
      console.error(chalk.dim('Stack trace:'), error.stack);
    }
    process.exit(1);
  }
}

// Execute main function
main();

// ===================
// Config Management
// ===================

const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv', 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  ui: {
    colorMode: 'full',     // 'full', 'minimal', 'none'
    showBanner: true,      // Show ASCII banner
    showDomainIcons: true, // Show icons for different domains
    compactMode: false     // Compact output mode
  },
  performance: {
    lazyLoading: true,     // Use lazy loading for commands
    showMetrics: false,    // Show performance metrics by default
    cacheTTL: 3600         // Cache TTL in seconds
  },
  domains: {
    enabledDomains: ['sallyport', 'wing', 'claude', 'domain'] // Enabled solution domains
  },
  user: {
    defaultAgent: '',      // Default agent for operations
    defaultEmail: '',      // Default email for auth
    defaultFormat: 'table' // Default output format ('table', 'json', 'compact')
  }
};

// Load user configuration
function loadConfig() {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
    
    // If config doesn't exist, create it with defaults
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error(chalk.red('Error loading config:'), error.message);
    return DEFAULT_CONFIG;
  }
}

// Save user configuration
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Error saving config:'), error.message);
  }
}

// User configuration
const userConfig = loadConfig();

// ===================
// UI Elements
// ===================

// Pre-rendered ASCII banner with ASOOS branding
const ASOOS_BANNER = `
${gradient.rainbow('     _      _          _     _              ____                          _                           ')}
${gradient.rainbow('    / \\    (_) __  __ | |_  (_) __   __    / ___|  _   _  _ __ ___  _ __ | |__    ___   _ __   _   _ ')}
${gradient.rainbow('   / _ \\   | | \\ \\/ / | __| | | \\ \\ / /    \\___ \\ | | | || \'_ ` _ \\| \'_ \\| \'_ \\  / _ \\ | \'_ \\ | | | |')}
${gradient.rainbow('  / ___ \\  | |  >  <  | |_  | |  \\ V /      ___) || |_| || | | | | | |_) | | | || (_) || | | || |_| |')}
${gradient.rainbow(' /_/   \\_\\ |_| /_/\\_\\  \\__| |_|   \\_/      |____/  \\__, ||_| |_| |_| .__/|_| |_| \\___/ |_| |_| \\__, |')}
${gradient.rainbow('                                                    |___/            |_|                        |___/ ')}

${chalk.bold('ASOOS Orchestration CLI')} ${chalk.dim('v1.1.0')}
${chalk.blue('➤ Intelligent. Secure. Fast.')}
`;

// Domain icons and colors
const DOMAIN_STYLES = {
  sallyport: {
    icon: '🔒',
    color: chalk.hex('#0066FF'),
    name: 'SallyPort'
  },
  wing: {
    icon: '✈️',
    color: chalk.hex('#00FF88'),
    name: 'Wing'
  },
  claude: {
    icon: '🧠',
    color: chalk.hex('#FF6600'),
    name: 'Dr. Claude'
  },
  domain: {
    icon: '🌐',
    color: chalk.hex('#9900CC'),
    name: 'Domain'
  },
  system: {
    icon: '⚙️',
    color: chalk.gray,
    name: 'System'
  }
};

// Helper for wing agent status coloring
function colorizeStatus(status) {
  switch (status) {
    case 'active':
      return chalk.green('Active');
    case 'offline':
      return chalk.red('Offline');
    case 'pending':
      return chalk.yellow('Pending');
    default:
      return status;
  }
}

// ===================
// Dr. Claude Command Suite
// ===================

// Dr. Claude project delegation command
registerCommand(
  'claude',
  'claude:agent:delegate',
  'Delegate a project to Dr. Claude as project manager',
  [
    { flags: '-p, --project <name>', description: 'Project name' },
    { flags: '-d, --description <description>', description: 'Project description' },
    { flags: '--priority <priority>', description: 'Project priority (low, medium, high)', defaultValue: 'medium' },
    { flags: '--deadline <date>', description: 'Project deadline (YYYY-MM-DD)', defaultValue: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }},
    { flags: '--tags <tags>', description: 'Comma-separated list of project tags' },
    { flags: '--assign-to <agent>', description: 'Directly assign to specific agent (e.g., dr-lucy, dr-match)' },
    { flags: '--wizard', description: 'Use interactive wizard interface' }
  ],
  async (options, { spinner }) => {
    // If wizard mode, use interactive interface
    if (options.wizard) {
      const wizard = new WizardBuilder('Delegate Project to Dr. Claude')
        .addStep('Project Information', [
          {
            type: 'input',
            name: 'project',
            message: 'Enter project name:',
            validate: input => !!input || 'Project name is required'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Enter project description:',
            validate: input => !!input || 'Project description is required'
          }
        ])
        .addStep('Project Details', [
          {
            type: 'list',
            name: 'priority',
            message: 'Select project priority:',
            choices: ['low', 'medium', 'high'],
            default: 'medium'
          },
          {
            type: 'input',
            name: 'deadline',
            message: 'Enter deadline (YYYY-MM-DD):',
            default: (() => {
              const date = new Date();
              date.setDate(date.getDate() + 7);
              return date.toISOString().split('T')[0];
            })(),
            validate: input => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter a valid date in YYYY-MM-DD format'
          },
          {
            type: 'input',
            name: 'tags',
            message: 'Enter comma-separated tags:',
            default: ''
          }
        ])
        .addStep('Assignment', [
          {
            type: 'list',
            name: 'assignTo',
            message: 'Assign to specific agent:',
            choices: [
              { name: 'Let Dr. Claude decide (recommended)', value: '' },
              { name: 'Dr. Lucy (Flight Memory)', value: 'dr-lucy' },
              { name: 'Dr. Match (Bid Suite)', value: 'dr-match' },
              { name: 'Dr. Sabina (Dream Commander)', value: 'dr-sabina' },
              { name: 'Dr. Claude (Orchestrator)', value: 'dr-claude' }
            ],
            default: ''
          }
        ]);
      
      const result = await wizard.run();
      options = { ...options, ...result };
    }
    
    // Validate required fields
    if (!options.project) {
      feedback.error('Project name is required');
      return;
    }
    
    if (!options.description) {
      feedback.error('Project description is required');
      return;
    }
    
    // Prepare tags
    const tags = options.tags ? options.tags.split(',').map(tag => tag.trim()) : [];
    
    if (spinner) spinner.text = 'Analyzing project requirements...';
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (spinner) spinner.text = 'Delegating to Dr. Claude...';
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const delegationId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Output delegation result
    if (program.opts().json) {
      console.log(JSON.stringify({
        success: true,
        delegationId,
        project: options.project,
        assignedTo: options.assignTo || 'Auto-selected',
        priority: options.priority,
        deadline: options.deadline,
        tags
      }, null, 2));
    } else {
      console.log(`\n${chalk.green('✓')} Project successfully delegated to Dr. Claude`);
      console.log(`\nDelegation Details:`);
      console.log(`  - ID: ${chalk.bold(delegationId)}`);
      console.log(`  - Project: ${chalk.bold(options.project)}`);
      console.log(`  - Description: ${options.description}`);
      console.log(`  - Priority: ${colorizeByPriority(options.priority)}`);
      console.log(`  - Deadline: ${chalk.blue(options.deadline)}`);
      
      if (tags.length > 0) {
        console.log(`  - Tags: ${tags.map(tag => chalk.cyan(`#${tag}`)).join(' ')}`);
      }
      
      if (options.assignTo) {
        console.log(`  - Assigned To: ${chalk.yellow(options.assignTo)}`);
      } else {
        console.log(`  - Assignment: ${chalk.green('Auto-assigned by Dr. Claude')}`);
      }
      
      console.log(`\nTrack status with: ${chalk.bold(`aixtiv claude:status --delegation ${delegationId}`)}`);
    }
  },
  ['-p "Website Redesign" -d "Update the company website with new branding" --priority high', '--wizard']
);

// Helper for priority coloring
function colorizeByPriority(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return chalk.red('High');
    case 'medium':
      return chalk.yellow('Medium');
    case 'low':
      return chalk.green('Low');
    default:
      return priority;
  }
}

// Claude status command
registerCommand(
  'claude',
  'claude:status',
  'Check status of Dr. Claude agents and their workloads',
  [
    { flags: '-a, --agent <agent>', description: 'Specific agent to check' },
    { flags: '-d, --delegation <id>', description: 'Check specific delegation ID' },
    { flags: '--detailed', description: 'Show detailed information' }
  ],
  async (options, { spinner }) => {
    if (spinner) spinner.text = 'Connecting to Dr. Claude Orchestration...';
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // If delegation ID is provided, check specific delegation
    if (options.delegation) {
      if (spinner) spinner.text = `Looking up delegation ${options.delegation}...`;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock delegation data
      const delegation = {
        id: options.delegation,
        project: 'Sample Project',
        description: 'This is a sample project description',
        status: 'in-progress',
        assignedTo: 'dr-lucy',
        priority: 'high',
        progress: 65,
        deadline: '2025-05-15',
        created: '2025-04-20T14:30:00Z',
        lastUpdated: '2025-04-26T08:15:22Z',
        tasks: [
          { id: 'task-1', name: 'Research', status: 'completed', completion: 100 },
          { id: 'task-2', name: 'Planning', status: 'completed', completion: 100 },
          { id: 'task-3', name: 'Implementation', status: 'in-progress', completion: 45 },
          { id: 'task-4', name: 'Testing', status: 'not-started', completion: 0 },
          { id: 'task-5', name: 'Deployment', status: 'not-started', completion: 0 }
        ]
      };
      
      // Output based on format options
      if (program.opts().json) {
        console.log(JSON.stringify(delegation, null, 2));
        return;
      }
      
      // Table output for delegation status
      console.log(`\n${chalk.bold(`Delegation Status: ${options.delegation}`)}`);
      console.log(`Project: ${chalk.cyan(delegation.project)}`);
      console.log(`Description: ${delegation.description}`);
      console.log(`Status: ${colorizeStatus(delegation.status)}`);
      console.log(`Assigned To: ${chalk.yellow(delegation.assignedTo)}`);
      console.log(`Priority: ${colorizeByPriority(delegation.priority)}`);
      console.log(`Progress: ${chalk.blue(delegation.progress + '%')}`);
      console.log(`Deadline: ${delegation.deadline}`);
      console.log(`Created: ${new Date(delegation.created).toLocaleString()}`);
      console.log(`Last Updated: ${new Date(delegation.lastUpdated).toLocaleString()}`);
      
      // Show tasks if detailed view
      if (options.detailed) {
        console.log(`\n${chalk.bold('Tasks:')}`);
        const taskTable = new Table({
          columns: [
            { name: 'id', title: 'ID' },
            { name: 'name', title: 'Name' },
            { name: 'status', title: 'Status' },
            { name: 'completion', title: 'Completion' }
          ]
        });
        
        delegation.tasks.forEach(task => {
          taskTable.addRow({
            id: task.id,
            name: task.name,
            status: colorizeStatus(task.status),
            completion: `${task.completion}%`
          });
        });
        
        taskTable.printTable();
      }
      
      return;
    }
    
    // If agent is specified, check status of specific agent
    if (options.agent) {
      if (spinner) spinner.text = `Checking status of agent ${options.agent}...`;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock agent data
      const agent = {
        id: options.agent,
        type: options.agent.includes('lucy') ? 'flight-memory' : 
              options.agent.includes('match') ? 'bid-suite' : 
              options.agent.includes('sabina') ? 'dream-commander' : 'orchestrator',
        status: 'active',
        workload: 75,
        projects: 3,
        delegations: 8,
        lastActive: new Date().toISOString(),
        capabilities: [
          'code-generation',
          'project-management',
          'data-analysis',
          'automation'
        ]
      };
      
      // Output based on format options
      if (program.opts().json) {
        console.log(JSON.stringify(agent, null, 2));
        return;
      }
      
      // Output agent status
      console.log(`\n${chalk.bold(`Agent Status: ${agent.id}`)}`);
      console.log(`Type: ${agent.type}`);
      console.log(`Status: ${colorizeStatus(agent.status)}`);
      console.log(`Workload: ${agent.workload}%`);
      console.log(`Projects: ${agent.projects}`);
      console.log(`Delegations: ${agent.delegations}`);
      console.log(`Last Active: ${new Date(agent.lastActive).toLocaleString()}`);
      
      if (options.detailed) {
        console.log(`\n${chalk.bold('Capabilities:')}`);
        agent.capabilities.forEach(cap => {
          console.log(`  - ${cap}`);
        });
      }
      
      return;
    }
    
    // If no specific delegation or agent is requested, show all agents
    if (spinner) spinner.text = 'Fetching agent status summary...';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data for all agents
    const agents = [
      { id: 'dr-lucy', type: 'flight-memory', status: 'active', workload: 85, projects: 5, delegations: 12 },
      { id: 'dr-match', type: 'bid-suite', status: 'active', workload: 60, projects: 2, delegations: 7 },
      { id: 'dr-sabina', type: 'dream-commander', status: 'offline', workload: 0, projects: 0, delegations: 0 },
      { id: 'dr-claude', type: 'orchestrator', status: 'active', workload: 45, projects: 8, delegations: 24 },
      { id: 'dr-memoria', type: 'anthology', status: 'active', workload: 70, projects: 3, delegations: 9 }
    ];
    
    // Output based on format options
    if (program.opts().json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }
    
    // Table output
    const table = new Table({
      title: 'Dr. Claude Agents Status',
      columns: [
        { name: 'id', title: 'Agent ID' },
        { name: 'type', title: 'Type' },
        { name: 'status', title: 'Status' },
        { name: 'workload', title: 'Workload' },
        { name: 'projects', title: 'Projects' },
        { name: 'delegations', title: 'Delegations' }
      ]
    });
    
    agents.forEach(agent => {
      table.addRow({
        id: agent.id,
        type: agent.type,
        status: colorizeStatus(agent.status),
        workload: `${agent.workload}%`,
        projects: agent.projects,
        delegations: agent.delegations
      });
    });
    
    table.printTable();
    
    console.log(`\nTotal Agents: ${agents
        return;
      }
      
      // Table output for delegation status
      console.log(`\n${chalk.bold(`Delegation Status: ${options.delegation}`)}`);
      console.log(`Project: ${chalk.cyan(delegation.project)}`);
      console.log(`Description: ${delegation.description}`);
      console.log(`Status: ${colorizeStatus(delegation.status)}`);
      console.log(`Assigned To: ${chalk.yellow(delegation.assignedTo)}`);
      console.log(`Priority: ${colorizeByPriority(delegation.priority)}`);
      console.log(`Progress: ${chalk.blue(delegation.progress + '%')}`);
      console.log(`Deadline: ${delegation.deadline}`);
      console.log(`Created: ${new Date(delegation.created).toLocaleString()}`);
      console.log(`Last Updated: ${new Date(delegation.lastUpdated).toLocaleString()}`);
      
      // Show tasks if detailed view
      if (options.detailed) {
        console.log(`\n${chalk.bold('Tasks:')}`);
        const taskTable = new Table({
          columns: [
            { name: 'id', title: 'ID' },
            { name: 'name', title: 'Name' },
            { name: 'status', title: 'Status' },
            { name: 'completion', title: 'Completion' }
          ]
        });
        
        delegation.tasks.forEach(task => {
          taskTable.addRow({
            id: task.id,
            name: task.name,
            status: colorizeStatus(task.status),
            completion: `${task.completion}%`
          });
        });
        
        taskTable.printTable();
      }
      
      return;
    }
    
    // If agent is specified, check status of specific agent
    if (options.agent) {
      if (spinner) spinner.text = `Checking status of agent ${options.agent}...`;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock agent data
      const agent = {
        id: options.agent,
        type: options.agent.includes('lucy') ? 'flight-memory' : 
              options.agent.includes('match') ? 'bid-suite' : 
              options.agent.includes('sabina') ? 'dream-commander' : 'orchestrator',
        status: 'active',
        workload: 75,
        projects: 3,
        delegations: 8,
        lastActive: new Date().toISOString(),
        capabilities: [
          'code-generation',
          'project-management',
          'data-analysis',
          'automation'
        ]
      };
      
      // Output based on format options
      if (program.opts().json) {
        console.log(JSON.stringify(agent, null, 2));
        return;
      }
      
      // Output agent status
      console.log(`\n${chalk.bold(`Agent Status: ${agent.id}`)}`);
      console.log(`Type: ${agent.type}`);
      console.log(`Status: ${colorizeStatus(agent.status)}`);
      console.log(`Workload: ${agent.workload}%`);
      console.log(`Projects: ${agent.projects}`);
      console.log(`Delegations: ${agent.delegations}`);
      console.log(`Last Active: ${new Date(agent.lastActive).toLocaleString()}`);
      
      if (options.detailed) {
        console.log(`\n${chalk.bold('Capabilities:')}`);
        agent.capabilities.forEach(cap => {
          console.log(`  - ${cap}`);
        });
      }
      
      return;
    }
    
    // If no specific delegation or agent is requested, show all agents
    if (spinner) spinner.text = 'Fetching agent status summary...';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data for all agents
    const agents = [
      { id: 'dr-lucy', type: 'flight-memory', status: 'active', workload: 85, projects: 5, delegations: 12 },
      { id: 'dr-match', type: 'bid-suite', status: 'active', workload: 60, projects: 2, delegations: 7 },
      { id: 'dr-sabina', type: 'dream-commander', status: 'offline', workload: 0, projects: 0, delegations: 0 },
      { id: 'dr-claude', type: 'orchestrator', status: 'active', workload: 45, projects: 8, delegations: 24 },
      { id: 'dr-memoria', type: 'anthology', status: 'active', workload: 70, projects: 3, delegations: 9 }
    ];
    
    // Output based on format options
    if (program.opts().json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }
    
    // Table output
    const table = new Table({
      title: 'Dr. Claude Agents Status',
      columns: [
        { name: 'id', title: 'Agent ID' },
        { name: 'type', title: 'Type' },
        { name: 'status', title: 'Status' },
        { name: 'workload', title: 'Workload' },
        { name: 'projects', title: 'Projects' },
        { name: 'delegations', title: 'Delegations' }
      ]
    });
    
    agents.forEach(agent => {
      table.addRow({
        id: agent.id,
        type: agent.type,
        status: colorizeStatus(agent.status),
        workload: `${agent.workload}%`,
        projects: agent.projects,
        delegations: agent.delegations
      });
    });
    
    table.printTable();
    
    console.log(`\nTotal Agents: ${agents.length}`);
    console.log(`Active Agents: ${agents.filter(a => a.status === 'active').length}`);
    console.log(`\nFor detailed information on a specific agent, use:`);
    console.log(`  aixtiv claude:status -a <agent-id> --detailed`);
  },
  ['-a dr-lucy --detailed', '-d ABC123XYZ', ''] // Examples
);

// Helper for feedback UI
const feedback = {
  success: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`✓ ${message}`);
    } else {
      console.log(`${chalk.green('✓')} ${chalk.green(message)}`);
    }
  },
  error: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.error(`✗ ${message}`);
    } else {
      console.error(`${chalk.red('✗')} ${chalk.red(message)}`);
    }
  },
  info: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`ℹ ${message}`);
    } else {
      console.log(`${chalk.blue('ℹ')} ${chalk.blue(message)}`);
    }
  },
  warning: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`⚠ ${message}`);
    } else {
      console.log(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
    }
  }
};
            ],
            default: 'javascript'
          }
        ])
        .addStep('Output Options', [
          {
            type: 'list',
            name: 'outputMode',
            message: 'How do you want to handle the output?',
            choices: [
              { name: 'Display in terminal', value: 'display' },
              { name: 'Save to new file', value: 'new' },
              { name: 'Edit existing file', value: 'edit' }
            ],
            default: 'display'
          },
          {
            type: 'input',
            name: 'outputFile',
            message: 'Enter output file path:',
            when: answers => answers.outputMode === 'new',
            validate: input => !!input || 'Output file path is required'
          },
          {
            type: 'input',
            name: 'edit',
            message: 'Enter file to edit:',
            when: answers => answers.outputMode === 'edit',
            validate: input => !!input || 'File path is required'
          }
        ])
        .addStep('Context', [
          {
            type: 'input',
            name: 'context',
            message: 'Enter comma-separated context files (optional):',
            default: ''
          }
        ]);
      
      const result = await wizard.run();
      options = { 
        ...options, 
        ...result,
        outputFile: result.outputFile || (result.outputMode === 'edit' ? result.edit : null)
      };
    }
    
    // Validate required fields
    if (!options.task) {
      feedback.error('Coding task description is required');
      return;
    }
    
    if (spinner) spinner.text = 'Analyzing coding task...';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Parse context files if provided
    let contextFiles = [];
    if (options.context) {
      contextFiles = options.context.split(',').map(file => file.trim());
      
      if (spinner) spinner.text = 'Loading context files...';
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (spinner) spinner.text = 'Generating code...';
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Generate mock code based on language
    const generatedCode = generateMockCode(options.language, options.task);
    
    // Output generation result
    if (program.opts().json) {
      console.log(JSON.stringify({
        success: true,
        language: options.language,
        task: options.task,
        code: generatedCode,
        outputFile: options.outputFile || null
      }, null, 2));
      return;
    }
    
    // If outputFile is specified, save the code
    if (options.outputFile) {
      try {
        const outputDir = path.dirname(options.outputFile);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(options.outputFile, generatedCode);
        feedback.success(`Code saved to ${options.outputFile}`);
      } catch (error) {
        feedback.error(`Failed to save code: ${error.message}`);
      }
    } else {
      // Otherwise display in terminal
      console.log(chalk.bold(`\n// Generated ${options.language.toUpperCase()} code for: ${options.task}`));
      console.log(chalk.cyan('// -----------------------------------------\n'));
      console.log(generatedCode);
    }
  },
  ['-t "Create a function to filter an array of objects by property value" -l javascript', '--wizard']
);

// Helper to generate mock code for demo
function generateMockCode(language, task) {
  const taskLower = task.toLowerCase();
  
  switch (language) {
    case 'javascript':
      if (taskLower.includes('filter')) {
        return `/**
 * Filters an array of objects by a property value
 * @param {Array} array - The array to filter
 * @param {string} property - The property to filter by
 * @param {*} value - The value to match
 * @returns {Array} Filtered array
 */
function filterByProperty(array, property, value) {
  if (!Array.isArray(array)) {
    throw new Error('First parameter must be an array');
  }
  
  return array.filter(item => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    
    return item[property] === value;
  });
}

// Example usage
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'user' }
];

const adminUsers = filterByProperty(users, 'role', 'admin');
console.log(adminUsers);`;
      } else {
        return `/**
 * Implementation for: ${task}
 */
function solution() {
  // TODO: Implement based on requirements
  console.log('Implementing solution for: ${task}');
}

// Example usage
solution();`;
      }
    
    case 'python':
      return `"""
Implementation for: ${task}
"""

def solution():
    # TODO: Implement based on requirements
    print(f"Implementing solution for: ${task}")

# Example usage
if __name__ == "__main__":
    solution()`;
      
    default:
      return `// Generated mock code for ${language}
// Implementation for: ${task}
// This is a placeholder - in a real implementation, Dr. Claude would
// generate actual code in the requested language.`;
  }
}

// Claude status command
registerCommand(
  'claude',
  'claude:status',
  'Check status of Dr. Claude agents and their workloads',
  [
    { flags: '-a, --agent <agent>', description: 'Specific agent to check' },
    { flags: '-d, --delegation <id>', description: 'Check specific delegation ID' },
    { flags: '--detailed', description: 'Show detailed information' }
  ],
  async (options, { spinner }) => {
    if (spinner) spinner.text = 'Connecting to Dr. Claude Orchestration...';
    await new Promise(resolve => setTimeout(resolve, 400
  success: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`✓ ${message}`);
    } else {
      console.log(`${chalk.green('✓')} ${chalk.green(message)}`);
    }
  },
  error: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.error(`✗ ${message}`);
    } else {
      console.error(`${chalk.red('✗')} ${chalk.red(message)}`);
    }
  },
  info: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`ℹ ${message}`);
    } else {
      console.log(`${chalk.blue('ℹ')} ${chalk.blue(message)}`);
    }
  },
  warning: (message) => {
    if (userConfig.ui.colorMode === 'none') {
      console.log(`⚠ ${message}`);
    } else {
      console.log(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
    }
  }
};

// Helper function to format time
function formatTime(ms) {
  return `${ms.toFixed(2)}ms`;
}

// Display banner based on configuration
function displayBanner() {
  if (userConfig.ui.showBanner && !program.opts().quiet && !program.opts().json) {
    if (userConfig.ui.colorMode === 'none') {
      // Plain text version for terminals without color support
      console.log('\nAixtiv Symphony ASOOS CLI\n');
    } else {
      console.log(ASOOS_BANNER);
    }
  }
}

// Display timing information
function displayTiming() {
  if (program.opts().timing || userConfig.performance.showMetrics) {
    console.log('\nPerformance Metrics:');
    console.log(`Initial CLI load time: ${formatTime(metrics.commandLoadTime)}`);
    
    // Show module load times
    if (Object.keys(metrics.moduleLoadTimes).length > 0) {
      console.log('\nModule Load Times:');
      Object.entries(metrics.moduleLoadTimes).forEach(([module, time]) => {
        console.log(`  ${module}: ${formatTime(time)}`);
      });
    }
    
    console.log(`Command execution time: ${formatTime(metrics.executionTime)}`);
    console.log(`Total time: ${formatTime(metrics.totalTime)}`);
  }
}

// ===================
// Command Registration
// ===================

// Track registered commands by domain
const registeredCommands = {
  sallyport: [],
  wing: [],
  claude: [],
  domain: [],
  system: []
};

// Lazy load a module
async function lazyLoadModule(modulePath, moduleName) {
  const startTime = performance.now();
  
  try {
    // In production, this would use dynamic import for true lazy loading
    // For simplicity in this demo, we're using require, but in a real impl would use:
    // const module = await import(modulePath);
    
    const loadedModule = require(modulePath);
    const loadTime = performance.now() - startTime;
    metrics.moduleLoadTimes[moduleName] = loadTime;
    
    return loadedModule;
  } catch (error) {
    feedback.error(`Failed to load module ${moduleName}: ${error.message}`);
    throw error;
  }
}

// Register a command with lazy loading and performance tracking
function registerCommand(domainKey, commandName, description, options, actionFn, examples = []) {
  // Only register commands from enabled domains
  if (!userConfig.domains.enabledDomains.includes(domainKey) && domainKey !== 'system') {
    return;
  }
  
  // Use domain styling for command
  const domainStyle = DOMAIN_STYLES[domainKey] || DOMAIN_STYLES.system;
  const formattedDescription = userConfig.ui.colorMode !== 'none'
    ? `${domainStyle.color(description)}`
    : description;
  
  const cmd = program
    .command(commandName)
    .description(formattedDescription);
    
  // Add options if provided
  if (options && Array.isArray(options)) {
    options.forEach(opt => {
      cmd.option(opt.flags, opt.description, opt.defaultValue);
    });
  }
  
  // Add command to domain registry for help grouping
  registeredCommands[domainKey].push({
    name: commandName,
    description,
    examples
  });
  
  // Add examples if provided
  if (examples && examples.length > 0) {
    let exampleText = '\nExamples:\n';
    examples.forEach((example, i) => {
      exampleText += `  ${commandName} ${example}\n`;
    });
    cmd.addHelpText('after', exampleText);
  }
  
  // Wrap the action function to measure performance
  cmd.action(async (...args) => {
    const commandStartTime = performance.now();
    
    try {
      // Show spinner for command execution
      const spinner = !program.opts().quiet && !program.opts().json
        ? ora(`Executing ${domainStyle.icon} ${commandName}...`).start()
        : null;
      
      // Execute the function
      await actionFn(...args, { spinner });
      
      // Stop spinner if it exists
      if (spinner) {
        spinner.succeed(`Completed ${domainStyle.icon} ${commandName}`);
      }
    } catch (error) {
      feedback.error(`Error in ${commandName}: ${error.message}`);
    } finally {
      metrics.executionTime = performance.now() - commandStartTime;
      metrics.totalTime = performance.now() - metrics.startTime;
      
      // Show timing information
      displayTiming();
    }
  });
}

// ===================
// Wizard Interface
// ===================

// Helper for creating interactive wizards
class WizardBuilder {
  constructor(title) {
    this.title = title;
    this.steps = [];
    this.currentStep = 0;
    this.data = {};
  }
  
  addStep(title, questions) {
    this.steps.push({ title, questions });
    return this;
  }
  
  async run() {
    if (this.steps.length === 0) {
      return {};
    }
    
    console.log(chalk.bold(`\n📋 ${this.title}`));
    
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      const step = this.steps[i];
      
      console.log(chalk.dim(`\nStep ${i + 1}/${this.steps.length}: ${step.title}`));
      
      const answers = await inquirer.prompt(step.questions);
      this.data = { ...this.data, ...answers };
    }
    
    return this.data;
  }
}

// ===================
// Command Registration (Core)
// ===================

// Global CLI options
program
  .version('1.1.0')
  .description('Aixtiv Symphony Orchestrating Operating System CLI')
  .option('-j, --json', 'Output as JSON')
  .option('-q, --quiet', 'Suppress all non-essential output')
  .option('-t, --timing', 'Show performance timing information')
  .option('-c, --config <path>', 'Path to custom configuration file')
  .option('--no-banner', 'Hide the banner')
  .option('--no-color', 'Disable colors');

// System commands

// Config management command
registerCommand(
  'system',
  'config',
  'Manage CLI configuration',
  [
    { flags: 'list', description: 'List current configuration' },
    { flags: 'set <key> <value>', description: 'Set configuration value' },
    { flags: 'reset', description: 'Reset to default configuration' }
  ],
  async (cmd, options) => {
    if (cmd === 'list') {
      const table = new Table({
        title: 'Aixtiv CLI Configuration',
        columns: [
          { name: 'setting', title: 'Setting' },
          { name: 'value', title: 'Value' } 
        ]
      });
      
      // Flatten config for display
      function flattenConfig(config, prefix = '') {
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            flattenConfig(value, `${prefix}${key}.`);
          } else {
            table.addRow({ setting: `${prefix}${key}`, value: String(value) });
          }
        });
      }
      
      flattenConfig(userConfig);
      table.printTable();
    } else if (cmd === 'set') {
      const { key, value } = options;
      if (!key) {
        feedback.error('Key is required');
        return;
      }
      
      // Parse value from string to appropriate type
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      
      // Update nested configuration
      const keys = key.split('.');
      let configRef = userConfig;
      
      // Navigate to the right depth
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in configRef)) {
          configRef[keys[i]] = {};
        }
        configRef = configRef[keys[i]];
      }
      
      // Set the value
      configRef[keys[keys.length - 1]] = parsedValue;
      
      // Save updated config
      saveConfig(userConfig);
      feedback.success(`Configuration updated: ${key} = ${parsedValue}`);
    } else if (cmd === 'reset') {
      // Confirm reset
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Reset all configuration to defaults?',
        default: false
      }]);
      
      if (confirm) {
        saveConfig(DEFAULT_CONFIG);
        feedback.success('Configuration reset to defaults');
      } else {
        feedback.info('Reset cancelled');
      }
    } else {
      feedback.error('Unknown config command. Use: list, set, or reset');
    }
  },
  ['list', 'set ui.colorMode full', 'set performance.showMetrics true']
);

// Help command with domain grouping
registerCommand(
  'system',
  'help',
  'Show help organized by solution domains',
  [],
  async () => {
    console.log('\n' + chalk.bold('Aixtiv Symphony CLI - Help by Solution Domain'));
    
    // Display domains and their commands
    Object.entries(DOMAIN_STYLES).forEach(([key, style]) => {
      if (registeredCommands[key] && registeredCommands[key].length > 0) {
        console.log(`\n${style.icon} ${style.color(style.name)} Commands:`);
        
        registeredCommands[key].forEach(cmd => {
          console.log(`  ${chalk.bold(cmd.name)}\t${cmd.description}`);
        });
      }
    });
    
    console.log('\nFor detailed help on a specific command, use:');
    console.log('  aixtiv <command> --help');
  }
);

// ===================
// SallyPort Security Commands
// ===================

// Auth verification command
registerCommand(
  'sallyport',
  'auth:verify',
  'Verify authentication with SallyPort Security Framework',
  [
    { flags: '-e, --email <email>', description: 'Email to verify' },
    { flags: '-a, --agent <agent>', description: 'Agent to verify' },
    { flags: '-d, --detailed', description: 'Show detailed verification results' }
  ],
  async (options, { spinner }) => {
    // Use defaults from config if not provided
    const email = options.email || userConfig.user.defaultEmail;
    const agent = options.agent || userConfig.user.defaultAgent;
    
    if (spinner) spinner.text = 'Connecting to SallyPort Security...';
    
    // This would normally use dynamic import for lazy loading
    // const authModule = await lazyLoadModule('../commands/auth/verify', 'SallyPort Auth');
    
    // Mock implementation for demo
    const authModule = {
      verify: (email, agent) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              authenticated: true,
              email: email || 'user@example.com',
              agent: agent || 'default-agent',
              sessionToken: 'mock-token-abc123',
              permissions: ['read', 'write', 'deploy'],
              lastLogin: new Date().toISOString(),
              securityLevel: 'enhanced',
              status: 'active'
            });
          }, 500);
        });
      }
    };
    
    if (spinner) spinner.text = 'Verifying credentials...';
    
    // Execute verification
    const result = await authModule.verify(email, agent);
    
    // Output based on format options
    if (program.opts().json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (program.opts().quiet) {
      console.log(`Authentication: ${result.authenticated ? 'Success' : 'Failed'}`);
    } else {
      const table = new Table({
        title: 'Authentication Results',
        columns: [
          { name: 'attribute', title: 'Attribute' },
          { name: 'value', title: 'Value' }
        ]
      });
      
      table.addRows([
        { attribute: 'Status', value: result.authenticated ? chalk.green('Authenticated') : chalk.red('Failed') },
        { attribute: 'Email', value: result.email },
        { attribute: 'Agent', value: result.agent },
        { attribute: 'Security Level', value: result.securityLevel },
        { attribute: 'Status', value: result.status }
      ]);
      
      if (options.detailed) {
        table.addRows([
          { attribute: 'Session Token', value: result.sessionToken },
          { attribute: 'Permissions', value: result.permissions.join(', ') },
          { attribute: 'Last Login', value: result.lastLogin }
        ]);
      }
      
      table.printTable();
    }
  },
  ['-e john@example.com -a agent001', '--detailed']
);

// Agent grant command
registerCommand(
  'sallyport',
  'agent:grant',
  'Grant agent access to a resource using SallyPort',
  [
    { flags: '-e, --email <email>', description: 'Principal email' },
    { flags: '-a, --agent <agent>', description: 'Agent ID' },
    { flags: '-r, --resource <resource>', description: 'Resource ID' },
    { flags: '-t, --type <type>', description: 'Access type (full, readonly, delegated)', defaultValue: 'readonly' },
    { flags: '--wizard', description: 'Use interactive wizard interface' }
  ],
  async (options) => {
    // If wizard mode, use interactive interface
    if (options.wizard) {
      const wizard = new WizardBuilder('Grant Agent Access')
        .addStep('Principal Information', [
          {
            type: 'input',
            name: 'email',
            message: 'Enter principal email:',
            default: userConfig.user.defaultEmail || ''
          }
        ])
        .addStep('Agent Selection', [
          {
            type: 'input',
            name: 'agent',
            message: 'Enter agent ID:',
            default: userConfig.user.defaultAgent || ''
          }
        ])
        .addStep('Resource and Permissions', [
          {
            type: 'input',
            name: 'resource',
            message: 'Enter resource ID:',
            validate: input => !!input || 'Resource ID is required'
          },
          {
            type: 'list',
            name: 'type',
            message: 'Select access type:',
            choices: ['readonly', 'delegated', 'full'],
            default: 'readonly'
          }
        ]);
      
      const result = await wizard.run();
      options = { ...options, ...result };
    }
    
    // Validate required fields
    if (!options.email) {
      feedback.error('Principal email is required');
      return;
    }
    
    if (!options.agent) {
      feedback.error('Agent ID is required');
      return;
    }
    
    if (!options.resource) {
      feedback.error('Resource ID is required');
      return;
    }
    
    // Simulate granting access
    await new Promise(resolve => setTimeout(resolve, 600));
    
    feedback.success(`Access granted for ${options.agent} to resource ${options.resource}`);
    console.log(`Details:
  - Principal: ${options.email}
  - Agent: ${options.agent}
  - Resource: ${options.resource}
  - Access Type: ${options.type}
  - Timestamp: ${new Date().toISOString()}`);
  },
  ['-e admin@example.com -a agent002 -r resource-123 -t full', '--wizard']
);

// ===================
// Wing Agent Orchestration Commands
// ===================

// Wing command for agent deployment
registerCommand(
  'wing',
  'deploy',
  'Deploy agents via Wing Orchestration',
  [
    { flags: '-a, --agent <agent>', description: 'Agent ID to deploy' },
    { flags: '-e, --environment <env>', description: 'Deployment environment (dev, prod)', defaultValue: 'dev' },
    { flags: '-c, --config <config>', description: 'Agent configuration file' },
    { flags: '--fast', description: 'Use fast deployment (minimal validation)' }
  ],
  async (options, { spinner }) => {
    const agent = options.agent;
    
    if (!agent) {
      feedback.error('Agent ID is required');
      return;
    }
    
    if (spinner) spinner.text = `Deploying ${agent} to ${options.environment}...`;
    
    // Simulate deployment stages
    const stages = ['Preparing', 'Validating', 'Deploying', 'Testing', 'Activating'];
    const stageTime = options.fast ? 200 : 500;
    
    for (const stage of stages) {
      if (spinner) spinner.text = `${stage} ${agent}...`;
      await new Promise(resolve => setTimeout(resolve, stageTime));
    }
    
    if (spinner) spinner.succeed(`Agent ${agent} deployed successfully to ${options.environment}`);
    
    // Show deployment details
    console.log(`\nDeployment Details:
  - Agent: ${agent}
  - Environment: ${options.environment}
  - Deployment ID: ${Math.random().toString(36).substring(2, 10)}
  - Timestamp: ${new Date().toISOString()}
  - Status: ${chalk.green('Active')}`);
  },
  ['-a pilot-001 -e prod', '-a wing-commander -e dev --fast']
);

// Wing agent list command
registerCommand(
  'wing',
  'list',
  'List Wing agents and their status',
  [
    { flags: '-s, --status <status>', description: 'Filter by status (active, pending, offline)' },
    { flags: '-t, --type <type>', description: 'Filter by agent type (pilot, rx, commander)' },
    { flags: '-d, --detailed', description: 'Show detailed information' }
  ],
  async (options) => {
    // Simulate fetching agents
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock agents data
    const agents = [
      { id: 'pilot-001', type: 'pilot', status: 'active', lastActive: '2025-04-26T02:10:15Z', resources: ['resource-001', 'resource-002'] },
      { id: 'pilot-002', type: 'pilot', status: 'offline', lastActive: '2025-04-25T22:45:30Z', resources: ['resource-003'] },
      { id: 'rx-alpha', type: 'rx', status: 'active', lastActive: '2025-04-26T08:15:42Z', resources: ['resource-004', 'resource-005', 'resource-006'] },
      { id: 'commander-prime', type: 'commander', status: 'active', lastActive: '2025-04-26T08:20:11Z', resources: ['all'] },
      { id: 'pilot-003', type: 'pilot', status: 'pending', lastActive: '2025-04-26T07:30:00Z', resources: [] }
    ];
    
    // Apply filters if provided
    let filteredAgents = [...agents];
    
    if (options.status) {
      filteredAgents = filteredAgents.filter(a => a.status === options.status);
    }
    
    if (options.type) {
      filteredAgents = filteredAgents.filter(a => a.type === options.type);
    }
    
    // Output results based on format
    if (program.opts().json) {
      console.log(JSON.stringify(filteredAgents, null, 2));
      return;
    }
    
    // Table output
    const table = new Table({
      title: 'Wing Agents',
      columns: [
        { name: 'id', title: 'Agent ID' },
        { name: 'type', title: 'Type' },
        { name: 'status', title: 'Status' },
        { name: 'lastActive', title: 'Last Active' }
      ]
    });
    
    if (options.detailed) {
      table.columns.push({ name: 'resources', title: 'Resources' });
    }
    
    filteredAgents.forEach(agent => {
      const row = {
        id: agent.id,
        type: agent.type.charAt(0).toUpperCase() + agent.type.slice(1),
        status: colorizeStatus(agent.status),
        lastActive: new Date(agent.lastActive).toLocaleString()
      };
      
      if (options.detailed) {
        row.resources = agent.resources.join(', ');
      }
      
      table.addRow(row);
    });
    
    table.printTable();
    console.log(`Total Agents: ${filteredAgents.length}`);
  },
  ['-s active', '-t pilot -d']
);

// Helper for wing agent status coloring
function colorizeStatus(status) {
  switch (status) {
    case 'active':
      return chalk.green('Active');
    case 'offline':
      return chalk.red('Offline');
    case 'pending':
      return chalk.yellow('Pending');
    default:
      return status;
  }
}

// ===================
//

