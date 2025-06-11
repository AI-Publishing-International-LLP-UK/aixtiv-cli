#!/bin/bash

# Aixtiv CLI Launch Preparation Script
# This script organizes the project structure, cleans up orphan files,
# and prepares the codebase for global launch.

echo "===================================================="
echo "Aixtiv CLI Global Launch Preparation"
echo "===================================================="

# Create launch directory structure if it doesn't exist
mkdir -p launch/bin
mkdir -p launch/commands
mkdir -p launch/lib
mkdir -p launch/src
mkdir -p launch/config
mkdir -p launch/functions
mkdir -p launch/scripts
mkdir -p launch/docs
mkdir -p launch/templates
mkdir -p launch/test

echo "✅ Created launch directory structure"

# Copy essential files to launch directory
cp -R bin/* launch/bin/
cp -R commands/* launch/commands/
cp -R lib/* launch/lib/
cp -R src/* launch/src/
cp -R config/* launch/config/
cp -R functions/* launch/functions/
cp -R test/* launch/test/
cp package.json launch/
cp README.md launch/
cp LICENSE launch/
cp -R docs/*.md launch/docs/

echo "✅ Copied essential files to launch directory"

# Copy new technical specification
cp docs/ELITE_ENHANCEMENT_SPEC.md launch/docs/

echo "✅ Copied Elite Enhancement Specification"

# Run tests to ensure everything is working
echo "🧪 Running tests to verify functionality..."

# Run speaker recognition tests
echo "🎤 Testing speaker recognition..."
npm run test:speaker-recognition

# Run emotion tuning tests
echo "🎭 Testing emotion tuning..."
npm run test:emotion-tuning:all

# Cleanup orphan files and temporary directories
echo "🔍 Identifying orphan files..."

# Find backup/temp files and list them
find . -name "*.bak" -o -name "*.bak[0-9]*" -o -name "*.tmp" -o -name "*.swp" -o -name "*.orig" > orphan_files.txt
find . -name "*copy*" -o -name "*old*" -o -name "*backup*" >> orphan_files.txt
find . -path "*/temp_*" -type d >> orphan_dirs.txt

# Display found orphan files
echo "Found $(wc -l < orphan_files.txt) orphan files"
echo "Found $(wc -l < orphan_dirs.txt) orphan directories"

# Create a cleanup report
echo "===================================================" > cleanup_report.md
echo "# Aixtiv CLI Launch Cleanup Report" >> cleanup_report.md
echo "===================================================" >> cleanup_report.md
echo "" >> cleanup_report.md
echo "## Orphan Files Identified" >> cleanup_report.md
echo "" >> cleanup_report.md
cat orphan_files.txt >> cleanup_report.md
echo "" >> cleanup_report.md
echo "## Orphan Directories Identified" >> cleanup_report.md
echo "" >> cleanup_report.md
cat orphan_dirs.txt >> cleanup_report.md

# Move the report to launch docs
cp cleanup_report.md launch/docs/

echo "✅ Created cleanup report"

# Verify package.json has all required dependencies
echo "🔍 Verifying package.json dependencies..."
node -e "
const pkg = require('./package.json');
const missingDeps = [];
const requiredDeps = [
  '@anthropic-ai/sdk', 
  'firebase', 
  'firebase-admin', 
  'axios', 
  'commander',
  'express',
  'winston',
  '@google-cloud/speech',
  '@google-cloud/text-to-speech',
  '@google-cloud/language'
];

