// commands/ci/deploy.js
// CI deploy command implementation

const { Command } = require('commander');
const chalk = require('chalk');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

// Create a command for CI deploy
const deployCommand = new Command('deploy')
  .description('Run deployment with CI/CD CTTT pipeline')
  .option('--config <file>', 'Configuration file', 'cloudbuild-ci-cttt.yaml')
  .option('--env <environment>', 'Deployment environment', 'staging')
  .option('--project <project>', 'Google Cloud project ID', 'api-for-warp-drive')
  .action(async (options) => {
    console.log(
      chalk.green(
        `Running deployment with config: ${chalk.yellow(
          options.config
        )} and environment: ${chalk.yellow(options.env)}`
      )
    );

    const spinner = ora('Looking for deployment script...').start();
    let deployScript = './deploy-ci-cttt.sh';

    // Check if script exists in current directory
    if (!fs.existsSync(deployScript)) {
      spinner.text = 'Looking for script in other locations...';

      // Try to find the script in the current path
      try {
        const { execSync } = require('child_process');
        const foundScript = execSync('find . -name "deploy-ci-cttt.sh" -type f | head -n 1', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();

        if (foundScript) {
          deployScript = foundScript;
          spinner.succeed(`Found script at: ${deployScript}`);
        } else {
          spinner.warn('Could not find deploy-ci-cttt.sh script.');
          console.log(
            chalk.yellow(
              'Please make sure you are in the correct directory or the script is in your PATH.'
            )
          );
          return;
        }
      } catch (error) {
        spinner.fail('Error searching for deploy script');
        console.error(chalk.red(`Error: ${error.message}`));
        return;
      }
    } else {
      spinner.succeed(`Found script at: ${deployScript}`);
    }

    // Run the deployment script
    spinner.text = 'Running deployment...';
    spinner.start();

    try {
      const deployProcess = spawn(
        deployScript,
        ['--config', options.config, '--project', options.project],
        {
          stdio: 'inherit',
          shell: true,
        }
      );

      deployProcess.on('error', (error) => {
        spinner.fail('Deployment failed');
        console.error(chalk.red(`Error: ${error.message}`));
      });

      deployProcess.on('close', (code) => {
        if (code === 0) {
          spinner.succeed('Deployment completed successfully');
        } else {
          spinner.fail(`Deployment failed with code ${code}`);
        }
      });
    } catch (error) {
      spinner.fail('Deployment failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

module.exports = deployCommand;
