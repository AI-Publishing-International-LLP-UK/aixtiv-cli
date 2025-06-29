/**
 * GCP Secret Manager Initialization Command
 * 
 * Sets up the GCP Secret Manager configuration for the CLI
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { execSync } = require('child_process');

// GCP Secret Manager client
let secretManager = null;

/**
 * Initialize the Secret Manager
 */
async function loadSecretManager() {
  if (secretManager) return secretManager;
  
  try {
    // Dynamically import the Secret Manager to avoid loading unless needed
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    secretManager = new SecretManagerServiceClient();
    return secretManager;
  } catch (error) {
    throw new Error(`Failed to load Secret Manager: ${error.message}`);
  }
}

/**
 * Validate GCP credentials by making a simple API call
 */
async function validateCredentials(projectId) {
  try {
    const client = await loadSecretManager();
    await client.listSecrets({ parent: `projects/${projectId}`, pageSize: 1 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if gcloud CLI is available
 */
function checkGcloudAvailability() {
  try {
    execSync('gcloud --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get active gcloud project
 */
function getActiveGcloudProject() {
  try {
    return execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

/**
 * Initialization command implementation
 */
async function initCommand(options) {
  try {
    utils.ui.feedback.info('Initializing GCP Secret Manager configuration...');

    // Config directory
    const configDir = path.join(os.homedir(), '.aixtiv', 'secrets');
    const configFile = path.join(configDir, 'config.json');
    
    // Check if config already exists
    let existingConfig = null;
    if (fs.existsSync(configFile) && !options.force) {
      existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      
      // Ask for confirmation to overwrite
      const { confirmOverwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'Secret Manager configuration already exists. Do you want to reconfigure?',
        default: false
      }]);
      
      if (!confirmOverwrite) {
        utils.ui.feedback.info('Keeping existing configuration.');
        return;
      }
    }
    
    // Prepare config object
    const config = {
      projectId: options.projectId,
      keyFile: options.keyFile,
      lastUpdated: new Date().toISOString()
    };
    
    // If no project ID specified, try to get from gcloud
    if (!config.projectId) {
      if (checkGcloudAvailability()) {
        const gcloudProject = getActiveGcloudProject();
        if (gcloudProject) {
          config.projectId = gcloudProject;
          utils.ui.feedback.info(`Using active gcloud project: ${config.projectId}`);
        }
      }
    }
    
    // If still no project ID, prompt user
    if (!config.projectId) {
      const { projectId } = await inquirer.prompt([{
        type: 'input',
        name: 'projectId',
        message: 'Enter your GCP Project ID:',
        validate: (input) => input.trim() !== '' ? true : 'Project ID is required'
      }]);
      
      config.projectId = projectId.trim();
    }
    
    // If no key file specified, try to discover or prompt
    if (!config.keyFile) {
      // Check common locations
      const commonKeyLocations = [
        path.join(process.cwd(), 'service-account-key.json'),
        path.join(os.homedir(), '.gcp', 'service-account-key.json'),
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      ].filter(Boolean);
      
      const foundKeyFiles = commonKeyLocations.filter(location => fs.existsSync(location));
      
      if (foundKeyFiles.length > 0) {
        // If multiple key files found, let user choose
        if (foundKeyFiles.length > 1) {
          const { selectedKeyFile } = await inquirer.prompt([{
            type: 'list',
            name: 'selectedKeyFile',
            message: 'Select a service account key file:',
            choices: foundKeyFiles
          }]);
          
          config.keyFile = selectedKeyFile;
        } else {
          config.keyFile = foundKeyFiles[0];
          utils.ui.feedback.info(`Using discovered key file: ${config.keyFile}`);
        }
      } else {
        // Prompt for key file path
        const { keyFile } = await inquirer.prompt([{
          type: 'input',
          name: 'keyFile',
          message: 'Enter path to service account key file:',
          validate: (input) => {
            if (input.trim() === '') return 'Key file path is required';
            if (!fs.existsSync(input.trim())) return 'File does not exist';
            return true;
          }
        }]);
        
        config.keyFile = keyFile.trim();
      }
    }
    
    // Validate key file
    if (!fs.existsSync(config.keyFile)) {
      utils.ui.feedback.error(`Key file not found: ${config.keyFile}`);
      return;
    }
    
    // Normalize paths
    config.keyFile = path.resolve(config.keyFile);
    
    // Validate credentials if requested
    if (options.validate !== false) {
      utils.ui.feedback.info('Validating GCP credentials...');
      
      // Set environment variable temporarily for validation
      const originalCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFile;
      
      const isValid = await validateCredentials(config.projectId);
      
      // Restore original environment variable
      if (originalCredentials) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = originalCredentials;
      } else {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      if (!isValid) {
        utils.ui.feedback.error('Invalid GCP credentials. Please check your service account key file and project ID.');
        return;
      }
      
      utils.ui.feedback.success('GCP credentials validated successfully.');
    }
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write config file
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    
    // Set environment variable in shell config files
    if (process.platform === 'darwin' || process.platform === 'linux') {
      utils.ui.feedback.info('Updating shell configuration...');
      
      const shellFiles = [
        path.join(os.homedir(), '.zshrc'),
        path.join(os.homedir(), '.bashrc')
      ].filter(file => fs.existsSync(file));
      
      for (const shellFile of shellFiles) {
        let content = fs.readFileSync(shellFile, 'utf8');
        const envVarLine = `export GOOGLE_APPLICATION_CREDENTIALS="${config.keyFile}"`;
        
        if (content.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
          // Update existing line
          content = content.replace(/export GOOGLE_APPLICATION_CREDENTIALS="[^"]*"/g, envVarLine);
        } else {
          // Add new line
          content += `\n\n# Added by aixtiv-cli for GCP Secret Manager\n${envVarLine}\n`;
        }
        
        fs.writeFileSync(shellFile, content);
        utils.ui.feedback.info(`Updated ${shellFile}`);
      }
    }
    
    utils.ui.feedback.success('GCP Secret Manager configuration initialized successfully!');
    utils.ui.feedback.info(`Project ID: ${config.projectId}`);
    utils.ui.feedback.info(`Key file: ${config.keyFile}`);
    
    utils.ui.feedback.info('\nRemember to run the following command to update your current shell:');
    utils.ui.feedback.info(chalk.cyan(`  export GOOGLE_APPLICATION_CREDENTIALS="${config.keyFile}"`));
    
  } catch (error) {
    utils.ui.feedback.error(`Error initializing GCP Secret Manager: ${error.message}`);
    if (options.debug) {
      console.error(error);
    }
  }
}

module.exports = initCommand;

