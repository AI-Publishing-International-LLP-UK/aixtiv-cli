#!/usr/bin/env node

/**
 * SSL Certificate Management Command for Aixtiv CLI
 * 
 * Provides functionality to manage SSL certificates for domains in the Aixtiv Symphony ecosystem,
 * including checking status, provisioning, and renewing certificates.
 * 
 * © 2025 AI Publishing International LLP
 */

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ora = require('ora');
const Table = require('cli-table3');

// Config path for domain cache
const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv-cli');
const domainCachePath = path.join(configDir, 'domain-cache.json');

/**
 * Load domain cache from file
 */
function loadDomainCache() {
  try {
    if (!fs.existsSync(domainCachePath)) {
      return { domains: [], lastUpdated: new Date().toISOString() };
    }
    const cacheData = fs.readFileSync(domainCachePath, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    console.error('Error loading domain cache:', error);
    return { domains: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save domain cache to file
 */
function saveDomainCache(data) {
  try {
    fs.writeFileSync(domainCachePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving domain cache:', error);
  }
}

/**
 * Update SSL certificate status for a domain
 */
function updateSSLStatus(domain, status) {
  const cache = loadDomainCache();
  const domainIndex = cache.domains.findIndex(d => d.name === domain);
  
  if (domainIndex !== -1) {
    cache.domains[domainIndex].sslStatus = status;
    saveDomainCache(cache);
  }
}

/**
 * Check the SSL certificate status for a domain
 */
async function checkSSL(domain, options) {
  if (!domain) {
    console.error(chalk.red('Domain name is required'));
    return;
  }
  
  const spinner = ora(`Checking SSL certificate for ${domain}...`).start();
  
  try {
    // Execute the OpenSSL command to check the certificate
    const command = `echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -enddate -issuer -subject`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        spinner.fail(`Failed to check SSL certificate for ${domain}`);
        console.error(chalk.red(`Error: ${error.message}`));
        console.error(chalk.red('The domain may not have a valid SSL certificate or might not be accessible.'));
        updateSSLStatus(domain, 'invalid');
        return;
      }
      
      spinner.succeed(`SSL certificate checked for ${domain}`);
      
      // Parse the certificate information
      const endDate = stdout.match(/notAfter=(.*)/)?.[1]?.trim();
      const issuer = stdout.match(/issuer=(.*)/)?.[1]?.trim();
      const subject = stdout.match(/subject=(.*)/)?.[1]?.trim();
      
      if (!endDate) {
        console.error(chalk.red('Could not parse certificate information'));
        return;
      }
      
      // Convert expiry date to timestamp
      const expiryDate = new Date(endDate);
      const now = new Date();
      const daysRemaining = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      // Display certificate details
      console.log('\n' + chalk.bold('SSL Certificate Details:'));
      
      const table = new Table();
      
      let statusColor = chalk.green;
      let statusText = 'Valid';
      
      if (daysRemaining <= 0) {
        statusColor = chalk.red;
        statusText = 'Expired';
      } else if (daysRemaining < 30) {
        statusColor = chalk.yellow;
        statusText = 'Expiring Soon';
      }
      
      table.push(
        { 'Domain': domain },
        { 'Status': statusColor(statusText) },
        { 'Expires': `${endDate} (${daysRemaining} days remaining)` },
        { 'Issuer': issuer },
        { 'Subject': subject }
      );
      
      console.log(table.toString());
      
      // Update domain cache with SSL status
      updateSSLStatus(domain, {
        status: statusText.toLowerCase(),
        expiryDate: endDate,
        daysRemaining,
        issuer,
        subject
      });
      
      // Show renewal instructions if expiring soon
      if (daysRemaining < 30) {
        console.log('\n' + chalk.yellow('⚠️ This certificate is expiring soon!'));
        console.log('To renew the certificate, use:');
        console.log(chalk.cyan(`  aixtiv domain ssl-renew ${domain}`));
      }
    });
  } catch (error) {
    spinner.fail(`Failed to check SSL certificate for ${domain}`);
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Check SSL certificate status for all domains
 */
async function checkAllSSL(options) {
  const cache = loadDomainCache();
  
  if (cache.domains.length === 0) {
    console.log(chalk.yellow('No domains found in the cache. Add domains using aixtiv domain add <domain>'));
    return;
  }
  
  // Execute the SSL check script
  const scriptPath = path.join(process.cwd(), 'scripts', 'domain-ssl-check.sh');
  
  if (!fs.existsSync(scriptPath)) {
    console.error(chalk.red(`SSL check script not found at ${scriptPath}`));
    console.log(chalk.yellow('Falling back to individual domain checks...'));
    
    // Execute individual checks
    for (const domain of cache.domains) {
      await checkSSL(domain.name, options);
      // Add a small delay between checks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return;
  }
  
  const spinner = ora('Checking SSL certificates for all domains...').start();
  
  try {
    // Make script executable
    fs.chmodSync(scriptPath, '755');
    
    // Execute the script
    exec(scriptPath, (error, stdout, stderr) => {
      if (error) {
        spinner.fail('Failed to check SSL certificates');
        console.error(chalk.red(`Error: ${error.message}`));
        return;
      }
      
      spinner.succeed('SSL certificates checked');
      
      // Display the script output
      console.log('\n' + stdout);
      
      if (stderr) {
        console.error(chalk.yellow('Warnings/Errors:'));
        console.error(stderr);
      }
    });
  } catch (error) {
    spinner.fail('Failed to check SSL certificates');
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Provision a new SSL certificate for a domain
 */
async function provisionSSL(domain, options) {
  if (!domain) {
    console.error(chalk.red('Domain name is required'));
    return;
  }
  
  const spinner = ora(`Provisioning SSL certificate for ${domain}...`).start();
  
  try {
    // Get domain information from cache
    const cache = loadDomainCache();
    const domainInfo = cache.domains.find(d => d.name === domain);
    
    if (!domainInfo) {
      spinner.fail(`Domain ${domain} not found in cache`);
      console.log(chalk.yellow(`Add the domain first with: aixtiv domain add ${domain}`));
      return;
    }
    
    // Determine hosting type (Firebase or GCP)
    const hostingType = options.type || await promptForHostingType();
    
    if (hostingType === 'firebase') {
      // Provision SSL certificate with Firebase
      await provisionFirebaseSSL(domain, domainInfo.firebaseProject || options.project);
    } else if (hostingType === 'gcp') {
      // Provision SSL certificate with GCP Load Balancer
      await provisionGCPSSL(domain, options.project);
    } else {
      spinner.fail(`Unknown hosting type: ${hostingType}`);
      return;
    }
    
    spinner.succeed(`SSL certificate provisioning initiated for ${domain}`);
    console.log(chalk.yellow('\nNOTE: The actual certificate provisioning may take some time to complete.'));
    console.log('Check the status with:');
    console.log(chalk.cyan(`  aixtiv domain ssl-check ${domain}`));
    
    // Update domain cache with SSL status
    updateSSLStatus(domain, {
      status: 'pending',
      provisionedAt: new Date().toISOString()
    });
  } catch (error) {
    spinner.fail(`Failed to provision SSL certificate for ${domain}`);
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Prompt for hosting type
 */
async function promptForHostingType() {
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Select hosting type:',
      choices: [
        { name: 'Firebase Hosting', value: 'firebase' },
        { name: 'Google Cloud Load Balancer', value: 'gcp' }
      ]
    }
  ]);
  
  return type;
}

/**
 * Provision SSL certificate with Firebase
 */
async function provisionFirebaseSSL(domain, project) {
  if (!project) {
    const { project: inputProject } = await inquirer.prompt([
      {
        type: 'input',
        name: 'project',
        message: 'Enter Firebase project ID:',
        validate: input => !!input || 'Firebase project ID is required'
      }
    ]);
    
    project = inputProject;
  }
  
  // Create site name from domain
  const siteName = domain.replace(/\./g, '-');
  
  // Execute Firebase CLI commands
  console.log(chalk.blue(`\nRunning Firebase commands for ${domain}...`));
  
  // Check if Firebase CLI is installed
  exec('firebase --version', async (error) => {
    if (error) {
      console.error(chalk.red('Firebase CLI not found. Please install it first:'));
      console.log(chalk.cyan('  npm install -g firebase-tools'));
      return;
    }
    
    // Create site if it doesn't exist
    console.log(chalk.dim('Creating Firebase site (if it doesn\'t exist)...'));
    exec(`firebase hosting:sites:list --project ${project} | grep -q "${siteName}" || firebase hosting:sites:create ${siteName} --project ${project}`, (error) => {
      if (error) {
        console.error(chalk.yellow(`Warning: Could not create site ${siteName}: ${error.message}`));
      }
      
      // Add domain to site
      console.log(chalk.dim('Adding domain to Firebase site...'));
      exec(`firebase hosting:domain:add ${domain} --site ${siteName} --project ${project}`, (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.yellow(`Warning: ${stderr}`));
          console.log(chalk.blue('You may need to verify domain ownership. Follow the instructions from Firebase.'));
        } else {
          console.log(chalk.green('\nDomain added to Firebase successfully!'));
          console.log(chalk.dim(stdout));
        }
      });
    });
  });
}

/**
 * Provision SSL certificate with GCP Load Balancer
 */
async function provisionGCPSSL(domain, project) {
  if (!project) {
    const { project: inputProject } = await inquirer.prompt([
      {
        type: 'input',
        name: 'project',
        message: 'Enter GCP project ID:',
        validate: input => !!input || 'GCP project ID is required'
      }
    ]);
    
    project = inputProject;
  }
  
  // Create certificate name from domain
  const certName = domain.replace(/\./g, '-') + '-ssl';
  
  // Execute gcloud CLI commands
  console.log(chalk.blue(`\nRunning gcloud commands for ${domain}...`));
  
  // Check if gcloud CLI is installed
  exec('gcloud --version', async (error) => {
    if (error) {
      console.error(chalk.red('gcloud CLI not found. Please install it first.'));
      return;
    }
    
    // Create managed certificate
    console.log(chalk.dim('Creating managed SSL certificate...'));
    exec(`gcloud config set project ${project} && gcloud compute ssl-certificates create ${certName} --domains=${domain} --global`, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.yellow(`Warning: ${stderr}`));
        console.log(chalk.blue('You may need to update your load balancer to use this certificate.'));
      } else {
        console.log(chalk.green('\nManaged SSL certificate created successfully!'));
        console.log(chalk.dim(stdout));
        console.log(chalk.blue('\nNext steps:'));
        console.log('1. Update your load balancer to use this certificate');
        console.log(`2. Ensure DNS for ${domain} is pointing to your load balancer IP`);
      }
    });
  });
}

/**
 * Renew SSL certificate for a domain
 */
async function renewSSL(domain, options) {
  if (!domain) {
    console.error(chalk.red('Domain name is required'));
    return;
  }
  
  // Renewal is essentially the same as provisioning for managed certificates
  return provisionSSL(domain, options);
}

// Export functions
module.exports = {
  checkSSL,
  checkAllSSL,
  provisionSSL,
  renewSSL
};