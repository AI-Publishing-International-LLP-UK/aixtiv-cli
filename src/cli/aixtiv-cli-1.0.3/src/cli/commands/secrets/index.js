/**
 * Secrets Management Commands Module
 *
 * This module provides commands for managing GCP Secret Manager secrets:
 * - Initializing secrets configuration
 * - Listing available secrets
 * - Getting secret values
 * - Creating and updating secrets
 * - Deleting secrets
 * - Rotating service account credentials
 */

const { utils, DOMAIN_STYLES } = require('../../aixtiv');
const initCommand = require('./init');
const listCommand = require('./list');
const getCommand = require('./get');
const createCommand = require('./create');
const deleteCommand = require('./delete');
const rotateCommand = require('./rotate');

/**
 * Register all secrets management commands
 */
function registerCommands(register) {
  // Domain Icon and Color
  const DOMAIN_STYLES.secrets = {
    icon: '🔑',
    color: chalk.hex('#FF3366'),
    name: 'Secrets',
  };

  // Initialize secret manager configuration
  register(
    'secrets',
    'secrets:init',
    'Initialize GCP Secret Manager configuration',
    [
      { flags: '-p, --project-id <id>', description: 'GCP Project ID' },
      { flags: '-k, --key-file <path>', description: 'Path to service account key file' },
      { flags: '-f, --force', description: 'Force overwrite of existing configuration' },
      { flags: '--no-validate', description: 'Skip validation of GCP credentials' },
    ],
    initCommand,
    ['--project-id=api-for-warp-drive', '--key-file=./service-account-key.json']
  );

  // List available secrets
  register(
    'secrets',
    'secrets:list',
    'List all secrets in GCP Secret Manager',
    [
      { flags: '-p, --project-id <id>', description: 'GCP Project ID (overrides config)' },
      { flags: '-o, --output <format>', description: 'Output format: table, json, yaml (default: table)' },
      { flags: '--filter <pattern>', description: 'Filter secrets by name pattern' },
    ],
    listCommand,
    ['', '--output=json', '--filter=api-key-*']
  );

  // Get secret value
  register(
    'secrets',
    'secrets:get <secret-name>',
    'Get a secret value from GCP Secret Manager',
    [
      { flags: '-p, --project-id <id>', description: 'GCP Project ID (overrides config)' },
      { flags: '-v, --version <version>', description: 'Secret version (default: latest)' },
      { flags: '-o, --output <format>', description: 'Output format: raw, json, env (default: raw)' },
      { flags: '--no-decode', description: 'Do not decode base64 values' },
    ],
    getCommand,
    ['api-keys-openai', 'firebase-credentials --output=json', 'db-password --version=1']
  );

  // Create or update a secret
  register(
    'secrets',
    'secrets:create <secret-name>',
    'Create or update a secret in GCP Secret Manager',
    [
      { flags: '-p, --project-id <id>', description: 'GCP Project ID (overrides config)' },
      { flags: '-v, --value <value>', description: 'Secret value (if not provided, will prompt)' },
      { flags: '-f, --file <path>', description: 'Read secret value from file' },
      { flags: '-l, --labels <labels>', description: 'Secret labels (comma-separated key=value pairs)' },
      { flags: '--env-var <variable>', description: 'Read secret value from environment variable' },
      { flags: '--force', description: 'Skip confirmation prompt' },
    ],
    createCommand,
    ['api-key-openai --value=sk_123456789', 'firebase-credentials --file=./firebase-key.json', 'db-password --env-var=DB_PASSWORD']
  );

  // Delete a secret
  register(
    'secrets',
    'secrets:delete <secret-name>',
    'Delete a secret from GCP Secret Manager',
    [
      { flags: '-p, --project-id <id>', description: 'GCP Project ID (overrides config)' },
      { flags: '--force', description: 'Skip confirmation prompt' },
    ],
    deleteCommand,
    ['old-api-key --force', 'test-secret']
  );

  // Rotate service account credentials
  register(
    'secrets',
    'secrets:rotate',
    'Rotate GCP service account credentials',
    [
      { flags: '-p, --project-id <id>', description: 'GCP Project ID (overrides config)' },
      { flags: '-e, --email <email>', description: 'Service account email' },
      { flags: '--delete-old', description: 'Delete old service account key after rotation' },
      { flags: '--force', description: 'Skip confirmation prompt' },
    ],
    rotateCommand,
    ['--email=drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com', '--delete-old', '--force']
  );
}

module.exports = {
  registerCommands,
};

