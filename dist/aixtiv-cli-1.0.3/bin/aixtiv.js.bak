#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

// Initialize telemetry
const telemetry = require('../lib/telemetry');

// Initialize telemetry asynchronously
(async () => {
  try {
    await telemetry.init();
    // Set up graceful shutdown
    process.on('exit', () => {
      telemetry.shutdown();
    });
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
  }
})();

const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');
require('dotenv').config();

// Helper for date formatting
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Import command modules
const claudeCommands = require('../commands/claude');
const registerDomainCommands = require('../commands/domain');

// Initialize the program
program.version('1.0.1').description('Aixtiv CLI for SallyPort Security Management');

// Register claude:project:list command
program
  .command('claude:project:list')
  .description('List projects from the Firestore database')
  .option(
    '-s, --status <status>',
    'Filter by status (active, completed, on-hold, cancelled, all)',
    'active'
  )
  .option('-t, --tags <tags>', 'Filter by comma-separated tags')
  .option('-p, --priority <priority>', 'Filter by priority (high, medium, low)')
  .option('-l, --limit <limit>', 'Limit the number of projects returned', '20')
  .action(claudeCommands.project.list);

// Register claude:code:generate command
program
  .command('claude:code:generate')
  .description('Generate code using Claude AI')
  .option('-t, --task <task>', 'Task description')
  .option('-l, --language <language>', 'Programming language')
  .option('-o, --output-file <outputFile>', 'File to save generated code')
  .option('-c, --context <context>', 'Additional context for generation')
  .action(claudeCommands.code);

// Display banner
console.log(chalk.cyan(figlet.textSync('Aixtiv CLI', { horizontalLayout: 'full' })));
console.log(chalk.blue(`v${packageJson.version} - SallyPort Security Management`));
console.log();

// Command imports
const initProject = require('../commands/init');
const authVerify = require('../commands/auth/verify');
const agentGrant = require('../commands/agent/grant');
const agentRevoke = require('../commands/agent/revoke');
const resourceScan = require('../commands/resource/scan');

// Co-pilot command imports
const copilotLink = require('../commands/copilot/link');
const copilotUnlink = require('../commands/copilot/unlink');
const copilotList = require('../commands/copilot/list');
const copilotVerify = require('../commands/copilot/verify');
const copilotGrant = require('../commands/copilot/grant');
const copilotExpiration = require('../commands/copilot/expiration');
const copilotVoice = require('../commands/copilot/voice');
const copilotSpeaker = require('../commands/copilot/speaker');
const copilotPreview = require('../commands/copilot/preview');
const copilotEmotion = require('../commands/copilot/emotion');

// Visionary commands
const summonVisionary = require('../commands/summon/visionary');

// Dr. Claude commands
const claudeAgentDelegate = require('../commands/claude/agent/delegate');
const claudeAutomationGithub = require('../commands/claude/automation/github');
const claudeCodeGenerate = require('../commands/claude/code/generate');
const claudeStatus = require('../commands/claude/status');
const claudeVideo = require('../commands/claude/video');
const claudeLive = require('../commands/claude/live');
const claudeUXCheck = require('../commands/claude/ux-check');

// Natural Language Processing command
let nlpCommand;
try {
  nlpCommand = require('../commands/nlp');
  console.log(chalk.green('NLP command module loaded successfully'));
} catch (error) {
  console.error(chalk.yellow('NLP module could not be loaded:'), chalk.dim(error.message));
  console.error(chalk.yellow('NLP commands will be unavailable'));
  nlpCommand = null;
}

// SERPEW Commands (temporarily commented out)
// const registerSerpewCommands = require('../commands/serpew');

// Project commands
program
  .command('init')
  .description('Initialize a new aixtiv project with basic structure')
  .option('-n, --name <name>', 'Project name', 'aixtiv-project')
  .option('-f, --force', 'Force overwrite if project directory exists')
  .action(initProject);

// Auth commands
program
  .command('auth:verify')
  .description('Verify authentication with SallyPort')
  .option('-e, --email <email>', 'Email to verify')
  .option('-a, --agent <agent>', 'Agent to verify')
  .action(authVerify);

