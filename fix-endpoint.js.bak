const fs = require('fs');
const path = require('path');

// Path to the generate.js file
const filePath = path.join(__dirname, 'commands', 'claude', 'code', 'generate.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace the hardcoded endpoint with one that checks for the environment variable
const oldLine = "const functionUrl = 'https://drclaude.live/code-generate';";
const newLine =
  "const functionUrl = process.env.CLAUDE_API_ENDPOINT || 'https://drclaude.live/code-generate';";

// Replace the content
content = content.replace(oldLine, newLine);

// Write back to the file
fs.writeFileSync(filePath, content);

console.log('Updated generate.js to use CLAUDE_API_ENDPOINT environment variable');
