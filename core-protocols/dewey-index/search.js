/**
 * DI:DC (Dewey Digital Index Cards) - Search
 * 
 * This module implements the semantic search capabilities for the DI:DC system.
 */

const admin = require("firebase-admin");

// Get Firestore instance
let db;
try {
  db = admin.firestore();
} catch (e) {
  const serviceAccount = require("../../../../integration-gateway/integrations/google-drive/service-account.json");
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
}

/**
 * Searches for content in the DI:DC system
 * @param {Object} query - The search parameters
 * @returns {Promise<Array>} - The search results
 */
async function searchContent(query) {
  try {
    const { text, filters = {}, limit = 10 } = query;
    
    console.log(`Searching for: ${text}`);
    
    // In a real implementation, this would use vector search
    // For now, we'll use a simple text search on the content field
    
    let contentQuery = db.collection("dewey_indexed_content");
    
    // Apply filters if provided
    if (filters.mountPoint) {
      contentQuery = contentQuery.where("mountPoint", "==", filters.mountPoint);
    }
    
    if (filters.sourceType) {
      contentQuery = contentQuery.where("sourceType", "==", filters.sourceType);
    }
    
    // Get all matching documents (this is inefficient but simpler for demonstration)
    const snapshot = await contentQuery.get();
    
    // Filter and rank results by relevance to the search text
    const results = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const content = data.content || "";
      
      // Simple relevance calculation based on text matching
      // In a real system, this would use vector similarity
      if (text && content.toLowerCase().includes(text.toLowerCase())) {
        results.push({
          id: doc.id,
          content: data.content,
          metadata: data.metadata,
          mountPoint: data.mountPoint,
          relevance: calculateRelevance(text, content)
        });
      }
    });
    
    // Sort by relevance and limit results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  } catch (error) {
    console.error("Error searching content:", error);
    throw error;
  }
}

/**
 * Calculates the relevance of a document to a search query
 * @param {string} query - The search query
 * @param {string} content - The document content
 * @returns {number} - The relevance score (0-1)
 */
function calculateRelevance(query, content) {
  if (!query || !content) {
    return 0;
  }
  
  // Simple relevance calculation based on term frequency
  // In a real system, this would use more sophisticated techniques
  
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();
  let matches = 0;
  
  for (const term of queryTerms) {
    if (term.length > 2 && contentLower.includes(term)) {
      matches++;
    }
  }
  
  return matches / queryTerms.length;
}

module.exports = {
  searchContent
};
