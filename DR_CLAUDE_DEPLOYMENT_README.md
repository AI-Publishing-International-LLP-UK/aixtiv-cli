# Dr. Claude Deployment Scripts

This directory contains three standardized deployment scripts for the Dr. Claude function:

## 1. deploy-drClaude-production.sh
- Deploys to the production environment
- Project: app-2100-cool
- Runtime: Node.js 22
- Firebase target: drclaude-live

## 2. deploy-drClaude-staging.sh
- Deploys to the staging environment
- Project: app-2100-cool
- Runtime: Node.js 22
- Firebase target: drclaude-live

## 3. deploy-drClaude-dev.sh
- Deploys to the development environment
- Project: app-2100-cool
- Runtime: Node.js 22
- Firebase target: drclaude-live

## Changes Made
- Standardized Node.js version to 22 across all scripts
- Standardized project ID to app-2100-cool
- Fixed Firebase target configuration for drclaude-live
- Removed the package.json modification step since package.json already specifies Node.js 22

## Usage
```bash
# To deploy to production
./deploy-drClaude-production.sh

# To deploy to staging
./deploy-drClaude-staging.sh

# To deploy to development
./deploy-drClaude-dev.sh
```

## Notes
- Each script performs identical deployments, but to different environments
- If environment-specific configurations are needed, modify the respective script
- All scripts now use Cloud Functions Gen 2 with Node.js 22
- The scripts no longer attempt to modify the package.json file, as it already specifies Node.js 22