requiredDeps.forEach(dep => {
  if (!pkg.dependencies[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.log('⚠️ Missing dependencies:', missingDeps.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required dependencies found');
}
"

# Create a version bump if needed
current_version=$(node -e "console.log(require('./package.json').version)")
echo "Current version: $current_version"
read -p "Would you like to bump the version for launch? (y/n) " bump_version

if [ "$bump_version" = "y" ]; then
  read -p "Enter new version (current: $current_version): " new_version
  
  # Update version in package.json in the launch directory
  node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('./launch/package.json', 'utf8'));
  pkg.version = '$new_version';
  fs.writeFileSync('./launch/package.json', JSON.stringify(pkg, null, 2));
  "
  
  echo "✅ Updated version to $new_version in launch package.json"
fi

# Validate the launch package
echo "🔍 Validating launch package structure..."
if [ ! -f "launch/bin/aixtiv.js" ]; then
  echo "❌ Main CLI entry point missing from launch package"
  exit 1
fi

# Ensure tests are included in package.json scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./launch/package.json', 'utf8'));

// Make sure all test scripts are included
const testScripts = {
  'test': 'jest',
  'test:speaker-recognition': 'node test/speaker-recognition-test.js',
  'test:emotion-tuning': 'node test/emotion-tuning-test.js',
  'test:emotion-tuning:speech': 'node test/emotion-tuning-speech-integration-test.js',
  'test:emotion-tuning:all': 'npm run test:emotion-tuning && npm run test:emotion-tuning:speech',
};

let modified = false;
for (const [key, value] of Object.entries(testScripts)) {
  if (!pkg.scripts[key] || pkg.scripts[key] !== value) {
    pkg.scripts[key] = value;
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync('./launch/package.json', JSON.stringify(pkg, null, 2));
  console.log('✅ Updated test scripts in package.json');
} else {
  console.log('✅ All test scripts already present in package.json');
}
"

# Create an Elite Enhancement implementation guide
cat > launch/docs/IMPLEMENTATION_GUIDE.md << 'EOF'
# Elite Enhancement Implementation Guide

This guide provides practical steps for implementing the Elite Enhancements as specified in the 
technical specification document.

## Getting Started

1. Start with the Project Licensing & Onboarding section
2. Implement features in the order specified in the implementation timeline
3. Utilize existing Firebase and CLI infrastructure
4. Follow the modular structure for each enhancement

## Implementation Steps

For each enhancement:

1. Create the directory structure and files
2. Define Firestore collections and schema
3. Implement core functionality
4. Add CLI commands
5. Write tests
6. Integrate with existing systems

## Best Practices

- Follow existing code style and patterns
- Document all new functions and components
- Create unit tests for new functionality
- Use existing authentication and security mechanisms
- Reuse components where possible

## Testing

For thorough testing of the Elite Enhancements:

1. Use `npm test` to run all Jest tests
2. Use specialized test scripts for specific features:
   - `npm run test:speaker-recognition` - Speaker recognition
   - `npm run test:emotion-tuning:all` - Emotion tuning with speech integration
3. Extend test coverage for new features by adding tests in the `/test` directory
EOF

echo "✅ Created implementation guide"

# Create testing guide
cat > launch/docs/TESTING_GUIDE.md << 'EOF'
# Aixtiv CLI Testing Guide

This guide provides instructions for testing the Aixtiv CLI and its Elite Enhancements.

## Available Test Commands

- `npm test` - Run all Jest tests
- `npm run test:speaker-recognition` - Test speaker recognition functionality
- `npm run test:emotion-tuning` - Test emotion tuning core functionality
- `npm run test:emotion-tuning:speech` - Test emotion tuning with speech integration
- `npm run test:emotion-tuning:all` - Run all emotion tuning tests
- `npm run cicd:test:speaker-recognition` - Run speaker recognition tests for CI/CD
- `npm run cicd:test:emotion-tuning` - Run emotion tuning tests with CI/CD integration
- `npm run cicd:test:pre-rotation` - Test security before key rotation
- `npm run cicd:test:post-rotation` - Test security after key rotation

## Test Requirements

- Audio files for speaker recognition tests should be in the `/test/test-audio` directory
- Speaker profiles will be created during testing
- Test output will be displayed in the console

## Adding New Tests

1. Create test files in the `/test` directory
2. Follow the existing patterns for test organization
3. Use descriptive test names to make debugging easier
4. Add new test commands to `package.json` as needed

## Test Output

Test output includes:
- Pass/fail status for each test
- Detailed information about test failures
- Summary of tests run, passed, and failed
EOF

echo "✅ Created testing guide"

# Create launch script
cat > launch/scripts/launch.sh << 'EOF'
#!/bin/bash

# Aixtiv CLI Launch Script
# This script deploys the Aixtiv CLI to production

echo "====================================================="
echo "Aixtiv CLI Global Launch"
echo "====================================================="

# Check for required environment variables
if [ -z "$FIREBASE_PROJECT_ID" ]; then
  echo "❌ FIREBASE_PROJECT_ID environment variable is required"
  exit 1
fi

# Run tests before deployment
echo "🧪 Running tests before deployment..."
npm test
npm run test:speaker-recognition
npm run test:emotion-tuning:all

# Check if tests passed
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Aborting deployment."
  exit 1
fi

echo "✅ All tests passed!"

# Build the project
npm run build

# Deploy to Firebase
npm run firebase -- deploy --project $FIREBASE_PROJECT_ID

echo "✅ Aixtiv CLI has been deployed to production"
EOF

chmod +x launch/scripts/launch.sh

echo "✅ Created launch script"

# Create a README for the launch directory
cat > launch/README.md << 'EOF'
# Aixtiv CLI Global Launch

This is the production-ready version of Aixtiv CLI with Elite Enhancements.

## Directory Structure

- `bin/` - CLI executable scripts
- `commands/` - CLI command implementations
- `lib/` - Core libraries and utilities
- `src/` - Source code for components and services
- `config/` - Configuration files
- `functions/` - Firebase Cloud Functions
- `scripts/` - Utility scripts
- `docs/` - Documentation
- `templates/` - Email and other templates
- `test/` - Test files and fixtures

## Launch Instructions

1. Set the environment variables:
   ```
   export FIREBASE_PROJECT_ID=your-project-id
   ```

2. Run the launch script:
   ```
   ./scripts/launch.sh
   ```

## Testing

Run tests before deployment:
```
npm test
npm run test:speaker-recognition
npm run test:emotion-tuning:all
```

See `docs/TESTING_GUIDE.md` for more information on testing.

## Elite Enhancements

See `docs/ELITE_ENHANCEMENT_SPEC.md` for details on the Elite Enhancements included in this release.
EOF

echo "✅ Created launch README"

echo "===================================================="
echo "Launch preparation complete!"
echo "===================================================="
echo "Next steps:"
echo "1. Review cleanup_report.md to decide what to clean up"
echo "2. Finalize the launch directory contents"
echo "3. Review the Elite Enhancement specification"
echo "4. Execute launch when ready"
echo "===================================================="