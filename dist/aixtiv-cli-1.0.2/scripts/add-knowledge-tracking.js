#!/usr/bin/env node

/**
 * Script to add knowledge access tracking to command files
 * 
 * This script demonstrates how to add telemetry knowledge access tracking
 * to a specific command file.
 * 
 * Usage: node scripts/telemetry/add-knowledge-tracking.js <command-file-path>
 * Example: node scripts/telemetry/add-knowledge-tracking.js commands/claude/status.js
 */

const fs = require('fs');
const path = require('path');

// Get the command file path from arguments
const commandFilePath = process.argv[2];

if (!commandFilePath) {
  console.error('Please provide a command file path');
  console.error('Usage: node scripts/telemetry/add-knowledge-tracking.js <command-file-path>');
  console.error('Example: node scripts/telemetry/add-knowledge-tracking.js commands/claude/status.js');
  process.exit(1);
}

// Full path to the command file
const fullPath = path.resolve(process.cwd(), commandFilePath);

// Check if the file exists
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

// Read the command file
let fileContent = fs.readFileSync(fullPath, 'utf8');

// Check if telemetry is already imported
const hasTelemetryImport = fileContent.includes('require(\'../../lib/telemetry\')') || 
                          fileContent.includes('require("../../lib/telemetry")');

// Calculate the relative path to the telemetry module
const relativePath = path.relative(path.dirname(fullPath), path.join(process.cwd(), 'lib/telemetry'));
const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

// Add telemetry import if needed
if (!hasTelemetryImport) {
  // Find a place to add the import
  const lines = fileContent.split('\n');
  
  // Find the last require statement
  let lastRequireIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('require(')) {
      lastRequireIndex = i;
    }
  }
  
  // If found, add after the last require, otherwise add at the beginning
  if (lastRequireIndex >= 0) {
    lines.splice(lastRequireIndex + 1, 0, `const telemetry = require('${importPath}');`);
  } else {
    lines.unshift(`const telemetry = require('${importPath}');`);
  }
  
  fileContent = lines.join('\n');
}

// Identify the access type based on the command file
let accessType = 'general';
if (commandFilePath.includes('claude')) {
  accessType = 'ai-model';
} else if (commandFilePath.includes('agent')) {
  accessType = 'agent';
} else if (commandFilePath.includes('resource')) {
  accessType = 'resource';
} else if (commandFilePath.includes('copilot')) {
  accessType = 'copilot';
}

// Find places to add knowledge access tracking
// Look for async functions or function exports
const asyncFunctionRegex = /async\s+function\s+(\w+)/g;
const exportedFunctionRegex = /module\.exports\s*=\s*(?:async\s*)?function\s*\w*/;
const asyncArrowFunctionRegex = /const\s+(\w+)\s*=\s*async\s*\(/g;

const matches = [...fileContent.matchAll(asyncFunctionRegex)];
if (matches.length > 0) {
  // Process each async function
  for (const match of matches) {
    const funcName = match[1];
    const funcStart = fileContent.indexOf(match[0]);
    
    // Find the function body opening brace
    const braceIndex = fileContent.indexOf('{', funcStart);
    if (braceIndex > 0) {
      // Find the first statement in the function
      const firstStatementIndex = fileContent.indexOf('\n', braceIndex) + 1;
      
      // Add knowledge access tracking before the first statement
      const trackingCode = `  // Record knowledge access for telemetry\n  telemetry.recordKnowledgeAccess('${accessType}');\n`;
      fileContent = fileContent.substring(0, firstStatementIndex) + 
                   trackingCode + 
                   fileContent.substring(firstStatementIndex);
    }
  }
} else if (exportedFunctionRegex.test(fileContent)) {
  // Handle module.exports = function...
  const match = fileContent.match(exportedFunctionRegex);
  const funcStart = fileContent.indexOf(match[0]);
  const braceIndex = fileContent.indexOf('{', funcStart);
  
  if (braceIndex > 0) {
    const firstStatementIndex = fileContent.indexOf('\n', braceIndex) + 1;
    const trackingCode = `  // Record knowledge access for telemetry\n  telemetry.recordKnowledgeAccess('${accessType}');\n`;
    fileContent = fileContent.substring(0, firstStatementIndex) + 
                 trackingCode + 
                 fileContent.substring(firstStatementIndex);
  }
} else {
  // Try to find arrow functions
  const arrowMatches = [...fileContent.matchAll(asyncArrowFunctionRegex)];
  if (arrowMatches.length > 0) {
    for (const match of arrowMatches) {
      const funcName = match[1];
      const funcStart = fileContent.indexOf(match[0]);
      
      // Find the function body opening brace
      const braceIndex = fileContent.indexOf('{', funcStart);
      if (braceIndex > 0) {
        // Find the first statement in the function
        const firstStatementIndex = fileContent.indexOf('\n', braceIndex) + 1;
        
        // Add knowledge access tracking before the first statement
        const trackingCode = `  // Record knowledge access for telemetry\n  telemetry.recordKnowledgeAccess('${accessType}');\n`;
        fileContent = fileContent.substring(0, firstStatementIndex) + 
                     trackingCode + 
                     fileContent.substring(firstStatementIndex);
      }
    }
  } else {
    console.warn('Could not find a suitable place to add knowledge access tracking');
    console.warn('You may need to add it manually');
  }
}

// Create a backup of the original file
fs.copyFileSync(fullPath, `${fullPath}.bak`);
console.log(`Created backup at ${fullPath}.bak`);

// Write the updated content
fs.writeFileSync(fullPath, fileContent);
console.log(`Updated ${fullPath} with telemetry knowledge access tracking`);
console.log(`Access type: ${accessType}`);
