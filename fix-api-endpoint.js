const fs = require('fs');
const path = require('path');

// Path to the generate.js file
const filePath = path.join(__dirname, 'commands', 'claude', 'code', 'generate.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace with the correct Anthropic API endpoint
const oldLine = "const functionUrl = process.env.CLAUDE_API_ENDPOINT || 'https://api.claude.ai/v1/code-generation';";
const newLine = "const functionUrl = process.env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages';";

// Replace the content
content = content.replace(oldLine, newLine);

// Write back to the file
fs.writeFileSync(filePath, content);

console.log('Updated generate.js with the correct Anthropic API endpoint');
