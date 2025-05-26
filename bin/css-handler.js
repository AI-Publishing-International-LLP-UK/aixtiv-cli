#!/usr/bin/env node

/**
 * CSS Handler Script
 * 
 * This script safely handles CSS content in a shell environment to avoid zsh parse errors.
 * It can read CSS from stdin, a string argument, or a file, and either display it or save it.
 * 
 * Usage:
 *   - Pipe content: cat style.css | node css-handler.js
 *   - From file: node css-handler.js --file=input.css
 *   - Direct input: node css-handler.js --css="body { color: red; }"
 *   - Save output: node css-handler.js --file=input.css --output=processed.css
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  file: null,
  css: null,
  output: null,
  verbose: false
};

// Process arguments
args.forEach(arg => {
  if (arg.startsWith('--file=')) {
    options.file = arg.substring(7);
  } else if (arg.startsWith('--css=')) {
    options.css = arg.substring(6);
  } else if (arg.startsWith('--output=')) {
    options.output = arg.substring(9);
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
});

function printHelp() {
  console.log(`
CSS Handler - Safely process CSS content in shell environments

Usage:
  node css-handler.js [options]

Options:
  --file=FILE       Read CSS from FILE
  --css="CONTENT"   Directly provide CSS content (use quotes)
  --output=FILE     Write processed CSS to FILE
  --verbose, -v     Show additional information
  --help, -h        Show this help message

Examples:
  cat style.css | node css-handler.js
  node css-handler.js --file=style.css --output=processed.css
  node css-handler.js --css=".button { color: red; }"
  `);
}

// Function to safely process CSS content
function processCss(css) {
  if (options.verbose) {
    console.log('Processing CSS content...');
  }
  
  // Here you could perform additional CSS processing if needed
  return css;
}

// Function to handle file output
function outputResult(css) {
  if (options.output) {
    fs.writeFileSync(options.output, css);
    if (options.verbose) {
      console.log(`CSS saved to ${options.output}`);
    }
  } else {
    // Output to stdout but in a way that's safe for terminal
    // This uses JSON.stringify to properly escape special characters
    const safeOutput = JSON.stringify(css);
    console.log('CSS Content (safely escaped):');
    console.log(safeOutput);
    console.log('\nTo use this CSS safely in a shell script:');
    console.log('1. Save it to a file: node css-handler.js [options] --output=file.css');
    console.log('2. Use cat to display: cat file.css');
    console.log('3. Or use single quotes when needed: echo \'your { css: here; }\'');
  }
}

// Main function to coordinate processing
async function main() {
  let cssContent = '';

  // Determine input source
  if (options.css) {
    // Direct CSS input from command line
    cssContent = options.css;
  } else if (options.file) {
    // Read from file
    try {
      cssContent = fs.readFileSync(options.file, 'utf8');
      if (options.verbose) {
        console.log(`Read CSS from file: ${options.file}`);
      }
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Check if there's data from stdin (piped input)
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      for await (const line of rl) {
        cssContent += line + '\n';
      }
      
      if (options.verbose) {
        console.log('Read CSS from stdin');
      }
    } else {
      // No input source specified
      console.error('No CSS input provided. Use --file, --css, or pipe content.');
      console.log('Use --help for usage information.');
      process.exit(1);
    }
  }

  // Process and output the CSS
  const processedCss = processCss(cssContent);
  outputResult(processedCss);
}

// Run the main function
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

