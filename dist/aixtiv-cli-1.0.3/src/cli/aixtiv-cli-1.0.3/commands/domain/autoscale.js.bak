#!/usr/bin/env node

/**
 * Dr. Claude Orchestrator
 * Firebase Domain Autoscaling Engine for Aixtiv Symphony
 * Honoring the orchestral design work of Dr. Claude
 *
 * Integrates Firebase domain verification with autoscaling workflows.
 * Automates the verification and connection of domains to Firebase hosting
 * during autoscaling events.
 *
 * © 2025 AI Publishing International LLP
 *
 * @system_codename Dr. Claude Orchestrator
 * @domain Firebase Hosting + DNS Auto-Binding
 * @agent_owner Dr. Lucy (execution) + Dr. Claude (architecture)
 * @license Aixtiv Symphony IP under AIPI
 * @metadata_tag orchestrated_by: Dr. Claude Orchestrator
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { handleAutoscaling } = require('../../scripts/autoscale-verify-firebase-domains');

/**
 * Run the domain autoscaling verification
 * @param {Object} options - Command options
 */
async function runAutoscaleVerify(options) {
  const spinner = ora('Starting domain autoscaling verification...').start();
  
  try {
    const results = await handleAutoscaling({
      force: options.force,
      dryRun: options.dryRun,
      logLevel: options.verbose ? 'verbose' : 'info'
    });
    
    if (options.dryRun) {
      spinner.succeed('Domain autoscaling verification simulation completed');
      console.log(`\n${chalk.cyan('Domains that would be verified:')} ${chalk.white(results.pendingCount)}`);
      
      if (results.pendingDomains && results.pendingDomains.length > 0) {
        results.pendingDomains.forEach(domain => {
          console.log(`- ${domain}`);
        });
      }
    } else {
      spinner.succeed('Domain autoscaling verification completed');
      console.log(`\n${chalk.green('Verified domains:')} ${chalk.white(results.verified.length)}`);
      console.log(`${chalk.red('Failed domains:')} ${chalk.white(results.failed.length)}`);
      
      // Display verified domains if any
      if (results.verified && results.verified.length > 0) {
        console.log(`\n${chalk.green('Successfully verified:')}`);
        results.verified.forEach(domain => {
          console.log(`- ${domain}`);
        });
      }
      
      // Display failed domains if any
      if (results.failed && results.failed.length > 0) {
        console.log(`\n${chalk.red('Failed to verify:')}`);
        results.failed.forEach(domain => {
          console.log(`- ${domain}`);
        });
      }
    }
    
    console.log(`\n${chalk.dim('For detailed logs, see ~/.aixtiv-cli/logs/verification/')}`);
  } catch (error) {
    spinner.fail('Domain autoscaling verification failed');
    console.error(chalk.red(`Error: ${error.message}`));
    
    if (options.verbose && error.stack) {
      console.error(chalk.dim(error.stack));
    }
  }
}

/**
 * Register domain autoscaling commands with the CLI
 * @param {import('commander').Command} program - The Commander program instance
 */
function registerDomainAutoscaleCommand(program) {
  // Domain autoscale verification command
  program
    .command('domain:autoscale-verify')
    .description('Verify and connect domains to Firebase during autoscaling')
    .option('-f, --force', 'Force verification of all domains, including already verified ones')
    .option('-d, --dry-run', 'Simulate verification without making changes')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(runAutoscaleVerify);
  
  return program;
}

module.exports = registerDomainAutoscaleCommand;