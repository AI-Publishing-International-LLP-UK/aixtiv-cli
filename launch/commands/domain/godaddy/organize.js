/**
 * Domain Family Organization and Hosting Assignment
 *
 * This module provides functionality to organize domains by family and
 * assign them to the appropriate hosting projects based on domain patterns.
 *
 * © 2025 AI Publishing International LLP
 */

// Standard libraries
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Third-party libraries
const chalk = require('chalk');
const ora = require('ora');
const gradient = require('gradient-string');
const boxen = require('boxen');
const { Table } = require('console-table-printer');
const inquirer = require('inquirer');

// Internal modules
const { logAgentAction } = require('../../../lib/agent-tracking');
const domainAPI = require('../../../lib/api/domain-client');

// Project mappings - which family goes to which project
const PROJECT_MAPPINGS = {
  // Character-based domains
  character: 'api-for-warp-drive',

  // Coaching and learning domains
  coaching: 'coaching2100-com',
  learning: 'academy2100-com',
  academy: 'academy2100-com',

  // Brand domains
  aixtiv: 'aixtiv-symphony',

  // Commerce domains
  commerce: 'giftshop2100-com',
  shop: 'giftshop2100-com',
  store: 'giftshop2100-com',

  // Default project for unknown families
  default: 'api-for-warp-drive',
};

/**
 * Extract the base domain name without TLD
 * @param {string} domain - Full domain name
 * @returns {string} - Base domain name (e.g., 'example' from 'example.com')
 */
function extractBaseDomain(domain) {
  // Handle special TLDs (co.uk, com.au, etc.)
  const specialTlds = ['co.uk', 'com.au', 'co.nz', 'org.uk', 'net.au', 'com.mx'];

  for (const tld of specialTlds) {
    if (domain.endsWith('.' + tld)) {
      const parts = domain.split('.');
      if (parts.length > 2) {
        return parts[parts.length - 3];
      }
      return parts[0];
    }
  }

  // Standard case
  const parts = domain.split('.');
  return parts[0];
}

/**
 * Identify the domain family based on naming patterns
 * @param {string} domain - Domain name
 * @returns {string} - Identified family
 */
function identifyDomainFamily(domain) {
  const baseDomain = extractBaseDomain(domain);

  // Check for character domains (e.g., dr-lucy, dr-match)
  if (baseDomain.startsWith('dr-') || baseDomain.includes('-agent')) {
    return 'character';
  }

  // Check for coaching domains
  if (baseDomain.includes('coach') || baseDomain.includes('mentor')) {
    return 'coaching';
  }

  // Check for learning domains
  if (
    baseDomain.includes('learn') ||
    baseDomain.includes('academy') ||
    baseDomain.includes('training')
  ) {
    return 'learning';
  }

  // Check for aixtiv domains
  if (baseDomain.includes('aixtiv') || baseDomain.includes('symphony')) {
    return 'aixtiv';
  }

  // Check for commerce domains
  if (
    baseDomain.includes('shop') ||
    baseDomain.includes('store') ||
    baseDomain.includes('market')
  ) {
    return 'commerce';
  }

  // Default to base domain as family if nothing else matches
  return baseDomain;
}

/**
 * Determine the hosting project for a domain family
 * @param {string} family - Domain family
 * @returns {string} - Firebase project ID
 */
function determineHostingProject(family) {
  // Check for exact match
  if (PROJECT_MAPPINGS[family]) {
    return PROJECT_MAPPINGS[family];
  }

  // Check for partial match
  for (const [key, project] of Object.entries(PROJECT_MAPPINGS)) {
    if (family.includes(key)) {
      return project;
    }
  }

  // Default project
  return PROJECT_MAPPINGS.default;
}

/**
 * Organize domains by family and assign to appropriate hosting projects
 * @param {Object} options - Command options
 * @param {boolean} [options.refresh] - Force refresh domain list from API
 * @param {boolean} [options.interactive] - Interactive mode for manual assignments
 * @param {boolean} [options.dryRun] - Dry run mode (don't make changes)
 * @param {string} [options.output] - Path to save domain organization map
 */
