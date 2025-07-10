#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

// Initialize telemetry
const telemetry = require('../lib/telemetry');

// Initialize telemetry asynchronously
(async () => {
  try {
    await telemetry.init();
    // Set up graceful shutdown
    process.on('exit', () => {
      telemetry.shutdown();
    });
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
  }
})();

const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');
require('dotenv').config();

// Display banner
console.log(chalk.cyan(figlet.textSync('Aixtiv CLI', { horizontalLayout: 'full' })));
console.log(chalk.blue(`v${packageJson.version} - Unified Agent System`));
console.log();

// Import unified command modules
const unifiedAgent = require('../commands/unified/agent');
const unifiedResource = require('../commands/unified/resource');

// Import legacy command modules
const initProject = require('../commands/init');
const authVerify = require('../commands/auth/verify');
const claudeCommands = require('../commands/claude');

// Legacy agent commands for backward compatibility
const legacyAgentGrant = require('../commands/agent/grant');
const legacyAgentRevoke = require('../commands/agent/revoke');
const legacyAgentActivate = require('../commands/agent/activate');

// Legacy co-pilot commands for backward compatibility
const legacyCopilotLink = require('../commands/copilot/link');
const legacyCopilotUnlink = require('../commands/copilot/unlink');
const legacyCopilotList = require('../commands/copilot/list');
const legacyCopilotVerify = require('../commands/copilot/verify');
const legacyCopilotGrant = require('../commands/copilot/grant');
const legacyCopilotExpiration = require('../commands/copilot/expiration');

// Domains, Dream Commander, and other modules
const registerDomainCommands = require('../commands/domain');
const dreamCommanderCommand = require('../commands/dreamCommander');
const summonVisionary = require('../commands/summon/visionary');

// Project commands
program
  .command('init')
  .description('Initialize a new aixtiv project with basic structure')
  .option('-n, --name <name>', 'Project name', 'aixtiv-project')
  .option('-f, --force', 'Force overwrite if project directory exists')
  .action(initProject);

// Auth commands
program
  .command('auth:verify')
  .description('Verify authentication with SallyPort')
  .option('-e, --email <email>', 'Email to verify')
  .option('-a, --agent <agent>', 'Agent to verify')
  .action(authVerify);

// Unified Agent Commands
// -----------------------------

// Agent registration
program
  .command('agent:register')
  .description('Register a new agent in the unified system')
  .requiredOption('--name <name>', 'Display name of the agent')
  .requiredOption('--squadron <squadron>', 'Squadron designation (S01-S06)')
  .requiredOption('--number <number>', 'Agent number within squadron')
  .option('--type <type>', 'Agent type (BASE, RIX, QRIX, COPILOT)', 'BASE')
  .option('--description <description>', 'Brief description of the agent')
  .option('--roles <roles>', 'Comma-separated list of roles')
  .option('--actions <actions>', 'Comma-separated list of actions')
  .option('--lifecycles <lifecycles>', 'Comma-separated list of lifecycle stages')
  .option('--sectors <sectors>', 'Comma-separated list of business sectors')
  .option('--collaborator <email>', 'Email of associated human collaborator')
  .action(unifiedAgent.register);

// Get agent information
program
  .command('agent:get')
  .description('Get information about an agent')
  .requiredOption('--id <id>', 'Agent ID (e.g., S01-01)')
  .action(unifiedAgent.get);

// List agents
program
  .command('agent:list')
  .description('List agents with optional filters')
  .option('--squadron <squadron>', 'Filter by squadron (S01-S06)')
  .option('--type <type>', 'Filter by agent type (BASE, RIX, QRIX, COPILOT)')
  .option('--collaborator <email>', 'Filter by human collaborator')
  .option('--active <boolean>', 'Filter by active status', 'true')
  .option('--capabilities <list>', 'Filter by comma-separated capabilities')
  .action(unifiedAgent.list);

// Update agent
program
  .command('agent:update')
  .description('Update an existing agent')
  .requiredOption('--id <id>', 'Agent ID (e.g., S01-01)')
  .option('--name <name>', 'New display name')
  .option('--description <description>', 'New description')
  .option('--type <type>', 'New agent type (BASE, RIX, QRIX, COPILOT)')
  .option('--roles <roles>', 'Comma-separated list of roles')
  .option('--actions <actions>', 'Comma-separated list of actions')
  .option('--lifecycles <lifecycles>', 'Comma-separated list of lifecycle stages')
  .option('--sectors <sectors>', 'Comma-separated list of business sectors')
  .option('--collaborator <email>', 'Email of associated human collaborator')
  .option('--active <boolean>', 'Set active status')
  .action(unifiedAgent.update);

// Extend agent
program
  .command('agent:extend')
  .description('Extend an agent with new capabilities or upgrade type')
  .requiredOption('--id <id>', 'Agent ID (e.g., S01-01)')
  .option('--newType <type>', 'New agent type (RIX, QRIX, COPILOT)')
  .option('--capabilities <list>', 'Comma-separated list of new capabilities')
  .option('--specialties <list>', 'Comma-separated list of new specialties')
  .option('--components <list>', 'Comma-separated list of components (for QRIX)')
  .option('--coreNodes <list>', 'Comma-separated list of core nodes (for QRIX)')
  .option('--level <level>', 'Trust level (for COPILOT: standard, enhanced, executive)')
  .action(unifiedAgent.extend);

// Migrate agents
program
  .command('agent:migrate')
  .description('Migrate existing agents, co-pilots, and QRIX to the unified schema')
  .action(unifiedAgent.migrate);

