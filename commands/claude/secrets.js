/**
 * Secret Management Commands for Aixtiv CLI
 *
 * Provides:
 * - Key rotation
 * - API key management
 * - Secret auditing
 * - Access control
 *
 * Part of Phase III: Agent Autonomy + Platform Automation
 */

const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { Table } = require('console-table-printer');
const fs = require('fs');
const path = require('path');
const EnhancedSecretManager = require('../../services/secrets/enhanced-secret-manager');

// Initialize enhanced secret manager
let secretManager = null;

/**
 * Initialize the secret manager
 * @param {object} options - Configuration options
 * @returns {EnhancedSecretManager} Initialized secret manager
 */
function getSecretManager(options = {}) {
  if (!secretManager) {
    secretManager = new EnhancedSecretManager(options);
  }
  return secretManager;
}

/**
 * Format a timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted date
 */
function formatDate(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return timestamp || 'Unknown';
  }
}

/**
 * List secrets in a project
 * @param {object} options - Command options
 */
async function listSecrets(options) {
  const spinner = ora('Listing secrets...').start();

  try {
    const { projectId, filter, detailed = false } = options;

    const manager = getSecretManager({ projectId });
    const secrets = await manager.listSecrets({ projectId, filter });

    spinner.succeed(`Found ${secrets.length} secrets`);

    if (secrets.length === 0) {
      console.log(chalk.yellow('No secrets found'));
      return;
    }

    // Create table for display
    const table = new Table({
      title: `Secrets in project: ${projectId || manager.projectId}`,
      columns: [
        { name: 'name', title: 'Secret Name' },
        { name: 'createTime', title: 'Created' },
        { name: 'labels', title: 'Labels' },
      ],
    });

    // Show versions if detailed
    if (detailed) {
      table.columns.push({ name: 'versions', title: 'Versions' });
    }

    // Add data to table
    for (const secret of secrets) {
      const secretName = secret.name.split('/').pop();

      // Get versions if detailed
      let versions = [];
      if (detailed) {
        try {
          versions = await manager.listSecretVersions(secretName, { projectId });
        } catch (err) {
          versions = [{ state: 'ERROR', error: err.message }];
        }
      }

      table.addRow({
        name: secretName,
        createTime: formatDate(secret.createTime),
        labels: secret.labels ? JSON.stringify(secret.labels) : '-',
        versions: detailed ? versions.length : undefined,
      });
    }

    table.printTable();
  } catch (error) {
    spinner.fail(`Error listing secrets: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Create a new secret
 * @param {object} options - Command options
 */
async function createSecret(options) {
  const spinner = ora('Creating secret...').start();

  try {
    const { secretId, projectId, value, labels = {}, fromFile, interactive = false } = options;

    // Validate required parameters
    if (!secretId) {
      spinner.fail('Secret ID is required');
      return;
    }

    let secretValue = value;

    // Read from file if specified
    if (fromFile) {
      if (!fs.existsSync(fromFile)) {
        spinner.fail(`File not found: ${fromFile}`);
        return;
      }
      secretValue = fs.readFileSync(fromFile, 'utf8');
    }

    // Interactive mode to get value securely
    if (interactive && !secretValue) {
      spinner.stop();

      const { inputValue } = await inquirer.prompt([
        {
          type: 'password',
          name: 'inputValue',
          message: `Enter value for secret ${secretId}:`,
          mask: '*',
        },
      ]);

      secretValue = inputValue;
      spinner.start('Creating secret...');
    }

    // Validate secret value
    if (!secretValue) {
      spinner.fail('Secret value is required');
      return;
    }

    // Create the secret
    const manager = getSecretManager({ projectId });
    await manager.setSecret(secretId, secretValue, {
      projectId,
      labels,
    });

    spinner.succeed(`Secret ${secretId} created successfully`);
  } catch (error) {
    spinner.fail(`Error creating secret: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Access a secret value
 * @param {object} options - Command options
 */
async function accessSecret(options) {
  const spinner = ora('Accessing secret...').start();

  try {
    const {
      secretId,
      projectId,
      version = 'latest',
      export: exportToFile,
      redact = false,
    } = options;

    // Validate required parameters
    if (!secretId) {
      spinner.fail('Secret ID is required');
      return;
    }

    // Access the secret
    const manager = getSecretManager({ projectId });
    const secretValue = await manager.accessSecret(secretId, version, { projectId });

    spinner.succeed(`Secret ${secretId} accessed successfully`);

    // Export to file if requested
    if (exportToFile) {
      const exportPath =
        typeof exportToFile === 'string'
          ? exportToFile
          : path.join(process.cwd(), `${secretId}.secret`);

      fs.writeFileSync(exportPath, secretValue);
      console.log(chalk.green(`Secret exported to: ${exportPath}`));

      // Print redacted value
      if (redact) {
        console.log(
          `Value: ${secretValue.substring(0, 3)}${'*'.repeat(Math.max(0, secretValue.length - 6))}${secretValue.substring(secretValue.length - 3)}`
        );
      }
    } else if (redact) {
      // Print redacted value
      console.log(
        `Value: ${secretValue.substring(0, 3)}${'*'.repeat(Math.max(0, secretValue.length - 6))}${secretValue.substring(secretValue.length - 3)}`
      );
    } else {
      // Print full value
      console.log(`Value: ${secretValue}`);
    }
  } catch (error) {
    spinner.fail(`Error accessing secret: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Delete a secret or version
 * @param {object} options - Command options
 */
async function deleteSecret(options) {
  const spinner = ora('Deleting secret...').start();

  try {
    const { secretId, projectId, version, confirm = false } = options;

    // Validate required parameters
    if (!secretId) {
      spinner.fail('Secret ID is required');
      return;
    }

    // Confirm deletion
    if (!confirm) {
      spinner.stop();

      const confirmation = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Are you sure you want to delete ${version ? `version ${version} of ` : ''}secret ${secretId}?`,
          default: false,
        },
      ]);

      if (!confirmation.proceed) {
        console.log(chalk.yellow('Deletion cancelled'));
        return;
      }

      spinner.start(`Deleting ${version ? `version ${version} of ` : ''}secret ${secretId}...`);
    }

    // Delete the secret
    const manager = getSecretManager({ projectId });
    await manager.deleteSecret(secretId, {
      projectId,
      version,
    });

    spinner.succeed(
      `${version ? `Version ${version} of secret` : 'Secret'} ${secretId} deleted successfully`
    );
  } catch (error) {
    spinner.fail(`Error deleting secret: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Rotate a service account key
 * @param {object} options - Command options
 */
async function rotateServiceAccountKey(options) {
  const spinner = ora('Rotating service account key...').start();

  try {
    const {
      secretId,
      projectId,
      serviceAccountEmail,
      keyType = 'json',
      deleteOldKey = true,
      maxKeyAge = 90, // days
      dryRun = false,
    } = options;

    // Validate required parameters
    if (!secretId) {
      spinner.fail('Secret ID is required');
      return;
    }

    if (!serviceAccountEmail) {
      spinner.fail('Service account email is required');
      return;
    }

    // Rotate the key
    const manager = getSecretManager({ projectId });

    if (dryRun) {
      spinner.info(
        `DRY RUN: Would rotate key for ${serviceAccountEmail} and store in secret ${secretId}`
      );
      return;
    }

    const result = await manager.rotateServiceAccountKey(secretId, serviceAccountEmail, {
      projectId,
      keyType,
      deleteOldKey,
      maxKeyAge,
    });

    if (result.rotated) {
      spinner.succeed(`Service account key for ${serviceAccountEmail} rotated successfully`);
      console.log(chalk.green(`New key ID: ${result.newKeyId}`));
      console.log(chalk.yellow(`Old key ID: ${result.oldKeyId || 'None'}`));
    } else {
      spinner.info(`Key rotation skipped: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`Error rotating service account key: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Rotate an API key
 * @param {object} options - Command options
 */
async function rotateApiKey(options) {
  const spinner = ora('Rotating API key...').start();

  try {
    const {
      secretId,
      projectId,
      apiKeyName,
      maxKeyAge = 90, // days
      dryRun = false,
    } = options;

    // Validate required parameters
    if (!secretId) {
      spinner.fail('Secret ID is required');
      return;
    }

    if (!apiKeyName) {
      spinner.fail('API key name is required');
      return;
    }

    // Rotate the API key
    const manager = getSecretManager({ projectId });

    if (dryRun) {
      spinner.info(`DRY RUN: Would rotate API key ${apiKeyName} and store in secret ${secretId}`);
      return;
    }

    const result = await manager.rotateApiKey(secretId, apiKeyName, {
      projectId,
      maxKeyAge,
    });

    if (result.rotated) {
      spinner.succeed(`API key ${apiKeyName} rotated successfully`);
      console.log(chalk.green(`New API key name: ${result.newApiKeyName}`));
      console.log(chalk.yellow(`Old API key name: ${result.oldApiKeyName}`));
    } else {
      spinner.info(`API key rotation skipped: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`Error rotating API key: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Set up a rotation schedule
 * @param {object} options - Command options
 */
async function setupRotationSchedule(options) {
  const spinner = ora('Setting up rotation schedule...').start();

  try {
    const { schedule, scheduleFile, projectId, outputFile } = options;

    let scheduleData = schedule;

    // Read from file if specified
    if (scheduleFile) {
      if (!fs.existsSync(scheduleFile)) {
        spinner.fail(`Schedule file not found: ${scheduleFile}`);
        return;
      }
      scheduleData = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
    }

    // Validate schedule
    if (!scheduleData || !Array.isArray(scheduleData)) {
      spinner.fail('Invalid schedule format');
      return;
    }

    // Create the schedule
    const manager = getSecretManager({ projectId });
    const result = await manager.createRotationSchedule(scheduleData, {
      projectId,
      schedulePath: outputFile,
    });

    spinner.succeed(`Rotation schedule created with ${result.scheduled} entries`);
    console.log(chalk.green(`Schedule saved to: ${result.path}`));
  } catch (error) {
    spinner.fail(`Error setting up rotation schedule: ${error.message}`);
    console.error(chalk.red(error));
  }
}

/**
 * Generate a secure random string
 * @param {object} options - Command options
 */
async function generateSecureString(options) {
  try {
    const { length = 32, charset, prefix = '', export: exportToFile } = options;

    // Generate the string
    const generatedString = EnhancedSecretManager.generateSecureString({
      length: parseInt(length),
      charset,
      prefix,
    });

    // Export to file if requested
    if (exportToFile) {
      const exportPath =
        typeof exportToFile === 'string'
          ? exportToFile
          : path.join(process.cwd(), 'generated-secret.txt');

      fs.writeFileSync(exportPath, generatedString);
      console.log(chalk.green(`Secret exported to: ${exportPath}`));
    } else {
      // Print the value
      console.log(chalk.green('Generated secure string:'));
      console.log(generatedString);
    }
  } catch (error) {
    console.error(chalk.red(`Error generating secure string: ${error.message}`));
  }
}

/**
 * View the audit log
 * @param {object} options - Command options
 */
async function viewAuditLog(options) {
  try {
    const { logFile, secretId, action, user, limit = 20, onlyErrors = false } = options;

    const auditLogPath = logFile || path.join(process.cwd(), 'logs', 'secret-audit.log');

    if (!fs.existsSync(auditLogPath)) {
      console.error(chalk.red(`Audit log file not found: ${auditLogPath}`));
      return;
    }

    // Read and parse audit log
    const logContent = fs.readFileSync(auditLogPath, 'utf8').trim();
    if (!logContent) {
      console.log(chalk.yellow('Audit log is empty'));
      return;
    }

    const logEntries = logContent
      .split('\n')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (err) {
          return null;
        }
      })
      .filter((entry) => entry !== null);

    // Apply filters
    let filteredEntries = logEntries;

    if (secretId) {
      filteredEntries = filteredEntries.filter((entry) => entry.secretName === secretId);
    }

    if (action) {
      filteredEntries = filteredEntries.filter((entry) => entry.action === action);
    }

    if (user) {
      filteredEntries = filteredEntries.filter((entry) => entry.user === user);
    }

    if (onlyErrors) {
      filteredEntries = filteredEntries.filter((entry) => entry.status === 'failed');
    }

    // Sort by timestamp (newest first)
    filteredEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    filteredEntries = filteredEntries.slice(0, limit);

    if (filteredEntries.length === 0) {
      console.log(chalk.yellow('No matching audit log entries found'));
      return;
    }

    // Create table for display
    const table = new Table({
      title: 'Secret Audit Log',
      columns: [
        { name: 'timestamp', title: 'Timestamp' },
        { name: 'action', title: 'Action' },
        { name: 'secretName', title: 'Secret' },
        { name: 'user', title: 'User' },
        { name: 'status', title: 'Status' },
      ],
    });

    // Add data to table
    for (const entry of filteredEntries) {
      table.addRow({
        timestamp: formatDate(entry.timestamp),
        action: entry.action,
        secretName: entry.secretName,
        user: entry.user,
        status: entry.status === 'failed' ? chalk.red(entry.status) : chalk.green(entry.status),
      });
    }

    table.printTable();
    console.log(chalk.dim(`Showing ${filteredEntries.length} of ${logEntries.length} log entries`));
  } catch (error) {
    console.error(chalk.red(`Error viewing audit log: ${error.message}`));
  }
}

/**
 * Main command handler for secret management
 * @param {object} options - Command options and action
 */
module.exports = async function secrets(options) {
  const { action, projectId, ...actionOptions } = options;

  // Override default project if specified
  if (projectId) {
    EnhancedSecretManager.setDefaultProject(projectId);
  }

  // Execute the requested action
  switch (action) {
    case 'list':
      await listSecrets({ projectId, ...actionOptions });
      break;

    case 'create':
      await createSecret({ projectId, ...actionOptions });
      break;

    case 'get':
      await accessSecret({ projectId, ...actionOptions });
      break;

    case 'delete':
      await deleteSecret({ projectId, ...actionOptions });
      break;

    case 'rotate-sa-key':
      await rotateServiceAccountKey({ projectId, ...actionOptions });
      break;

    case 'rotate-api-key':
      await rotateApiKey({ projectId, ...actionOptions });
      break;

    case 'setup-rotation':
      await setupRotationSchedule({ projectId, ...actionOptions });
      break;

    case 'generate':
      await generateSecureString(actionOptions);
      break;

    case 'audit':
      await viewAuditLog(actionOptions);
      break;

    default:
      console.error(chalk.red(`Unknown action: ${action}`));
      console.log(
        'Available actions: list, create, get, delete, rotate-sa-key, rotate-api-key, setup-rotation, generate, audit'
      );
  }
};
