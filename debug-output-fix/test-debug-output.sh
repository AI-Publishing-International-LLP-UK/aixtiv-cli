#!/bin/bash

# Test the Aixtiv CLI Debug Output Enhancement
echo "🧪 Testing Aixtiv CLI Debug Output Enhancement"
echo

# Check if we're in the right directory
if [[ ! -d "bin" || ! -f "bin/aixtiv.js" ]]; then
  echo "❌ Error: This script must be run from the Aixtiv CLI root directory"
  echo "Current directory: $(pwd)"
  echo "Please navigate to the correct directory and try again"
  exit 1
fi

# Test command
TEST_COMMAND="claude:code:generate --task \"Create a function that calculates the factorial of a number\" --language javascript"

echo "📋 Test command: $TEST_COMMAND"
echo

# Method 1: Run with direct debug script
echo "🔍 Method 1: Using run-with-debug.js"
echo "Running: node debug-output-fix/run-with-debug.js $TEST_COMMAND"
echo
echo "Press Enter to continue..."
read

node debug-output-fix/run-with-debug.js $TEST_COMMAND

echo
echo "✅ Method 1 complete"
echo
echo "Press Enter to try Method 2..."
read

# Method 2: If installation was performed
if [[ -f "bin/aixtiv-debug.js" ]]; then
  echo "🔍 Method 2: Using aixtiv-debug.js wrapper"
  echo "Running: ./bin/aixtiv-debug.js $TEST_COMMAND"
  echo
  
  ./bin/aixtiv-debug.js $TEST_COMMAND
  
  echo
  echo "✅ Method 2 complete"
else
  echo "⚠️ Method 2 skipped: bin/aixtiv-debug.js not found"
  echo "Run the installation script to create this wrapper:"
  echo "  ./debug-output-fix/install.sh"
fi

echo
echo "🎉 Testing complete!"
echo
echo "You now have two ways to see both internal reasoning and execution results:"
echo "1. node debug-output-fix/run-with-debug.js <command> [arguments]"
echo "2. ./bin/aixtiv-debug.js <command> [arguments] (if installed)"
echo
echo "Enjoy the enhanced visibility into the Aixtiv CLI operations!"
