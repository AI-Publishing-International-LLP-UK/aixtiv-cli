#!/usr/bin/env node
/**
 * Test Script for Agent Cards Validation
 * 
 * This script validates all agent card JSON files in the config/agent-cards directory
 * to ensure they load correctly and have all required fields.
 * 
 * Usage:
 *   node scripts/test-agent-cards.js
 * 
 * Options:
 *   --verbose       Show detailed information about each card
 *   --fix           Attempt to fix common issues in agent cards
 *   --agent [name]  Test only the specified agent card
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Directory containing agent cards
const AGENT_CARDS_DIR = path.join(process.cwd(), 'config', 'agent-cards');

// Required fields for all agent cards (legacy V1 format)
const REQUIRED_FIELDS_V1 = [
  'id',
  'name',
  'version',
  'description',
  'capabilities',
  'status'
];

// Required fields for V2 Immersive format
const REQUIRED_FIELDS_V2 = {
  agentProfile: ['id', 'name', 'version', 'description', 'capabilities'],
  brainArchitecture: true, // Just check if section exists
  metadata: ['version', 'created', 'updated']
};

// Detect agent card version
function detectAgentCardVersion(card) {
  if (card.agentProfile && card.brainArchitecture) {
    return 'v2';
  }
  return 'v1';
}

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  fix: args.includes('--fix'),
  agent: null
};

// Extract agent name if specified
const agentIndex = args.indexOf('--agent');
if (agentIndex !== -1 && args.length > agentIndex + 1) {
  options.agent = args[agentIndex + 1];
}

/**
 * Load and validate all agent cards
 */
