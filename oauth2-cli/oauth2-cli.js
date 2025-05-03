#!/usr/bin/env node

const fs = require('fs');
const {google} = require('googleapis');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Display help information
function showHelp() {
  console.log('OAuth2 CLI - A simple OAuth2 tool for Google service accounts');
  console.log('');
  console.log('Usage:');
  console.log('  oauth2-cli help                       Show this help message');
  console.log('  oauth2-cli auth <keyfile>             Authenticate with a service account key file');
  console.log('  oauth2-cli token <keyfile> [scope]    Get an access token using a service account');
  console.log('');
  console.log('Examples:');
  console.log('  oauth2-cli auth ./key.json');
  console.log('  oauth2-cli token ./key.json https://www.googleapis.com/auth/cloud-platform');
}

// Authenticate with a service account
async function authenticateServiceAccount(keyFile) {
  try {
    // Check if the key file exists
    if (!fs.existsSync(keyFile)) {
      console.error(`Error: Key file '${keyFile}' not found`);
      process.exit(1);
    }
    
    // Load the service account key file
    const keyFileContent = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    
    // Create a JWT client using the service account credentials
    const jwtClient = new google.auth.JWT(
      keyFileContent.client_email,
      null,
      keyFileContent.private_key,
      ['https://www.googleapis.com/auth/cloud-platform']
    );
    
    // Authenticate
    await jwtClient.authorize();
    
    console.log(`Successfully authenticated as: ${keyFileContent.client_email}`);
    console.log(`Project ID: ${keyFileContent.project_id}`);
    
    return jwtClient;
  } catch (error) {
    console.error('Authentication error:', error.message);
    process.exit(1);
  }
}

// Get an access token
async function getAccessToken(keyFile, scope) {
  try {
    // Default scope
    const defaultScope = 'https://www.googleapis.com/auth/cloud-platform';
    const authScope = scope || defaultScope;
    
    // Load the service account key file
    const keyFileContent = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    
    // Create a JWT client using the service account credentials
    const jwtClient = new google.auth.JWT(
      keyFileContent.client_email,
      null,
      keyFileContent.private_key,
      [authScope]
    );
    
    // Get the access token
    const token = await jwtClient.getAccessToken();
    
    console.log(`Service Account: ${keyFileContent.client_email}`);
    console.log(`Scope: ${authScope}`);
    console.log(`Access Token: ${token.token}`);
    
    return token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    process.exit(1);
  }
}

// Process commands
async function processCommand() {
  switch (command) {
    case 'help':
      showHelp();
      break;
    
    case 'auth':
      const keyFile = args[1];
      if (!keyFile) {
        console.error('Error: Key file path is required');
        showHelp();
        process.exit(1);
      }
      await authenticateServiceAccount(keyFile);
      break;
    
    case 'token':
      const tokenKeyFile = args[1];
      const scope = args[2];
      if (!tokenKeyFile) {
        console.error('Error: Key file path is required');
        showHelp();
        process.exit(1);
      }
      await getAccessToken(tokenKeyFile, scope);
      break;
    
    default:
      console.error(`Error: Unknown command '${command}'`);
      showHelp();
      process.exit(1);
  }
}

// Run the CLI
processCommand().catch(console.error);
