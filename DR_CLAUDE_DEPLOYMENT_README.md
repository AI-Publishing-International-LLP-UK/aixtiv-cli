# Dr. Claude Deployment Guide

This document outlines the deployment process and fixes for the Dr. Claude function.

## Deployment Scripts

We have created several deployment scripts:

1. **deploy-drClaude-final.sh** (Recommended)
   - Deploys an authenticated version of the Dr. Claude function
   - Project: app-2100-cool
   - Runtime: Node.js 22
   - Region: us-west1

2. **deploy-drClaude-production.sh / deploy-drClaude-staging.sh / deploy-drClaude-dev.sh**
   - Environment-specific deployment scripts 
   - These scripts have been standardized but are not recommended due to IAM policy issues

## Fixed Issues

1. **Node.js Version Mismatch**
   - Original scripts were using Node.js 20, but package.json specified Node.js 22
   - All scripts now consistently use Node.js 22
   - Removed the package.json modification step which was causing errors

2. **Project ID Inconsistency**
   - Scripts were targeting different project IDs
   - All scripts now consistently use "app-2100-cool"

3. **Firebase Target Configuration**
   - Fixed the Firebase target configuration for "drclaude-live"
   - Updated .firebaserc to properly include it

4. **Express App Configuration**
   - Modified dr-claude.js to properly listen on the PORT environment variable
   - This fix was necessary for the Cloud Function to start correctly

5. **IAM Permissions**
   - Due to organization policies, we couldn't enable unauthenticated access via the command line
   - The function is deployed with authentication required

## Accessing the Function

The function is deployed at:
- URL: https://drclaude-ecxckelbgq-uw.a.run.app
- Function URL: https://us-west1-app-2100-cool.cloudfunctions.net/drClaude

**Note**: Authentication is required to access this function. To grant public access, you need to:
1. Go to the Google Cloud Console
2. Navigate to Cloud Functions
3. Find the drClaude function
4. Go to Permissions tab
5. Add a principal "allUsers" with the role "Cloud Functions Invoker"

## Testing the Function

Once permissions are set up, you can test the function with:
```bash
# Health check
curl https://drclaude-ecxckelbgq-uw.a.run.app/

# Project delegation
curl -X POST https://drclaude-ecxckelbgq-uw.a.run.app/projects/delegate \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"A test project"}'
```

## Code Updates

The dr-claude.js function was updated to:
1. Add proper Express server initialization for Cloud Functions Gen 2
2. Ensure it listens on the PORT environment variable (8080 by default)
3. Fix a missing 'next' parameter in the projects/delegate endpoint

## Next Steps

1. Set up proper IAM permissions through the Google Cloud Console
2. Create a CI/CD pipeline for automated deployment
3. Implement monitoring and logging for the function
