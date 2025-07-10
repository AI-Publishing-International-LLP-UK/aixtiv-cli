/**
 * GCP Secret Manager List Command
 * 
 * Lists all secrets in the GCP Secret Manager
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { Table } = require('console-table-printer');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

/**
 * Load configuration from file
 */
function loadConfig() {
  const configFile = path.join(os.homedir(), '.aixtiv', 'secrets', 'config.json');
  
  if (!fs.existsSync(configFile)) {
    throw new Error('Secret Manager not configured. Run "aixtiv secrets:init" to configure.');
  }

  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

/**
 * List secrets in a GCP project
 */
async function listSecrets(options = {}) {
  const config = loadConfig();
  const projectId = options.projectId || config.projectId;
  
  if (!projectId) {
    throw new Error('Project ID is required. Provide it with --project-id or configure it with "aixtiv secrets:init".');
  }
  
  // Create a client
  const client = new SecretManagerServiceClient();
  
  // Build the parent resource name
  const parent = `projects/${projectId}`;
  
  try {
    // List all secrets
    const [secrets] = await client.listSecrets({ parent });
    
    // Filter if requested
    const filteredSecrets = options.filter
      ? secrets.filter(secret => secret.name.includes(options.filter))
      : secrets;
    
    return formatOutput(filteredSecrets, options.output || 'table');
  } catch (error) {
    throw new Error(`Failed to list secrets: ${error.message}`);
  }
}

/**
 * Format the output based on requested format
 */
function formatOutput(secrets, format) {
  if (format === 'json') {
    return JSON.stringify(secrets, null, 2);
  } else if (format === 'yaml') {
    return yaml.dump(secrets);
  } else {
    // Table format (default)
    const table = new Table({
      title: 'GCP Secret Manager Secrets',
      columns: [
        { name: 'name', title: 'Secret Name' },
        { name: 'createTime', title: 'Created' },
        { name: 'versions', title: 'Versions' },
        { name: 'labels', title: 'Labels' }
      ]
    });
    
    secrets.forEach(secret => {
      const name = secret.name.split('/').pop();
      const createTime = new Date(secret.createTime.seconds * 1000).toLocaleString();
      const versions = secret.replication?.automatic ? 'Automatic' : 'Custom';
      const labels = secret.labels ? Object.entries(secret.labels).map(([k, v]) => `${k}=${v}`).join(', ') : '';
      
      table.addRow({
        name,
        createTime,
        versions,
        labels
      });
    });
    
    return table.render();
  }
}

// Export the main function
module.exports = listSecrets;