async function organizeDomains(options = {}) {
  console.log(
    boxen(gradient.pastel(' Domain Family Organization '), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );

  // Display options
  console.log(chalk.cyan('Refresh from API:'), options.refresh ? 'Yes' : 'No');
  console.log(chalk.cyan('Interactive Mode:'), options.interactive ? 'Yes' : 'No');
  console.log(chalk.cyan('Dry Run:'), options.dryRun ? 'Yes' : 'No');
  console.log();

  const spinner = ora('Loading domains from GoDaddy...').start();

  try {
    // Fetch domains or use cache
    let domains = [];
    let fromCache = false;

    const cachePath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      '.aixtiv-cli',
      'godaddy-domains.json'
    );

    if (!options.refresh && fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      domains = cache.domains;
      fromCache = true;

      spinner.succeed(
        `Loaded ${domains.length} domains from cache (last updated: ${cache.lastUpdated.split('T')[0]})`
      );
    } else {
      try {
        const apiDomains = await domainAPI.godaddy.listDomains({
          statuses: 'ACTIVE',
        });

        domains = apiDomains;

        // Save to cache
        fs.writeFileSync(
          cachePath,
          JSON.stringify(
            {
              domains,
              lastUpdated: new Date().toISOString(),
            },
            null,
            2
          )
        );

        spinner.succeed(`Fetched ${domains.length} domains from GoDaddy API`);
      } catch (error) {
        spinner.fail(`Error fetching domains from GoDaddy API: ${error.message}`);
        if (fromCache) {
          console.log(chalk.yellow(`Using cached data instead (${domains.length} domains)`));
        } else {
          throw error;
        }
      }
    }

    // Organize domains by family
    spinner.text = 'Organizing domains by family...';
    spinner.start();

    // Group by family
    const families = {};
    const assignments = {};

    for (const domain of domains) {
      const family = identifyDomainFamily(domain.domain);
      const project = determineHostingProject(family);

      if (!families[family]) {
        families[family] = [];
      }

      families[family].push(domain.domain);

      if (!assignments[project]) {
        assignments[project] = {
          domains: [],
          families: new Set(),
        };
      }

      assignments[project].domains.push(domain.domain);
      assignments[project].families.add(family);
    }

    spinner.succeed(
      `Organized ${domains.length} domains into ${Object.keys(families).length} families`
    );

    // Display families table
    console.log(chalk.cyan('\nDomain Families:'));
    const familiesTable = new Table({
      columns: [
        { name: 'family', title: 'Family', alignment: 'left' },
        { name: 'count', title: 'Count', alignment: 'right' },
        { name: 'project', title: 'Hosting Project', alignment: 'left' },
        { name: 'examples', title: 'Examples', alignment: 'left' },
      ],
    });

    // Add family data to table
    for (const [family, domainList] of Object.entries(families)) {
      const project = determineHostingProject(family);

      familiesTable.addRow({
        family: family,
        count: domainList.length,
        project: chalk.green(project),
        examples: domainList.slice(0, 3).join(', ') + (domainList.length > 3 ? '...' : ''),
      });
    }

    familiesTable.printTable();

    // Display project assignments
    console.log(chalk.cyan('\nProject Assignments:'));
    const projectTable = new Table({
      columns: [
        { name: 'project', title: 'Firebase Project', alignment: 'left' },
        { name: 'count', title: 'Domain Count', alignment: 'right' },
        { name: 'families', title: 'Families', alignment: 'left' },
      ],
    });

    // Add project data to table
    for (const [project, data] of Object.entries(assignments)) {
      projectTable.addRow({
        project: chalk.green(project),
        count: data.domains.length,
        families: Array.from(data.families).join(', '),
      });
    }

    projectTable.printTable();

    // Interactive adjustments if requested
    if (options.interactive) {
      console.log(chalk.cyan('\nInteractive Assignment Mode:'));

      // Ask about families that might need manual assignment
      for (const family of Object.keys(families)) {
        if (!PROJECT_MAPPINGS[family]) {
          const { project } = await inquirer.prompt([
            {
              type: 'list',
              name: 'project',
              message: `Assign family "${family}" (${families[family].length} domains) to project:`,
              choices: Object.values(PROJECT_MAPPINGS),
              default: determineHostingProject(family),
            },
          ]);

          // Update assignments based on user selection
          const oldProject = determineHostingProject(family);

          if (oldProject !== project) {
            console.log(
              chalk.yellow(`Reassigning family "${family}" from ${oldProject} to ${project}`)
            );

            // Remove domains from old project
            const domainsToMove = families[family];
            assignments[oldProject].domains = assignments[oldProject].domains.filter(
              (domain) => !domainsToMove.includes(domain)
            );
            assignments[oldProject].families.delete(family);

            // Add domains to new project
            if (!assignments[project]) {
              assignments[project] = {
                domains: [],
                families: new Set(),
              };
            }

            assignments[project].domains.push(...domainsToMove);
            assignments[project].families.add(family);
          }
        }
      }

      // Display updated assignments
      console.log(chalk.cyan('\nUpdated Project Assignments:'));
      const updatedTable = new Table({
        columns: [
          { name: 'project', title: 'Firebase Project', alignment: 'left' },
          { name: 'count', title: 'Domain Count', alignment: 'right' },
          { name: 'families', title: 'Families', alignment: 'left' },
        ],
      });

      // Add updated project data to table
      for (const [project, data] of Object.entries(assignments)) {
        updatedTable.addRow({
          project: chalk.green(project),
          count: data.domains.length,
          families: Array.from(data.families).join(', '),
        });
      }

      updatedTable.printTable();
    }

    // Save organization map to file if specified
    if (options.output) {
      const organizationMap = {
        families,
        assignments,
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(options.output, JSON.stringify(organizationMap, null, 2));
      console.log(chalk.green(`\nDomain organization map saved to: ${options.output}`));
    }

    // Apply assignments if not in dry run mode
    if (!options.dryRun) {
      const syncSpinner = ora('Preparing to sync domains with Firebase projects...').start();

      // Execute sync operation for each project
      for (const [project, data] of Object.entries(assignments)) {
        if (data.domains.length === 0) {
          continue;
        }

        syncSpinner.text = `Syncing ${data.domains.length} domains to project ${project}...`;

        // Create temporary file with domains
        const tempFile = path.join(
          process.env.HOME || process.env.USERPROFILE,
          '.aixtiv-cli',
          `firebase-domains-${project}.txt`
        );

        fs.writeFileSync(tempFile, data.domains.join('\n'));

        // Run the bulk-domain-import.sh script
        const scriptPath = path.join(__dirname, '../../../scripts/bulk-domain-import.sh');

        if (!fs.existsSync(scriptPath)) {
          syncSpinner.fail(`Script not found: ${scriptPath}`);
          console.error(chalk.red(`Script not found: ${scriptPath}`));
          continue;
        }

        try {
          const command = `"${scriptPath}" "${tempFile}" "godaddy" "${project}" "false"`;
          execSync(command, { stdio: 'pipe' }); // Use pipe to suppress output

          syncSpinner.succeed(`Synced ${data.domains.length} domains to project ${project}`);
        } catch (error) {
          syncSpinner.fail(`Error syncing domains to project ${project}: ${error.message}`);
          console.error(chalk.red(error.stack));
        }
      }

      console.log(chalk.green('\nDomain organization and assignment completed successfully'));

      // Log action
      logAgentAction('godaddy-domain-organization', {
        familyCount: Object.keys(families).length,
        domainCount: domains.length,
        projectCount: Object.keys(assignments).length,
      });
    } else {
      console.log(chalk.yellow('\nDry run completed. No changes were made.'));
      console.log(
        chalk.yellow('To apply these assignments, run the command without the --dry-run flag.')
      );
    }
  } catch (error) {
    spinner.fail(`Error organizing domains: ${error.message}`);
    console.error(chalk.red(error.stack));
  }
}

module.exports = organizeDomains;
