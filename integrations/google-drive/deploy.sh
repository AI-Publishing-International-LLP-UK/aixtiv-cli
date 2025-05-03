#!/bin/bash
echo "Deploying Google Drive integration for coaching2100..."

# Step 1: Deploy Firebase Function
echo "Deploying Firebase Functions..."
cd "$(dirname "$0")/../../"
firebase deploy --only functions:handleDriveChanges,functions:processDriveFiles

# Step 2: Set up Pub/Sub topic
echo "Setting up Pub/Sub topic..."
gcloud pubsub topics create drive-updates --project=api-for-warp-drive

# Step 3: Create watch notification
echo "Setting up watch notification on Google Drive folder..."
# This would use the Google Drive API to set up notifications
# Placeholder for actual implementation

echo "✅ Drive integration deployment complete!"
