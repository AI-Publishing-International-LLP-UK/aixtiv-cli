/**
 * DI:DC (Dewey Digital Index Cards) - Indexer
 *
 * This module implements the indexing engine for the DI:DC system,
 * which processes documents and extracts metadata.
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
 * Extracts metadata from content
 * @param {Object} content - The content to extract metadata from
 * @returns {Object} - The extracted metadata
 */
function extractMetadata(content) {
  // This is a simplified implementation
  // In a real system, this would extract metadata from various document types

  const metadata = {
    wordCount: 0,
    charCount: 0,
    language: 'en',
    createdAt: new Date().toISOString(),
  };

  if (typeof content === 'string') {
    metadata.wordCount = content.split(/\s+/).length;
    metadata.charCount = content.length;
  } else if (content.content && typeof content.content === 'string') {
    metadata.wordCount = content.content.split(/\s+/).length;
    metadata.charCount = content.content.length;
  }

  // Combine with any existing metadata
  return {
    ...metadata,
    ...(content.metadata || {}),
  };
}

/**
 * Chunks content for more effective indexing
 * @param {string} content - The content to chunk
 * @param {number} maxChunkSize - The maximum chunk size
 * @returns {Array<string>} - The content chunks
 */
function chunkContent(content, maxChunkSize = 1000) {
  // This is a simplified implementation
  // In a real system, this would chunk content intelligently, e.g., by paragraph or section

  if (!content || typeof content !== 'string') {
    return [];
  }

  const chunks = [];
  let currentChunk = '';
  const sentences = content.split(/[.!?]\s+/);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Indexes content in the DI:DC system
 * @param {Object} content - The content to index
 * @returns {Promise<string>} - The ID of the indexed content
 */
async function indexContent(content) {
  try {
    // Extract metadata
    const metadata = extractMetadata(content);

    // Chunk content if it's a string
    let chunks = [];
    if (typeof content === 'string') {
      chunks = chunkContent(content);
    } else if (content.content && typeof content.content === 'string') {
      chunks = chunkContent(content.content);
    }

    // Create a record in the dewey_indexed_content collection
    const contentRef = await db.collection('dewey_indexed_content').add({
      content: typeof content === 'string' ? content : content.content || '',
      metadata,
      chunks,
      sourceType: content.sourceType || 'manual',
      sourceId: content.sourceId || null,
      mountPoint: content.mountPoint || '/ddiCardMount',
      indexedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Indexed content with ID: ${contentRef.id}`);
    return contentRef.id;
  } catch (error) {
    console.error('Error indexing content:', error);
    throw error;
  }
}

module.exports = {
  indexContent,
  extractMetadata,
  chunkContent,
};
