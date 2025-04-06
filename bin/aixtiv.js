#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');
require('dotenv').config();

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync('Aixtiv CLI', { horizontalLayout: 'full' })
  )
);
console.log(chalk.blue(`v${packageJson.version} - SalleyPort Security Management`));
console.log();

// Command imports
const authVerify = require('../commands/auth/verify');
const agentGrant = require('../commands/agent/grant');
const agentRevoke = require('../commands/agent/revoke');
const resourceScan = require('../commands/resource/scan');

// Co-pilot command imports
const copilotLink = require('../commands/copilot/link');
const copilotUnlink = require('../commands/copilot/unlink');
const copilotList = require('../commands/copilot/list');
const copilotVerify = require('../commands/copilot/verify');
const copilotGrant = require('../commands/copilot/grant');

// Visionary commands
const summonVisionary = require('../commands/summon/visionary');
// Configure program
program
  .version(packageJson.version)
  .description('Aixtiv CLI for SalleyPort security management');

// Auth commands
program
  .command('auth:verify')
  .description('Verify authentication with SalleyPort')
  .option('-e, --email <email>', 'Email to verify')
  .option('-a, --agent <agent>', 'Agent to verify')
  .action(authVerify);

// Agent commands
program
  .command('agent:grant')
  .description('Grant agent access to a resource')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-a, --agent <agent>', 'Agent ID')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .option('-t, --type <type>', 'Access type (full, readonly, delegated)', 'full')
  .action(agentGrant);

program
  .command('agent:revoke')
  .description('Revoke agent access to a resource')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-a, --agent <agent>', 'Agent ID')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .action(agentRevoke);

// Resource commands
program
  .command('resource:scan')
  .description('Scan resources for access patterns')
  .option('-r, --resource <resource>', 'Resource ID to scan')
  .option('-a, --agent <agent>', 'Filter by agent ID')
  .option('-e, --email <email>', 'Filter by principal email')
  .action(resourceScan);

// Handle PR special case directly
program
  .command('fix:pr')
  .description('Apply special PR fix for pr@coaching2100.com with agent 001')
  .option('-c, --cleanup', 'Clean up the PR fix instead of applying it')
  .action(async (options) => {
    const { cleanup } = options;
    const agent = '001';
    const principal = 'pr@coaching2100.com';
    const resource = 'pr-2bd91160bf21ba21';
    
    if (cleanup) {
      const revoke = require('../commands/agent/revoke');
      await revoke({
        email: principal,
        agent: agent,
        resource: resource
      });
    } else {
      const grant = require('../commands/agent/grant');
      await grant({
        email: principal,
        agent: agent,
        resource: resource,
        type: 'full'
      });
    }
  });

// Co-pilot commands
program
  .command('copilot:link')
  .description('Link a co-pilot to a principal')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name (if just name, will use name@drname.live format)')
  .option('-l, --level <level>', 'Trust level (standard, enhanced, executive)', 'standard')
  .action(copilotLink);

program
  .command('copilot:unlink')
  .description('Unlink a co-pilot from a principal')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .action(copilotUnlink);

program
  .command('copilot:list')
  .description('List co-pilots linked to a principal')
  .option('-e, --email <email>', 'Principal email (if omitted, lists all relationships)')
  .option('-s, --status <status>', 'Filter by status (active, pending, all)', 'active')
  .action(copilotList);

program
  .command('copilot:verify')
  .description('Verify co-pilot identity and cultural empathy')
  .requiredOption('-e, --email <email>', 'Co-pilot email')
  .requiredOption('-p, --principal <principal>', 'Principal email')
  .option('-c, --code <code>', 'Cultural Empathy Code')
  .action(copilotVerify);

program
  .command('copilot:grant')
  .description('Grant co-pilot access to a resource')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .option('-t, --type <type>', 'Access type (readonly, delegated, full)', 'readonly')
  .action(copilotGrant);

// Visionary commands
program
  .command('summon:visionary')
  .description('Summon Visionary 1 Command Suite with audio-visual effects')
  .option('-s, --silent', 'Run without audio effects')
  .option('--install-assets', 'Install or reinstall audio assets')
  .action(summonVisionary);

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (process.argv.length === 2) {
  program.outputHelp();
}