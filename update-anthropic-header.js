/**
 * Update Anthropic Header Script
 * 
 * This script updates the existing 'anthropic-api-key' header in the Claude code generation file
 * to use either ANTHROPIC_API_KEY or DR_CLAUDE_API environment variables.
 */

const fs = require('fs');
const path = require('path');

// Path to the generate.js file
const filePath = path.join(__dirname, 'commands', 'claude', 'code', 'generate.js');

console.log(`Reading file: ${filePath}`);

// Read the file content
let content;
try {
  content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully');
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}

// Look for the existing anthropic-api-key pattern
const apiKeyPattern = /'anthropic-api-key':\s*process\.env\.ANTHROPIC_API_KEY\s*\|\|\s*''/;
const apiKeyMatch = content.match(apiKeyPattern);

if (!apiKeyMatch) {
  console.error('Could not find the existing anthropic-api-key pattern');
  process.exit(1);
}

// Replace with a version that also checks DR_CLAUDE_API
const updatedContent = content.replace(
  apiKeyPattern,
  `'anthropic-api-key': process.env.ANTHROPIC_API_KEY || process.env.DR_CLAUDE_API || ''`
);

// Write the updated content back to the file
try {
  fs.writeFileSync(filePath, updatedContent);
  console.log('Successfully updated anthropic-api-key header in generate.js');
  console.log('The Claude code generation feature should now work with either ANTHROPIC_API_KEY or DR_CLAUDE_API environment variables');
} catch (error) {
  console.error(`Error writing to file: ${error.message}`);
  process.exit(1);
}
