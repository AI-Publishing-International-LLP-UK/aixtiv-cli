#!/bin/bash

# Find untracked files and add them directly
echo "Finding and adding untracked files..."

# Get list of untracked files
git ls-files --others --exclude-standard > untracked.txt
echo "Found $(wc -l < untracked.txt) untracked files."

# Add each untracked file
while IFS= read -r file; do
  echo "Adding untracked file: $file"
  git add "$file"
done < untracked.txt

# Clean up
rm untracked.txt

echo "All untracked files added successfully."
