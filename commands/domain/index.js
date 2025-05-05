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
