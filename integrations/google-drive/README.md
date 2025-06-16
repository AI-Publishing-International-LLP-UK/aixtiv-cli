# Emergency Google Drive Integration for coaching2100

This integration connects the coaching2100 Google Drive content with Aixtiv Symphony for seamless content distribution and management.

## Components

1. **Firebase Functions**
   - `handleDriveChanges`: Processes notifications when files change
   - `processDriveFiles`: Extracts content and updates Firestore

2. **Pub/Sub Topic**
   - Name: `drive-updates`
   - Purpose: Channel for Drive change notifications

3. **Monitored Folders**
   - `Coaching Materials`: Training content
   - `Client Resources`: Client-facing documents
   - `Video Content`: Training videos
   - `Assessment Tools`: Evaluation materials

## Setup

1. Place your Google service account JSON file at `service-account.json`
2. Edit the `COACHING2100_FOLDER_ID` in `coaching2100-setup.js`
3. Run the deployment script: `./deploy.sh`

## Troubleshooting

If the integration fails, check:
1. Google Drive API is enabled
2. Service account has access to the coaching2100 folders
3. Firebase project is properly configured

## Monitoring

Files processed by this integration can be monitored in the Firestore `drive_files` collection.
