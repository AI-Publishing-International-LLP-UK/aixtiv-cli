/**
 * DI:DC (Dewey Digital Index Cards) - Classifier
 *
 * This module implements the classification system for the DI:DC system,
 * which categorizes content according to a taxonomic hierarchy.
 */

const admin = require('firebase-admin');

// Get Firestore instance
let db;
try {
  db = admin.firestore();
} catch (e) {
  const serviceAccount = require('../../../../integration-gateway/integrations/google-drive/service-account.json');
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
}

/**
 * Classifies content based on its text and metadata
 * @param {Object} content - The content to classify
 * @returns {Promise<Object>} - The classification result
 */
async function classifyContent(content) {
  // This is a simplified implementation
  // In a real system, this would use NLP or AI to determine categories and tags

  // Example classification based on simple keyword matching
  const categories = [];
  const tags = [];

  const text = content.content || '';
  const metadata = content.metadata || {};

  // Check for keywords in the content
  if (text.toLowerCase().includes('project')) {
    categories.push('Projects');
  }

  if (text.toLowerCase().includes('agent')) {
    categories.push('Agents');
  }

  if (text.toLowerCase().includes('training')) {
    categories.push('Training');
  }

  // Add tags based on metadata
  if (metadata.author) {
    tags.push(`author:${metadata.author}`);
  }

  if (metadata.createdDate) {
    const date = new Date(metadata.createdDate);
    tags.push(`year:${date.getFullYear()}`);
  }

  // If no categories were found, use a default category
  if (categories.length === 0) {
    categories.push('Uncategorized');
  }

  return {
    categories,
    tags,
    classifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Stores a classification result in Firestore
 * @param {string} contentId - The ID of the content
 * @param {Object} classification - The classification result
 * @returns {Promise<string>} - The ID of the classification record
 */
async function storeClassification(contentId, classification) {
  try {
    const classificationRef = await db.collection('dewey_classifications').add({
      contentId,
      categories: classification.categories,
      tags: classification.tags,
      classifiedAt: classification.classifiedAt,
    });

    // Update the content record with the classification ID
    await db.collection('dewey_indexed_content').doc(contentId).update({
      classificationId: classificationRef.id,
      classifiedAt: classification.classifiedAt,
    });

    return classificationRef.id;
  } catch (error) {
    console.error('Error storing classification:', error);
    throw error;
  }
}

module.exports = {
  classifyContent,
  storeClassification,
};
