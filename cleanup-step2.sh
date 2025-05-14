#!/bin/bash
# Aixtiv CLI Cleanup Script - Step 2: Remove Backup Files
# This script implements part 2 of the cleanup plan

set -e  # Exit on error

echo "Starting Aixtiv CLI cleanup process - Step 2..."

# Find and list .bak files instead of directly removing them
echo "Finding .bak files in source directories..."
find . -name "*.bak" -type f -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./cleanup-backup/*" > bak_files_to_remove.txt

echo "Finding numbered backup files..."
find . -name "*.bak[0-9]*" -type f -not -path "./node_modules/*" -not -path "./dist/*" > numbered_bak_files_to_remove.txt
find . -name "*.bak.original" -type f -not -path "./node_modules/*" -not -path "./dist/*" >> numbered_bak_files_to_remove.txt

echo "Finding .fixed files..."
find . -name "*.fixed" -type f -not -path "./node_modules/*" -not -path "./dist/*" > fixed_files_to_review.txt

echo "Finding video.js.test* files..."
find . -name "video.js.test*" -type f -not -path "./node_modules/*" -not -path "./dist/*" > test_files_to_remove.txt

echo "Finding directory distribution files..."
find ./dist -name "aixtiv-cli-1.0.2*" > outdated_dist_files_to_review.txt 2>/dev/null || true

echo "All cleanup candidates have been identified in the following files:"
echo "- bak_files_to_remove.txt"
echo "- numbered_bak_files_to_remove.txt"
echo "- fixed_files_to_review.txt" 
echo "- test_files_to_remove.txt"
echo "- outdated_dist_files_to_review.txt"

echo "Review these files before proceeding to Step 3."
echo "Step 2 completed successfully!"
echo "Continue with ./cleanup-step3.sh after reviewing the files"