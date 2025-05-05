/**
 * Fix Anthropic Header Script
 *
 * This script adds the missing 'anthropic-api-key' header to the Claude code generation file.
 * It uses either ANTHROPIC_API_KEY or DR_CLAUDE_API environment variables.
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

// Look for the pattern where we have Content-Type followed by anthropic-version
const contentTypePattern = /'Content-Type':\s*'application\/json',\s*\n\s*'anthropic-version':/;
const contentTypeMatch = content.match(contentTypePattern);

if (!contentTypeMatch) {
  console.error('Could not find the expected pattern in the headers section');
  process.exit(1);
}

// Insert the anthropic-api-key header after Content-Type
const updatedContent = content.replace(
  contentTypePattern,
  `'Content-Type': 'application/json',\n  'anthropic-api-key': process.env.ANTHROPIC_API_KEY || process.env.DR_CLAUDE_API || '',\n  'anthropic-version':`
);

// Write the updated content back to the file
try {
  fs.writeFileSync(filePath, updatedContent);
  console.log('Successfully added anthropic-api-key header to generate.js');
  console.log(
    'The Claude code generation feature should now work with either ANTHROPIC_API_KEY or DR_CLAUDE_API environment variables'
  );
} catch (error) {
  console.error(`Error writing to file: ${error.message}`);
  process.exit(1);
}
