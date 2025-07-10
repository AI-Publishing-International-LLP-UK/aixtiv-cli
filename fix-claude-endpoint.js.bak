const fs = require('fs');
const path = require('path');

// Path to the generate.js file
const filePath = path.join(__dirname, 'commands', 'claude', 'code', 'generate.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace with the correct Anthropic API endpoint
const oldLine =
  "const functionUrl = process.env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages';";
const newLine =
  "const functionUrl = process.env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages';";

// Also need to update the headers to match the Anthropic API requirements
const headerSearchPattern = /headers: {[\s\S]*?},/;

const newHeaders = `headers: {
        'Content-Type': 'application/json',
        'anthropic-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'X-Agent-ID': getCurrentAgentId() // Add agent ID in headers for tracking
      },`;

// Replace the content
content = content.replace(oldLine, newLine);
content = content.replace(headerSearchPattern, newHeaders);

// Write back to the file
fs.writeFileSync(filePath, content);

console.log('Updated generate.js with the correct Anthropic API endpoint and headers');
