#!/usr/bin/env node

/**
 * Restore Original Command Files
 *
 * This script restores the original command files that may have been
 * modified by the installation process.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// List of files that may have been modified
const filesToFix = [
  path.join(__dirname, '..', 'commands', 'claude', 'agent', 'delegate.js'),
  path.join(__dirname, '..', 'commands', 'claude', 'automation', 'github.js'),
  path.join(__dirname, '..', 'commands', 'claude', 'code', 'generate.js'),
];

// Restore original files
console.log(chalk.cyan('Restoring original command files...'));

let filesFixed = 0;

for (const filePath of filesToFix) {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Check if file was modified to use debug-display
      if (content.includes('debug-display')) {
        console.log(`Fixing ${filePath}...`);

        // Remove debug-display import
        content = content.replace(
          /\/\/ Import debug display[\s\S]*?require\(['"]\.\.\/..\/.\/lib\/debug-display['"]\);[\s\S]*?\n/g,
          ''
        );

        // Remove debug display calls
        content = content.replace(
          /\/\/ Display debug information[\s\S]*?debugDisplay\({[\s\S]*?\};[\s\S]*?\n/g,
          ''
        );

        // Remove debug variables
        content = content.replace(
          /\/\/ Capture internal reasoning[\s\S]*?const internalThought[\s\S]*?;[\s\S]*?\n/g,
          ''
        );

        // Write fixed content back to file
        fs.writeFileSync(filePath, content);
        filesFixed++;

        console.log(chalk.green(`✓ Fixed ${path.basename(filePath)}`));
      } else {
        console.log(chalk.dim(`No changes needed for ${path.basename(filePath)}`));
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error fixing ${filePath}: ${error.message}`));
  }
}

// Clean up any debug files
const debugFilesToRemove = [
  path.join(__dirname, '..', 'lib', 'debug-display.js'),
  path.join(__dirname, '..', 'bin', 'aixtiv-debug.js'),
];

for (const filePath of debugFilesToRemove) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(chalk.green(`✓ Removed ${path.basename(filePath)}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error removing ${filePath}: ${error.message}`));
  }
}

console.log('');
console.log(chalk.green(`Restoration complete! Fixed ${filesFixed} files.`));
console.log('');
console.log('You can now use the simple debug wrapper without issues:');
console.log(chalk.cyan('node debug-output-fix/simple-debug.js <command> [arguments]'));
console.log('');
console.log('Example:');
console.log(
  chalk.cyan(
    'node debug-output-fix/simple-debug.js claude:code:generate --task "Create a factorial function"'
  )
);