// Agent commands
program
  .command('agent:grant')
  .description('Grant agent access to a resource')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-a, --agent <agent>', 'Agent ID')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .option('-t, --type <type>', 'Access type (full, readonly, delegated)', 'full')
  .action(agentGrant);

program
  .command('agent:revoke')
  .description('Revoke agent access to a resource')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-a, --agent <agent>', 'Agent ID')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .action(agentRevoke);

// Agent activation command
program
  .command('agent:activate')
  .description('Activate agents and mark them as available')
  .option('-a, --agent <agent>', 'Specific agent to activate (omit to activate all)')
  .action(require('../commands/agent/activate'));

// Resource commands
program
  .command('resource:scan')
  .description('Scan resources for access patterns')
  .option('-r, --resource <resource>', 'Resource ID to scan')
  .option('-a, --agent <agent>', 'Filter by agent ID')
  .option('-e, --email <email>', 'Filter by principal email')
  .action(resourceScan);

// Handle PR special case directly
program
  .command('fix:pr')
  .description('Apply special PR fix for pr@coaching2100.com with agent 001')
  .option('-c, --cleanup', 'Clean up the PR fix instead of applying it')
  .action(async (options) => {
    const { cleanup } = options;
    const agent = '001';
    const principal = 'pr@coaching2100.com';
    const resource = 'pr-2bd91160bf21ba21';

    if (cleanup) {
      const revoke = require('../commands/agent/revoke');
      await revoke({
        email: principal,
        agent: agent,
        resource: resource,
      });
    } else {
      const grant = require('../commands/agent/grant');
      await grant({
        email: principal,
        agent: agent,
        resource: resource,
        type: 'full',
      });
    }
  });

// Co-pilot commands
program
  .command('copilot:link')
  .description('Link a co-pilot to a principal')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption(
    '-c, --copilot <copilot>',
    'Co-pilot email or name (if just name, will use name@drname.live format)'
  )
  .option('-l, --level <level>', 'Trust level (standard, enhanced, executive)', 'standard')
  .action(copilotLink);

program
  .command('copilot:unlink')
  .description('Unlink a co-pilot from a principal')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .action(copilotUnlink);

program
  .command('copilot:list')
  .description('List co-pilots linked to a principal')
  .option('-e, --email <email>', 'Principal email (if omitted, lists all relationships)')
  .option('-s, --status <status>', 'Filter by status (active, pending, all)', 'active')
  .action(copilotList);

program
  .command('copilot:verify')
  .description('Verify co-pilot identity and cultural empathy')
  .requiredOption('-e, --email <email>', 'Co-pilot email')
  .requiredOption('-p, --principal <principal>', 'Principal email')
  .option('-c, --code <code>', 'Cultural Empathy Code')
  .action(copilotVerify);

program
  .command('copilot:grant')
  .description('Grant co-pilot access to a resource')
  .requiredOption('-e, --email <email>', 'Principal email')
  .requiredOption('-c, --copilot <copilot>', 'Co-pilot email or name')
  .requiredOption('-r, --resource <resource>', 'Resource ID')
  .option('-t, --type <type>', 'Access type (readonly, delegated, full)', 'readonly')
  .action(copilotGrant);

// Add new copilot:expiration command
program
  .command('copilot:expiration')
  .description('Set an expiration period for a co-pilot relationship')
  .option('-e, --email <email>', 'Principal email')
  .option('-c, --copilot <copilot>', 'Co-pilot email or name')
  .requiredOption('-p, --period <period>', 'Time period value (e.g., 30)')
  .option('-u, --unit <unit>', 'Time unit (minutes, hours, days, weeks, months)', 'days')
  .option('-l, --latest', 'Target the most recently created co-pilot relationship')
  .action(copilotExpiration);

