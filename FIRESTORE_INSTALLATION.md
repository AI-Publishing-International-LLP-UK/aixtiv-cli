# Firestore Installation and Configuration Guide

## Overview

This document outlines the installation process for the Google Cloud Firestore package in the aixtiv-cli project, addressing common compilation issues and version conflicts.

## Issues Addressed

- TypeScript compilation errors during installation of Google Cloud packages, particularly with the @google-cloud/language package
- Version conflicts between directly installed @google-cloud/firestore and the version bundled with firebase-admin
- Missing tsconfig.json causing TypeScript compilation failures

## Installation Solution

### 1. Clean Installation with --ignore-scripts

To prevent TypeScript compilation errors during installation, we use the `--ignore-scripts` flag with npm:

```bash
# Remove existing dependencies first
rm -rf node_modules package-lock.json yarn.lock

# Install Firestore with the ignore-scripts flag
npm install "@google-cloud/firestore@^6.7.0" --ignore-scripts

# Install other Google Cloud packages with ignore-scripts
npm install "@google-cloud/language" "@google-cloud/secret-manager" "@google-cloud/speech" "@google-cloud/text-to-speech" --ignore-scripts

# Reinstall firebase-admin if needed
npm install firebase-admin --ignore-scripts
```

### 2. TypeScript Configuration

A proper tsconfig.json is crucial for compilation. We created a tsconfig.json with the following settings:

```json
{
  "compilerOptions": {
    "target": "es2019",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": false,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*", "lib/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

The `skipLibCheck: true` setting is particularly important as it prevents TypeScript from type-checking the node_modules directory, which can contain type conflicts between packages.

## Version Management

### Firestore Version Compatibility

- Our project directly uses @google-cloud/firestore v6.8.0
- firebase-admin depends on @google-cloud/firestore v7.11.1
- These different versions coexist in our dependency tree

To check installed versions:

```bash
npm list @google-cloud/firestore
```

### Testing Firestore Functionality

We've created test scripts to verify Firestore functionality:

1. `test-firestore.js` - Tests basic connectivity and SalleyPort system status
2. `test-firestore-agents.js` - Tests agent access and resource scanning functionality

Run these tests after any package updates to verify functionality:

```bash
node test-firestore.js
node test-firestore-agents.js
```

## Maintenance Recommendations

1. **Package Updates**:

   - Always use the `--ignore-scripts` flag when updating Google Cloud packages
   - Test functionality after updates using the provided test scripts
   - Monitor version compatibility between firebase-admin and @google-cloud/firestore

2. **ESLint and Build Process**:

   - We've added `DISABLE_ESLINT_PLUGIN=true` to .env for development builds
   - Address ESLint issues separately from Firestore functionality concerns

3. **TypeScript Configuration**:

   - Maintain the `skipLibCheck: true` setting in tsconfig.json
   - Consider using resolutions in package.json for conflicting types if needed

4. **Firebase Admin SDK**:
   - Be cautious when upgrading firebase-admin as it may change its Firestore dependency
   - Test thoroughly after any firebase-admin upgrades

## Conclusion

By following these installation steps and maintenance recommendations, we ensure a stable Firestore integration in the aixtiv-cli project, avoiding TypeScript compilation issues while maintaining full functionality of the SalleyPort security management system.
