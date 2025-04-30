#!/bin/bash

# File to modify
FILE="bin/aixtiv.js"

# Check if file exists
if [ ! -f "$FILE" ]; then
  echo "Error: $FILE does not exist"
  exit 1
fi

# Create backup
cp "$FILE" "${FILE}.bak"
echo "Created backup at ${FILE}.bak"

# Comment out the SERPEW require line
sed -i '' 's/const registerSerpewCommands = require("\.\.\/commands\/serpew");/\/\/ TEMPORARILY COMMENTED: const registerSerpewCommands = require("\.\.\/commands\/serpew");/' "$FILE"

# Comment out the SERPEW registration line
sed -i '' 's/registerSerpewCommands(program);/\/\/ TEMPORARILY COMMENTED: registerSerpewCommands(program);/' "$FILE"

echo "Modified $FILE to comment out SERPEW module references"
echo "Run the following to make the script executable:"
echo "chmod +x fix-aixtiv-cli.sh"
echo "Then execute with:"
echo "./fix-aixtiv-cli.sh"