// Add copilot:voice command for speech functionality
program
  .command('copilot:voice')
  .description('Speech capabilities using Google STT/TTS with personalization and sentiment analysis')
  .option('-a, --action <action>', 'Action to perform (transcribe, speak, personalize, test)')
  .option('-u, --userId <userId>', 'User ID for the operation')
  .option('-c, --copilotId <copilotId>', 'Copilot ID to use')
  .option('-f, --file <path>', 'Path to audio file for transcription')
  .option('-t, --text <text>', 'Text to convert to speech')
  .option('-o, --output <path>', 'Output file path')
  .option('--sentiment <boolean>', 'Include sentiment analysis', 'true')
  .option('--personalization <boolean>', 'Use personalized voice', 'true')
  .option('--pitch <value>', 'Voice pitch (-10.0 to 10.0)')
  .option('--rate <value>', 'Speaking rate (0.25 to 4.0)')
  .option('--gender <gender>', 'Voice gender (MALE, FEMALE, NEUTRAL)')
  .option('--language <code>', 'Language code', 'en-US')
  .action(copilotVoice);

// Add copilot:speaker command for voice biometrics
program
  .command('copilot:speaker')
  .description('Speaker recognition for voice biometrics, enrollment, and verification')
  .option('-a, --action <action>', 'Action to perform (create-profile, enroll, verify, identify, list-profiles, profile-details, delete-profile)')
  .option('-e, --email <email>', 'Principal email for the profile or operation')
  .option('-p, --profileId <profileId>', 'Speaker profile ID')
  .option('-f, --file <path>', 'Path to audio file for enrollment, verification, or identification')
  .option('--phrase <text>', 'Phrase spoken in the audio')
  .option('--name <name>', 'Display name for the profile')
  .option('--description <text>', 'Description for the profile')
  .option('--locale <code>', 'Language code', 'en-US')
  .option('--profiles <ids>', 'Comma-separated list of profile IDs for identification')
  .option('--nonInteractive', 'Skip interactive prompts')
  .action(copilotSpeaker);

// Add copilot:preview command for response preview panel
program
  .command('copilot:preview')
  .description('Copilot response preview panel with "this is what the agent sees" transparency')
  .option('-a, --action <action>', 'Action to perform (create, get, approve, request-changes, edit, settings, history, submit-feedback)')
  .option('--userId <userId>', 'User ID for the preview session')
  .option('--copilotId <copilotId>', 'Copilot ID')
  .option('--message <message>', 'User message')
  .option('--response <response>', 'Copilot response')
  .option('--previewId <previewId>', 'Preview ID')
  .option('--feedback <feedback>', 'Feedback for changes')
  .option('--editedText <editedText>', 'Edited response text')
  .option('--note <note>', 'Note for approval')
  .option('--changeOptions <options>', 'Comma-separated list of change options')
  .option('--feedbackType <type>', 'Feedback type (helpful, not-helpful, tone-issue, needs-improvement)')
  .option('--comment <comment>', 'Comment for feedback')
  .option('--showEmotionIndicators <boolean>', 'Show emotion indicators')
  .option('--showToneSuggestions <boolean>', 'Show tone suggestions')
  .option('--showAIThinking <boolean>', 'Show AI thinking process')
  .option('--transparencyLevel <level>', 'Transparency level (low, medium, high)')
  .option('--limit <number>', 'Limit for history items')
  .option('--skipCache <boolean>', 'Skip cache for history')
  .action(copilotPreview);

// Add copilot:emotion command for agent emotion tuning
program
  .command('copilot:emotion')
  .description('Agent emotion tuner – softens or sharpens tone based on user preference')
  .action(copilotEmotion);

// Visionary commands
program
  .command('summon:visionary')
  .description('Summon Visionary 1 Command Suite with audio-visual effects')
  .option('-s, --silent', 'Run without audio effects')
  .option('--install-assets', 'Install or reinstall audio assets')
  .action(summonVisionary);

// Dr. Claude Agent commands
program
  .command('claude:agent:delegate')
  .description('Delegate a project to Dr. Claude as project manager')
  .requiredOption('-p, --project <name>', 'Project name')
  .requiredOption('-d, --description <description>', 'Project description')
  .option('--priority <priority>', 'Project priority (low, medium, high)', 'medium')
  .option(
    '--deadline <date>',
    'Project deadline (YYYY-MM-DD)',
    formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  )
  .option('--tags <tags>', 'Comma-separated list of project tags')
  .option('--assign-to <agent>', 'Directly assign to specific agent (e.g., dr-lucy, dr-match)')
  .action(claudeAgentDelegate);

