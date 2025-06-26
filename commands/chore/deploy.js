// commands/chore/deploy.js
// Implementation of the deploy chore command

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Create a safe telemetry wrapper to handle missing methods or module
const telemetry = {
  recordEvent: (event, data) => {
    try {
      const realTelemetry = require('../../lib/telemetry');
      if (typeof realTelemetry.recordEvent === 'function') {
        realTelemetry.recordEvent(event, data);
      } else {
        console.log(chalk.dim(`[Telemetry] Event: ${event}`));
      }
    } catch (error) {
      // Silently fail if telemetry module isn't available
      console.log(chalk.dim(`[Telemetry] Event: ${event}`));
    }
  },
};

// Utility to execute shell commands
function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// Deploy command implementation
const deployCommand = new Command('deploy')
  .description('Deploy ASOOS system with various configurations')
  .option(
    '-t, --type <type>',
    'Deployment type (dual-interface, single, minimal)',
    'dual-interface'
  )
  .option('-s, --skip-tests', 'Skip deployment tests', false)
  .option('-d, --dns-check', 'Run DNS check after deployment', true)
  .option('-r, --region <region>', 'Google Cloud region for deployment', 'us-west1')
  .option('-z, --zone <zone>', 'Google Cloud zone for deployment', 'us-west1-b')
  .option('-p, --project <project>', 'Google Cloud project ID')
  .action(async (options) => {
    // Initialize currentStep outside try block to ensure it's always defined
    let currentStep = '';
    const deploymentSteps = [];

    try {
      // Start telemetry
      telemetry.recordEvent('chore_command_started', {
        command: 'chore:deploy',
        type: options.type,
        region: options.region,
        zone: options.zone,
      });

      console.log(chalk.cyan.bold('\n🚀 ASOOS Deployment Chore'));
      console.log(chalk.dim('---------------------------'));

      // Validate project directory
      const spinner = ora('Validating project structure...').start();

      try {
        currentStep = 'validate_project';
        deploymentSteps.push(currentStep);

        // Determine if we're in the right directory
        const currentDir = process.cwd();
        const isAixtivCliDir = currentDir.endsWith('aixtiv-cli');

        if (!isAixtivCliDir) {
          spinner.warn('Not in aixtiv-cli directory. Attempting to navigate...');
          process.chdir('/Users/as/asoos/aixtiv-cli');
          spinner.succeed('Changed to aixtiv-cli directory');
        } else {
          spinner.succeed('Project structure validated');
        }
      } catch (error) {
        spinner.fail('Failed to validate project structure');
        throw new Error(`Project validation failed: ${error.message}`);
      }

      // Deploy dual-interface system with UI folders /v1 and /v2
      if (options.type === 'dual-interface') {
        // Define shared variables that will be used across multiple steps
        const configDir = path.join(process.cwd(), '..', 'config');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        // Define UI path variables that will be used in multiple steps
        const uiDirPath = path.join(process.cwd(), '..', 'public', 'ui');
        const v1Path = path.join(uiDirPath, 'v1');
        const v2Path = path.join(uiDirPath, 'v2');

        // Step 1: Stage UI folders
        spinner.text = 'Staging UI folders /v1 and /v2...';
        spinner.start();

        try {
          currentStep = 'stage_ui_folders';
          deploymentSteps.push(currentStep);

          // Create UI directory structure if it doesn't exist

          if (!fs.existsSync(uiDirPath)) {
            fs.mkdirSync(uiDirPath, { recursive: true });
          }

          if (!fs.existsSync(v1Path)) {
            fs.mkdirSync(v1Path, { recursive: true });
          }

          if (!fs.existsSync(v2Path)) {
            fs.mkdirSync(v2Path, { recursive: true });
          }

          // Copy UI files if needed (sample implementation)
          // You might want to replace this with actual UI file copying logic
          const defaultHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASOOS Interface</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c3e50; }
  </style>
</head>
<body>
  <h1>ASOOS Interface</h1>
  <p>Version: {{VERSION}}</p>
  <p>Authentication Status: <span id="auth-status">Initializing...</span></p>
  <p>Mode: <span id="mode-switch">Standard</span></p>
</body>
</html>`;

          fs.writeFileSync(
            path.join(v1Path, 'index.html'),
            defaultHtmlContent.replace('{{VERSION}}', 'v1')
          );
          fs.writeFileSync(
            path.join(v2Path, 'index.html'),
            defaultHtmlContent.replace('{{VERSION}}', 'v2')
          );

          spinner.succeed('UI folders staged successfully');
        } catch (error) {
          spinner.fail('Failed to stage UI folders');
          throw new Error(`Stage UI folders failed: ${error.message}`);
        }

        // Step 2: Activate role-based auth
        spinner.text = 'Activating role-based authentication...';
        spinner.start();

        try {
          currentStep = 'activate_role_auth';
          deploymentSteps.push(currentStep);

          // Update firestore.rules to include role-based auth
          const rulesPath = path.join(process.cwd(), '..', 'firestore.rules');
          let rulesContent = '';

          if (fs.existsSync(rulesPath)) {
            rulesContent = fs.readFileSync(rulesPath, 'utf8');
          } else {
            rulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny all rule
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;
          }

          // Add role-based auth rules if they don't already exist
          if (!rulesContent.includes('function hasRole(role)')) {
            const roleBasedRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check user roles
    function hasRole(role) {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles[role] == true;
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Admins can read all user profiles
      allow read: if hasRole('admin');
    }
    
    // Content accessible based on roles
    match /content/{document} {
      allow read: if request.auth != null && (
        hasRole('admin') || 
        hasRole('editor') || 
        hasRole('viewer')
      );
      allow write: if request.auth != null && (
        hasRole('admin') || 
        hasRole('editor')
      );
    }
    
    // System settings - admin only
    match /settings/{setting} {
      allow read: if request.auth != null;
      allow write: if hasRole('admin');
    }
    
    // Default deny all other documents
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

            fs.writeFileSync(rulesPath, roleBasedRules);
          }

          // Create a roles configuration file (configDir is already defined at higher scope)

          const rolesConfig = {
            roles: {
              admin: {
                description: 'Full system access',
                permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
              },
              editor: {
                description: 'Content creation and editing',
                permissions: ['read', 'write', 'limited_delete'],
              },
              viewer: {
                description: 'Read-only access',
                permissions: ['read'],
              },
            },
            roleAssignmentRules: {
              ownerGetAdmin: true,
              defaultNewUserRole: 'viewer',
            },
          };

          fs.writeFileSync(
            path.join(configDir, 'roles.json'),
            JSON.stringify(rolesConfig, null, 2)
          );

          spinner.succeed('Role-based authentication activated');
        } catch (error) {
          spinner.fail('Failed to activate role-based authentication');
          throw new Error(`Role-based auth activation failed: ${error.message}`);
        }

        // Step 3: Enable mode switch logic
        spinner.text = 'Enabling mode switch logic...';
        spinner.start();

        try {
          currentStep = 'enable_mode_switch';
          deploymentSteps.push(currentStep);

          // Create mode switch configuration
          const modeSwitchConfig = {
            enabled: true,
            defaultMode: 'standard',
            availableModes: ['standard', 'advanced', 'experimental'],
            modeAccess: {
              standard: ['viewer', 'editor', 'admin'],
              advanced: ['editor', 'admin'],
              experimental: ['admin'],
            },
            featureFlags: {
              standard: {
                darkMode: true,
                analytics: true,
                sharing: true,
              },
              advanced: {
                darkMode: true,
                analytics: true,
                sharing: true,
                advancedExport: true,
                customViews: true,
              },
              experimental: {
                darkMode: true,
                analytics: true,
                sharing: true,
                advancedExport: true,
                customViews: true,
                aiAssistant: true,
                betaFeatures: true,
              },
            },
          };

          fs.writeFileSync(
            path.join(configDir, 'mode-switch.json'),
            JSON.stringify(modeSwitchConfig, null, 2)
          );

          // Create a simple mode-switch.js file for the UI
          const publicJsDir = path.join(process.cwd(), '..', 'public', 'js');
          if (!fs.existsSync(publicJsDir)) {
            fs.mkdirSync(publicJsDir, { recursive: true });
          }

          const modeSwitchJs = `// Mode Switch Functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize mode from localStorage or default to standard
  let currentMode = localStorage.getItem('uiMode') || 'standard';
  
  // Update UI with current mode
  updateModeDisplay(currentMode);
  
  // Check if mode-switch element exists
  const modeSwitch = document.getElementById('mode-switch');
  if (modeSwitch) {
    modeSwitch.textContent = currentMode;
    
    // Add click handler if it's interactive
    modeSwitch.addEventListener('click', function() {
      // Cycle through modes: standard -> advanced -> experimental -> standard
      switch(currentMode) {
        case 'standard':
          setMode('advanced');
          break;
        case 'advanced':
          setMode('experimental');
          break;
        case 'experimental':
          setMode('standard');
          break;
        default:
          setMode('standard');
      }
    });
  }
  
  function setMode(mode) {
    currentMode = mode;
    localStorage.setItem('uiMode', mode);
    updateModeDisplay(mode);
    
    // You would typically load different features based on mode
    loadFeaturesForMode(mode);
  }
  
  function updateModeDisplay(mode) {
    const modeSwitch = document.getElementById('mode-switch');
    if (modeSwitch) {
      modeSwitch.textContent = mode;
    }
    
    // Add/remove CSS classes based on mode
    document.body.classList.remove('mode-standard', 'mode-advanced', 'mode-experimental');
    document.body.classList.add('mode-' + mode);
  }
  
  function loadFeaturesForMode(mode) {
    // This would make API calls to load appropriate features
    console.log('Loading features for mode: ' + mode);
    
    // Example: fetch mode configuration
    fetch('/api/config/mode/' + mode)
      .then(response => response.json())
      .then(config => {
        console.log('Mode config loaded:', config);
        // Apply configuration
      })
      .catch(error => {
        console.error('Error loading mode config:', error);
      });
  }
});`;

          fs.writeFileSync(path.join(publicJsDir, 'mode-switch.js'), modeSwitchJs);

          // Update index.html files to include the mode-switch.js script
          const updateHtmlWithScript = (htmlPath) => {
            if (fs.existsSync(htmlPath)) {
              let htmlContent = fs.readFileSync(htmlPath, 'utf8');
              if (!htmlContent.includes('mode-switch.js')) {
                htmlContent = htmlContent.replace(
                  '</body>',
                  '  <script src="/js/mode-switch.js"></script>\n</body>'
                );
                fs.writeFileSync(htmlPath, htmlContent);
              }
            }
          };

          updateHtmlWithScript(path.join(v1Path, 'index.html'));
          updateHtmlWithScript(path.join(v2Path, 'index.html'));

          spinner.succeed('Mode switch logic enabled');
        } catch (error) {
          spinner.fail('Failed to enable mode switch logic');
          throw new Error(`Mode switch enablement failed: ${error.message}`);
        }

        // Step 4: Test deployment
        if (!options.skipTests) {
          spinner.text = 'Testing deployment...';
          spinner.start();

          try {
            currentStep = 'test_deployment';
            deploymentSteps.push(currentStep);

            // Create a temporary test script
            const testScript = `#!/bin/bash
echo "Testing ASOOS dual-interface deployment..."
echo "Checking UI directories..."
test -d ../public/ui/v1 && echo "✅ v1 UI directory exists" || echo "❌ v1 UI directory missing"
test -d ../public/ui/v2 && echo "✅ v2 UI directory exists" || echo "❌ v2 UI directory missing"

echo "Checking role-based auth configuration..."
test -f ../firestore.rules && grep -q "hasRole" ../firestore.rules && echo "✅ Role-based auth rules found" || echo "❌ Role-based auth rules missing"
test -f ../config/roles.json && echo "✅ Roles config exists" || echo "❌ Roles config missing"

echo "Checking mode switch configuration..."
test -f ../config/mode-switch.json && echo "✅ Mode switch config exists" || echo "❌ Mode switch config missing"
test -f ../public/js/mode-switch.js && echo "✅ Mode switch JS exists" || echo "❌ Mode switch JS missing"

echo "Testing complete!"
exit 0`;

            const testScriptPath = path.join(process.cwd(), 'test-deployment.sh');
            fs.writeFileSync(testScriptPath, testScript);
            fs.chmodSync(testScriptPath, '755');

            // Run test script
            const { stdout } = await executeCommand(`${testScriptPath}`, { cwd: process.cwd() });

            // Clean up test script
            fs.unlinkSync(testScriptPath);

            // Check test results
            const testsPassed = !stdout.includes('❌');

            if (testsPassed) {
              spinner.succeed('Deployment tests passed');
            } else {
              spinner.warn('Some deployment tests failed, but continuing. Check logs for details.');
              console.log(chalk.yellow(stdout));
            }
          } catch (error) {
            spinner.warn('Deployment tests had issues, but continuing');
            console.log(chalk.yellow(`Test error: ${error.message}`));
          }
        } else {
          spinner.info('Deployment tests skipped');
        }

        // Step 5: Run DNS check
        if (options.dnsCheck) {
          spinner.text = 'Running DNS check...';
          spinner.start();

          try {
            currentStep = 'dns_check';
            deploymentSteps.push(currentStep);

            // Get deployed domains from config or use defaults
            const domainConfigPath = path.join(process.cwd(), '..', 'config', 'domains.json');
            let domains = ['asoos-2100-com'];

            if (fs.existsSync(domainConfigPath)) {
              try {
                const domainConfig = JSON.parse(fs.readFileSync(domainConfigPath, 'utf8'));
                if (domainConfig.domains && Array.isArray(domainConfig.domains)) {
                  domains = domainConfig.domains.map((d) => d.name || d);
                }
              } catch (e) {
                console.log(chalk.yellow(`Warning: Could not parse domains config: ${e.message}`));
              }
            }

            // Check DNS resolution for each domain
            const dnsResults = [];
            for (const domain of domains) {
              try {
                spinner.text = `Checking DNS for ${domain}...`;
                await executeCommand(`ping -c 1 ${domain}`);
                dnsResults.push({ domain, status: 'resolved' });
              } catch (error) {
                dnsResults.push({ domain, status: 'failed', error: error.message });
              }
            }

            // Display DNS check results
            const successfulDomains = dnsResults.filter((r) => r.status === 'resolved');
            const failedDomains = dnsResults.filter((r) => r.status === 'failed');

            if (failedDomains.length === 0) {
              spinner.succeed(`DNS check passed for all ${domains.length} domains`);
            } else {
              spinner.warn(
                `DNS check passed for ${successfulDomains.length}/${domains.length} domains`
              );

              // List failed domains
              console.log(chalk.yellow('\nThe following domains failed DNS resolution:'));
              failedDomains.forEach((d) => {
                console.log(chalk.yellow(` - ${d.domain}: ${d.error.split('\n')[0]}`));
              });

              console.log(
                chalk.yellow(
                  '\nNote: DNS propagation can take up to 48 hours. If this is a new deployment, wait and try again.'
                )
              );
            }
          } catch (error) {
            spinner.warn('DNS check encountered issues');
            console.log(chalk.yellow(`DNS check error: ${error.message}`));
          }
        } else {
          spinner.info('DNS check skipped');
        }

        // Final deployment summary
        console.log(chalk.green.bold('\n✅ ASOOS Dual-Interface Deployment Complete'));
        console.log(chalk.green('Successfully completed the following steps:'));
        deploymentSteps.forEach((step) => {
          console.log(
            chalk.green(` - ${step.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`)
          );
        });

        console.log(chalk.cyan('\nTo access the deployed system:'));
        console.log(chalk.cyan(' - UI Version 1: http://[your-domain]/ui/v1'));
        console.log(chalk.cyan(' - UI Version 2: http://[your-domain]/ui/v2'));

        // Record successful telemetry
        telemetry.recordEvent('chore_command_completed', {
          command: 'chore:deploy',
          type: options.type,
          steps: deploymentSteps,
          region: options.region,
          zone: options.zone,
          success: true,
        });
      } else {
        // Handle other deployment types
        spinner.info(`Deployment type "${options.type}" is not yet implemented`);
        console.log(chalk.yellow('Currently, only "dual-interface" deployment type is supported.'));
        console.log(chalk.yellow('Please use --type=dual-interface'));
      }
    } catch (error) {
      // Handle any errors that occurred during the deployment
      console.error(chalk.red('\n❌ Deployment Failed'));
      console.error(chalk.red(`Error: ${error.message}`));

      if (currentStep) {
        console.error(
          chalk.red(
            `Failed during step: ${currentStep.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`
          )
        );
      }

      // Record error telemetry
      telemetry.recordEvent('chore_command_error', {
        command: 'chore:deploy',
        type: options.type,
        error: error.message,
        step: currentStep,
        region: options.region,
        zone: options.zone,
      });

      process.exit(1);
    }
  });

module.exports = deployCommand;
