const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');

const command = new Command('claude:fix:mcpipv6security')
  .description('Fix IPv4-mapped IPv6 vulnerability (CVE-2024-24790)')
  .option('-i, --instance <instance>', 'GCP instance name', 'modelcontextprotocol-b')
  .option('-z, --zone <zone>', 'GCP zone', 'us-west1-b')
  .option('-p, --project <project>', 'GCP project ID', 'api-for-warp-drive')
  .option('--check', 'Check if instance is vulnerable', false)
  .action(async (options) => {
    const spinner = ora('Starting IPv4-mapped IPv6 vulnerability fix').start();

    try {
      if (options.check) {
        // Check if instance is vulnerable
        spinner.text = 'Checking IPv4-mapped IPv6 vulnerability status...';

        const checkScript =
          'if ip -6 addr show | grep -q "::ffff:"; then ' +
          'echo "VULNERABLE: IPv4-mapped IPv6 addresses found"; ' +
          'exit 1; ' +
          'else ' +
          'echo "SECURE: No IPv4-mapped IPv6 addresses found"; ' +
          'exit 0; ' +
          'fi';

        try {
          execSync(`gcloud compute ssh ${options.instance} \
            --project=${options.project} \
            --zone=${options.zone} \
            --command="${checkScript}"`).toString();

          spinner.succeed('Instance is secure against IPv4-mapped IPv6 vulnerability');
        } catch (error) {
          spinner.fail('Instance is vulnerable to IPv4-mapped IPv6 vulnerability');
          console.log(chalk.yellow('\nRun this command without --check to apply the fix'));
        }
      } else {
        // Apply the fix
        spinner.text = 'Applying IPv4-mapped IPv6 vulnerability fix...';

        const fixScript = `
          # Create sysctl configuration for IPv4-mapped IPv6 addresses
          echo 'net.ipv6.conf.all.mapped = 0' | sudo tee /etc/sysctl.d/99-disable-ipv4-mapped.conf

          # Apply sysctl settings
          sudo sysctl -p /etc/sysctl.d/99-disable-ipv4-mapped.conf

          # Update network configuration
          sudo sed -i '/::ffff:/d' /etc/hosts

          # Restart networking service
          if command -v systemctl >/dev/null 2>&1; then
            sudo systemctl restart networking
          else
            sudo service networking restart
          fi

          # Verify fix
          sysctl net.ipv6.conf.all.mapped`;

        try {
          const output = execSync(`gcloud compute ssh ${options.instance} \
            --project=${options.project} \
            --zone=${options.zone} \
            --command="${fixScript}"`).toString();

          spinner.succeed('Successfully applied IPv4-mapped IPv6 vulnerability fix');
          console.log(chalk.green('\nFix verified successfully'));
          console.log(chalk.gray('Output:', output));
        } catch (error) {
          spinner.fail('Failed to apply IPv4-mapped IPv6 vulnerability fix');
          console.error(chalk.red('Error:', error.message));
          process.exit(1);
        }
      }
    } catch (error) {
      spinner.fail('Error executing IPv4-mapped IPv6 vulnerability fix');
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
  });

module.exports = command;
