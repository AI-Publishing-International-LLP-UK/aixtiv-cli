#!/usr/bin/env node

/**
 * sync-agent-cards.js
 *
 * This script synchronizes agent cards in the Aixtiv CLI with formal agent
 * definitions from the Opus1 Amplify system.
 *
 * It reads the formal agent definitions from:
 * /Users/as/asoos/opus/opus1_amplify/aixtiv-admin-core/src/constants/ai-pilots.ts
 *
 * And compares them with the existing agent cards in:
 * /Users/as/asoos/aixtiv-cli/config/agent-cards/
 *
 * The script will:
 * 1. Update existing agent cards to match the formal definitions
 * 2. Create new agent cards for any agents that don't have cards yet
 * 3. Provide a report of the changes made
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FORMAL_AGENTS_PATH = path.join(__dirname, 'formal-agents.json');
const AGENT_CARDS_DIR = '/Users/as/asoos/aixtiv-cli/config/agent-cards';
const RECONCILIATION_LOG_PATH = path.join(__dirname, 'reconciliation-log.json');

// For colorful console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Stats for reporting
const stats = {
  totalFormalAgents: 0,
  existingAgentCards: 0,
  agentCardsUpdated: 0,
  agentCardsCreated: 0,
  errors: 0,
};

// Detailed change log
const changeLog = {
  timestamp: new Date().toISOString(),
  updates: [],
  creations: [],
  errors: [],
};

/**
 * Extract agent definitions from the TypeScript file
 */
async function extractAgentDefinitions() {
  try {
    console.log(`${COLORS.cyan}Reading file: ${FORMAL_AGENTS_PATH}${COLORS.reset}`);
    const agentsJson = await fs.readFile(FORMAL_AGENTS_PATH, 'utf8');

    // Parse the JSON file to get the agent definitions
    const agents = JSON.parse(agentsJson);

    if (!Array.isArray(agents) || agents.length === 0) {
      console.error(
        `${COLORS.red}No agents found in the JSON file or invalid format${COLORS.reset}`
      );
      throw new Error('No agents found in the JSON file or invalid format');
    }

    console.log(
      `${COLORS.green}Successfully loaded ${agents.length} agents from JSON file${COLORS.reset}`
    );

    // Log a few agents for verification
    agents.slice(0, 3).forEach((agent) => {
      console.log(`${COLORS.green}Loaded agent: ${agent.id} (${agent.name})${COLORS.reset}`);
    });

    stats.totalFormalAgents = agents.length;
    return agents;
  } catch (err) {
    console.error(
      `${COLORS.red}Failed to extract agent definitions: ${err.message}${COLORS.reset}`
    );
    console.error(`${COLORS.red}Stack trace: ${err.stack}${COLORS.reset}`);
    changeLog.errors.push({
      type: 'extraction_error',
      message: err.message,
      stack: err.stack,
    });
    stats.errors++;
    return [];
  }
}

/**
 * Get existing agent cards from the config directory
 */
async function getExistingAgentCards() {
  try {
    const files = await fs.readdir(AGENT_CARDS_DIR);
    const cardFiles = files.filter((file) => file.endsWith('.json'));

    const cards = {};
    for (const file of cardFiles) {
      try {
        const content = await fs.readFile(path.join(AGENT_CARDS_DIR, file), 'utf8');
        const card = JSON.parse(content);
        cards[card.id] = {
          content: card,
          filename: file,
        };
      } catch (err) {
        console.error(
          `${COLORS.red}Error reading agent card ${file}: ${err.message}${COLORS.reset}`
        );
        changeLog.errors.push({
          type: 'card_read_error',
          file,
          message: err.message,
        });
        stats.errors++;
      }
    }

    stats.existingAgentCards = Object.keys(cards).length;
    return cards;
  } catch (err) {
    console.error(`${COLORS.red}Failed to get existing agent cards: ${err.message}${COLORS.reset}`);
    changeLog.errors.push({
      type: 'read_dir_error',
      message: err.message,
    });
    stats.errors++;
    return {};
  }
}

/**
 * Convert formal agent definition to agent card format
 */
