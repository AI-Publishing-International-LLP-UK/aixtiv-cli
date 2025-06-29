# Aixtiv CLI Cleanup Guide

This guide accompanies the `cleanup.sh` script and `cleanup-plan.md` document to help you prepare a tidy, launch-ready directory structure for Aixtiv CLI.

## Overview

As part of preparing Aixtiv CLI for launch, we're cleaning up development artifacts, organizing files into logical structures, and ensuring consistent code quality.

## Files Created

1. **cleanup-plan.md** - Comprehensive plan for cleaning up the codebase
2. **cleanup.sh** - Script that implements most of the plan automatically
3. **README-CLEANUP.md** - This guide with additional context and instructions

## Cleanup Process

### How to Use the Cleanup Script

1. Review the script before running:

   ```bash
   cat cleanup.sh
   ```

2. Make it executable:

   ```bash
   chmod +x cleanup.sh
   ```

3. Run the script:
   ```bash
   ./cleanup.sh
   ```

### What the Script Does

The script will:

- Create a backup of your current state
- Create organizational directories
- Remove .bak files
- Remove numbered backup files
- Generate lists of fixed files and outdated dist files for your review
- Move temporary directories to an archive folder
- Move backups to the archive
- Move fix scripts to a maintenance directory
- Consolidate deployment reports
- Format code for consistency

### Manual Steps After Running the Script

After running the script, you'll need to:

1. Review the generated list of fixed files:

   ```bash
   cat fixed_files_to_review.txt
   ```

2. Review the list of outdated distribution files:

   ```bash
   cat outdated_dist_files_to_review.txt
   ```

3. Delete files you confirm are no longer needed:

   ```bash
   xargs rm < fixed_files_to_review.txt
   xargs rm < outdated_dist_files_to_review.txt
   ```

4. Run tests to verify functionality:

   ```bash
   npm test
   ```

5. Build a clean package:
   ```bash
   npm run build
   ```

## Directory Structure After Cleanup

The cleanup process will transform your directory structure to:

```
aixtiv-cli/
├── archive/            # Historical files for reference
├── bin/                # Main executables
├── commands/           # Command implementations
├── config/             # Configuration files
├── docs/               # Documentation
├── lib/                # Core libraries
├── maintenance/        # Maintenance scripts and utilities
│   └── scripts/        # Cleanup and fix scripts
├── reports/            # Reports and status information
│   └── deployment/     # Deployment-related reports
├── scripts/            # Utility scripts
├── src/                # Source code
└── test/               # Test files
```

## Launch Readiness Checklist

After cleanup, verify launch readiness with:

1. **Documentation Completeness**

   - README covers all major features
   - Command documentation is up-to-date
   - Examples are provided for key functionality

2. **Testing Coverage**

   - All key features have tests
   - Speaker recognition tests pass
   - Emotion tuning tests pass
   - CI/CD integration tests pass

3. **Code Quality**

   - ESLint shows no errors
   - Prettier formatting applied
   - No unused dependencies

4. **Build Verification**
   - Package builds successfully
   - Generated artifacts are consistent
   - ZIP and tarball files created correctly

## Final Steps

Before announcing the launch:

1. Review the directory structure one more time
2. Ensure CI/CD pipelines are working correctly
3. Verify deployment scripts
4. Update any version references in documentation

By following this cleanup process, Aixtiv CLI will have a clean, organized, and professional code structure ready for launching to users.
