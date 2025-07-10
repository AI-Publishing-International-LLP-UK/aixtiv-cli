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
    throw new Error('Secret Manager not configured. Run "

