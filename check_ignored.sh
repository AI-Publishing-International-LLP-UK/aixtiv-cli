#!/bin/bash

# Check a few sample paths to see if they're ignored
echo "Checking if important files are being ignored by git..."

# Sample paths to check
paths=(
  "bin/aixtiv.js"
  "lib/agent-tracking.js"
  "commands/claude/status.js"
  "src/index.js"
  "aixtiv-cli/lib/agent-tracking.js"
  ".eslintrc.js"
)

# Check each path
for path in "${paths[@]}"; do
  echo -n "Is $path ignored? "
  if git check-ignore -q "$path"; then
    echo "YES - This file is ignored by git"
  else
    echo "NO - This file is not ignored"
    
    # Check if the file exists
    if [ -f "$path" ]; then
      echo "   File exists but is not tracked."
    else
      echo "   File doesn't exist at this path."
    fi
  fi
done

echo "Completed ignore check."