// Dr. Claude Automation commands
program
  .command('claude:automation:github')
  .description('Use Dr. Claude Automation to manage GitHub repositories')
  .requiredOption('-r, --repository <repo>', 'Repository name or "all" for all repositories')
  .requiredOption(
    '-a, --action <action>',
    'Action to perform (align, clean, secure, memoria-assist, sync)'
  )
  .option('-b, --branch <branch>', 'Branch name', 'main')
  .option('-o, --organization <org>', 'GitHub organization', 'AI-Publishing-International-LLP-UK')
  .option('--security-check <boolean>', 'Perform security checks', 'true')
  .action(claudeAutomationGithub);

// Claude Code commands
program
  .command('claude:code:generate')
  .description('Generate code using Claude Code assistant')
  .requiredOption('-t, --task <task>', 'Coding task description')
  .option('-l, --language <language>', 'Programming language', 'javascript')
  .option('-o, --output-file <path>', 'Output file path')
  .option('-c, --context <files>', 'Comma-separated list of context files')
  .action(claudeCodeGenerate);

// Claude Status command
program
  .command('claude:status')
  .description('Check status of Dr. Claude agents and their workloads')
  .option('-a, --agent <agent>', 'Specific agent to check (omit for all agents)')
  .action(claudeStatus);

// Claude Video command
program
  .command('claude:video')
  .description('Manage video generation for agents with green screen and AI background generation')
  .option(
    '-a, --action <action>',
    'Action to perform (create-session, generate-agent, generate-background, combine, status, download, list-backgrounds)'
  )
  .option('--agentId <agentId>', 'ID of the agent')
  .option('--agentType <agentType>', 'Type of agent (rix, crx, copilot)')
  .option('--session <sessionId>', 'Session ID from a previous create-session call')
  .option('--script <script>', 'Video script for the agent')
  .option('--duration <duration>', 'Duration in seconds')
  .option('--background <backgroundId>', 'Background ID to use')
  .option('--prompt <prompt>', 'Text prompt for background generation')
  .option('--job <jobId>', 'Job ID for status checks')
  .option('--jobType <jobType>', 'Job type (agent, background, composition)')
  .option('--agentJob <jobId>', 'Agent video job ID for combining videos')
  .option('--backgroundJob <jobId>', 'Background video job ID for combining videos')
  .action(claudeVideo);

// Claude Live command
program
  .command('claude:live')
  .description('Execute live workflows with real API integrations')
  .option('-w, --workflow <workflow>', 'Workflow to execute (linkedin, github, claude)')
  .option('-u, --userId <userId>', 'User ID for the workflow')
  .option('-a, --accessToken <token>', 'Access token for API authentication')
  .option('-p, --prompt <prompt>', 'Prompt for Claude generation')
  .option('-f, --format <format>', 'Output format (text, markdown, json, html)')
  .option('-c, --context <context>', 'Additional context for generation')
  .option('-r, --repository <repo>', 'Repository name for GitHub workflow')
  .action(claudeLive);

// Claude UX Check command - Phase II "Visual Check" overlay tool
program
  .command('claude:ux-check')
  .description('Dr. Match visual UX check overlay tool for screen preview before go-live')
  .option('-a, --action <action>', 'Action to perform (create-session, check-screenshot, check-live, review-status, get-issues, compare)')
  .option('--userId <userId>', 'User ID for the session')
  .option('--session <sessionId>', 'UX preview session ID')
  .option('--deviceType <type>', 'Device type (desktop, tablet, mobile)')
  .option('--screenType <type>', 'Screen type (dashboard, product, checkout, etc.)')
  .option('--screenshot <path>', 'Path to screenshot file')
  .option('--url <url>', 'URL to check')
  .option('--review <reviewId>', 'Review ID to check status')
  .option('--before <reviewId>', 'Before review ID for comparison')
  .option('--after <reviewId>', 'After review ID for comparison')
  .option('--showGrid <boolean>', 'Show grid overlay', 'true')
  .option('--showAccessibility <boolean>', 'Show accessibility markers', 'true')
  .option('--showTapTargets <boolean>', 'Show tap target areas', 'true')
  .action(claudeUXCheck);

