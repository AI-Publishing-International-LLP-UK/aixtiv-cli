#!/bin/bash
# Aixtiv CLI Cleanup Script
# This script implements the cleanup plan for a tidy, launch-ready directory structure

set -e  # Exit on error

echo "Starting Aixtiv CLI cleanup process..."

# Create backup before cleanup
echo "Creating backup of current state..."
tar -czf pre-cleanup-backup.tar.gz --exclude=node_modules --exclude=.git .

# 1. Create necessary directories
echo "Creating organizational directories..."
mkdir -p maintenance/scripts
mkdir -p reports/deployment
mkdir -p archive/backups

# 2. Remove backup files
echo "Removing .bak files from source directories..."
find . -name "*.bak" -type f -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./pre-cleanup-backup.tar.gz" -delete

# 3. Remove multiple backup versions
echo "Removing numbered backup files..."
find . -name "*.bak[0-9]*" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete
find . -name "*.bak.original" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete

# 4. Clean up fixed/test files
echo "Cleaning up fixed/test files..."
# We'll create a list but let you review before deletion as these might be important
find . -name "*.fixed" -type f -not -path "./node_modules/*" -not -path "./dist/*" > fixed_files_to_review.txt
find . -name "video.js.test*" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete

# 5. Move temporary directories to archive
echo "Moving temporary directories to archive..."
# Instead of directly removing temp directories, move them to archive
for dir in temp_* temp_files temp_patch temp_repository_files temp_AI-Publishing-International-LLP-UK_AIXTIV-SYMPHONY; do
  if [ -d "$dir" ]; then
    mkdir -p archive/$dir
    mv $dir/* archive/$dir/ 2>/dev/null || true
    rmdir $dir 2>/dev/null || true
  fi
done

# 6. Move backups to archive
echo "Moving backups to archive..."
if [ -d "backups" ]; then
  mv backups/* archive/backups/ 2>/dev/null || true
  rmdir backups 2>/dev/null || true
fi

# 7. Move fix scripts to maintenance
echo "Moving fix scripts to maintenance directory..."
for script in fix-*.sh; do
  if [ -f "$script" ]; then
    mv $script maintenance/scripts/
  fi
done

# 8. Consolidate deployment reports
echo "Consolidating deployment reports..."
for report in deployment-*.md; do
  if [ -f "$report" ]; then
    mv $report reports/deployment/
  fi
done

# 9. Clean up outdated distribution files
echo "Cleaning up outdated distribution files..."
# Create a list but let you review before deletion
ls -la dist/aixtiv-cli-1.0.2* > outdated_dist_files_to_review.txt 2>/dev/null || true

# 10. Format code
echo "Running formatter to ensure consistent code style..."
npm run format

echo "Cleanup script completed!"
echo ""
echo "Next steps:"
echo "1. Review fixed_files_to_review.txt and outdated_dist_files_to_review.txt before deleting those files"
echo "2. Run tests to verify functionality: npm test"
echo "3. Build a clean package: npm run build"
echo "4. Update documentation to reflect the new structure"
echo ""
echo "For files you decide to delete after review, run:"
echo "xargs rm < fixed_files_to_review.txt"
echo "xargs rm < outdated_dist_files_to_review.txt"