async function validateAgentCards() {
  console.log(chalk.cyan('\n=== Agent Cards Validation ===\n'));
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(AGENT_CARDS_DIR)) {
      console.error(chalk.red(`Error: Agent cards directory not found at ${AGENT_CARDS_DIR}`));
      process.exit(1);
    }
    
    // Get list of card files
    let cardFiles = fs.readdirSync(AGENT_CARDS_DIR).filter(file => file.endsWith('.json'));
    
    // Filter by agent if specified
    if (options.agent) {
      const agentPattern = options.agent.toLowerCase();
      cardFiles = cardFiles.filter(file => file.toLowerCase().includes(agentPattern));
      if (cardFiles.length === 0) {
        console.error(chalk.red(`Error: No agent cards found matching "${options.agent}"`));
        process.exit(1);
      }
    }
    
    console.log(chalk.gray(`Found ${cardFiles.length} agent card files to validate...\n`));
    
    // Track validation results
    const results = {
      valid: 0,
      invalid: 0,
      fixed: 0
    };
    
    const invalidCards = [];
    
    // Validate each card
    for (const file of cardFiles) {
      const cardPath = path.join(AGENT_CARDS_DIR, file);
      const result = await validateCard(cardPath);
      
      // Update results
      if (result.valid) {
        results.valid++;
      } else {
        results.invalid++;
        invalidCards.push({ file, issues: result.issues });
        
        // Fix if requested
        if (options.fix && result.fixable) {
          if (await fixCard(cardPath, result.card, result.issues)) {
            results.fixed++;
          }
        }
      }
    }
    
    // Print summary
    console.log(chalk.cyan('\n=== Validation Summary ===\n'));
    console.log(`Total agent cards: ${chalk.bold(cardFiles.length)}`);
    console.log(`Valid: ${chalk.green(results.valid)}`);
    console.log(`Invalid: ${chalk.red(results.invalid)}`);
    
    if (options.fix) {
      console.log(`Fixed: ${chalk.yellow(results.fixed)}`);
    }
    
    // Print invalid cards
    if (invalidCards.length > 0) {
      console.log(chalk.red('\nInvalid Cards:'));
      invalidCards.forEach(card => {
        console.log(`\n${chalk.bold(card.file)}:`);
        card.issues.forEach(issue => {
          console.log(`  - ${issue}`);
        });
      });
      
      if (!options.fix) {
        console.log(chalk.yellow('\nTip: Run with --fix to attempt automatic fixing of issues.'));
      }
    }
    
    // Exit with appropriate status code
    process.exit(results.invalid > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red(`Error during validation: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Validate a single agent card
 * @param {string} cardPath - Path to the agent card file
 * @returns {Object} - Validation result
 */
async function validateCard(cardPath) {
  const fileName = path.basename(cardPath);
  const result = {
    valid: false,
    card: null,
    issues: [],
    fixable: false
  };
  
  try {
    // Read and parse the card file
    const cardContent = fs.readFileSync(cardPath, 'utf8');
    let card = null;
    
    try {
      card = JSON.parse(cardContent);
      result.card = card;
    } catch (error) {
      result.issues.push(`Invalid JSON format: ${error.message}`);
      return result;
    }
    
    // Detect version
    const version = detectAgentCardVersion(card);

    // Validate required fields based on version
    if (version === 'v1') {
      for (const field of REQUIRED_FIELDS_V1) {
        if (!card[field]) {
          result.issues.push(`Missing required field: ${field}`);
          result.fixable = field !== 'id' && field !== 'name';
        }
      }
    } else { // v2
      // Check agentProfile fields
      if (!card.agentProfile) {
        result.issues.push('Missing required section: agentProfile');
        result.fixable = false;
      } else {
        for (const field of REQUIRED_FIELDS_V2.agentProfile) {
          if (!card.agentProfile[field]) {
            result.issues.push(`Missing required field in agentProfile: ${field}`);
            result.fixable = field !== 'id' && field !== 'name';
          }
        }
      }

      // Check brainArchitecture existence
      if (!card.brainArchitecture) {
        result.issues.push('Missing required section: brainArchitecture');
        result.fixable = false;
      }

      // Check metadata fields
      if (!card.metadata) {
        result.issues.push('Missing required section: metadata');
        result.fixable = true;
      } else {
        for (const field of REQUIRED_FIELDS_V2.metadata) {
          if (!card.metadata[field]) {
            result.issues.push(`Missing required field in metadata: ${field}`);
            result.fixable = true;
          }
        }
      }
    }
    
    // Validate capabilities is an array (based on version)
    if (version === 'v1') {
      if (card.capabilities && !Array.isArray(card.capabilities)) {
        result.issues.push('Capabilities must be an array');
        result.fixable = true;
      }
    } else { // v2
      if (card.agentProfile && card.agentProfile.capabilities && !Array.isArray(card.agentProfile.capabilities)) {
        result.issues.push('agentProfile.capabilities must be an array');
        result.fixable = true;
      }
    }
    
    // Validate status is valid (only for v1 cards)
    if (version === 'v1') {
      const validStatuses = ['ready', 'in_development', 'maintenance'];
      if (card.status && !validStatuses.includes(card.status)) {
        result.issues.push(`Invalid status: ${card.status}. Must be one of: ${validStatuses.join(', ')}`);
        result.fixable = true;
      }
    }
    
    // Validate version format (x.y.z) based on version
    if (version === 'v1') {
      if (card.version && !/^\d+\.\d+\.\d+$/.test(card.version)) {
        result.issues.push(`Invalid version format: ${card.version}. Should be in format x.y.z`);
        result.fixable = true;
      }
    } else { // v2
      if (card.agentProfile && card.agentProfile.version && !/^\d+\.\d+\.\d+$/.test(card.agentProfile.version)) {
        result.issues.push(`Invalid version format in agentProfile: ${card.agentProfile.version}. Should be in format x.y.z`);
        result.fixable = true;
      }

      if (card.metadata && card.metadata.version && !/^\d+\.\d+\.\d+$/.test(card.metadata.version)) {
        result.issues.push(`Invalid version format in metadata: ${card.metadata.version}. Should be in format x.y.z`);
        result.fixable = true;
      }
    }
    
    // Validate team_assignments if present
    if (card.team_assignments && Array.isArray(card.team_assignments)) {
      for (let i = 0; i < card.team_assignments.length; i++) {
        const team = card.team_assignments[i];
        if (!team.team_id || !team.role) {
          result.issues.push(`Team assignment at index ${i} is missing required fields (team_id, role)`);
          result.fixable = false;
        }
      }
    }
    
    // Check ID consistency with filename based on version
    const expectedIdPart = fileName.replace('.json', '').replace(/_/g, '-');

    if (version === 'v1') {
      if (card.id && !card.id.includes(expectedIdPart.replace('dr-', ''))) {
        result.issues.push(`ID "${card.id}" does not match expected pattern from filename "${expectedIdPart}"`);
        result.fixable = true;
      }
    } else { // v2
      if (card.agentProfile && card.agentProfile.id &&
          !card.agentProfile.id.includes(expectedIdPart.replace('dr-', '').replace('drmatch-', 'dr-match-'))) {
        result.issues.push(`ID "${card.agentProfile.id}" does not match expected pattern from filename "${expectedIdPart}"`);
        result.fixable = true;
      }
    }
    
    // Print validation result
    if (result.issues.length === 0) {
      result.valid = true;
      console.log(`${chalk.green('✓')} ${chalk.bold(fileName)}: Valid`);
      
      if (options.verbose) {
        if (version === 'v1') {
          console.log(`  ID: ${card.id}`);
          console.log(`  Name: ${card.name}`);
          console.log(`  Version: ${card.version}`);
          console.log(`  Status: ${card.status}`);
          console.log(`  Capabilities: ${card.capabilities.length}`);
        } else { // v2
          console.log(`  ID: ${card.agentProfile.id}`);
          console.log(`  Name: ${card.agentProfile.name}`);
          console.log(`  Version: ${card.agentProfile.version}`);
          console.log(`  Type: ${card.agentProfile.type || 'Not specified'}`);
          console.log(`  Capabilities: ${card.agentProfile.capabilities.length}`);
          console.log(`  Brain Architecture: ${Object.keys(card.brainArchitecture).length} components`);
          console.log(`  Format: V2 Immersive System`);
        }
      }
    } else {
      console.log(`${chalk.red('✗')} ${chalk.bold(fileName)}: Invalid (${result.issues.length} issues)`);
      
      if (options.verbose) {
        result.issues.forEach(issue => {
          console.log(`  - ${issue}`);
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red(`Error validating ${fileName}: ${error.message}`));
    result.issues.push(`File error: ${error.message}`);
    return result;
  }
}

/**
 * Attempt to fix issues in an agent card
 * @param {string} cardPath - Path to the agent card file
 * @param {Object} card - Parsed card object
 * @param {Array<string>} issues - List of issues to fix
 * @returns {boolean} - True if fixes were applied
 */
async function fixCard(cardPath, card, issues) {
  const fileName = path.basename(cardPath);
  console.log(chalk.yellow(`\nAttempting to fix ${fileName}...`));
  
  let fixed = false;
  
  try {
    // Detect card version
    const version = detectAgentCardVersion(card);

    if (version === 'v1') {
      // V1 card fixes

      // Add missing non-critical fields
      if (!card.version) {
        card.version = '1.0.0';
        console.log('  - Added default version: 1.0.0');
        fixed = true;
      } else if (!/^\d+\.\d+\.\d+$/.test(card.version)) {
        // Fix version format
        const versionParts = card.version.match(/\d+/g) || [1, 0, 0];
        while (versionParts.length < 3) versionParts.push(0);
        card.version = versionParts.slice(0, 3).join('.');
        console.log(`  - Fixed version format: ${card.version}`);
        fixed = true;
      }

      // Fix capabilities if not an array
      if (card.capabilities && !Array.isArray(card.capabilities)) {
        if (typeof card.capabilities === 'string') {
          card.capabilities = [card.capabilities];
        } else {
          card.capabilities = [];
        }
        console.log('  - Fixed capabilities format');
        fixed = true;
      } else if (!card.capabilities) {
        card.capabilities = [];
        console.log('  - Added empty capabilities array');
        fixed = true;
      }

      // Fix invalid status
      const validStatuses = ['ready', 'in_development', 'maintenance'];
      if (card.status && !validStatuses.includes(card.status)) {
        card.status = 'in_development';
        console.log('  - Set status to "in_development"');
        fixed = true;
      } else if (!card.status) {
        card.status = 'in_development';
        console.log('  - Added default status: "in_development"');
        fixed = true;
      }

      // Fix ID if it doesn't match filename pattern
      const expectedIdPart = fileName.replace('.json', '').replace(/_/g, '-');
      if (card.id && !card.id.includes(expectedIdPart.replace('dr-', ''))) {
        card.id = expectedIdPart;
        console.log(`  - Fixed id to match filename: ${card.id}`);
        fixed = true;
      }

      // Add description if missing
      if (!card.description) {
        card.description = `${card.name || expectedIdPart} agent for Aixtiv Symphony platform`;
        console.log('  - Added default description');
        fixed = true;
      }
    } else {
      // V2 card fixes

      // Fix agentProfile
      if (!card.agentProfile) {
        console.log('  - Cannot fix missing agentProfile section');
      } else {
        // Fix version format in agentProfile
        if (card.agentProfile.version && !/^\d+\.\d+\.\d+$/.test(card.agentProfile.version)) {
          const versionParts = card.agentProfile.version.match(/\d+/g) || [2, 0, 0];
          while (versionParts.length < 3) versionParts.push(0);
          card.agentProfile.version = versionParts.slice(0, 3).join('.');
          console.log(`  - Fixed agentProfile version format: ${card.agentProfile.version}`);
          fixed = true;
        } else if (!card.agentProfile.version) {
          card.agentProfile.version = '2.0.0';
          console.log('  - Added default agentProfile version: 2.0.0');
          fixed = true;
        }

        // Fix capabilities in agentProfile
        if (card.agentProfile.capabilities && !Array.isArray(card.agentProfile.capabilities)) {
          if (typeof card.agentProfile.capabilities === 'string') {
            card.agentProfile.capabilities = [card.agentProfile.capabilities];
          } else {
            card.agentProfile.capabilities = [];
          }
          console.log('  - Fixed agentProfile capabilities format');
          fixed = true;
        } else if (!card.agentProfile.capabilities) {
          card.agentProfile.capabilities = [];
          console.log('  - Added empty agentProfile capabilities array');
          fixed = true;
        }

        // Fix ID if it doesn't match filename pattern
        const expectedIdPart = fileName.replace('.json', '').replace(/_/g, '-');
        const normalizedPart = expectedIdPart.replace('drmatch-', 'dr-match-');
        if (card.agentProfile.id && !card.agentProfile.id.includes(normalizedPart.replace('dr-', ''))) {
          card.agentProfile.id = normalizedPart;
          console.log(`  - Fixed agentProfile id to match filename: ${card.agentProfile.id}`);
          fixed = true;
        }
      }

      // Fix metadata
      if (!card.metadata) {
        console.log('  - Adding missing metadata section');
        card.metadata = {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: card.agentProfile?.version || '2.0.0',
          author: "Aixtiv Symphony Team",
          description: `Agent card for ${card.agentProfile?.name || fileName}`
        };
        fixed = true;
      } else {
        // Fix version format in metadata
        if (card.metadata.version && !/^\d+\.\d+\.\d+$/.test(card.metadata.version)) {
          const versionParts = card.metadata.version.match(/\d+/g) || [2, 0, 0];
          while (versionParts.length < 3) versionParts.push(0);
          card.metadata.version = versionParts.slice(0, 3).join('.');
          console.log(`  - Fixed metadata version format: ${card.metadata.version}`);
          fixed = true;
        }

        // Add timestamps if missing
        if (!card.metadata.created) {
          card.metadata.created = new Date().toISOString();
          console.log('  - Added metadata.created timestamp');
          fixed = true;
        }

        if (!card.metadata.updated) {
          card.metadata.updated = new Date().toISOString();
          console.log('  - Added metadata.updated timestamp');
          fixed = true;
        }
      }
    }
    
    if (fixed) {
      // Write fixed card back to file
      fs.writeFileSync(cardPath, JSON.stringify(card, null, 2), 'utf8');
      console.log(chalk.green('  ✓ Fixed and saved'));
      return true;
    } else {
      console.log(chalk.yellow('  ✗ No automatic fixes available'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red(`  ✗ Error fixing card: ${error.message}`));
    return false;
  }
}

// Run the validation
validateAgentCards();