function convertToAgentCard(agent) {
  // Format the filename based on the agent ID
  const normalizedId = agent.id.replace(/-/g, '_');

  return {
    id: agent.id,
    name: agent.name,
    version: '1.0.0', // Default version
    description: agent.title,
    capabilities: [
      ...agent.specializations,
      ...agent.knowledgeDomains.slice(0, 2), // Add first two knowledge domains as capabilities
    ],
    service_path: `/src/services/${normalizedId}/index.js`,
    api_endpoint: agent.apiConfig.endpoint,
    status: 'ready',
    team_compatible: true,
    requires_authentication: true,
    authentication_provider: 'SallyPort',
    default_permissions: ['create', 'read', 'process'],
    metadata: {
      region: 'us-west1',
      zone: 'us-west1-b',
      creator: 'Aixtiv Symphony System',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      specializations: agent.specializations,
      knowledge_domains: agent.knowledgeDomains,
    },
    team_assignments: [
      {
        team_id: 'symphony-core',
        role: 'contributor',
        description: `Core ${agent.name} component for Symphony`,
      },
    ],
    instances: [
      {
        id: `${agent.id}-01`,
        specialization: agent.specializations[0] || 'general',
        status: 'active',
      },
    ],
  };
}

/**
 * Update an existing agent card with formal definition data
 */
function updateAgentCard(existingCard, formalAgent) {
  const updated = { ...existingCard };

  // Update basic information
  updated.name = formalAgent.name;
  updated.description = formalAgent.title;

  // Update API endpoint if available
  if (formalAgent.apiConfig && formalAgent.apiConfig.endpoint) {
    updated.api_endpoint = formalAgent.apiConfig.endpoint;
  }

  // Merge capabilities with specializations and knowledge domains
  const newCapabilities = [
    ...formalAgent.specializations,
    ...formalAgent.knowledgeDomains.slice(0, 2),
  ];

  // Keep existing capabilities that aren't in the new list
  const existingCapabilities = updated.capabilities || [];
  updated.capabilities = [...new Set([...newCapabilities, ...existingCapabilities])].slice(0, 10); // Limit to 10 capabilities

  // Update metadata
  if (!updated.metadata) updated.metadata = {};
  updated.metadata.last_updated = new Date().toISOString();
  updated.metadata.specializations = formalAgent.specializations;
  updated.metadata.knowledge_domains = formalAgent.knowledgeDomains;

  return updated;
}

/**
 * Create or update agent card files
 */
async function syncAgentCards(formalAgents, existingCards) {
  try {
    // Ensure the agent cards directory exists
    await fs.mkdir(AGENT_CARDS_DIR, { recursive: true });

    // Process each formal agent
    for (const agent of formalAgents) {
      const existingCard = existingCards[agent.id];

      if (existingCard) {
        // Update existing card
        try {
          const updatedCard = updateAgentCard(existingCard.content, agent);

          // Check if there are actual changes
          if (JSON.stringify(updatedCard) !== JSON.stringify(existingCard.content)) {
            await fs.writeFile(
              path.join(AGENT_CARDS_DIR, existingCard.filename),
              JSON.stringify(updatedCard, null, 2),
              'utf8'
            );

            console.log(
              `${COLORS.yellow}Updated agent card: ${existingCard.filename}${COLORS.reset}`
            );
            stats.agentCardsUpdated++;

            changeLog.updates.push({
              id: agent.id,
              filename: existingCard.filename,
              changes: {
                before: existingCard.content,
                after: updatedCard,
              },
            });
          } else {
            console.log(
              `${COLORS.cyan}No changes needed for: ${existingCard.filename}${COLORS.reset}`
            );
          }
        } catch (err) {
          console.error(
            `${COLORS.red}Error updating agent card ${agent.id}: ${err.message}${COLORS.reset}`
          );
          changeLog.errors.push({
            type: 'update_error',
            id: agent.id,
            message: err.message,
          });
          stats.errors++;
        }
      } else {
        // Create new card
        try {
          const newCard = convertToAgentCard(agent);
          const normalizedId = agent.id.replace(/-/g, '_');
          const filename = `${normalizedId}.json`;

          await fs.writeFile(
            path.join(AGENT_CARDS_DIR, filename),
            JSON.stringify(newCard, null, 2),
            'utf8'
          );

          console.log(`${COLORS.green}Created new agent card: ${filename}${COLORS.reset}`);
          stats.agentCardsCreated++;

          changeLog.creations.push({
            id: agent.id,
            filename,
            content: newCard,
          });
        } catch (err) {
          console.error(
            `${COLORS.red}Error creating agent card ${agent.id}: ${err.message}${COLORS.reset}`
          );
          changeLog.errors.push({
            type: 'creation_error',
            id: agent.id,
            message: err.message,
          });
          stats.errors++;
        }
      }
    }

    // Write reconciliation log
    await fs.writeFile(RECONCILIATION_LOG_PATH, JSON.stringify(changeLog, null, 2), 'utf8');
  } catch (err) {
    console.error(`${COLORS.red}Failed to sync agent cards: ${err.message}${COLORS.reset}`);
    changeLog.errors.push({
      type: 'sync_error',
      message: err.message,
    });
    stats.errors++;
  }
}

