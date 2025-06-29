require('dotenv').config();
const CLAUDE_API_ENDPOINT =
  process.env.CLAUDE_API_ENDPOINT ||
  process.env.DR_CLAUDE_API ||
  'https://us-west1-aixtiv-symphony.cloudfunctions.net';
const PROJECT_DELEGATE_ENDPOINT = `${CLAUDE_API_ENDPOINT}/dr-claude/projects/delegate`;

console.log(`CLAUDE_API_ENDPOINT: ${CLAUDE_API_ENDPOINT}`);
console.log(`PROJECT_DELEGATE_ENDPOINT: ${PROJECT_DELEGATE_ENDPOINT}`);

// Additional debugging info
console.log('\nDEBUGGING ENVIRONMENT:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`ANTHROPIC_API_KEY set: ${!!process.env.ANTHROPIC_API_KEY}`);
console.log(`DR_CLAUDE_API set: ${!!process.env.DR_CLAUDE_API}`);

// Check for common configuration issues
if (!process.env.CLAUDE_API_ENDPOINT && !process.env.DR_CLAUDE_API) {
  console.log('\nWARNING: No custom endpoint configured, using default endpoint');
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('\nWARNING: ANTHROPIC_API_KEY is not set in environment');
}
