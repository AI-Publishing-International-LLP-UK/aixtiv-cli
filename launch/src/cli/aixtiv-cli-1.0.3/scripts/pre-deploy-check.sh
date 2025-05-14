#!/bin/bash
# Pre-deployment environment validation script
# This script ensures all environment variables are valid before deployment

echo "Running pre-deployment environment validation..."

# Run environment validator
node lib/utils/envValidator.js

# Check exit code
if [ $? -ne 0 ]; then
  echo "Environment validation failed. Deployment aborted."
  exit 1
fi

echo "Environment validation passed. Proceeding with deployment..."
# Deployment steps would follow here

exit 0
