const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../lib/utils');

/**
 * Initialize a new aixtiv project with basic structure and configuration
 * @param {object} options - Command options
 */
module.exports = async function initializeProject(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('general');
  const { name, force } = parseOptions(options, {
    name: 'aixtiv-project',
  });

  // Define project structure
  const projectPath = path.resolve(process.cwd(), name);
  const directories = [
    '',
    'src',
    'src/commands',
    'src/handlers',
    'src/utils',
    'config',
    'assets',
    'docs',
  ];

  // Define files to create
  const files = [
    {
      path: '.env.example',
      content: `# Aixtiv Project Configuration
# Environment: development, staging, production
AIXTIV_ENV=development

# SalleyPort Security Configuration
SALLEYPORT_API_KEY=your_api_key_here
SALLEYPORT_ENDPOINT=https://api.salleyport.aixtiv.io/v1

# Claude Configuration
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_API_ENDPOINT=https://api.claude.ai/v1

# Logging Level: error, warn, info, verbose, debug
LOG_LEVEL=info
`,
    },
    {
      path: 'config/default.json',
      content: JSON.stringify(
        {
          project: {
            name: name,
            version: '1.0.0',
          },
          api: {
            salleyport: {
              timeout: 30000,
              retries: 3,
            },
            claude: {
              timeout: 60000,
              maxTokens: 4096,
            },
          },
          logging: {
            level: 'info',
            format: 'simple',
          },
          security: {
            authRequired: true,
            allowedAgents: [],
          },
        },
        null,
        2
      ),
    },
    {
      path: 'src/index.js',
      content: `#!/usr/bin/env node
const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');
require('dotenv').config();

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync('Aixtiv Project', { horizontalLayout: 'full' })
  )
);
console.log(chalk.blue(\`v\${packageJson.version} - Aixtiv Project\`));
console.log();

// Configure program
program
  .version(packageJson.version)
  .description('Aixtiv Project CLI');

// Define commands here
// Example:
// program
//   .command('example:command')
//   .description('Example command description')
//   .option('-o, --option <value>', 'Option description')
//   .action(require('./commands/example'));
const telemetry = require('../../lib/telemetry');

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (process.argv.length === 2) {
  program.outputHelp();
}
`,
    },
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: name,
          version: '1.0.0',
          description: 'Project created with aixtiv-cli',
          main: 'src/index.js',
          bin: {
            [name]: 'src/index.js',
          },
          scripts: {
            start: 'node src/index.js',
            test: 'echo "Error: no test specified" && exit 1',
          },
          keywords: ['aixtiv', 'project'],
          dependencies: {
            axios: '^1.3.4',
            chalk: '^4.1.2',
            commander: '^9.4.1',
            dotenv: '^16.5.0',
            figlet: '^1.5.2',
          },
        },
        null,
        2
      ),
    },
    {
      path: 'README.md',
      content: `# ${name}

## Overview
Project created with aixtiv-cli.

## Setup
1. Copy \`.env.example\` to \`.env\` and update with your configuration
2. Install dependencies with \`npm install\`
3. Run the CLI with \`npm start\`

## Configuration
Configuration files are stored in the \`config/\` directory.

## Project Structure
- \`src/\`: Source code
  - \`commands/\`: CLI command implementations
  - \`handlers/\`: Business logic handlers
  - \`utils/\`: Utility functions
- \`config/\`: Configuration files
- \`assets/\`: Static assets
- \`docs/\`: Documentation

## License
UNLICENSED
`,
    },
  ];

  try {
    // Check if directory exists
    if (fs.existsSync(projectPath) && !force) {
      console.error(chalk.red(`Error: Directory '${name}' already exists.`));
      console.log(chalk.yellow(`Use --force to overwrite existing directory.`));
      process.exit(1);
    }

    // Create project structure with spinner
    await withSpinner(`Initializing Aixtiv project structure in ${chalk.cyan(name)}`, async () => {
      // Create directories
      for (const dir of directories) {
        const dirPath = path.join(projectPath, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }

      // Create files
      for (const file of files) {
        const filePath = path.join(projectPath, file.path);
        fs.writeFileSync(filePath, file.content);
      }

      return true;
    });

    // Display result
    displayResult({
      success: true,
      message: `Project initialized successfully in ${chalk.cyan(projectPath)}`,
      details: {
        name: name,
        directories: directories.length,
        files: files.length,
      },
    });

    // Print next steps
    console.log(chalk.bold('\nNext Steps:'));
    console.log(`1. ${chalk.cyan(`cd ${name}`)}`);
    console.log(`2. ${chalk.cyan('cp .env.example .env')}`);
    console.log(`3. ${chalk.cyan('npm install')}`);
    console.log(`4. ${chalk.cyan('npm start')}`);
  } catch (error) {
    // Display error
    displayResult({
      success: false,
      message: 'Failed to initialize project',
      error: error.message,
    });

    process.exit(1);
  }
};
