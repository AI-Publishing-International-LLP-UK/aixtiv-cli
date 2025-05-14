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
