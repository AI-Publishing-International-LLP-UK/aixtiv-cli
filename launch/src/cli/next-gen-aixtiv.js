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
  totalTime: 0,
};

// ===================
// Config Management
// ===================

const CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.aixtiv',
  'config.json'
);

// Default configuration
const DEFAULT_CONFIG = {
  ui: {
    colorMode: 'full', // 'full', 'minimal', 'none'
    showBanner: true, // Show ASCII banner
    showDomainIcons: true, // Show icons for different domains
    compactMode: false, // Compact output mode
  },
  performance: {
    lazyLoading: true, // Use lazy loading for commands
    showMetrics: false, // Show performance metrics by default
    cacheTTL: 3600, // Cache TTL in seconds
  },
  domains: {
    enabledDomains: ['sallyport', 'wing', 'claude', 'domain'], // Enabled solution domains
  },
  user: {
    defaultAgent: '', // Default agent for operations
    defaultEmail: '', // Default email for auth
    defaultFormat: 'table', // Default output format ('table', 'json', 'compact')
  },
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
${gradient.rainbow("   / _ \\   | | \\ \\/ / | __| | | \\ \\ / /    \\___ \\ | | | || '_ ` _ \\| '_ \\| '_ \\  / _ \\ | '_ \\ | | | |")}
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
    name: 'SallyPort',
  },
  wing: {
    icon: '✈️',
    color: chalk.hex('#00FF88'),
    name: 'Wing',
  },
  claude: {
    icon: '🧠',
    color: chalk.hex('#FF6600'),
    name: 'Dr. Claude',
  },
  domain: {
    icon: '🌐',
    color: chalk.hex('#9900CC'),
    name: 'Domain',
  },
  system: {
    icon: '⚙️',
    color: chalk.gray,
    name: 'System',
  },
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
  },
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
  system: [],
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
  const formattedDescription =
    userConfig.ui.colorMode !== 'none' ? `${domainStyle.color(description)}` : description;

  const cmd = program.command(commandName).description(formattedDescription);

  // Add options if provided
  if (options && Array.isArray(options)) {
    options.forEach((opt) => {
      cmd.option(opt.flags, opt.description, opt.defaultValue);
    });
  }

  // Add command to domain registry for help grouping
  registeredCommands[domainKey].push({
    name: commandName,
    description,
    examples,
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
      const spinner =
        !program.opts().quiet && !program.opts().json
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
    { flags: 'reset', description: 'Reset to default configuration' },
  ],
  async (cmd, options) => {
    if (cmd === 'list') {
      const table = new Table({
        title: 'Aixtiv CLI Configuration',
        columns: [
          { name: 'setting', title: 'Setting' },
          { name: 'value', title: 'Value' },
        ],
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
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Reset all configuration to defaults?',
          default: false,
        },
      ]);

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
registerCommand('system', 'help', 'Show help organized by solution domains', [], async () => {
  console.log('\n' + chalk.bold('Aixtiv Symphony CLI - Help by Solution Domain'));

  // Display domains and their commands
  Object.entries(DOMAIN_STYLES).forEach(([key, style]) => {
    if (registeredCommands[key] && registeredCommands[key].length > 0) {
      console.log(`\n${style.icon} ${style.color(style.name)} Commands:`);

      registeredCommands[key].forEach((cmd) => {
        console.log(`  ${chalk.bold(cmd.name)}\t${cmd.description}`);
      });
    }
  });

  console.log('\nFor detailed help on a specific command, use:');
  console.log('  aixtiv <command> --help');
});

// ===================
// Domain List Command
// ===================

// Domain list command
registerCommand(
  'domain',
  'domain:list',
  'List domains in the Aixtiv Symphony ecosystem',
  [
    { flags: '-r, --refresh', description: 'Force refresh domains from server' },
    { flags: '-t, --type <type>', description: 'Filter domains by type' },
    { flags: '-s, --status <status>', description: 'Filter domains by status' },
    { flags: '--cache-ttl <seconds>', description: 'Cache time-to-live in seconds' },
  ],
  async (options, { spinner }) => {
    if (spinner) spinner.text = 'Connecting to Dr. Claude Orchestration...';
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Mock domain data for demo
    const domains = [
      {
        name: 'coaching2100.com',
        type: 'brand',
        status: 'active',
        expiryDate: '2026-04-20',
        firebaseProject: 'coaching2100-com',
      },
      {
        name: 'drlucy.live',
        type: 'character',
        status: 'active',
        expiryDate: '2026-02-15',
        firebaseProject: 'dr-lucy-live',
      },
      {
        name: 'drmatch.live',
        type: 'character',
        status: 'active',
        expiryDate: '2026-02-15',
        firebaseProject: 'dr-match-live',
      },
      {
        name: 'drclaude.live',
        type: 'character',
        status: 'active',
        expiryDate: '2026-03-10',
        firebaseProject: 'dr-claude-live',
      },
      {
        name: 'anthology-ai.com',
        type: 'brand',
        status: 'active',
        expiryDate: '2026-05-18',
        firebaseProject: 'anthology-ai-com',
      },
      {
        name: 'aixtiv.com',
        type: 'brand',
        status: 'active',
        expiryDate: '2026-04-30',
        firebaseProject: 'aixtiv-com',
      },
      {
        name: 'test-domain.org',
        type: 'brand',
        status: 'pending',
        expiryDate: '2026-01-01',
        firebaseProject: 'test-domain-org',
      },
    ];

    // Apply filters
    let filteredDomains = [...domains];

    if (options.type) {
      filteredDomains = filteredDomains.filter((d) => d.type === options.type);
    }

    if (options.status) {
      filteredDomains = filteredDomains.filter((d) => d.status === options.status);
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
          { name: 'expiryDate', title: 'Expiry Date' },
        ],
      });

      if (!options.compact) {
        table.columns.push({ name: 'firebaseProject', title: 'Firebase Project' });
      }

      filteredDomains.forEach((domain) => {
        const row = {
          name: domain.name,
          type: domain.type,
          status: colorizeStatus(domain.status),
          expiryDate: domain.expiryDate,
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

// Export the configuration for use in other modules
module.exports = {
  program,
  feedback,
  DOMAIN_STYLES,
};

// Execute main function
main();
