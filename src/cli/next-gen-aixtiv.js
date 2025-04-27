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

// Helper to format domain name with styling
function formatDomain(domainKey, text) {
  const domain = DOMAIN_STYLES[domainKey] || DOMAIN_STYLES.system;
  const showIcons = userConfig.ui.showDomainIcons;
  
  if (userConfig.ui.colorMode === 'none') {
    return showIcons ? `${domain.icon} ${text}` : text;
  }
  
  return showIcons 
    ? `${domain.icon} ${domain.color(text)}`
    : domain.color(text);
}

// Helper for success/error feedback
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

