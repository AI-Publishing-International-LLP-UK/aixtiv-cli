// commands/ci/status.js
// CI status command implementation

const { Command } = require('commander');
const chalk = require('chalk');
const { execSync } = require('child_process');
const ora = require('ora');

// Create a command for CI status
const statusCommand = new Command('status')
  .description('Check status of CI/CD pipelines and deployments')
  .option('--project <project>', 'Google Cloud project ID', 'api-for-warp-drive')
  .option('--limit <limit>', 'Limit the number of builds returned', '5')
  .option('--filter <filter>', 'Filter for builds (e.g., "tags=cdi")')
  .action(async (options) => {
    const spinner = ora('Checking CI/CD status...').start();

    try {
      let command = `gcloud builds list --project="${options.project}" --limit=${options.limit}`;

      if (options.filter) {
        command += ` --filter="${options.filter}"`;
      }

      const result = execSync(command, { encoding: 'utf8' });
      spinner.succeed('CI/CD status retrieved');

      console.log();
      console.log(chalk.cyan('Recent CI/CD builds:'));
      console.log(result);

      // Provide helpful commands
      console.log(chalk.yellow('\nUseful commands:'));
      console.log(chalk.blue(`  aixtiv ci logs             - View CI/CD logs`));
      console.log(chalk.blue(`  aixtiv ci deploy           - Run deployment`));
      console.log(chalk.blue(`  aixtiv ci cdi status       - Check CDI status`));
      console.log(chalk.blue(`  aixtiv ci ctt status       - Check CTTT status`));
    } catch (error) {
      spinner.fail('Failed to check CI/CD status');
      console.error(chalk.red(`Error: ${error.message}`));

      if (error.message.includes('not installed')) {
        console.log(
          chalk.yellow(
            '\nGcloud CLI may not be installed or authenticated. Please install and authenticate with:'
          )
        );
        console.log(chalk.blue('  1. https://cloud.google.com/sdk/docs/install'));
        console.log(chalk.blue('  2. gcloud auth login'));
        console.log(chalk.blue(`  3. gcloud config set project ${options.project}`));
      }
    }
  });

module.exports = statusCommand;
