#!/bin/bash

# Apply code generator fixes

echo "Applying fixes to code generation files..."

# Create backup of original files
echo "Creating backups..."
cp /Users/as/asoos/aixtiv-cli/commands/claude/code/generate.js /Users/as/asoos/aixtiv-cli/commands/claude/code/generate.js.bak
cp /Users/as/asoos/aixtiv-cli/commands/claude/code/fallback-generator.js /Users/as/asoos/aixtiv-cli/commands/claude/code/fallback-generator.js.bak

# Apply fixes
echo "Applying fixes..."
cp /Users/as/asoos/aixtiv-cli/fixes/generate.js.fix /Users/as/asoos/aixtiv-cli/commands/claude/code/generate.js
cp /Users/as/asoos/aixtiv-cli/fixes/fallback-generator.js.fix /Users/as/asoos/aixtiv-cli/commands/claude/code/fallback-generator.js

echo "Fixes applied successfully!"
echo "Original files were backed up with .bak extension"
echo ""
echo "Changes made:"
echo "1. Added validation for task parameter in generate.js"
echo "2. Added handling for undefined task in fallback-generator.js"
echo "3. Improved error messages for better debugging"
echo ""
echo "To test, run a command like:"
echo "  node bin/aixtiv.js claude code generate --language javascript --task \"Create a factorial function\""
