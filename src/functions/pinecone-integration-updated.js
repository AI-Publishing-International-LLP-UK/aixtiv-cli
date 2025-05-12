/**
 * Enhanced Pinecone Integration for Aixtiv CLI Owner-Subscriber V1-V2 Immersive System
 * 
 * This module provides GCP Secret Manager integration with Pinecone vector database
 * capabilities, enabling semantic search across prompts, memories, and agent outputs.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const secretManager = require('../services/secrets/secret-manager');
const providerFactory = require('../services/secrets/provider-factory');

// Cached API keys and configuration, initialized at first use
let PINECONE_API_KEY = '';
let PINECONE_ENVIRONMENT = 'us-west1-gcp';
let EMBEDDING_MODEL = 'text-embedding-ada-002';
let DIMENSION = 1536; // Dimension for OpenAI ada-002 embeddings

// Selected provider for embeddings, can be 'openai' or 'vertexai'
let EMBEDDINGS_PROVIDER = 'openai';

// Flag to track initialization
let isInitialized = false;

/**
 * Initialize Pinecone integration configuration
 * @returns {Promise<void>}
 */
async function initialize() {
  if (isInitialized) return;
  
  try {
    // Get API keys from GCP Secret Manager
    PINECONE_API_KEY = await secretManager.getPineconeKey();
    
    // Get environment setting
    const environment = await secretManager.getPineconeEnvironment();
    if (environment) {
      PINECONE_ENVIRONMENT = environment;
    }
    
    // Determine embeddings provider based on available credentials
    try {
      await secretManager.getOpenAIKey();
      EMBEDDINGS_PROVIDER = 'openai';
    } catch (error) {
      // If OpenAI key not available, try Vertex AI
      try {
        await secretManager.getVertexAIKey();
        EMBEDDINGS_PROVIDER = 'vertexai';
      } catch (secondError) {
        console.warn('Neither OpenAI nor Vertex AI credentials available, defaulting to OpenAI');
        EMBEDDINGS_PROVIDER = 'openai';
      }
    }
    
    console.log(`Pinecone integration initialized with ${EMBEDDINGS_PROVIDER} embeddings`);
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize Pinecone integration:', error.message);
    throw error;
  }
}

/**
 * Initialize Pinecone client with API key and environment
 * @returns {Object} Pinecone client object with methods for index operations
 */
async function initPinecone() {
  await initialize();
  
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
 * Generate embeddings for text using provider API
 * @param {string|string[]} texts - Text(s) to generate embeddings for
 * @returns {Promise<Array>} Array of embeddings
 */
async function generateEmbeddings(texts) {
  await initialize();
  
  // Convert single text to array if needed
  const inputTexts = Array.isArray(texts) ? texts : [texts];
  
  try {
    // Get embeddings provider based on configuration
    const embeddings = await providerFactory.getEmbeddingsProvider(EMBEDDINGS_PROVIDER);
    return await embeddings.embedDocuments(inputTexts);
  } catch (error) {
    console.error('Error generating embeddings:', error.message);
    throw error;
  }
}

/**
 * Create Pinecone index if it doesn't exist
 * @param {string} indexName - Name of the index to create
 * @returns {Promise<boolean>} True if index was created or already exists
 */
async function createIndexIfNotExists(indexName) {
  const pinecone = await initPinecone();
  
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
    const pinecone = await initPinecone();
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
    const pinecone = await initPinecone();
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
    const pinecone = await initPinecone();
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

/**
 * Set the embeddings provider to use
 * @param {string} provider - Provider to use ('openai'|'vertexai')
 */
function setEmbeddingsProvider(provider) {
  if (provider !== 'openai' && provider !== 'vertexai') {
    throw new Error(`Unsupported embeddings provider: ${provider}`);
  }
  EMBEDDINGS_PROVIDER = provider;
  console.log(`Embeddings provider set to ${provider}`);
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
  searchSimilarPrompts,
  setEmbeddingsProvider
};