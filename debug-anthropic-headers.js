/**
 * Debug Anthropic Headers Script
 * 
 * This script examines the Claude code generation file to understand
 * how the headers and API key are being used.
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

// Function to extract and print sections
function extractAndPrint(pattern, label) {
  const regex = new RegExp(pattern, 's'); // 's' flag to allow . to match newlines
  const match = content.match(regex);
  
  if (match) {
    console.log(`\n=== ${label} ===`);
    console.log(match[0]);
  } else {
    console.log(`\n=== ${label} not found ===`);
  }
}

// Extract the fetch request with headers
extractAndPrint('const response = await fetch[\\s\\S]*?\\);', 'Fetch Request');

// Extract any environment variable loading or setup
extractAndPrint('require\\([\'"]dotenv[\'"]\\)[\\s\\S]*?;', 'Environment Variable Setup');

// Extract any initialization or configuration
extractAndPrint('const functionUrl[\\s\\S]*?;', 'API Endpoint Configuration');

// Extract any command execution
extractAndPrint('execute\\([\\s\\S]*?{[\\s\\S]*?}\\)', 'Command Execution');

console.log('\nDebug complete. Check the above sections to understand how API keys are being used.');

/**
 * Debug Anthropic Headers Script
 * 
 * This script examines how headers and API keys are being used in the Claude code generation file.
 * It extracts and prints the relevant sections to help diagnose authentication issues.
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
  console.log('File read successfully\n');
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}

// Find the fetch request with headers
console.log('====== FETCH REQUEST WITH HEADERS ======');
const fetchPattern = /const response = await fetch[\s\S]*?}\);/g;
const fetchMatches = content.match(fetchPattern);

if (fetchMatches && fetchMatches.length > 0) {
  console.log(fetchMatches[0]);
} else {
  console.log('No fetch request found');
}

// Find sections related to environment variables and API setup
console.log('\n====== ENVIRONMENT VARIABLE LOADING ======');
const envVarPattern = /process\.env\.[A-Z_]+/g;
const envVars = content.match(envVarPattern);

if (envVars && envVars.length > 0) {
  console.log('Environment variables used:');
  const uniqueEnvVars = [...new Set(envVars)];
  uniqueEnvVars.forEach(envVar => {
    console.log(`- ${envVar}`);
  });
} else {
  console.log('No environment variables found');
}

// Find sections related to API configuration or endpoint setup
console.log('\n====== API CONFIGURATION ======');
const configPattern = /const .*Url = .*process\.env\..*API.*|require\('dotenv'\)/g;
const configMatches = content.match(configPattern);

if (configMatches && configMatches.length > 0) {
  console.log('API configuration:');
  configMatches.forEach(config => {
    console.log(config);
  });
} else {
  console.log('No API configuration found');
}

// Check if dotenv is being used to load environment variables
console.log('\n====== ENVIRONMENT LOADING ======');
const dotenvPattern = /require\(['"](dotenv|\.\.?\/\.env)['"]\)/g;
const dotenvMatches = content.match(dotenvPattern);

if (dotenvMatches && dotenvMatches.length > 0) {
  console.log('Environment loading:');
  dotenvMatches.forEach(match => {
    console.log(match);
  });
} else {
  console.log('No explicit dotenv loading found in this file');
}

// Look for headers validation or manipulation
console.log('\n====== HEADERS VALIDATION OR MANIPULATION ======');
const headersPattern = /headers\s*=[\s\S]*?}/g;
const headersMatches = content.match(headersPattern);

if (headersMatches && headersMatches.length > 0) {
  console.log('Headers manipulation:');
  headersMatches.forEach(match => {
    console.log(match);
  });
} else {
  console.log('No headers validation or manipulation found');
}

console.log('\nDebugging complete');

