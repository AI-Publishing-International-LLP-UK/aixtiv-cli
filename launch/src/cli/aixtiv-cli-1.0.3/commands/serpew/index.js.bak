/**
 * SERPEW (Squadron Extended Repository for Performance Enhancement and Wisdom)
 * Command registration module
 *
 * Registers all SERPEW-related commands with the CLI
 */

const { Command } = require('commander');
const chalk = require('chalk');

/**
 * Register SERPEW commands with the CLI
 * @param {Command} program The Commander program instance
 */
function registerCommands(program) {
  // Initialize command
  program
    .command('serpew:init')
    .description('Initialize the SERPEW system')
    .action(require('./init'));

  // Repository commands
  program
    .command('serpew:repository:add')
    .description('Add knowledge to a squadron repository')
    .option('-s, --squadron <squadron>', 'Squadron ID (R1, R2, R3, R4, R5, RIX)')
    .option('-r, --repository <repository>', 'Repository ID', 'general')
    .option('-c, --content <content>', 'Content to add')
    .option('-f, --file <file>', 'File path to read content from')
    .option('-t, --title <title>', 'Title for the knowledge entry')
    .option('--tags <tags>', 'Comma-separated list of tags')
    .option('--format <format>', 'Content format (text, json, markdown)', 'text')
    .action(require('./repository/add'));

  program
    .command('serpew:repository:query')
    .description('Query knowledge from repositories')
    .option('-s, --squadron <squadron>', 'Squadron ID (R1, R2, R3, R4, R5, RIX)')
    .option('-r, --repository <repository>', 'Repository ID')
    .option('-i, --id <id>', 'Knowledge entry ID')
    .option('--search <search>', 'Search term')
    .option('--tags <tags>', 'Comma-separated list of tags to filter by')
    .option('--limit <limit>', 'Maximum number of results', '10')
    .action(require('./repository/query'));

  // Sentiment tracking commands
  program
    .command('serpew:sentiment:track')
    .description('Track sentiment data from agent interactions')
    .requiredOption('-i, --interaction_id <id>', 'Interaction ID')
    .requiredOption('--sentiment <sentiment>', 'Sentiment value (positive, negative, neutral)')
    .option('-c, --content <content>', 'Interaction content')
    .option('-f, --file <file>', 'File containing interaction content')
    .option('-a, --agent <agent>', 'Agent ID (defaults to current agent)')
    .option('-s, --squadron <squadron>', 'Squadron ID')
    .option('--session_id <session_id>', 'Session ID')
    .option('--tags <tags>', 'Comma-separated list of tags')
    .option('--source <source>', 'Data source', 'manual')
    .action(require('./sentiment/track'));

  // Performance reporting commands
  program
    .command('serpew:performance:report')
    .description('Generate performance reports by squadron or agent')
    .option('-s, --squadron <squadron>', 'Squadron ID')
    .option('-a, --agent <agent>', 'Agent ID')
    .option('-p, --period <period>', 'Time period (24h, 7d, 30d, 90d, or number of days)', '7d')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(require('./performance/report'));

  return program;
}

module.exports = registerCommands;
