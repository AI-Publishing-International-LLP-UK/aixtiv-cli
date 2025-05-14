/**
 * System Commands Module
 *
 * Core system-level commands for the Aixtiv CLI including:
 * - Configuration management
 * - Help system
 * - Version information
 */

const os = require('os');
const path = require('path');
const chalk = require('chalk');
const { Table } = require('console-table-printer');
const { utils, DOMAIN_STYLES } = require('../../aixtiv');

/**
 * Config command implementation
 */
function configCommand(cmd, options) {
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

    flattenConfig(utils.config.data);
    table.printTable();
  } else if (cmd === 'set') {
    const { key, value } = options;
    if (!key) {
      utils.ui.feedback.error('Key is required');
      return;
    }

    // Parse value from string to appropriate type
    let parsedValue = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    // Set the value in config
    utils.config.set(key, parsedValue);
    utils.ui.feedback.success(`Configuration updated: ${key} = ${parsedValue}`);
  } else if (cmd === 'reset') {
    const inquirer = require('inquirer');

    // Ask for confirmation
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Reset all configuration to defaults?',
          default: false,
        },
      ])
      .then((answers) => {
        if (answers.confirm) {
          utils.config.reset();
          utils.ui.feedback.success('Configuration reset to defaults');
        } else {
          utils.ui.feedback.info('Reset cancelled');
        }
      });
  } else {
    utils.ui.feedback.error('Unknown config command. Use: list, set, or reset');
  }
}

/**
 * Help command implementation
 */
function helpCommand() {
  const program = require('commander').program;

  console.log('\n' + chalk.bold('Aixtiv Symphony CLI - Help by Solution Domain'));

  // Get all registered commands from the program
  const commands = program.commands;

  // Group commands by domain
  const domainCommands = {};

  // Initialize domains
  Object.keys(DOMAIN_STYLES).forEach((domain) => {
    domainCommands[domain] = [];
  });

  // Categorize commands
  commands.forEach((cmd) => {
    let domain = 'system'; // Default domain

    // Try to determine command domain from name
    if (cmd.name().startsWith('sallyport:') || cmd.name().startsWith('auth:')) {
      domain = 'sallyport';
    } else if (cmd.name().startsWith('wing:') || cmd.name().startsWith('agent:')) {
      domain = 'wing';
    } else if (cmd.name().startsWith('claude:')) {
      domain = 'claude';
    } else if (cmd.name().startsWith('domain:')) {
      domain = 'domain';
    }

    // Add command to its domain group
    domainCommands[domain].push(cmd);
  });

  // Display commands by domain
  Object.entries(DOMAIN_STYLES).forEach(([domain, style]) => {
    if (domainCommands[domain] && domainCommands[domain].length > 0) {
      console.log(`\n${style.icon} ${style.color(style.name)} Commands:`);

      domainCommands[domain].forEach((cmd) => {
        console.log(`  ${chalk.bold(cmd.name())}\t${cmd.description()}`);
      });
    }
  });

  console.log('\nFor detailed help on a specific command, use:');
  console.log('  aixtiv <command> --help');
}

/**
 * Version command implementation
 */
function versionCommand() {
  const { version } = require('../../../package.json');

  console.log(chalk.bold(`\nAixtiv Symphony CLI v${version}`));
  console.log(chalk.dim('ASOOS Orchestration System'));

  const table = new Table({
    title: 'System Information',
    columns: [
      { name: 'property', title: 'Property' },
      { name: 'value', title: 'Value' },
    ],
  });

  // Add system information
  table.addRows([
    { property: 'CLI Version', value: version },
    { property: 'Node.js Version', value: process.version },
    { property: 'OS', value: `${os.type()} ${os.release()}` },
    { property: 'Platform', value: os.platform() },
    { property: 'Architecture', value: os.arch() },
    { property: 'CPU Cores', value: os.cpus().length },
    { property: 'Total Memory', value: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB` },
  ]);

  table.printTable();

  console.log('\nASOOS Components:');
  console.log(
    `${DOMAIN_STYLES.sallyport.icon} ${DOMAIN_STYLES.sallyport.color('SallyPort Security')}: v1.0.2`
  );
  console.log(
    `${DOMAIN_STYLES.wing.icon} ${DOMAIN_STYLES.wing.color('Wing Orchestration')}: v1.1.0`
  );
  console.log(
    `${DOMAIN_STYLES.claude.icon} ${DOMAIN_STYLES.claude.color('Dr. Claude Commands')}: v1.0.5`
  );
  console.log(
    `${DOMAIN_STYLES.domain.icon} ${DOMAIN_STYLES.domain.color('Domain Management')}: v1.2.1`
  );

  console.log('\nCopyright © 2025 AI Publishing International LLP');
}

/**
 * Register all system commands
 */
function registerCommands(register) {
  // Config command
  register(
    'system',
    'config',
    'Manage CLI configuration',
    [
      { flags: 'list', description: 'List current configuration' },
      { flags: 'set <key> <value>', description: 'Set configuration value' },
      { flags: 'reset', description: 'Reset to default configuration' },
    ],
    configCommand,
    ['list', 'set ui.colorMode full', 'set performance.showMetrics true', 'reset']
  );

  // Help command
  register('system', 'help', 'Show help organized by solution domains', [], helpCommand, []);

  // Version command
  register(
    'system',
    'version',
    'Show detailed version and system information',
    [],
    versionCommand,
    []
  );
}

module.exports = {
  registerCommands,
};
