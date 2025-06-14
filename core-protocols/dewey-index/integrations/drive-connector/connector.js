/**
 * Google Drive Connector for DI:DC (Dewey Digital Index Cards)
 * 
 * This module connects Google Drive with the DI:DC system,
 * allowing Drive files to be indexed, classified, and mounted at /ddiCardMount.
 */

const admin = require("firebase-admin");
const config = require("./config.json");

// Initialize Firebase if not already initialized
let firebaseApp;
try {
  firebaseApp = admin.app();
} catch (e) {
  const serviceAccount = require("../../../../../integration-gateway/integrations/google-drive/service-account.json");
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Indexes a Drive file in the DI:DC system
 * @param {Object} fileData - The file data from Google Drive
 * @returns {Promise<string>} - The ID of the indexed document
 */
async function indexDriveFile(fileData) {
  try {
    // Create a reference in the drive_files collection
    const driveFileRef = await db.collection(config.collections.driveFiles).add({
      fileId: fileData.fileId,
      name: fileData.name,
      mimeType: fileData.mimeType,
      createdTime: admin.firestore.FieldValue.serverTimestamp(),
      indexed: false
    });
    
    // Create an entry in the dewey_indexed_content collection
    const indexedContentRef = await db.collection(config.collections.indexedContent).add({
      sourceId: driveFileRef.id,
      sourceType: "google_drive",
      mountPoint: config.mountPoint,
      content: fileData.content || "",
      metadata: fileData.metadata || {},
      indexedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update the drive_files record to mark as indexed
    await driveFileRef.update({
      indexed: true,
      indexedContentId: indexedContentRef.id,
      indexedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Indexed Drive file ${fileData.fileId} at ${config.mountPoint}`);
    return indexedContentRef.id;
  } catch (error) {
    console.error("Error indexing Drive file:", error);
    throw error;
  }
}

/**
 * Classifies an indexed document according to the DI:DC system
 * @param {string} indexedContentId - The ID of the indexed content
 * @returns {Promise<string>} - The ID of the classification record
 */
async function classifyDocument(indexedContentId) {
  try {
    // Get the indexed content
    const indexedContentDoc = await db.collection(config.collections.indexedContent).doc(indexedContentId).get();
    if (!indexedContentDoc.exists) {
      throw new Error(`Indexed content ${indexedContentId} not found`);
    }
    
    const indexedContent = indexedContentDoc.data();
    
    // Create a classification record
    // In a real implementation, this would use AI to determine the classification
    const classificationRef = await db.collection(config.collections.classifications).add({
      indexedContentId: indexedContentId,
      mountPoint: config.mountPoint,
      categories: ["default"], // This would be dynamically determined in a real implementation
      tags: [], // This would be dynamically determined in a real implementation
      classifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update the indexed content with the classification ID
    await indexedContentDoc.ref.update({
      classificationId: classificationRef.id,
      classifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Classified document ${indexedContentId} at ${config.mountPoint}`);
    return classificationRef.id;
  } catch (error) {
    console.error("Error classifying document:", error);
    throw error;
  }
}

module.exports = {
  indexDriveFile,
  classifyDocument,
  config
};

