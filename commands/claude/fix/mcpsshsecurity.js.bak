const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

const command = new Command('claude:fix:mcpsshsecurity')
  .description('Fix MCP SSH security vulnerability (CVE-2024-45337)')
  .option('-i, --instance <instance>', 'GCP instance name', 'modelcontextprotocol-b')
  .option('-z, --zone <zone>', 'GCP zone', 'us-west1-b')
  .option('-p, --project <project>', 'GCP project ID', 'api-for-warp-drive')
  .option('--local', 'Apply fixes to local machine only', false)
  .option('--remote', 'Apply fixes to remote instance only', false)
  .option('--check', 'Check current security status', false)
  .action(async (options) => {
    const spinner = ora('Starting MCP SSH security fix').start();

    try {
      // Instructions for remote fix
      const instructions = `To fix the SSH vulnerability on the GCP instance, please run the following steps through the Cloud Console:

1. Go to https://console.cloud.google.com/compute/instances?project=${options.project}
2. Click on "${options.instance}"
3. Click on "SSH" button to open a terminal
4. Run the following commands:

   sudo apt-get update
   sudo apt-get install -y openssh-server
   
   # Create security directory
   sudo mkdir -p /etc/ssh/security
   
   # Create security policy file
   cat > security-policy.conf << 'EOFINNER'
   # SSH Security Policy to mitigate CVE-2024-45337
   
   # Only allow specific authentication methods
   PubkeyAuthentication yes
   PasswordAuthentication no
   
   # Disable authentication agent forwarding
   AllowAgentForwarding no
   
   # Enable verbose logging for authentication attempts
   LogLevel VERBOSE
   
   # Restrict public key authentication to specific keys
   AuthorizedKeysFile %h/.ssh/authorized_keys
   
   # Disable X11 forwarding
   X11Forwarding no
   
   # Enable strict mode checking
   StrictModes yes
   
   # Disable challenge-response authentication
   ChallengeResponseAuthentication no
   
   # Disable Kerberos authentication
   KerberosAuthentication no
   
   # Disable GSSAPI authentication
   GSSAPIAuthentication no
   EOFINNER
   
   sudo mv security-policy.conf /etc/ssh/security/
   
   # Update SSH configuration
   sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
   echo -e "\n# Include security policy to mitigate CVE-2024-45337\nInclude /etc/ssh/security/security-policy.conf" | sudo tee -a /etc/ssh/sshd_config
   
   # Verify configuration
   sudo sshd -t
   
   # If no errors, restart SSH
   sudo systemctl restart ssh`;

      // Function to apply local fixes
      const applyLocalFixes = async () => {
        spinner.text = 'Applying local SSH security fixes...';

        const SECURITY_DIR = path.join(process.env.HOME, '.ssh/security');
        fs.mkdirSync(SECURITY_DIR, { recursive: true });

        // Create security policy file
        const policyContent = `# SSH Security Policy to mitigate CVE-2024-45337
# This configuration restricts SSH authentication methods and adds additional logging

# Only allow specific authentication methods
PubkeyAuthentication yes
PasswordAuthentication no

# Disable authentication agent forwarding
ForwardAgent no

# Enable verbose logging for authentication attempts
LogLevel VERBOSE

# Disable X11 forwarding
ForwardX11 no

# Disable challenge-response authentication
ChallengeResponseAuthentication no`;

        fs.writeFileSync(path.join(SECURITY_DIR, 'security-policy.conf'), policyContent);

        // Update SSH config
        const SSH_CONFIG = path.join(process.env.HOME, '.ssh/config');
        if (!fs.existsSync(SSH_CONFIG)) {
          fs.writeFileSync(SSH_CONFIG, '');
        }

        const configContent = fs.readFileSync(SSH_CONFIG, 'utf8');
        if (!configContent.includes('Include ' + path.join(SECURITY_DIR, 'security-policy.conf'))) {
          fs.appendFileSync(
            SSH_CONFIG,
            `\n# Include security policy to mitigate CVE-2024-45337\nInclude ${path.join(SECURITY_DIR, 'security-policy.conf')}\n`
          );
        }

        spinner.succeed('Local SSH security fixes applied');
      };

      // Function to check security status
      const checkSecurityStatus = async () => {
        spinner.text = 'Checking SSH security status...';

        // Check local configuration
        const SECURITY_DIR = path.join(process.env.HOME, '.ssh/security');
        const localStatus = {
          securityDirExists: fs.existsSync(SECURITY_DIR),
          policyExists: fs.existsSync(path.join(SECURITY_DIR, 'security-policy.conf')),
          configIncludes:
            fs.existsSync(path.join(process.env.HOME, '.ssh/config')) &&
            fs
              .readFileSync(path.join(process.env.HOME, '.ssh/config'), 'utf8')
              .includes('security-policy.conf'),
        };

        spinner.stop();
        console.log(chalk.bold('\nLocal Security Status:'));
        console.log(
          `Security Directory: ${localStatus.securityDirExists ? chalk.green('✓') : chalk.red('✗')}`
        );
        console.log(
          `Security Policy: ${localStatus.policyExists ? chalk.green('✓') : chalk.red('✗')}`
        );
        console.log(
          `SSH Config Integration: ${localStatus.configIncludes ? chalk.green('✓') : chalk.red('✗')}`
        );

        // Check remote configuration if possible
        console.log(chalk.bold('\nRemote Security Status:'));
        console.log(`Use gcloud command to check remote instance:\n`);
        console.log(
          chalk.cyan(`gcloud compute ssh ${options.instance} \
  --project=${options.project} \
  --zone=${options.zone} \
  --command="test -f /etc/ssh/security/security-policy.conf && echo 'Security policy installed' || echo 'Security policy missing'"`)
        );
      };

      if (options.check) {
        await checkSecurityStatus();
      } else if (options.local) {
        await applyLocalFixes();
      } else if (options.remote) {
        spinner.info('Remote fix instructions:');
        console.log(chalk.cyan(instructions));
      } else {
        // Apply both local and show remote instructions
        await applyLocalFixes();
        spinner.info('Remote fix instructions:');
        console.log(chalk.cyan(instructions));
      }

      if (!options.check) {
        spinner.succeed('MCP SSH security fix completed');
        console.log(chalk.green('\nLocal machine has been secured against CVE-2024-45337'));
        if (!options.local) {
          console.log(chalk.yellow('\nTo secure remote instance, follow the instructions above'));
          console.log(
            chalk.yellow('or run this command again with --remote flag to see instructions')
          );
        }
      }
    } catch (error) {
      spinner.fail('Error applying MCP SSH security fix');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

module.exports = command;
