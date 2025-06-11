// commands/ci/cdi.js
// Continuous Deployment Integration command implementation

const { Command } = require('commander');
const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs');
const ora = require('ora');

// Create a command for CDI operations
const cdiCommand = new Command('cdi')
  .description('Continuous Deployment Integration commands')
  .option('--project <project>', 'Google Cloud project ID', 'api-for-warp-drive');

// CDI setup command
cdiCommand
  .command('setup')
  .description('Set up Continuous Deployment Integration')
  .action(async (options) => {
    const spinner = ora('Setting up Continuous Deployment Integration...').start();
    
    try {
      // Check if the integration script exists
      if (fs.existsSync('./cicd-cttt-symphony-integration.js')) {
        spinner.text = 'Running integration setup...';
        const result = execSync('node cicd-cttt-symphony-integration.js', { encoding: 'utf8' });
        spinner.succeed('Continuous Deployment Integration setup completed');
        console.log(result);
      } else {
        spinner.fail('Integration script not found');
        console.log(chalk.yellow('The script cicd-cttt-symphony-integration.js was not found in the current directory.'));
        console.log(chalk.yellow('Please make sure you are in the correct directory or the script is available.'));
      }
    } catch (error) {
      spinner.fail('CDI setup failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// CDI status command
cdiCommand
  .command('status')
  .description('Check CDI status')
  .action(async (cmdOptions) => {
    const options = { ...cdiCommand.opts(), ...cmdOptions };
    const spinner = ora('Checking CDI status...').start();
    
    try {
      const result = execSync(`gcloud builds list --project="${options.project}" --filter="tags=cdi" --limit=5`, { encoding: 'utf8' });
      spinner.succeed('CDI status retrieved');
      console.log();
      console.log(chalk.cyan('CDI Builds:'));
      console.log(result);
    } catch (error) {
      spinner.fail('Failed to check CDI status');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// CDI logs command
cdiCommand
  .command('logs')
  .description('View CDI logs')
  .action(async () => {
    const spinner = ora('Viewing CDI logs...').start();
    
    try {
      if (fs.existsSync('./logs')) {
        const result = execSync('ls -la ./logs | grep cttt', { encoding: 'utf8' });
        spinner.succeed('CDI logs found');
        console.log();
        console.log(chalk.cyan('CDI Log Files:'));
        console.log(result);
        console.log();
        console.log(chalk.blue("Use 'aixtiv ci logs --cat [LOGFILE] --path ./logs' to view a specific log file"));
      } else {
        spinner.warn('No logs directory found');
        console.log(chalk.yellow('The logs directory was not found. Try running a CDI operation first.'));
      }
    } catch (error) {
      if (error.status === 1 && error.stderr.toString().includes('grep')) {
        spinner.info('No CDI log files found');
        console.log(chalk.yellow('No CDI log files were found in the logs directory.'));
      } else {
        spinner.fail('Failed to list CDI logs');
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
  });

// CDI config command
cdiCommand
  .command('config')
  .description('Configure CDI settings')
  .action(async () => {
    const spinner = ora('Configuring CDI...').start();
    
    try {
      if (fs.existsSync('./cloud-build/triggers/main-trigger.yaml')) {
        const configContent = fs.readFileSync('./cloud-build/triggers/main-trigger.yaml', 'utf8');
        spinner.succeed('CDI configuration retrieved');
        console.log();
        console.log(chalk.cyan('Current CDI Configuration:'));
        console.log(configContent);
      } else {
        spinner.warn('Configuration file not found');
        console.log(chalk.yellow('The CDI configuration file was not found at ./cloud-build/triggers/main-trigger.yaml'));
        
        // Try to find configuration files in alternative locations
        try {
          const result = execSync('find . -name "*trigger*.yaml" -o -name "*ci*.yaml" | grep -v node_modules', { encoding: 'utf8' });
          if (result.trim()) {
            console.log(chalk.blue('\nPossible configuration files found:'));
            console.log(result);
          }
        } catch (error) {
          // Silent fail for the find command
        }
      }
    } catch (error) {
      spinner.fail('Failed to retrieve CDI configuration');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

module.exports = cdiCommand;
