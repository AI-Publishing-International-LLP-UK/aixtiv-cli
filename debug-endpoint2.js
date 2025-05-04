require('dotenv').config();
const CLAUDE_API_ENDPOINT = process.env.CLAUDE_API_ENDPOINT || process.env.DR_CLAUDE_API || 'https://api-dr-claude-us-west1.nw.gcp.com/v3';
const PROJECT_DELEGATE_ENDPOINT = `${CLAUDE_API_ENDPOINT}/dr-claude/projects/delegate`;

console.log(`CLAUDE_API_ENDPOINT: ${CLAUDE_API_ENDPOINT}`);
console.log(`PROJECT_DELEGATE_ENDPOINT: ${PROJECT_DELEGATE_ENDPOINT}`);
