#!/bin/bash

# Aixtiv CLI Output Enhancement Installer
echo "🚀 Installing Aixtiv CLI Output Enhancement..."

# Make sure we're in the right directory
cd "$(dirname "$0")/.."
echo "📁 Working in directory: $(pwd)"

# Create lib directory if it doesn't exist
mkdir -p lib

# Run the enhancement script
echo "🔧 Running enhancement script..."
node debug-output-fix/fix-cli-output.js

echo "📝 Creating simple test command..."
cat > bin/aixtiv-debug.js << 'EOF'
#!/usr/bin/env node

/**
 * Aixtiv CLI Debug Wrapper
 * 
 * This script provides a debugging wrapper around the standard Aixtiv CLI
 * that shows both internal thought processes and execution results.
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

// Get the original command to run
const args = process.argv.slice(2);
const originalCommand = path.join(__dirname, 'aixtiv.js');

console.log(chalk.cyan('🔍 DEBUG MODE ACTIVATED'));
console.log(chalk.dim(`Running command: ${originalCommand} ${args.join(' ')}`));
console.log(chalk.yellow('─'.repeat(50)));

// Run the original command with a prefix to show its output is the actual result
const child = spawn('node', [originalCommand, ...args], {
  stdio: ['inherit', 'pipe', 'pipe']
});

// Display stdout with a prefix
child.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Split the output into thought and result sections if the pattern is detected
  if (output.includes('INTERNAL REASONING') && output.includes('EXECUTION RESULT')) {
    // Output already has our debug formatting, just pass it through
    process.stdout.write(output);
  } else {
    // Apply simple labeling
    console.log(chalk.green('📊 EXECUTION RESULT:'));
    console.log(chalk.green('─'.repeat(50)));
    process.stdout.write(output);
  }
});

// Display stderr
child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  console.log(chalk.yellow('─'.repeat(50)));
  console.log(chalk.dim(`Command exited with code ${code}`));
});
EOF

chmod +x bin/aixtiv-debug.js

echo "✅ Installation complete!"
echo ""
echo "To use the debug mode, run commands with the aixtiv-debug.js wrapper:"
echo "  ./bin/aixtiv-debug.js <command> <args>"
echo ""
echo "Example:"
echo "  ./bin/aixtiv-debug.js claude:code:generate --task \"Create a factorial function\""
echo ""
echo "This will show both the internal reasoning and the execution results."
