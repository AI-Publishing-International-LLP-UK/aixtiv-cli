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
const gradient = require('gradient-string');

// ==========================================
// Performance Tracking & Utility Functions
// ==========================================

const utils = {
  metrics: {
    startTime: performance.now(),
    commandLoadTime: 0,
    moduleLoadTimes: {},
    executionTime: 0,
    totalTime: 0
  },
  
  // Helper function to format time
  formatTime: (ms) => `${ms.toFixed(2)}ms`,
  
  // Display timing information
  displayTiming: () => {
    if (program.opts().timing || utils.config.get('performance.showMetrics')) {
      console.log('\nPerformance Metrics:');
      console.log(`Initial CLI load time: ${utils.formatTime(utils.metrics.commandLoadTime)}`);
      
      // Show module load times
      if (Object.keys(utils.metrics.moduleLoadTimes).length > 0) {
        console.log('\nModule Load Times:');
        Object.entries(utils.metrics.moduleLoadTimes).forEach(([module, time]) => {
          console.log(`  ${module}: ${utils.formatTime(time)}`);
        });
      }
      
      console.log(`Command execution time: ${utils.formatTime(utils.metrics.executionTime)}`);
      console.log(`Total time: ${utils.formatTime(utils.metrics.totalTime)}`);
    }
  },
  
  // Lazy load a module with performance tracking
  lazyLoadModule: async (modulePath, moduleName) => {
    const startTime = performance.now();
    
    try {
      // In a real implementation, this would use dynamic import for true lazy loading
      // For demonstration in this prototype, we're using require for simplicity
      const resolvedPath = path.resolve(__dirname, modulePath);
      const loadedModule = require(resolvedPath);
      
      const loadTime = performance.now() - startTime;
      utils.metrics.moduleLoadTimes[moduleName] = loadTime;
      
      return loadedModule;
    } catch (error) {
      utils.ui.feedback.error(`Failed to load module ${moduleName}: ${error.message}`);
      throw error;
    }
  }
};

// ==========================================
// Configuration Management
// ==========================================

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

utils.config = {
  // Load user configuration
  load: () => {
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
  },
  
  // Save user configuration
  save: (config) => {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(chalk.red('Error saving config:'), error.message);
    }
  },
  
  // Get configuration value by key path (e.g., 'ui.colorMode')
  get: (keyPath, defaultValue) => {
    const keys = keyPath.split('.');
    let value = utils.config.data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  },
  
  // Set configuration value by key path
  set: (keyPath, value) => {
    const keys = keyPath.split('.');
    let configSection = utils.config.data;
    
    // Navigate to the right depth
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in configSection)) {
        configSection[keys[i]] = {};
      }
      configSection = configSection[keys[i]];
    }
    
    // Set the value
    configSection[keys[keys.length - 1]] = value;
    
    // Save updated config
    utils.config.save(utils.config.data);
  },
  
  // Reset to default configuration
  reset: () => {
    utils.config.data = { ...DEFAULT_CONFIG };
    utils.config.save(utils.config.data);
  },
  
  // Store the actual configuration data
  data: null
};

// Initialize configuration
utils.config.data = utils.config.load();

// ==========================================
// UI Elements
// ==========================================

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

// Track registered commands by domain
const registeredCommands = {
  sallyport: [],
  wing: [],
  claude: [],
  domain: [],
  system: []
};

