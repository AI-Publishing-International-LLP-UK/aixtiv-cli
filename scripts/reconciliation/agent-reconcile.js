#!/usr/bin/env node

/**
 * Agent Reconciliation Script
 *
 * This script analyzes agent data from three sources:
 * 1. auth:verify - Authentication system
 * 2. resource:scan - Resource allocation system
 * 3. config/agent-cards/ - Agent configuration files
 *
 * It identifies inconsistencies such as:
 * - Missing agent cards
 * - Naming inconsistencies
 * - Inactive/unused agents
 * - Misconfigured agents
 *
 * The script can generate reports and optionally fix issues.
 *
 * Usage:
 *   node scripts/reconciliation/agent-reconcile.js [options]
 *
 * Options:
 *   --fix             Automatically fix issues
 *   --report-only     Generate report without fixing
 *   --verbose         Show detailed information
 *   --output <file>   Write report to file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// Configuration
const CONFIG = {
  agentCardsDir: path.join(process.cwd(), 'config', 'agent-cards'),
  outputDir: path.join(process.cwd(), 'reports'),
  cliCommand: 'cd /Users/as/asoos/aixtiv-cli && node bin/aixtiv.js',
  defaultAgentTemplate: {
    id: '',
    name: '',
    version: '1.0.0',
    description: 'Auto-generated agent card',
    capabilities: [],
    service_path: '/src/services/agents/index.js',
    api_endpoint: 'https://api.aixtiv.org/api',
    status: 'active',
    team_compatible: true,
    requires_authentication: false,
    default_permissions: ['verify', 'authenticate', 'generate'],
    metadata: {
      region: 'us-west1',
      orchestration_endpoint: 'https://api.aixtiv.com/symphony/opus/orchestration',
      creator: 'Agent Reconciliation Script',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
  },
};

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  reportOnly: args.includes('--report-only'),
  verbose: args.includes('--verbose'),
  output: args.includes('--output') ? args[args.indexOf('--output') + 1] : null,
};

// Utility functions
function log(message, type = 'info') {
  const prefix = {
    info: chalk.blue('INFO'),
    warning: chalk.yellow('WARNING'),
    error: chalk.red('ERROR'),
    success: chalk.green('SUCCESS'),
  }[type];

  console.log(`${prefix}: ${message}`);
}

function executeCommand(command, options = {}) {
  const { timeout = 30000 } = options; // Default timeout: 30 seconds
  try {
    return execSync(command, {
      encoding: 'utf8',
      timeout: timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });
  } catch (error) {
    if (error.signal === 'SIGTERM') {
      log(`Command timed out after ${timeout}ms: ${command}`, 'error');
    } else {
      log(`Error executing command: ${command}`, 'error');
      log(error.message, 'error');
    }
    return null;
  }
}

function standardizeAgentId(id) {
  // Remove email format if present (e.g., 'lucy@drlucy.live' -> 'lucy')
  let standardId = id.includes('@') ? id.split('@')[0] : id;

  // Add 'dr-' prefix if it's a doctor but missing the prefix
  const doctorNames = [
    'lucy',
    'grant',
    'memoria',
    'match',
    'claude',
    'sabina',
    'roark',
    'maria',
    'cypriot',
    'burby',
  ];
  if (doctorNames.includes(standardId) && !standardId.startsWith('dr-')) {
    standardId = `dr-${standardId}`;
  }

  // Convert to lowercase
  standardId = standardId.toLowerCase();

  // Replace underscores with hyphens
  standardId = standardId.replace(/_/g, '-');

  return standardId;
}

// Data retrieval functions
async function getAuthVerifyAgents() {
  log('Fetching agents from auth:verify...');

  // Hardcoded agent list as a fallback in case the command fails
  const knownAgents = [
    'lucy@drlucy',
    '00015',
    '001',
    'dr-claude-orchestrator',
    'dr-lucy-flight-memory',
    'professor-lee-q4d-trainer',
    'dr-grant-cybersecurity',
    'qblucy',
    'dr-memoria-anthology',
    'dr-grant-sallyport',
    'QBLucy',
    'SirHand',
  ];

  // Try to get the output with a 15-second timeout
  const output = executeCommand(`${CONFIG.cliCommand} auth:verify`, { timeout: 15000 });

  if (!output) {
    log('Failed to get auth:verify output, using known agent list', 'warning');
    return knownAgents.map((id) => ({
      id,
      source: 'auth:verify (fallback)',
      standardId: standardizeAgentId(id),
    }));
  }

  // Extract agent IDs from output using a more robust approach
  // Try multiple patterns to account for different formats
  let agentIds = [];

  // Pattern 1: Standard format with "Agent IDs:" prefix
  const agentListMatch = output.match(/Agent IDs:\s*(.*?)(?:\n|$)/);

  if (agentListMatch && agentListMatch[1]) {
    agentIds = agentListMatch[1].split(', ').map((id) => id.trim());
  } else {
    // Pattern 2: Look for a specific section that might contain agent IDs
    const agentSection = output.match(/Agents:\s*(\d+)\s*\n(.*?)(?:\n\n|\n[^\n]|$)/s);
    if (agentSection && agentSection[2]) {
      // Try to extract agent IDs from the lines following "Agents: N"
      const potentialAgentLine = agentSection[2].trim();
      agentIds = potentialAgentLine.split(/[,\s]+/).filter((id) => id && id.length > 0);
    }
  }

  // If we still couldn't find agents, use the fallback list
  if (agentIds.length === 0) {
    log('Could not parse agents from output, using known agent list', 'warning');
    log('Output snippet:', 'info');
    log(output.substring(0, 500) + (output.length > 500 ? '...' : ''), 'info');

    return knownAgents.map((id) => ({
      id,
      source: 'auth:verify (fallback)',
      standardId: standardizeAgentId(id),
    }));
  }

  log(`Found ${agentIds.length} agents from auth:verify`);

  return agentIds.map((id) => ({
    id,
    source: 'auth:verify',
    standardId: standardizeAgentId(id),
  }));
}

async function getResourceScanAgents() {
  log('Fetching agents from resource:scan...');
  const output = executeCommand(`${CONFIG.cliCommand} resource:scan`);

  if (!output) {
    return [];
  }

  // Extract all unique agent IDs from resource assignments
  const lines = output.split('\n');
  const agentSet = new Set();

  // Extract from table rows
  for (const line of lines) {
    // Skip lines that don't look like table data
    if (!line.includes('│')) continue;

    // Try to extract agent IDs from the "Authorized Agents" column
    const parts = line.split('│');
    if (parts.length >= 4) {
      const agentsPart = parts[3].trim();
      // Split multiple agents in the same field
      if (agentsPart) {
        const ids = agentsPart.split(',').map((id) => id.trim());
        ids.forEach((id) => {
          if (id && id !== 'Authorized Agents') agentSet.add(id);
        });
      }
    }
  }

  const agentIds = Array.from(agentSet);
  log(`Found ${agentIds.length} unique agents from resource:scan`);

  return agentIds.map((id) => ({
    id,
    source: 'resource:scan',
    standardId: standardizeAgentId(id),
  }));
}

async function getAgentCardFiles() {
  log(`Checking agent cards in ${CONFIG.agentCardsDir}...`);

  try {
    const files = await readdir(CONFIG.agentCardsDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    log(`Found ${jsonFiles.length} agent card files`);

    const agentCards = [];
    for (const file of jsonFiles) {
      const filePath = path.join(CONFIG.agentCardsDir, file);
      try {
        const content = await readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        agentCards.push({
          id: data.id || path.basename(file, '.json'),
          filename: file,
          path: filePath,
          data,
          source: 'agent-cards',
          standardId: standardizeAgentId(data.id || path.basename(file, '.json')),
        });
      } catch (error) {
        log(`Error reading agent card ${file}: ${error.message}`, 'error');
      }
    }

    return agentCards;
  } catch (error) {
    log(`Error reading agent cards directory: ${error.message}`, 'error');
    return [];
  }
}

// Analysis functions
function findInconsistencies(authAgents, resourceAgents, agentCards) {
  const allAgents = new Map();

  // Add all agents to the map with their sources
  function addToMap(agent, source) {
    const key = agent.standardId;
    if (!allAgents.has(key)) {
      allAgents.set(key, {
        standardId: key,
        originalIds: [agent.id],
        sources: [source],
        cardData: null,
      });
    } else {
      const existing = allAgents.get(key);
      if (!existing.originalIds.includes(agent.id)) {
        existing.originalIds.push(agent.id);
      }
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
    }
  }

  // Process all sources
  authAgents.forEach((agent) => addToMap(agent, 'auth:verify'));
  resourceAgents.forEach((agent) => addToMap(agent, 'resource:scan'));

  // Process agent cards differently to include card data
  agentCards.forEach((card) => {
    const key = card.standardId;
    if (!allAgents.has(key)) {
      allAgents.set(key, {
        standardId: key,
        originalIds: [card.id],
        sources: ['agent-cards'],
        cardData: card,
      });
    } else {
      const existing = allAgents.get(key);
      if (!existing.originalIds.includes(card.id)) {
        existing.originalIds.push(card.id);
      }
      if (!existing.sources.includes('agent-cards')) {
        existing.sources.push('agent-cards');
      }
      existing.cardData = card;
    }
  });

  // Identify inconsistencies
  const inconsistencies = {
    missingCards: [],
    multipleIds: [],
    unusedCards: [],
    namingIssues: [],
  };

  for (const [key, agent] of allAgents.entries()) {
    // Missing cards: agent exists in auth or resources but has no card
    if (
      (agent.sources.includes('auth:verify') || agent.sources.includes('resource:scan')) &&
      !agent.sources.includes('agent-cards')
    ) {
      inconsistencies.missingCards.push(agent);
    }

    // Unused cards: agent has a card but is not in auth or resources
    if (
      agent.sources.includes('agent-cards') &&
      !agent.sources.includes('auth:verify') &&
      !agent.sources.includes('resource:scan')
    ) {
      inconsistencies.unusedCards.push(agent);
    }

    // Multiple IDs: agent has more than one ID format
    if (agent.originalIds.length > 1) {
      inconsistencies.multipleIds.push(agent);
    }

    // Naming issues: original ID doesn't match standardized format
    if (agent.originalIds.some((id) => standardizeAgentId(id) !== id)) {
      inconsistencies.namingIssues.push(agent);
    }
  }

  return {
    allAgents: Array.from(allAgents.values()),
    inconsistencies,
  };
}

// Fix functions
async function createMissingAgentCard(agent) {
  const standardId = agent.standardId;
  const filename = `${standardId.replace(/-/g, '_')}.json`;
  const filePath = path.join(CONFIG.agentCardsDir, filename);

  // Create agent card data based on template
  const cardData = { ...CONFIG.defaultAgentTemplate };
  cardData.id = standardId;
  cardData.name = agent.originalIds[0].replace(/^dr-/, 'Dr. ').replace(/-/g, ' ');

  // Try to infer capabilities
  if (standardId.includes('lucy')) {
    cardData.capabilities = ['Flight memory system', 'Agent coordination', 'Task tracking'];
    cardData.description = 'Flight Memory System';
  } else if (standardId.includes('claude')) {
    cardData.capabilities = ['Orchestration', 'Code generation', 'Project management'];
    cardData.description = 'Orchestration System';
  } else if (standardId.includes('grant')) {
    cardData.capabilities = ['Authentication', 'Security', 'Access control'];
    cardData.description = 'Security System';
  } else if (standardId.includes('memoria')) {
    cardData.capabilities = ['Knowledge management', 'Content generation', 'Publishing'];
    cardData.description = 'Anthology System';
  } else {
    cardData.capabilities = ['Task automation', 'Workflow management'];
    cardData.description = 'Agent System';
  }

  try {
    await writeFile(filePath, JSON.stringify(cardData, null, 2), 'utf8');
    log(`Created agent card for ${standardId} at ${filePath}`, 'success');
    return true;
  } catch (error) {
    log(`Error creating agent card for ${standardId}: ${error.message}`, 'error');
    return false;
  }
}

// Main function
async function main() {
  log('Starting agent reconciliation...');

  // Fetch data from all sources
  const authAgents = await getAuthVerifyAgents();
  const resourceAgents = await getResourceScanAgents();
  const agentCards = await getAgentCardFiles();

  // Analyze inconsistencies
  const { allAgents, inconsistencies } = findInconsistencies(
    authAgents,
    resourceAgents,
    agentCards
  );

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalAgents: allAgents.length,
      authAgents: authAgents.length,
      resourceAgents: resourceAgents.length,
      agentCards: agentCards.length,
      missingCards: inconsistencies.missingCards.length,
      unusedCards: inconsistencies.unusedCards.length,
      multipleIds: inconsistencies.multipleIds.length,
      namingIssues: inconsistencies.namingIssues.length,
    },
    inconsistencies,
    allAgents,
  };

  // Print report
  console.log('\n========= AGENT RECONCILIATION REPORT =========\n');
  console.log(chalk.bold('SUMMARY:'));
  console.log(`Total unique agents: ${report.summary.totalAgents}`);
  console.log(`Auth agents: ${report.summary.authAgents}`);
  console.log(`Resource agents: ${report.summary.resourceAgents}`);
  console.log(`Agent cards: ${report.summary.agentCards}`);
  console.log(`\nINCONSISTENCIES:`);
  console.log(`Missing agent cards: ${report.summary.missingCards}`);
  console.log(`Unused agent cards: ${report.summary.unusedCards}`);
  console.log(`Multiple IDs for same agent: ${report.summary.multipleIds}`);
  console.log(`Naming convention issues: ${report.summary.namingIssues}`);

  // Detailed report of inconsistencies
  if (options.verbose) {
    if (inconsistencies.missingCards.length > 0) {
      console.log(chalk.yellow('\nMISSING AGENT CARDS:'));
      inconsistencies.missingCards.forEach((agent) => {
        console.log(`  - ${agent.standardId} (Original IDs: ${agent.originalIds.join(', ')})`);
      });
    }

    if (inconsistencies.unusedCards.length > 0) {
      console.log(chalk.yellow('\nUNUSED AGENT CARDS:'));
      inconsistencies.unusedCards.forEach((agent) => {
        console.log(
          `  - ${agent.standardId} (File: ${agent.cardData ? agent.cardData.filename : 'unknown'})`
        );
      });
    }

    if (inconsistencies.multipleIds.length > 0) {
      console.log(chalk.yellow('\nMULTIPLE IDs:'));
      inconsistencies.multipleIds.forEach((agent) => {
        console.log(`  - ${agent.standardId} (Original IDs: ${agent.originalIds.join(', ')})`);
      });
    }

    if (inconsistencies.namingIssues.length > 0) {
      console.log(chalk.yellow('\nNAMING ISSUES:'));
      inconsistencies.namingIssues.forEach((agent) => {
        console.log(`  - ${agent.standardId} (Original IDs: ${agent.originalIds.join(', ')})`);
      });
    }
  }

  // Save report to file if requested
  if (options.output) {
    const outputPath = path.join(CONFIG.outputDir, options.output);
    try {
      await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
      log(`Report saved to ${outputPath}`, 'success');
    } catch (error) {
      log(`Error saving report: ${error.message}`, 'error');
    }
  }

  // Apply fixes if requested
  if (options.fix) {
    console.log(chalk.blue('\n========= APPLYING FIXES =========\n'));

    // Fix missing agent cards
    if (inconsistencies.missingCards.length > 0) {
      log(`Creating ${inconsistencies.missingCards.length} missing agent cards...`);

      for (const agent of inconsistencies.missingCards) {
        await createMissingAgentCard(agent);
      }
    }

    // Fix naming inconsistencies (optionally)
    if (inconsistencies.namingIssues.length > 0) {
      log(
        `Found ${inconsistencies.namingIssues.length} agents with naming issues. These require manual fixes.`
      );
      log('Please use the following naming conventions:');
      log('1. Use hyphens instead of underscores for word separation');
      log('2. Use lowercase for all agent IDs');
      log('3. Include "dr-" prefix for doctor agents');
      log('4. Remove email format from agent IDs (e.g., use "lucy" instead of "lucy@drlucy.live")');
    }
  } else if (!options.reportOnly) {
    // Prompt for fix if not in report-only mode
    console.log(chalk.blue('\nRecommended actions:'));

    if (inconsistencies.missingCards.length > 0) {
      console.log(`- Create ${inconsistencies.missingCards.length} missing agent cards`);
    }

    if (inconsistencies.unusedCards.length > 0) {
      console.log(`- Review ${inconsistencies.unusedCards.length} unused agent cards`);
    }

    if (inconsistencies.multipleIds.length > 0 || inconsistencies.namingIssues.length > 0) {
      console.log('- Standardize agent naming conventions');
    }

    console.log(chalk.blue('\nTo apply fixes, run with --fix flag'));
  }

  return report;
}

// Helper functions for fix operations
async function applyNamingFixes(agent) {
  // This would require updating Firestore or other backend systems
  // For safety, this is left as a manual operation
  log(`Would standardize naming for ${agent.standardId} (${agent.originalIds.join(', ')})`, 'info');
  return false;
}

async function activateUnusedAgent(agent) {
  // This would require calling agent:activate command
  if (!agent.cardData) {
    log(`Cannot activate ${agent.standardId}: No card data available`, 'error');
    return false;
  }

  log(`Would activate agent ${agent.standardId}`, 'info');
  // Uncomment to actually run the activation command:
  // executeCommand(`${CONFIG.cliCommand} agent:activate --agent ${agent.standardId}`);
  return true;
}

// Run the script
main().catch((error) => {
  console.error('Error running agent reconciliation script:', error);
  process.exit(1);
});
