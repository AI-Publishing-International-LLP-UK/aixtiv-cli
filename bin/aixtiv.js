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

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (process.argv.length === 2) {
  program.outputHelp();
}