require('dotenv').config();

// Helper to safely show part of a key
function safeKeyInfo(key) {
  if (!key) return 'not defined';

  // Show only the first 7 characters (typically shows the prefix) and the length
  const prefix = key.substring(0, 7);
  return `starts with "${prefix}..." and is ${key.length} characters long`;
}

console.log('Checking environment variables for Anthropic API...');
console.log(`ANTHROPIC_API_KEY: ${safeKeyInfo(process.env.ANTHROPIC_API_KEY)}`);
console.log(`DR_CLAUDE_API: ${safeKeyInfo(process.env.DR_CLAUDE_API)}`);

// Check if DR_CLAUDE_API has the expected format (usually starts with sk-ant-)
if (process.env.DR_CLAUDE_API) {
  const hasCorrectFormat = process.env.DR_CLAUDE_API.startsWith('sk-ant-');
  console.log(`DR_CLAUDE_API has correct format (starts with sk-ant-): ${hasCorrectFormat}`);
}

// Check if any key is available
const hasValidKey = !!process.env.ANTHROPIC_API_KEY || !!process.env.DR_CLAUDE_API;
console.log(`Has at least one API key defined: ${hasValidKey}`);

// Check for header format used by Anthropic v2 API
if (process.env.DR_CLAUDE_API) {
  console.log('\nTesting API key formatting:');

  // For x-api-key header format
  const xApiKeyHeader = `x-api-key: ${process.env.DR_CLAUDE_API}`;
  console.log(`x-api-key header format: ${xApiKeyHeader.substring(0, 18)}...`);

  // For anthropic-api-key header format
  const anthropicApiKeyHeader = `anthropic-api-key: ${process.env.DR_CLAUDE_API}`;
  console.log(`anthropic-api-key header format: ${anthropicApiKeyHeader.substring(0, 24)}...`);

  console.log('\nNOTE: Anthropic V2 API requires "x-api-key" header, not "anthropic-api-key"');
}