// Claude Secret Management command - Phase III: Agent Autonomy + Platform Automation
program
  .command('claude:secrets')
  .description('Manage secrets and API keys with automatic rotation')
  .requiredOption('-a, --action <action>', 'Action to perform (list, create, get, delete, rotate-sa-key, rotate-api-key, setup-rotation, generate, audit)')
  .option('-i, --secretId <secretId>', 'Secret ID')
  .option('-p, --projectId <projectId>', 'GCP Project ID')
  .option('-v, --version <version>', 'Secret version')
  .option('-s, --serviceAccountEmail <email>', 'Service account email for key rotation')
  .option('-k, --apiKeyName <name>', 'API key name for rotation')
  .option('--keyType <type>', 'Key type (json, p12)', 'json')
  .option('--deleteOldKey <boolean>', 'Delete old key after rotation', 'true')
  .option('--maxKeyAge <days>', 'Maximum key age in days', '90')
  .option('--dryRun', 'Perform a dry run without making changes')
  .option('--interactive', 'Use interactive prompts for sensitive information')
  .option('--filter <filter>', 'Filter for listing secrets')
  .option('--detailed', 'Show detailed information when listing secrets')
  .option('--value <value>', 'Secret value when creating secrets')
  .option('--fromFile <path>', 'Path to file containing secret value')
  .option('--export <path>', 'Export secret to file')
  .option('--redact', 'Redact secret value when displaying')
  .option('--confirm', 'Skip confirmation prompts')
  .option('--schedule <json>', 'Rotation schedule as JSON string')
  .option('--scheduleFile <path>', 'Path to rotation schedule JSON file')
  .option('--outputFile <path>', 'Output file path for rotation schedule')
  .option('--length <number>', 'Length of generated secure string', '32')
  .option('--charset <charset>', 'Character set for generated secure string')
  .option('--prefix <prefix>', 'Prefix for generated secure string')
  .option('--logFile <path>', 'Path to audit log file')
  .option('--limit <number>', 'Limit for audit log entries', '20')
  .option('--onlyErrors', 'Show only error entries in audit log')
  .action(claudeCommands.secrets);

// Legacy command for backward compatibility
program
  .command('claude:delegate')
  .description('Delegate a task to an agent (legacy command - use claude:agent:delegate instead)')
  .requiredOption('-a, --agent <agent>', 'Agent ID to assign the task to')
  .requiredOption('-t, --task <task>', 'Task details (use quotes for multi-word tasks)')
  .option('-p, --priority <priority>', 'Task priority (low, normal, high)', 'normal')
  .option('-e, --env <environment>', 'Environment (dev, prod)', 'prod')
  .action((options) => {
    console.log(
      chalk.yellow(
        'Warning: claude:delegate is deprecated. Please use claude:agent:delegate instead.'
      )
    );
    console.log('');

    // Convert to project-style delegation
    claudeAgentDelegate({
      project: `Task for ${options.agent}`,
      description: options.task,
      priority: options.priority,
      assignTo: options.agent,
      env: options.env,
    });
  });

// Register NLP command if available
if (nlpCommand) {
  try {
    program.addCommand(nlpCommand);
    console.log(chalk.green('NLP command registered successfully'));
  } catch (error) {
    console.error(chalk.yellow('Failed to register NLP command:'), chalk.dim(error.message));
  }
}

// Register domain management commands
registerDomainCommands(program);

// Register Dream Commander commands
const dreamCommanderCommand = require('../commands/dreamCommander');
program.addCommand(dreamCommanderCommand);

// Register SERPEW commands (temporarily commented out)
// registerSerpewCommands(program);

// Parse command line arguments
program.parse(process.argv);
