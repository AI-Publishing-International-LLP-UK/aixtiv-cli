const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {google} = require('googleapis');

// Initialize app if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Handle Google Drive file changes
exports.handleDriveChanges = functions
  .region('us-west1')
  .pubsub.topic('drive-updates')
  .onPublish(async (message) => {
    console.log('Received Drive update:', message.json);
    
    // Add file to Firestore
    const db = admin.firestore();
    await db.collection('drive_files').add({
      fileId: message.json.fileId,
      name: message.json.name,
      mimeType: message.json.mimeType,
      createdTime: admin.firestore.Timestamp.now(),
      processed: false
    });
    
    console.log('File added to processing queue:', message.json.fileId);
    return null;
  });

// Process Drive files
exports.processDriveFiles = functions
  .region('us-west1')
  .firestore
  .document('drive_files/{fileId}')
  .onCreate(async (snap, context) => {
    const fileData = snap.data();
    console.log('Processing new Drive file:', fileData.fileId);
    
    // Process file based on mime type
    if (fileData.mimeType.includes('text')) {
      // Process text file
      console.log('Processing text file');
    } else if (fileData.mimeType.includes('spreadsheet')) {
      // Process spreadsheet
      console.log('Processing spreadsheet');
    } else if (fileData.mimeType.includes('presentation')) {
      // Process presentation
      console.log('Processing presentation');
    }
    
    // Mark as processed
    await snap.ref.update({processed: true});
    console.log('File processed successfully');
    return null;
  });