// UI Utilities
utils.ui = {
  // Helper for feedback messages
  feedback: {
    success: (message) => {
      if (utils.config.get('ui.colorMode') === 'none') {
        console.log(`✓ ${message}`);
      } else {
        console.log(`${chalk.green('✓')} ${chalk.green(message)}`);
      }
    },
    error: (message) => {
      if (utils.config.get('ui.colorMode') === 'none') {
        console.error(`✗ ${message}`);
      } else {
        console.error(`${chalk.red('✗')} ${chalk.red(message)}`);
      }
    },
    info: (message) => {
      if (utils.config.get('ui.colorMode') === 'none') {
        console.log(`ℹ ${message}`);
      } else {
        console.log(`${chalk.blue('ℹ')} ${chalk.blue(message)}`);
      }
    },
    warning: (message) => {
      if (utils.config.get('ui.colorMode') === 'none') {
        console.log(`⚠ ${message}`);
      } else {
        console.log(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
      }
    }
  },
  
  // Format domain name with styling
  formatDomain: (domainKey, text) => {
    const domain = DOMAIN_STYLES[domainKey] || DOMAIN_STYLES.system;
    const showIcons = utils.config.get('ui.showDomainIcons');
    
    if (utils.config.get('ui.colorMode') === 'none') {
      return showIcons ? `${domain.icon} ${text}` : text;
    }
    
    return showIcons 
      ? `${domain.icon} ${domain.color(text)}`
      : domain.color(text);
  },
  
  // Display banner based on configuration
  displayBanner: () => {
    if (utils.config.get('ui.showBanner') && !program.opts().quiet && !program.opts().json) {
      if (utils.config.get('ui.colorMode') === 'none') {
        // Plain text version for terminals without color support
        console.log('\nAixtiv Symphony ASOOS CLI\n');
      } else {
        console.log(ASOOS_BANNER);
      }
    }
  },
  
  // Helper for status coloring
  colorizeStatus: (status) => {
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
  },
  
  // Helper for priority coloring
  colorizeByPriority: (priority) => {
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
};

// ==========================================
// Command Registration & Management
// ==========================================

// Register a command with lazy loading and performance tracking
function registerCommand(domainKey, commandName, description, options, actionFn, examples = []) {
  // Only register commands from enabled domains
  if (!utils.config.get('domains.enabledDomains', []).includes(domainKey) && domainKey !== 'system') {
    return;
  }
  
  // Use domain styling for command
  const domainStyle = DOMAIN_STYLES[domainKey] || DOMAIN_STYLES.system;
  const formattedDescription = utils.config.get('ui.colorMode') !== 'none'
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
    examples.forEach((example) => {
      exampleText += `  ${commandName} ${example}\n`;
    });
    cmd.addHelpText('after', exampleText);
  }
  
  // Wrap the action function to measure performance
  cmd.action(async (...args) => {
    const commandStartTime = performance.now();
    
    try {
      // Execute the function
      await actionFn(...args);
    } catch (error) {
      utils.ui.feedback.error(`Error in ${commandName}: ${error.message}`);
    } finally {
      utils.metrics.executionTime = performance.now() - commandStartTime;
      utils.metrics.totalTime = performance.now() - utils.metrics.startTime;
      
      // Show timing information
      utils.displayTiming();
    }
  });
}

// ==========================================
// Command Domain Loading
// ==========================================

// Load commands for a specific domain
async function loadDomainCommands(domain) {
  try {
    // Load the domain's commands
    const domainModule = await utils.lazyLoadModule(`./commands/${domain}`, `${domain} Commands`);
    
    // Register the commands from this domain
    domainModule.registerCommands(registerCommand);
    
    return true;
  } catch (error) {
    utils.ui.feedback.warning(`Failed to load ${domain} commands: ${error.message}`);
    return false;
  }
}

// Load all enabled domains
async function loadAllDomains() {
  const enabledDomains = utils.config.get('domains.enabledDomains', []);
  
  // Always load system domain commands first
  await loadDomainCommands('system');
  
  // Load commands from each enabled domain
  for (const domain of enabledDomains) {
    await loadDomainCommands(domain);
  }
}

// ==========================================
// Global CLI Setup
// ==========================================

// Configure global CLI options
program
  .version('1.1.0')
  .description('Aixtiv Symphony Orchestrating Operating System CLI')
  .option('-j, --json', 'Output as JSON')
  .option('-q, --quiet', 'Suppress all non-essential output')
  .option('-t, --timing', 'Show performance timing information')
  .option('-c, --config <path>', 'Path to custom configuration file')
  .option('--no-banner', 'Hide the banner')
  .option('--no-color', 'Disable colors');

// ==========================================
// Main Execution Function
// ==========================================

// Main CLI execution
async function main() {
  try {
    // Display banner conditionally
    utils.ui.displayBanner();
    
    // Load all domain commands
    await loadAllDomains();
    
    // Record time after CLI is initialized but before command execution
    utils.metrics.commandLoadTime = performance.now() - utils.metrics.startTime;
    
    // Parse arguments and execute command
    await program.parseAsync(process.argv);
    
    // If no command specified, show help
    if (process.argv.length <= 2) {
      program.help();
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    
    // Show stack trace if timing metrics are enabled
    if (program.opts().timing || utils.config.get('performance.showMetrics')) {
      console.error(chalk.dim('Stack trace:'), error.stack);
    }
    
    process.exit(1);
  }
}

// ==========================================
// Export utilities for use in command modules
// ==========================================

// Export utils for use in command modules
module.exports = {
  utils,
  registerCommand,
  DOMAIN_STYLES
};

// ==========================================
// Execute the CLI
// ==========================================

// Don't run main() when the module is required, only when run directly
if (require.main === module) {
  main();
}