// Unified Resource Commands
// -----------------------------

// Grant resource access
program
  .command('resource:grant')
  .description('Grant an agent access to a resource')
  .requiredOption('--principal <email>', 'Principal email')
  .requiredOption('--agent <id>', 'Agent ID')
  .requiredOption('--resource <id>', 'Resource ID')
  .option('--type <type>', 'Access type (readonly, delegated, full)', 'readonly')
  .action(unifiedResource.grant);

// Revoke resource access
program
  .command('resource:revoke')
  .description("Revoke an agent's access to a resource")
  .requiredOption('--principal <email>', 'Principal email')
  .requiredOption('--agent <id>', 'Agent ID')
  .requiredOption('--resource <id>', 'Resource ID')
  .action(unifiedResource.revoke);

// Scan resources
program
  .command('resource:scan')
  .description('Scan resources for access patterns')
  .option('--resource <id>', 'Resource ID to scan')
  .option('--agent <id>', 'Filter by agent ID')
  .option('--principal <email>', 'Filter by principal email')
  .action(unifiedResource.scan);

// Legacy Commands for Backward Compatibility
// ------------------------------------------

// Legacy agent commands
program
  .command('agent:grant')
  .description('[Legacy] Grant agent access to a resource (use resource:grant instead)')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-a, --agent <agent>', 'Agent ID')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .option('-t, --type <type>', 'Access type (full, readonly, delegated)', 'full')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: agent:grant is deprecated. Please use resource:grant instead.')
    );
    legacyAgentGrant(options);
  });

program
  .command('agent:revoke')
  .description('[Legacy] Revoke agent access to a resource (use resource:revoke instead)')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-a, --agent <agent>', 'Agent ID')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: agent:revoke is deprecated. Please use resource:revoke instead.')
    );
    legacyAgentRevoke(options);
  });

program
  .command('agent:activate')
  .description('[Legacy] Activate agents (use agent:update instead)')
  .option('-a, --agent <agent>', 'Specific agent to activate (omit to activate all)')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: agent:activate is deprecated. Please use agent:update instead.')
    );
    legacyAgentActivate(options);
  });

// Legacy co-pilot commands
program
  .command('copilot:link')
  .description(
    '[Legacy] Link a co-pilot to a principal (use agent:register with type COPILOT instead)'
  )
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .option('-l, --level <level>', 'Trust level (standard, enhanced, executive)', 'standard')
  .action((options) => {
    console.log(
      chalk.yellow(
        'Warning: copilot:link is deprecated. Please use agent:register with type COPILOT instead.'
      )
    );
    legacyCopilotLink(options);
  });

program
  .command('copilot:unlink')
  .description('[Legacy] Unlink a co-pilot from a principal (use agent:update instead)')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: copilot:unlink is deprecated. Please use agent:update instead.')
    );
    legacyCopilotUnlink(options);
  });

program
  .command('copilot:list')
  .description(
    '[Legacy] List co-pilots linked to a principal (use agent:list with type COPILOT instead)'
  )
  .option('-e, --email <email>', 'Principal email (if omitted, lists all relationships)')
  .option('-s, --status <status>', 'Filter by status (active, pending, all)', 'active')
  .action((options) => {
    console.log(
      chalk.yellow(
        'Warning: copilot:list is deprecated. Please use agent:list with type COPILOT instead.'
      )
    );
    legacyCopilotList(options);
  });

program
  .command('copilot:verify')
  .description('[Legacy] Verify co-pilot identity (use agent:update instead)')
  .requiredOption('-e, --email <email>', 'Co-pilot email')
  .requiredOption('-p, --principal <principal>', 'Principal email')
  .option('-c, --code <code>', 'Cultural Empathy Code')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: copilot:verify is deprecated. Please use agent:update instead.')
    );
    legacyCopilotVerify(options);
  });

program
  .command('copilot:grant')
  .description('[Legacy] Grant co-pilot access to a resource (use resource:grant instead)')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .option('-t, --type <type>', 'Access type (readonly, delegated, full)', 'readonly')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: copilot:grant is deprecated. Please use resource:grant instead.')
    );
    legacyCopilotGrant(options);
  });

program
  .command('copilot:expiration')
  .description(
    '[Legacy] Set an expiration period for a co-pilot relationship (use agent:update instead)'
  )
  .option('-e, --email <email>', 'Principal email')
  .option('-c, --copilot <copilot>', 'Co-pilot email or name')
  .requiredOption('-p, --period <period>', 'Time period value (e.g., 30)')
  .option('-u, --unit <unit>', 'Time unit (minutes, hours, days, weeks, months)', 'days')
  .action((options) => {
    console.log(
      chalk.yellow('Warning: copilot:expiration is deprecated. Please use agent:update instead.')
    );
    legacyCopilotExpiration(options);
  });

// Other commands (kept as-is)
// ---------------------------

// Visionary commands
program
  .command('summon:visionary')
  .description('Summon Visionary 1 Command Suite with audio-visual effects')
  .option('-s, --silent', 'Run without audio effects')
  .option('--install-assets', 'Install or reinstall audio assets')
  .action(summonVisionary);

// Register domain management commands
registerDomainCommands(program);

// Register Dream Commander commands
program.addCommand(dreamCommanderCommand);

// Handle Claude commands
program
  .command('claude:status')
  .description('Check status of Dr. Claude agents and their workloads')
  .option('-a, --agent <agent>', 'Specific agent to check (omit for all agents)')
  .action(claudeCommands.status);

// Parse command line arguments
program.parse(process.argv);
