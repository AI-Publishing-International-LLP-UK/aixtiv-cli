#!/bin/bash
# Aixtiv CLI Cleanup Script - Step 1: Backup and Directory Setup
# This script implements part 1 of the cleanup plan

set -e  # Exit on error

echo "Starting Aixtiv CLI cleanup process - Step 1..."

# Create backup before cleanup
echo "Creating backup of current state..."
mkdir -p cleanup-backup
tar -czf cleanup-backup/pre-cleanup-backup.tar.gz --exclude=node_modules --exclude=.git .

# Create necessary directories
echo "Creating organizational directories..."
mkdir -p maintenance/scripts
mkdir -p reports/deployment
mkdir -p archive/backups

echo "Step 1 completed successfully!"
echo "Continue with ./cleanup-step2.sh"