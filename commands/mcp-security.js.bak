const { Command } = require('commander');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

const command = new Command('mcp:security');

command
  .description('MCP Security Management for Model Context Protocol servers')
  .option('-c, --check', 'Check for security vulnerabilities')
  .option('-p, --patch', 'Apply security patches')
  .option('-m, --monitor', 'Monitor for security issues')
  .option('-r, --region <region>', 'GCP region to target')
  .option('-i, --instance <instance>', 'Specific instance to target')
  .option('--cve <cve-id>', 'Specific CVE to address')
  .action(async (options) => {
    const spinner = ora('Starting MCP Security Management').start();

    try {
      // Default to all MCP instances if not specified
      const region = options.region || 'us-west1-b';
      const instance = options.instance || 'modelcontextprotocol-b';
      const cve = options.cve || 'CVE-2024-45337';

      if (options.check) {
        spinner.text = `Checking for MCP security vulnerabilities in ${region}`;
        // Execute security check
        const checkResult = execSync('./mcp-watchdog.sh', { encoding: 'utf8' });
        spinner.succeed('Security check completed');
        console.log(checkResult);
      }

      if (options.patch) {
        spinner.text = `Applying security patches to MCP servers in ${region}`;
        // Execute security patch script
        if (cve === 'CVE-2024-45337') {
          const patchResult = execSync('./mcp-security-patch.sh', { encoding: 'utf8' });
          spinner.succeed('Security patches applied successfully');
          console.log(patchResult);
        } else {
          spinner.warn(`No patch available for ${cve}. Please check for updates.`);
        }
      }

      if (options.monitor) {
        spinner.text = 'Setting up MCP security monitoring';
        // Set up monitoring for security issues
        execSync(
          `gcloud logging metrics create ssh_auth_bypass_attempts \
          --description="Potential SSH auth bypass attempts" \
          --log-filter='resource.type="gce_instance" \
          resource.labels.instance_id=~"modelcontextprotocol.*" \
          textPayload=~"PublicKeyCallback.*multiple.*keys"'`,
          { encoding: 'utf8' }
        );

        spinner.succeed('Security monitoring set up successfully');
        console.log(
          chalk.green('Log-based metric created to monitor for SSH authentication bypass attempts.')
        );
        console.log(chalk.green('Remember to set up an alert policy for this metric.'));
      }

      if (!options.check && !options.patch && !options.monitor) {
        spinner.info('No action specified. Use --check, --patch, or --monitor.');
        console.log('Examples:');
        console.log('  aixtiv mcp:security --check');
        console.log('  aixtiv mcp:security --patch --region us-west1-b');
        console.log('  aixtiv mcp:security --monitor');
      }
    } catch (error) {
      spinner.fail('Error executing MCP security operations');
      console.error(chalk.red(`Error: ${error.message}`));

      if (error.stdout) {
        console.log(chalk.yellow('Command output:'));
        console.log(error.stdout);
      }

      if (error.stderr) {
        console.log(chalk.red('Error output:'));
        console.log(error.stderr);
      }

      process.exit(1);
    }
  });

module.exports = command;