/**
 * Print summary report
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log(`${COLORS.bright}AGENT CARD SYNCHRONIZATION SUMMARY${COLORS.reset}`);
  console.log('='.repeat(80));
  console.log(`${COLORS.cyan}Total formal agents found:${COLORS.reset} ${stats.totalFormalAgents}`);
  console.log(`${COLORS.cyan}Existing agent cards:${COLORS.reset} ${stats.existingAgentCards}`);
  console.log(`${COLORS.green}Agent cards created:${COLORS.reset} ${stats.agentCardsCreated}`);
  console.log(`${COLORS.yellow}Agent cards updated:${COLORS.reset} ${stats.agentCardsUpdated}`);
  console.log(`${COLORS.red}Errors encountered:${COLORS.reset} ${stats.errors}`);
  console.log('='.repeat(80));

  if (stats.errors > 0) {
    console.log(
      `\n${COLORS.red}Warning: ${stats.errors} errors occurred during synchronization.${COLORS.reset}`
    );
    console.log(`See the log file for details: ${RECONCILIATION_LOG_PATH}`);
  }

  console.log(
    `\n${COLORS.bright}Reconciliation log saved to:${COLORS.reset} ${RECONCILIATION_LOG_PATH}`
  );
  console.log('\n');
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log(`${COLORS.bright}Starting agent card synchronization...${COLORS.reset}\n`);

    // Step 1: Extract agent definitions from formal source
    console.log(`${COLORS.cyan}Reading formal agent definitions...${COLORS.reset}`);
    const formalAgents = await extractAgentDefinitions();
    console.log(`Found ${formalAgents.length} formal agent definitions.\n`);

    // Step 2: Get existing agent cards
    console.log(`${COLORS.cyan}Reading existing agent cards...${COLORS.reset}`);
    const existingCards = await getExistingAgentCards();
    console.log(`Found ${Object.keys(existingCards).length} existing agent cards.\n`);

    // Step 3: Synchronize agent cards
    console.log(`${COLORS.cyan}Synchronizing agent cards...${COLORS.reset}`);
    await syncAgentCards(formalAgents, existingCards);

    // Step 4: Print summary
    printSummary();

    return 0; // Success exit code
  } catch (err) {
    console.error(`\n${COLORS.red}ERROR: ${err.message}${COLORS.reset}`);
    console.error(`${COLORS.red}Stack trace: ${err.stack}${COLORS.reset}`);
    return 1; // Error exit code
  }
}

/**
 * Ensure the reconciliation directory exists
 */
async function ensureDirectoryExists() {
  try {
    await fs.mkdir(__dirname, { recursive: true });
    return true;
  } catch (err) {
    console.error(`${COLORS.red}Failed to create directory: ${err.message}${COLORS.reset}`);
    return false;
  }
}

// Execute the script
(async () => {
  // First ensure the directory structure exists
  if (await ensureDirectoryExists()) {
    try {
      const exitCode = await main();
      process.exit(exitCode);
    } catch (err) {
      console.error(`\n${COLORS.red}FATAL ERROR: ${err.message}${COLORS.reset}`);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
})();
