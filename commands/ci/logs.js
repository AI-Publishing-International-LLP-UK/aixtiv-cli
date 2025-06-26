// commands/ci/logs.js
// CI logs command implementation

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

// Create a command for CI logs
const logsCommand = new Command('logs')
  .description('View logs from CI/CD processes')
  .option('--filter <filter>', 'Filter logs by string pattern')
  .option('--limit <limit>', 'Limit the number of log files shown', '20')
  .option('--path <path>', 'Path to logs directory', './logs')
  .option('--cat <filename>', 'Display contents of a specific log file')
  .action(async (options) => {
    const spinner = ora('Checking for logs...').start();

    // If user wants to view a specific log file
    if (options.cat) {
      try {
        const logPath = path.resolve(options.path, options.cat);

        // Security check to make sure we're not accessing files outside logs dir
        const normalizedLogDir = path.resolve(options.path);
        if (!logPath.startsWith(normalizedLogDir)) {
          spinner.fail('Security error: Cannot access files outside the logs directory');
          return;
        }

        if (fs.existsSync(logPath)) {
          spinner.succeed(`Displaying log file: ${options.cat}`);
          console.log(chalk.cyan('\n=== Log Contents ==='));
          const logContent = fs.readFileSync(logPath, 'utf8');
          console.log(logContent);
          console.log(chalk.cyan('=== End of Log ===\n'));
        } else {
          spinner.fail(`Log file not found: ${options.cat}`);
          console.log(chalk.yellow(`File does not exist at path: ${logPath}`));
        }
        return;
      } catch (error) {
        spinner.fail('Error reading log file');
        console.error(chalk.red(`Error: ${error.message}`));
        return;
      }
    }

    // List available log files
    try {
      if (fs.existsSync(options.path)) {
        const files = fs.readdirSync(options.path);

        // Filter log files
        let logFiles = files.filter((file) => {
          if (options.filter) {
            return file.includes(options.filter);
          }
          return true;
        });

        // Apply limit
        const limit = parseInt(options.limit);
        if (logFiles.length > limit) {
          logFiles = logFiles.slice(0, limit);
        }

        if (logFiles.length > 0) {
          spinner.succeed(`Found ${logFiles.length} log files in ${options.path}`);
          console.log();

          // Display files with details
          logFiles.forEach((file) => {
            try {
              const filePath = path.join(options.path, file);
              const stats = fs.statSync(filePath);
              const fileSizeKb = (stats.size / 1024).toFixed(2);
              const modifiedDate = stats.mtime.toISOString().replace(/T/, ' ').replace(/\..+/, '');

              console.log(
                chalk.green(`${file}`) +
                  chalk.gray(` (${fileSizeKb} KB, modified: ${modifiedDate})`)
              );
            } catch (error) {
              console.log(chalk.green(file) + chalk.red(' (error reading file details)'));
            }
          });

          console.log();
          console.log(
            chalk.blue(`Use 'aixtiv ci logs --cat FILENAME' to view a specific log file`)
          );
        } else {
          spinner.info('No log files found matching your criteria');
        }
      } else {
        spinner.warn(`No logs directory found at ${options.path}`);
        console.log(chalk.yellow('Try running a CI/CD operation first to generate logs'));
      }
    } catch (error) {
      spinner.fail('Error listing log files');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

module.exports = logsCommand;
