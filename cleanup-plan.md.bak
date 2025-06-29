# Aixtiv CLI Cleanup Plan

This document outlines a structured approach to clean up the Aixtiv CLI codebase for a tidy, launch-ready directory structure.

## 1. Backup Files (.bak)

All `.bak` files should be removed from the source code. These are backup files created during development and are not needed for production:

```bash
# Remove all .bak files from the source code directories
find . -name "*.bak" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete
```

## 2. Multiple Backup Versions

Files with multiple backup versions (like delegate.js.bak2, delegate.js.bak6, etc.) should be removed:

```bash
# Remove files with numbered backups
find . -name "*.bak[0-9]*" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete
find . -name "*.bak.original" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete
```

## 3. Fixed/Test Files

Test, temporary, and fixed-version files should be cleaned up:

```bash
# Remove .fixed files from source directories
find . -name "*.fixed" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete

# Remove video.js.test* files
find . -name "video.js.test*" -type f -not -path "./node_modules/*" -not -path "./dist/*" -delete
```

## 4. Temporary Directories

Temporary directories should be removed or archived:

```bash
# Remove all temp_* directories
rm -rf temp_*
rm -rf temp_files
rm -rf temp_patch
rm -rf temp_repository_files
rm -rf temp_AI-Publishing-International-LLP-UK_AIXTIV-SYMPHONY
```

## 5. Distribution Files Cleanup

Cleanup of outdated distribution files:

```bash
# Keep only the latest distribution files
rm -rf dist/aixtiv-cli-1.0.2*
```

## 6. Fix Scripts Consolidation

Many fix-\*.sh scripts could be consolidated or moved to a maintenance directory:

```bash
# Create a maintenance directory
mkdir -p maintenance/scripts

# Move fix scripts to the maintenance directory
mv fix-*.sh maintenance/scripts/
```

## 7. Duplicate Deployment Reports

Consolidate multiple deployment report files:

```bash
# Create a reports directory if it doesn't exist
mkdir -p reports/deployment

# Move deployment reports to the reports directory
mv deployment-*.md reports/deployment/
```

## 8. Archive Directories

Create an archive for files that might be needed for reference but not for active development:

```bash
# Create an archive directory
mkdir -p archive

# Move specific backup directories to archive
mv backups archive/
```

## 9. Code Optimization

Add a lint step to ensure code consistency:

```bash
# Update the lint script in package.json to actually run ESLint
npm run lint:fix
```

## 10. Documentation Updates

Ensure all new features are properly documented:

```bash
# Verify documentation for all commands
node scripts/verify-documentation.js
```

## 11. Build Clean Package

After cleanup, build a clean package:

```bash
# Run the build script
npm run build
```

## 12. Verify Functionality

After cleanup, verify that all functionality works as expected:

```bash
# Run basic tests
npm test
```

## Implementation Strategy

To safely implement these changes:

1. Create a temporary branch for cleanup: `git checkout -b cleanup-launch-prep`
2. First, make a backup of everything we plan to clean up: `tar -czf pre-cleanup-backup.tar.gz --exclude=node_modules --exclude=.git .`
3. Execute the cleanup steps in order
4. Verify functionality after each major step
5. Commit changes with descriptive commit messages
6. Create a PR for review before merging to the main branch

## Files to Keep

Important files that should NOT be removed during cleanup include:

1. All active command files
2. Configuration files
3. Documentation files
4. Test files that are actually used in test scripts
5. Important scripts referenced in package.json

## Next Steps

After cleanup, focus on:

1. Ensuring comprehensive documentation
2. Expanding test coverage
3. Updating the README with the latest features
4. Creating a streamlined onboarding process for new users
