/**
 * Pinecone Integration for Aixtiv CLI Owner-Subscriber V1-V2 Immersive System
 * 
 * This module provides integration with Pinecone for vector database capabilities,
 * enabling semantic search across prompts, memories, and agent outputs.
 * 
 * @module pineconeIntegration
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration for Pinecone
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp';
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const DIMENSION = 1536; // Dimension for OpenAI ada-002 embeddings

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Initialize Pinecone client with API key and environment
 * @returns {Object} Pinecone client object with methods for index operations
 */
function initPinecone() {
  // This is a simplified implementation that uses Axios for API calls
  // In a production environment, use the official Pinecone SDK
  const pineconeBaseUrl = `https://${PINECONE_ENVIRONMENT}.pinecone.io/v1`;
  
  return {
    createIndex: async (indexName, dimension = DIMENSION, metric = 'cosine') => {
      try {
        const response = await axios.post(
          `${pineconeBaseUrl}/indexes`,
          {
            name: indexName,
            dimension,
            metric
          },
          {
            headers: {
              'Api-Key': PINECONE_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error creating Pinecone index:', error.response?.data || error.message);
        throw error;
      }
    },
    
    listIndexes: async () => {
      try {
        const response = await axios.get(
          `${pineconeBaseUrl}/indexes`,
          {
            headers: {
              'Api-Key': PINECONE_API_KEY
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error listing Pinecone indexes:', error.response?.data || error.message);
        throw error;
      }
    },
    
    deleteIndex: async (indexName) => {
      try {
        const response = await axios.delete(
          `${pineconeBaseUrl}/indexes/${indexName}`,
          {
            headers: {
              'Api-Key': PINECONE_API_KEY
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error deleting Pinecone index:', error.response?.data || error.message);
        throw error;
      }
    },
    
    describeIndex: async (indexName) => {
      try {
        const response = await axios.get(
          `${pineconeBaseUrl}/indexes/${indexName}`,
          {
            headers: {
              'Api-Key': PINECONE_API_KEY
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error describing Pinecone index:', error.response?.data || error.message);
        throw error;
      }
    },
    
    getIndex: (indexName) => {
      // Return an object with methods for the specific index
      const indexUrl = `${pineconeBaseUrl}/indexes/${indexName}`;
      
      return {
        upsert: async (vectors) => {
          try {
            const response = await axios.post(
              `${indexUrl}/vectors/upsert`,
              { vectors },
              {
                headers: {
                  'Api-Key': PINECONE_API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );
            return response.data;
          } catch (error) {
            console.error('Error upserting vectors:', error.response?.data || error.message);
            throw error;
          }
        },
        
        query: async (vector, topK = 10, includeMetadata = true, includeValues = false, filter = {}) => {
          try {
            const response = await axios.post(
              `${indexUrl}/query`,
              {
                vector,
                topK,
                includeMetadata,
                includeValues,
                filter
              },
              {
                headers: {
                  'Api-Key': PINECONE_API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );
            return response.data;
          } catch (error) {
            console.error('Error querying vectors:', error.response?.data || error.message);
            throw error;
          }
        },
        
        fetch: async (ids) => {
          try {
            const response = await axios.get(
              `${indexUrl}/vectors/fetch`,
              {
                params: { ids: ids.join(',') },
                headers: {
                  'Api-Key': PINECONE_API_KEY
                }
              }
            );
            return response.data;
          } catch (error) {
            console.error('Error fetching vectors:', error.response?.data || error.message);
            throw error;
          }
        },
        
        delete: async (ids, filter = null) => {
          try {
            const payload = filter ? { filter } : { ids };
            const response = await axios.post(
              `${indexUrl}/vectors/delete`,
              payload,
              {
                headers: {
                  'Api-Key': PINECONE_API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );
            return response.data;
          } catch (error) {
            console.error('Error deleting vectors:', error.response?.data || error.message);
            throw error;
          }
        }
      };
    }
  };
}

/**
 * Generate embeddings for text using OpenAI API
 * @param {string|string[]} texts - Text(s) to generate embeddings for
 * @returns {Promise<Array>} Array of embeddings
 */
async function generateEmbeddings(texts) {
  // Convert single text to array if needed
  const inputTexts = Array.isArray(texts) ? texts : [texts];
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: inputTexts,
        model: EMBEDDING_MODEL
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create Pinecone index if it doesn't exist
 * @param {string} indexName - Name of the index to create
 * @returns {Promise<boolean>} True if index was created or already exists
 */
async function createIndexIfNotExists(indexName) {
  const pinecone = initPinecone();
  
  try {
    // Check if index already exists
    const indexes = await pinecone.listIndexes();
    
    if (indexes.includes(indexName)) {
      console.log(`Index ${indexName} already exists`);
      return true;
    }
    
    // Create the index
    await pinecone.createIndex(indexName);
    console.log(`Index ${indexName} created successfully`);
    return true;
  } catch (error) {
    console.error('Error creating index:', error);
    return false;
  }
}

/**
 * Store data in Pinecone with generated embeddings
 * @param {string} indexName - Name of the Pinecone index
 * @param {Array} items - Array of objects with text and metadata
 * @returns {Promise<boolean>} True if data was stored successfully
 */
async function storeInPinecone(indexName, items) {
  try {
    // Ensure index exists
    await createIndexIfNotExists(indexName);
    
    // Prepare items for embedding
    const texts = items.map(item => item.text);
    
    // Generate embeddings
    const embeddings = await generateEmbeddings(texts);
    
    // Prepare vectors for Pinecone
    const vectors = items.map((item, index) => ({
      id: item.id || uuidv4(),
      values: embeddings[index],
      metadata: item.metadata || {}
    }));
    
    // Store in Pinecone
    const pinecone = initPinecone();
    const index = pinecone.getIndex(indexName);
    await index.upsert(vectors);
    
    console.log(`Stored ${vectors.length} vectors in Pinecone index ${indexName}`);
    return true;
  } catch (error) {
    console.error('Error storing in Pinecone:', error);
    return false;
  }
}

/**
 * Search Pinecone for similar items
 * @param {string} indexName - Name of the Pinecone index
 * @param {string} queryText - Text to search for
 * @param {Object} filter - Optional filter for the search
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Array of search results
 */
async function searchPinecone(indexName, queryText, filter = {}, topK = 10) {
  try {
    // Generate embedding for the query
    const [queryEmbedding] = await generateEmbeddings(queryText);
    
    // Search Pinecone
    const pinecone = initPinecone();
    const index = pinecone.getIndex(indexName);
    
    const results = await index.query(
      queryEmbedding,
      topK,
      true, // includeMetadata
      false, // includeValues
      filter
    );
    
    return results.matches || [];
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return [];
  }
}

/**
 * Delete items from Pinecone
 * @param {string} indexName - Name of the Pinecone index
 * @param {Array<string>} ids - Array of IDs to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
async function deleteFromPinecone(indexName, ids) {
  try {
    const pinecone = initPinecone();
    const index = pinecone.getIndex(indexName);
    
    await index.delete(ids);
    
    console.log(`Deleted ${ids.length} vectors from Pinecone index ${indexName}`);
    return true;
  } catch (error) {
    console.error('Error deleting from Pinecone:', error);
    return false;
  }
}

/**
 * Store memory in Pinecone for semantic search
 * @param {Object} memory - Memory object with content and metadata
 * @returns {Promise<boolean>} True if memory was stored successfully
 */
async function storeMemoryInPinecone(memory) {
  try {
    const indexName = 'aixtiv-memories';
    
    const item = {
      id: memory.id || uuidv4(),
      text: memory.content,
      metadata: {
        userId: memory.userId,
        sessionId: memory.sessionId,
        copilotId: memory.copilotId,
        type: memory.type,
        category: memory.category,
        importance: memory.importance,
        timestamp: memory.timestamp ? new Date(memory.timestamp).toISOString() : new Date().toISOString(),
        ...memory.metadata
      }
    };
    
    return await storeInPinecone(indexName, [item]);
  } catch (error) {
    console.error('Error storing memory in Pinecone:', error);
    return false;
  }
}

/**
 * Store prompt in Pinecone for semantic search
 * @param {Object} prompt - Prompt object with content and metadata
 * @returns {Promise<boolean>} True if prompt was stored successfully
 */
async function storePromptInPinecone(prompt) {
  try {
    const indexName = 'aixtiv-prompts';
    
    const item = {
      id: prompt.id || prompt.promptId || uuidv4(),
      text: prompt.content || prompt.promptText,
      metadata: {
        userId: prompt.userId,
        agentId: prompt.agentId,
        type: prompt.type || 'default',
        category: prompt.category || 'general',
        timestamp: prompt.timestamp ? new Date(prompt.timestamp).toISOString() : new Date().toISOString(),
        ...prompt.metadata
      }
    };
    
    return await storeInPinecone(indexName, [item]);
  } catch (error) {
    console.error('Error storing prompt in Pinecone:', error);
    return false;
  }
}

/**
 * Search for similar memories in Pinecone
 * @param {string} queryText - Text to search for
 * @param {Object} filter - Optional filter for the search (userId, copilotId, etc.)
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Array of similar memories
 */
async function searchSimilarMemories(queryText, filter = {}, topK = 10) {
  return await searchPinecone('aixtiv-memories', queryText, filter, topK);
}

/**
 * Search for similar prompts in Pinecone
 * @param {string} queryText - Text to search for
 * @param {Object} filter - Optional filter for the search (userId, agentId, etc.)
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Array of similar prompts
 */
async function searchSimilarPrompts(queryText, filter = {}, topK = 10) {
  return await searchPinecone('aixtiv-prompts', queryText, filter, topK);
}

module.exports = {
  initPinecone,
  generateEmbeddings,
  createIndexIfNotExists,
  storeInPinecone,
  searchPinecone,
  deleteFromPinecone,
  storeMemoryInPinecone,
  storePromptInPinecone,
  searchSimilarMemories,
  searchSimilarPrompts
};