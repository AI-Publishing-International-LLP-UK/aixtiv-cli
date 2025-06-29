/**
 * Dream Commander - Main CLI Command Module
 * 
 * Command module for the Dream Commander system, integrating with the
 * aixtiv-cli infrastructure to provide management of the high-volume
 * prompt processing system.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');
const gradient = require('gradient-string');
const path = require('path');
const admin = require('firebase-admin');
const { Command } = require('commander');

// Initialize firebase admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Create Dream Commander command
const dreamCommanderCommand = new Command('dream')
  .description('Dream Commander - High-volume prompt routing and processing system')
  .addHelpText('before', () => {
    return gradient.pastel.multiline([
      '╔══════════════════════════════════════════════════════════════════╗',
      '║                       DREAM COMMANDER                            ║',
      '║          High-Volume Prompt Routing & Processing System          ║',
      '╚══════════════════════════════════════════════════════════════════╝'
    ].join('\n'));
  });

// Status command
dreamCommanderCommand
  .command('status')
  .description('Check Dream Commander system status')
  .option('-c, --component <component>', 'Specific component to check (processor, router, classifier, channels)')
  .option('-d, --detailed', 'Show detailed status information')
  .action(async (options) => {
    try {
      const { component, detailed } = options;
      const spinner = ora('Checking Dream Commander status...').start();
      
      // Dynamic import of the message processor
      let processor;
      try {
        processor = require('../../dream-commander/src/core/message-processor');
        await processor.initialize();
      } catch (error) {
        spinner.fail('Dream Commander system not fully initialized');
        console.error(chalk.red(`Error: ${error.message}`));
        return;
      }
      
      // Get component status
      if (component) {
        try {
          let componentModule;
          
          switch (component.toLowerCase()) {
            case 'processor':
              componentModule = processor;
              break;
            case 'router':
              componentModule = require('../../dream-commander/src/routing/router');
              break;
            case 'classifier':
              componentModule = require('../../dream-commander/src/classification/classifier');
              break;
            case 'channels':
              // Get status of all channels
              const apiChannel = require('../../dream-commander/src/channels/api');
              const emailChannel = require('../../dream-commander/src/channels/email');
              
              spinner.succeed(`Dream Commander ${component} status`);
              
              // Display API channel status
              console.log(boxen(
                chalk.cyan('API Channel:\n') +
                `Status: ${apiChannel.initialized ? chalk.green('Running') : chalk.yellow('Stopped')}\n` +
                `Received: ${apiChannel.stats?.received || 0}\n` +
                `Errors: ${apiChannel.stats?.errors || 0}\n` +
                `Rate Limited: ${apiChannel.stats?.rateLimited || 0}`,
                { padding: 1, margin: 1, borderColor: 'cyan' }
              ));
              
              // Display Email channel status
              console.log(boxen(
                chalk.cyan('Email Channel:\n') +
                `Status: ${emailChannel.initialized ? chalk.green('Running') : chalk.yellow('Stopped')}\n` +
                `Received: ${emailChannel.stats?.received || 0}\n` +
                `Sent: ${emailChannel.stats?.sent || 0}\n` +
                `Errors: ${emailChannel.stats?.errors || 0}\n` +
                `Attachments: ${emailChannel.stats?.attachments || 0}`,
                { padding: 1, margin: 1, borderColor: 'cyan' }
              ));
              
              return;
            default:
              throw new Error(`Unknown component: ${component}`);
          }
          
          // Get status from the component
          spinner.succeed(`Dream Commander ${component} status`);
          
          const stats = componentModule.getStats ? componentModule.getStats() : { status: 'Unknown' };
          
          console.log(boxen(
            Object.entries(stats).map(([key, value]) => {
              if (typeof value === 'object') {
                return `${chalk.cyan(key)}:\n${JSON.stringify(value, null, 2)}`;
              }
              return `${chalk.cyan(key)}: ${value}`;
            }).join('\n'),
            { padding: 1, margin: 1, borderColor: 'cyan' }
          ));
          
        } catch (error) {
          spinner.fail(`Failed to get ${component} status`);
          console.error(chalk.red(`Error: ${error.message}`));
        }
        
        return;
      }
      
      // Overall system status
      spinner.succeed('Dream Commander system status');
      
      // Get message processing stats
      const processorStats = processor.getStats();
      
      console.log(boxen(
        chalk.cyan('Message Processor:\n') +
        `Processed: ${processorStats.processed}\n` +
        `Failed: ${processorStats.failed}\n` +
        `Avg. Latency: ${processorStats.averageLatency}ms\n` +
        (detailed ? `Channel Counts: ${JSON.stringify(processorStats.channelCounts, null, 2)}\n` : ''),
        { padding: 1, margin: 1, borderColor: 'cyan' }
      ));
      
      try {
        // Get router stats if available
        const router = require('../../dream-commander/src/routing/router');
        const routerStats = router.getStats();
        
        console.log(boxen(
          chalk.cyan('Message Router:\n') +
          `Routed: ${routerStats.routed}\n` +
          `Failed: ${routerStats.failed}\n` +
          (detailed ? `Agent Counts: ${JSON.stringify(routerStats.agentCounts, null, 2)}\n` : ''),
          { padding: 1, margin: 1, borderColor: 'cyan' }
        ));
      } catch (error) {
        console.warn(chalk.yellow('Router status not available'));
      }
      
      // Show Firebase collection stats
      const db = admin.firestore();
      
      try {
        const messageSnapshot = await db.collection('dream_commander_messages').count().get();
        const taskSnapshot = await db.collection('dream_commander_tasks').count().get();
        
        console.log(boxen(
          chalk.cyan('Database Stats:\n') +
          `Messages: ${messageSnapshot.data().count}\n` +
          `Tasks: ${taskSnapshot.data().count}`,
          { padding: 1, margin: 1, borderColor: 'cyan' }
        ));
      } catch (error) {
        console.warn(chalk.yellow('Database stats not available'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error checking Dream Commander status:'), error.message);
    }
  });

// Configuration command
dreamCommanderCommand
  .command('config')
  .description('Manage Dream Commander configuration')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-r, --reset', 'Reset configuration to defaults')
  .option('-l, --list', 'List all configuration values')
  .action(async (options) => {
    try {
      const { set, get, reset, list } = options;
      const spinner = ora('Managing Dream Commander configuration...').start();
      
      // Load configuration from Firebase
      const db = admin.firestore();
      const configRef = db.collection('dream_commander_config').doc('system');
      const configDoc = await configRef.get();
      
      // Create default config if it doesn't exist
      if (!configDoc.exists) {
        // Load default config
        const defaultConfig = require('../../dream-commander/config/default.json').dreamCommander;
        
        // Store in Firebase
        await configRef.set(defaultConfig);
        
        spinner.succeed('Default configuration created');
      }
      
      const currentConfig = configDoc.exists ? configDoc.data() : require('../../dream-commander/config/default.json').dreamCommander;
      
      // Handle get configuration
      if (get) {
        spinner.succeed(`Getting configuration: ${get}`);
        
        // Parse nested key
        const keys = get.split('.');
        let value = currentConfig;
        
        for (const key of keys) {
          if (value[key] === undefined) {
            console.log(chalk.yellow(`Configuration key not found: ${get}`));
            return;
          }
          value = value[key];
        }
        
        if (typeof value === 'object') {
          console.log(boxen(
            JSON.stringify(value, null, 2),
            { padding: 1, margin: 1, borderColor: 'green' }
          ));
        } else {
          console.log(boxen(
            `${get} = ${value}`,
            { padding: 1, margin: 1, borderColor: 'green' }
          ));
        }
        
        return;
      }
      
      // Handle set configuration
      if (set) {
        spinner.succeed(`Setting configuration: ${set}`);
        
        // Parse key=value pair
        const match = set.match(/^([^=]+)=(.*)$/);
        
        if (!match) {
          console.log(chalk.red('Invalid format. Use key=value'));
          return;
        }
        
        const [, key, value] = match;
        
        // Parse nested key
        const keys = key.split('.');
        let configObject = { ...currentConfig };
        let current = configObject;
        
        // Navigate to the nested property, creating objects as needed
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          
          if (!current[k]) {
            current[k] = {};
          }
          
          current = current[k];
        }
        
        // Set the value
        const lastKey = keys[keys.length - 1];
        
        // Try to parse as JSON if possible
        try {
          current[lastKey] = JSON.parse(value);
        } catch (e) {
          // If not valid JSON, use the string value
          current[lastKey] = value;
        }
        
        // Save to Firebase
        await configRef.set(configObject);
        
        console.log(chalk.green(`Configuration ${key} updated successfully`));
        
        return;
      }
      
      // Handle reset configuration
      if (reset) {
        const confirm = await promptConfirmation('Are you sure you want to reset configuration to defaults?');
        
        if (confirm) {
          spinner.start('Resetting configuration...');
          
          // Load default config
          const defaultConfig = require('../../dream-commander/config/default.json').dreamCommander;
          
          // Store in Firebase
          await configRef.set(defaultConfig);
          
          spinner.succeed('Configuration reset to defaults');
        } else {
          spinner.info('Reset cancelled');
        }
        
        return;
      }
      
      // Handle list configuration
      if (list) {
        spinner.succeed('Current Dream Commander configuration:');
        
        console.log(boxen(
          JSON.stringify(currentConfig, null, 2),
          { padding: 1, margin: 1, borderColor: 'blue' }
        ));
        
        return;
      }
      
      // If no options specified, show help
      dreamCommanderCommand.help();
      
    } catch (error) {
      console.error(chalk.red('Error managing Dream Commander configuration:'), error.message);
    }
  });

// Start command
dreamCommanderCommand
  .command('start')
  .description('Start Dream Commander system or specific component')
  .option('-c, --component <component>', 'Specific component to start (processor, api, email)')
  .option('-d, --detached', 'Run in detached mode')
  .action(async (options) => {
    try {
      const { component, detached } = options;
      const spinner = ora('Starting Dream Commander system...').start();
      
      // Handle specific component
      if (component) {
        switch (component.toLowerCase()) {
          case 'processor':
            // Load and initialize message processor
            try {
              const processor = require('../../dream-commander/src/core/message-processor');
              await processor.initialize();
              spinner.succeed('Dream Commander message processor started');
            } catch (error) {
              spinner.fail('Failed to start message processor');
              console.error(chalk.red(`Error: ${error.message}`));
            }
            break;
            
          case 'api':
            // Load and initialize API channel
            try {
              const apiChannel = require('../../dream-commander/src/channels/api');
              await apiChannel.initialize();
              spinner.succeed('Dream Commander API channel started');
              console.log(chalk.green(`API listening on port ${apiChannel.port}`));
            } catch (error) {
              spinner.fail('Failed to start API channel');
              console.error(chalk.red(`Error: ${error.message}`));
            }
            break;
            
          case 'email':
            // Load and initialize Email channel
            try {
              const emailChannel = require('../../dream-commander/src/channels/email');
              await emailChannel.initialize();
              spinner.succeed('Dream Commander Email channel started');
            } catch (error) {
              spinner.fail('Failed to start Email channel');
              console.error(chalk.red(`Error: ${error.message}`));
            }
            break;
            
          default:
            spinner.fail(`Unknown component: ${component}`);
            break;
        }
        
        return;
      }
      
      // Start all components
      try {
        // Start message processor
        const processor = require('../../dream-commander/src/core/message-processor');
        await processor.initialize();
        
        // Start API channel
        const apiChannel = require('../../dream-commander/src/channels/api');
        await apiChannel.initialize();
        
        // Start Email channel
        const emailChannel = require('../../dream-commander/src/channels/email');
        await emailChannel.initialize();
        
        spinner.succeed('Dream Commander system started successfully');
        
        console.log(boxen(
          chalk.green('Dream Commander system is running\n\n') +
          `API Service: ${chalk.cyan(`http://localhost:${apiChannel.port}`)}\n` +
          `Email Polling: ${emailChannel.polling ? chalk.green('Active') : chalk.yellow('Inactive')}\n` +
          `Message Processor: ${chalk.green('Running')}`,
          { padding: 1, margin: 1, borderColor: 'green' }
        ));
        
        // Keep process running if not detached
        if (!detached) {
          console.log(chalk.blue('Press Ctrl+C to stop Dream Commander'));
          // eslint-disable-next-line no-constant-condition
          while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
      } catch (error) {
        spinner.fail('Failed to start Dream Commander system');
        console.error(chalk.red(`Error: ${error.message}`));
      }
      
    } catch (error) {
      console.error(chalk.red('Error starting Dream Commander:'), error.message);
    }
  });

// Stop command
dreamCommanderCommand
  .command('stop')
  .description('Stop Dream Commander system or specific component')
  .option('-c, --component <component>', 'Specific component to stop (processor, api, email)')
  .action(async (options) => {
    try {
      const { component } = options;
      const spinner = ora('Stopping Dream Commander system...').start();
      
      // Handle specific component
      if (component) {
        switch (component.toLowerCase()) {
          case 'processor':
            // We don't have a direct way to stop the processor in this implementation
            spinner.info('Message processor will stop with the process');
            break;
            
          case 'api':
            // Stop API channel
            try {
              const apiChannel = require('../../dream-commander/src/channels/api');
              apiChannel.shutdown();
              spinner.succeed('Dream Commander API channel stopped');
            } catch (error) {
              spinner.fail('Failed to stop API channel');
              console.error(chalk.red(`Error: ${error.message}`));
            }
            break;
            
          case 'email':
            // Stop Email channel
            try {
              const emailChannel = require('../../dream-commander/src/channels/email');
              await emailChannel.shutdown();
              spinner.succeed('Dream Commander Email channel stopped');
            } catch (error) {
              spinner.fail('Failed to stop Email channel');
              console.error(chalk.red(`Error: ${error.message}`));
            }
            break;
            
          default:
            spinner.fail(`Unknown component: ${component}`);
            break;
        }
        
        return;
      }
      
      // Stop all components
      try {
        // Stop API channel if loaded
        try {
          const apiChannel = require('../../dream-commander/src/channels/api');
          apiChannel.shutdown();
        } catch (error) {
          console.warn(chalk.yellow('API channel not running or failed to stop'));
        }
        
        // Stop Email channel if loaded
        try {
          const emailChannel = require('../../dream-commander/src/channels/email');
          await emailChannel.shutdown();
        } catch (error) {
          console.warn(chalk.yellow('Email channel not running or failed to stop'));
        }
        
        spinner.succeed('Dream Commander system stopped');
        
      } catch (error) {
        spinner.fail('Failed to stop Dream Commander system');
        console.error(chalk.red(`Error: ${error.message}`));
      }
      
    } catch (error) {
      console.error(chalk.red('Error stopping Dream Commander:'), error.message);
    }
  });

// Stats command
dreamCommanderCommand
  .command('stats')
  .description('View Dream Commander system statistics')
  .option('-p, --period <period>', 'Time period (hour, day, week, month)', 'day')
  .option('-c, --channel <channel>', 'Filter by channel (api, email, sms, linkedin, threads)')
  .option('-f, --format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    try {
      const { period, channel, format } = options;
      const spinner = ora('Fetching Dream Commander statistics...').start();
      
      // Get stats from Firestore
      const db = admin.firestore();
      let query = db.collection('dream_commander_messages');
      
      // Apply time period filter
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }
      
      query = query.where('timestamp', '>=', startDate.toISOString());
      
      // Apply channel filter if provided
      if (channel) {
        query = query.where('channel', '==', channel);
      }
      
      const snapshot = await query.get();
      
      // Aggregate stats
      const stats = {
        total: snapshot.size,
        byChannel: {},
        byStatus: {},
        byPriority: {},
        avgProcessingTime: 0
      };
      
      // Calculate statistics
      let totalProcessingTime = 0;
      let processedCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Count by channel
        if (!stats.byChannel[data.channel]) {
          stats.byChannel[data.channel] = 0;
        }
        stats.byChannel[data.channel]++;
        
        // Count by status
        if (!stats.byStatus[data.status]) {
          stats.byStatus[data.status] = 0;
        }
        stats.byStatus[data.status]++;
        
        // Count by priority
        const priority = data.metadata?.priority || 'normal';
        if (!stats.byPriority[priority]) {
          stats.byPriority[priority] = 0;
        }
        stats.byPriority[priority]++;
        
        // Calculate processing time for completed messages
        if (data.status === 'completed' && data.completedAt) {
          const start = new Date(data.timestamp);
          const end = new Date(data.completedAt);
          const processingTime = end - start;
          
          totalProcessingTime += processingTime;
          processedCount++;
        }
      });
      
      // Calculate average processing time
      if (processedCount > 0) {
        stats.avgProcessingTime = Math.round(totalProcessingTime / processedCount);
      }
      
      spinner.succeed('Statistics fetched successfully');
      
      // Display stats
      if (format === 'json') {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        const Table = require('cli-table3');
        
        // Summary table
        const summaryTable = new Table({
          head: [chalk.cyan('Statistic'), chalk.cyan('Value')],
          colWidths: [25, 20],
        });
        
        summaryTable.push(
          ['Total Messages', stats.total],
          ['Avg Processing Time', `${Math.round(stats.avgProcessingTime / 1000)}s`]
        );
        
        console.log(chalk.bold(`\nSummary - Last ${period}:`));
        console.log(summaryTable.toString());
        
        // By channel table
        const channelTable = new Table({
          head: [chalk.cyan('Channel'), chalk.cyan('Count'), chalk.cyan('Percentage')],
          colWidths: [15, 10, 15],
        });
        
        for (const [channel, count] of Object.entries(stats.byChannel)) {
          channelTable.push([
            channel,
            count,
            `${Math.round((count / stats.total) * 100)}%`
          ]);
        }
        
        console.log(chalk.bold('\nBy Channel:'));
        console.log(channelTable.toString());
        
        // By status table
        const statusTable = new Table({
          head: [chalk.cyan('Status'), chalk.cyan('Count'), chalk.cyan('Percentage')],
          colWidths: [15, 10, 15],
        });
        
        for (const [status, count] of Object.entries(stats.byStatus)) {
          statusTable.push([
            status,
            count,
            `${Math.round((count / stats.total) * 100)}%`
          ]);
        }
        
        console.log(chalk.bold('\nBy Status:'));
        console.log(statusTable.toString());
        
        // By priority table
        const priorityTable = new Table({
          head: [chalk.cyan('Priority'), chalk.cyan('Count'), chalk.cyan('Percentage')],
          colWidths: [15, 10, 15],
        });
        
        for (const [priority, count] of Object.entries(stats.byPriority)) {
          priorityTable.push([
            priority,
            count,
            `${Math.round((count / stats.total) * 100)}%`
          ]);
        }
        
        console.log(chalk.bold('\nBy Priority:'));
        console.log(priorityTable.toString());
      }
      
    } catch (error) {
      console.error(chalk.red('Error fetching Dream Commander statistics:'), error.message);
    }
  });

// Message command
dreamCommanderCommand
  .command('message')
  .description('Manage Dream Commander messages')
  .option('-i, --id <id>', 'Message ID')
  .option('-v, --view', 'View message details')
  .option('-l, --list', 'List recent messages')
  .option('-c, --channel <channel>', 'Filter by channel')
  .option('--limit <limit>', 'Limit number of results', '10')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      const { id, view, list, channel, limit, status } = options;
      const spinner = ora('Managing Dream Commander messages...').start();
      
      // Get Firestore instance
      const db = admin.firestore();
      
      // Handle view message
      if (id && view) {
        spinner.text = `Fetching message ${id}...`;
        
        const messageDoc = await db.collection('dream_commander_messages').doc(id).get();
        
        if (!messageDoc.exists) {
          spinner.fail(`Message not found: ${id}`);
          return;
        }
        
        spinner.succeed(`Message ${id} details:`);
        
        const message = messageDoc.data();
        
        console.log(boxen(
          chalk.cyan(`Message ID: ${id}\n`) +
          `Channel: ${message.channel}\n` +
          `Status: ${message.status}\n` +
          `Timestamp: ${message.timestamp}\n` +
          `Sender: ${typeof message.sender === 'object' ? JSON.stringify(message.sender) : message.sender}\n\n` +
          `Content: ${typeof message.content === 'object' ? JSON.stringify(message.content, null, 2) : message.content}\n\n` +
          (message.classification ? `Classification: ${JSON.stringify(message.classification, null, 2)}\n\n` : '') +
          (message.routing ? `Routing: ${JSON.stringify(message.routing, null, 2)}` : ''),
          { padding: 1, margin: 1, borderColor: 'blue' }
        ));
        
        return;
      }
      
      // Handle list messages
      if (list) {
        spinner.text = 'Fetching recent messages...';
        
        let query = db.collection('dream_commander_messages')
          .orderBy('timestamp', 'desc')
          .limit(parseInt(limit, 10));
        
        // Apply channel filter if provided
        if (channel) {
          query = query.where('channel', '==', channel);
        }
        
        // Apply status filter if provided
        if (status) {
          query = query.where('status', '==', status);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          spinner.info('No messages found');
          return;
        }
        
        spinner.succeed(`Found ${snapshot.size} messages`);
        
        const Table = require('cli-table3');
        const table = new Table({
          head: [
            chalk.cyan('ID'),
            chalk.cyan('Channel'),
            chalk.cyan('Status'),
            chalk.cyan('Timestamp'),
            chalk.cyan('Sender'),
            chalk.cyan('Content Preview')
          ],
          colWidths: [10, 10, 12, 24, 20, 30],
          wordWrap: true
        });
        
        snapshot.forEach(doc => {
          const message = doc.data();
          
          // Get content preview
          let contentPreview;
          
          if (typeof message.content === 'string') {
            contentPreview = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
          } else if (message.content.subject) {
            contentPreview = message.content.subject.substring(0, 50) + (message.content.subject.length > 50 ? '...' : '');
          } else if (message.content.text) {
            contentPreview = message.content.text.substring(0, 50) + (message.content.text.length > 50 ? '...' : '');
          } else {
            contentPreview = '[Complex content]';
          }
          
          // Get sender preview
          let senderPreview;
          
          if (typeof message.sender === 'string') {
            senderPreview = message.sender;
          } else if (message.sender.email) {
            senderPreview = message.sender.email;
          } else if (message.sender.apiKey) {
            senderPreview = `API:${message.sender.apiKey.substring(0, 8)}...`;
          } else {
            senderPreview = '[Unknown]';
          }
          
          table.push([
            doc.id.substring(0, 8),
            message.channel,
            message.status,
            message.timestamp,
            senderPreview,
            contentPreview
          ]);
        });
        
        console.log(table.toString());
        
        console.log(chalk.blue('\nView message details:'));
        console.log(`  aixtiv dream message --id <message_id> --view`);
        
        return;
      }
      
      // If no options specified, show help
      dreamCommanderCommand.help();
      
    } catch (error) {
      console.error(chalk.red('Error managing Dream Commander messages:'), error.message);
    }
  });

// Test command for quick testing
dreamCommanderCommand
  .command('test')
  .description('Test Dream Commander functionality')
  .option('-c, --channel <channel>', 'Test channel (api, email)', 'api')
  .option('-m, --message <message>', 'Test message content', 'This is a test message')
  .action(async (options) => {
    try {
      const { channel, message } = options;
      const spinner = ora(`Testing Dream Commander ${channel} channel...`).start();
      
      switch (channel) {
        case 'api': {
          // Create test message
          const testMessage = {
            content: message,
            metadata: {
              test: true,
              timestamp: new Date().toISOString()
            }
          };
          
          // Load processor
          const processor = require('../../dream-commander/src/core/message-processor');
          await processor.initialize();
          
          // Process test message
          const normalizedMessage = {
            id: `test-${Date.now()}`,
            channel: 'api',
            content: testMessage.content,
            timestamp: new Date().toISOString(),
            sender: {
              test: true
            },
            metadata: testMessage.metadata
          };
          
          // Submit message
          processor.emit('message:received', normalizedMessage);
          
          spinner.succeed('Test message submitted to processor');
          console.log(chalk.green(`Message ID: ${normalizedMessage.id}`));
          console.log(chalk.blue('Check status with:'));
          console.log(`  aixtiv dream message --id ${normalizedMessage.id} --view`);
          break;
        }
          
        case 'email': {
          spinner.text = 'Email channel testing is not implemented yet';
          spinner.warn('Email channel testing is not implemented yet');
          break;
        }
          
        default:
          spinner.fail(`Unknown channel: ${channel}`);
          break;
      }
      
    } catch (error) {
      console.error(chalk.red('Error testing Dream Commander:'), error.message);
    }
  });

/**
 * Helper function to prompt for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - True if confirmed, false otherwise
 */
async function promptConfirmation(message) {
  const inquirer = require('inquirer');
  
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message,
      default: false
    }
  ]);
  
  return answer.confirm;
}

module.exports = dreamCommanderCommand;