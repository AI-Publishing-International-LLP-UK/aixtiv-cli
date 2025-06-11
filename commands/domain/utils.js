/**
 * Domain Management Utilities for Aixtiv CLI
 *
 * Provides utility functions for domain operations across the CLI.
 *
 * © 2025 AI Publishing International LLP
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { Table } = require('console-table-printer');

/**
 * Extract base domain from full domain name
 * @param {string} domain Full domain name (e.g., "subdomain.example.com")
 * @returns {string} Base domain (e.g., "example.com")
 */
function extractBaseDomain(domain) {
  // Handle special TLDs (co.uk, com.au, etc.)
  const specialTlds = ['co.uk', 'com.au', 'co.nz', 'org.uk', 'net.au', 'com.mx'];

  for (const tld of specialTlds) {
    if (domain.endsWith('.' + tld)) {
      const parts = domain.split('.');
      if (parts.length > 2) {
        return parts.slice(parts.length - 3).join('.');
      }
      return domain;
    }
  }

  // Standard case
  const parts = domain.split('.');
  if (parts.length > 2) {
    return parts.slice(parts.length - 2).join('.');
  }
  return domain;
}

/**
 * Group domains by family or TLD
 * @param {Array<Object>} domains Array of domain objects
 * @param {string} groupBy Property to group by ('family' or 'tld')
 * @returns {Object} Domains grouped by the specified property
 */
function groupDomains(domains, groupBy = 'family') {
  const groups = {};

  domains.forEach((domain) => {
    const domainName = domain.name || domain.domain;
    if (!domainName) return;

    let groupKey;

    if (groupBy === 'tld') {
      // Group by TLD
      const parts = domainName.split('.');
      groupKey = parts.length > 1 ? parts.slice(1).join('.') : 'unknown';
    } else {
      // Group by family (first part of domain)
      const baseName = domainName.split('.')[0];

      // Extract family from base name
      if (baseName.startsWith('dr-') || baseName.includes('-agent')) {
        groupKey = 'character';
      } else if (baseName.includes('command')) {
        groupKey = 'command';
      } else if (baseName.includes('wing-')) {
        groupKey = 'wing';
      } else if (baseName.includes('squadron-')) {
        groupKey = 'squadron';
      } else if (baseName.includes('aixtiv') || baseName.includes('symphony')) {
        groupKey = 'aixtiv';
      } else if (baseName.includes('coach') || baseName.includes('2100')) {
        groupKey = 'brand';
      } else if (baseName.includes('learn') || baseName.includes('academy')) {
        groupKey = 'learning';
      } else if (baseName.includes('shop') || baseName.includes('store')) {
        groupKey = 'commerce';
      } else {
        // Extract root name (strip numbers and dashes)
        const rootName = baseName.replace(/[0-9-]/g, '');
        groupKey = rootName || baseName;
      }
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(domain);
  });

  return groups;
}

/**
 * Format expiration date with color based on urgency
 * @param {string} expirationDate Expiration date in any parseable format
 * @returns {string} Formatted date with color
 */
function formatExpirationDate(expirationDate) {
  if (!expirationDate) return chalk.dim('N/A');

  try {
    const expDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expDate - now;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = expDate.toISOString().split('T')[0];

    if (daysRemaining <= 7) {
      return chalk.red(formattedDate + ` (${daysRemaining} days)`);
    } else if (daysRemaining <= 30) {
      return chalk.yellow(formattedDate + ` (${daysRemaining} days)`);
    } else {
      return chalk.green(formattedDate + ` (${daysRemaining} days)`);
    }
  } catch (error) {
    return chalk.dim(expirationDate.toString());
  }
}

/**
 * Get default expiry date (1 year from now)
 * @returns {string} Default expiry date in YYYY-MM-DD format
 */
function getDefaultExpiryDate() {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Check if a file is executable
 * @param {string} filePath Path to file
 * @returns {boolean} True if file is executable
 */
function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Make a file executable
 * @param {string} filePath Path to file
 * @returns {boolean} True if successful
 */
function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, '755');
    return true;
  } catch (error) {
    console.error(chalk.red(`Error making file executable: ${error.message}`));
    return false;
  }
}

/**
 * Display domains in a table with optional grouping
 * @param {Array} domains List of domain objects
 * @param {Object} options Display options
 * @param {string} options.groupBy Group domains by property
 * @param {boolean} options.showBanner Show banner with domain count
 */
function displayDomains(domains, options = {}) {
  if (!domains || domains.length === 0) {
    console.log(chalk.yellow('No domains to display'));
    return;
  }

  // Display header if requested
  if (options.showBanner) {
    console.log(chalk.cyan(`\nDisplaying ${domains.length} domains:`));
  }

  // If grouping is enabled
  if (options.groupBy) {
    const groups = groupDomains(domains, options.groupBy);
    const groupNames = Object.keys(groups).sort();

    console.log(
      chalk.cyan(`\nDomains grouped by ${options.groupBy} (${groupNames.length} groups):`)
    );

    groupNames.forEach((groupName) => {
      const groupDomains = groups[groupName];
      console.log(chalk.blue(`\n${groupName} (${groupDomains.length}):`));

      const table = new Table({
        columns: [
          { name: 'domain', title: 'Domain', alignment: 'left' },
          { name: 'type', title: 'Type', alignment: 'center' },
          { name: 'status', title: 'Status', alignment: 'center' },
          { name: 'project', title: 'Project', alignment: 'left' },
        ],
      });

      groupDomains.forEach((domain) => {
        const domainName = domain.name || domain.domain;
        const type = domain.type || 'unknown';
        const status = domain.status
          ? domain.status.toLowerCase() === 'active'
            ? chalk.green(domain.status)
            : domain.status.toLowerCase() === 'pending'
              ? chalk.yellow(domain.status)
              : chalk.red(domain.status)
          : chalk.dim('unknown');
        const project = domain.firebaseProject || domain.project || 'N/A';

        table.addRow({ domain: domainName, type, status, project });
      });

      table.printTable();
    });
  } else {
    // Standard table display
    const table = new Table({
      columns: [
        { name: 'domain', title: 'Domain', alignment: 'left' },
        { name: 'type', title: 'Type', alignment: 'center' },
        { name: 'status', title: 'Status', alignment: 'center' },
        { name: 'project', title: 'Project', alignment: 'left' },
        { name: 'expires', title: 'Expires', alignment: 'right' },
      ],
    });

    domains.forEach((domain) => {
      const domainName = domain.name || domain.domain;
      const type = domain.type || 'unknown';
      const status = domain.status
        ? domain.status.toLowerCase() === 'active'
          ? chalk.green(domain.status)
          : domain.status.toLowerCase() === 'pending'
            ? chalk.yellow(domain.status)
            : chalk.red(domain.status)
        : chalk.dim('unknown');
      const project = domain.firebaseProject || domain.project || 'N/A';
      const expires = formatExpirationDate(domain.expiryDate || domain.expires);

      table.addRow({ domain: domainName, type, status, project, expires });
    });

    table.printTable();
  }
}

/**
 * Validate a domain name
 * @param {string} domain Domain name to validate
 * @returns {boolean} True if valid
 */
function isValidDomain(domain) {
  // Basic domain validation regex
  const domainRegex = /^(?!-)(?:(?:[a-zA-Z0-9]-?)*[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$/;
  return domainRegex.test(domain);
}

module.exports = {
  extractBaseDomain,
  groupDomains,
  formatExpirationDate,
  getDefaultExpiryDate,
  isExecutable,
  makeExecutable,
  displayDomains,
  isValidDomain,
};
