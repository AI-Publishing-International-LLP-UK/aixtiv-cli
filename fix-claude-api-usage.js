const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Path to the generate.js file
const filePath = path.join(__dirname, 'commands', 'claude', 'code', 'generate.js');

console.log(`Reading file: ${filePath}`);

// Check if DR_CLAUDE_API is a URL
const drClaudeApi = process.env.DR_CLAUDE_API || '';
const isUrl = drClaudeApi.startsWith('http');

console.log(`DR_CLAUDE_API appears to be a ${isUrl ? 'URL' : 'API key or empty'}`);

if (!isUrl) {
  console.log('No changes needed, DR_CLAUDE_API is not a URL');
  process.exit(0);
}

// Read the file content
let content;
try {
  content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully');
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}

// Update the functionUrl to use DR_CLAUDE_API if it's a URL
const functionUrlPattern =
  /const functionUrl = process\.env\.CLAUDE_API_ENDPOINT \|\| 'https:\/\/api\.anthropic\.com\/v1\/messages';/;
const updatedFunctionUrl = `const functionUrl = process.env.CLAUDE_API_ENDPOINT || process.env.DR_CLAUDE_API || 'https://api.anthropic.com/v1/messages';`;

// Update the code
const updatedContent = content.replace(functionUrlPattern, updatedFunctionUrl);

// Write the updated content back to the file
try {
  fs.writeFileSync(filePath, updatedContent);
  console.log('Successfully updated functionUrl to use DR_CLAUDE_API as a URL');
} catch (error) {
  console.error(`Error writing to file: ${error.message}`);
  process.exit(1);
}
