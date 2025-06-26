const chalk = require('chalk');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * ASOOS.2100.Cool Deployment Command
 * Integrates with the ci-deploy-asoos.sh script for deployment management
 */

const DEPLOYMENT_CONFIG = {
  scriptPath: '/Users/as/asoos/integration-gateway/ci-deploy-asoos.sh',
  multiSiteScriptPath: '/Users/as/asoos/integration-gateway/deploy-2100-cool-sites.sh',
  projectRoot: '/Users/as/asoos/integration-gateway',
  domain: 'asoos.2100.cool',
  firebaseSite: 'asoos-2100-cool',
  targetName: '2100-cool-c624d',
  configFile: '/Users/as/asoos/integration-gateway/config/2100-cool-sites.json',
};

/**
 * Execute deployment script with specified action
 * @param {string} action - The deployment action to perform
 * @param {Object} options - Command options
 */
async function executeDeployment(action, options = {}) {
  return new Promise((resolve, reject) => {
    const args = action ? [action] : [];
    const scriptProcess = spawn('bash', [DEPLOYMENT_CONFIG.scriptPath, ...args], {
      cwd: DEPLOYMENT_CONFIG.projectRoot,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    scriptProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (options.verbose) {
        process.stdout.write(text);
      }
    });

    scriptProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      if (options.verbose) {
        process.stderr.write(text);
      }
    });

    scriptProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ output, success: true });
      } else {
        reject(new Error(`Deployment failed with exit code ${code}: ${errorOutput}`));
      }
    });

    scriptProcess.on('error', (error) => {
      reject(new Error(`Failed to execute deployment script: ${error.message}`));
    });
  });
}

/**
 * Check if deployment script exists and is executable
 */
function validateDeploymentScript() {
  try {
    const stats = fs.statSync(DEPLOYMENT_CONFIG.scriptPath);
    if (!stats.isFile()) {
      throw new Error('Deployment script is not a file');
    }

    // Check if file is executable
    fs.accessSync(DEPLOYMENT_CONFIG.scriptPath, fs.constants.X_OK);
    return true;
  } catch (error) {
    throw new Error(`Deployment script validation failed: ${error.message}`);
  }
}

/**
 * Display deployment status and information
 */
function displayDeploymentInfo() {
  console.log(chalk.blue('🚀 ASOOS.2100.Cool Deployment Configuration'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.cyan('Domain:')} ${DEPLOYMENT_CONFIG.domain}`);
  console.log(`${chalk.cyan('Firebase Site:')} ${DEPLOYMENT_CONFIG.firebaseSite}`);
  console.log(`${chalk.cyan('Target:')} ${DEPLOYMENT_CONFIG.targetName}`);
  console.log(`${chalk.cyan('Script:')} ${DEPLOYMENT_CONFIG.scriptPath}`);
  console.log(`${chalk.cyan('Project Root:')} ${DEPLOYMENT_CONFIG.projectRoot}`);
  console.log();
}

/**
 * Main deployment command handler
 * @param {Object} options - Command line options
 */
async function deployCommand(options) {
  const { action, verbose, info } = options;

  try {
    console.log(chalk.yellow('🔧 Aixtiv CLI - ASOOS.2100.Cool Deployment'));
    console.log();

    if (info) {
      displayDeploymentInfo();
      return;
    }

    // Validate deployment script
    console.log(chalk.blue('📋 Validating deployment environment...'));
    validateDeploymentScript();
    console.log(chalk.green('✅ Deployment script validated'));
    console.log();

    // Display what action will be performed
    const actionText = action || 'full deployment';
    console.log(chalk.blue(`🚀 Executing ${actionText}...`));
    console.log();

    // Execute deployment
    const result = await executeDeployment(action, { verbose });

    if (result.success) {
      console.log(chalk.green('🎉 Deployment completed successfully!'));

      if (!verbose && result.output) {
        // Show summary of output if not in verbose mode
        const lines = result.output.split('\n');
        const summaryLines = lines.filter(
          (line) =>
            line.includes('[SUCCESS]') ||
            line.includes('✅') ||
            line.includes('🎉') ||
            line.includes('🌐 Live at:')
        );

        if (summaryLines.length > 0) {
          console.log(chalk.blue('\n📋 Deployment Summary:'));
          summaryLines.forEach((line) => console.log(chalk.dim(line)));
        }
      }

      console.log();
      console.log(chalk.cyan('🌐 Access your site at:'));
      console.log(chalk.blue(`   Primary: https://${DEPLOYMENT_CONFIG.domain}`));
      console.log(chalk.blue(`   Firebase: https://${DEPLOYMENT_CONFIG.firebaseSite}.web.app`));
    }
  } catch (error) {
    console.error(chalk.red('❌ Deployment failed:'));
    console.error(chalk.red(error.message));

    if (error.message.includes('script validation failed')) {
      console.log();
      console.log(chalk.yellow('💡 Troubleshooting:'));
      console.log(chalk.dim(`   1. Ensure the script exists: ${DEPLOYMENT_CONFIG.scriptPath}`));
      console.log(chalk.dim('   2. Make sure the script is executable: chmod +x <script>'));
      console.log(chalk.dim("   3. Verify you're in the correct project directory"));
    }

    process.exit(1);
  }
}

module.exports = deployCommand;
