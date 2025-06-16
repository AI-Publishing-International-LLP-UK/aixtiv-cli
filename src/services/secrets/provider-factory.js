/**
 * AI Provider Factory
 * 
 * Creates configured API clients for different AI providers using
 * credentials from Secret Manager.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const secretManager = require('./secret-manager');

// Cache for providers to avoid re-initialization
const providerCache = new Map();

/**
 * Provider Factory for creating configured AI clients
 */
class ProviderFactory {
  /**
   * Create an OpenAI client
   * @returns {Promise<Object>} - Configured OpenAI client
   */
  async createOpenAIClient() {
    if (providerCache.has('openai')) {
      return providerCache.get('openai');
    }
    
    try {
      const { OpenAI } = require('openai');
      const apiKey = await secretManager.getOpenAIKey();
      
      if (!apiKey) {
        throw new Error('OpenAI API key not available');
      }
      
      const client = new OpenAI({
        apiKey: apiKey,
        maxRetries: 3,
        timeout: 30000
      });
      
      providerCache.set('openai', client);
      return client;
    } catch (error) {
      console.error('Failed to create OpenAI client:', error.message);
      throw error;
    }
  }

  /**
   * Create an Anthropic/Claude client
   * @returns {Promise<Object>} - Configured Anthropic client
   */
  async createAnthropicClient() {
    if (providerCache.has('anthropic')) {
      return providerCache.get('anthropic');
    }
    
    try {
      const { Anthropic } = require('@anthropic-ai/sdk');
      const apiKey = await secretManager.getAnthropicKey();
      
      if (!apiKey) {
        throw new Error('Anthropic API key not available');
      }
      
      const client = new Anthropic({
        apiKey: apiKey
      });
      
      providerCache.set('anthropic', client);
      return client;
    } catch (error) {
      console.error('Failed to create Anthropic client:', error.message);
      throw error;
    }
  }

  /**
   * Create a Pinecone client
   * @returns {Promise<Object>} - Configured Pinecone client
   */
  async createPineconeClient() {
    if (providerCache.has('pinecone')) {
      return providerCache.get('pinecone');
    }
    
    try {
      const { Pinecone } = require('@pinecone-database/pinecone');
      const apiKey = await secretManager.getPineconeKey();
      const environment = await secretManager.getPineconeEnvironment();
      
      if (!apiKey) {
        throw new Error('Pinecone API key not available');
      }
      
      const client = new Pinecone({
        apiKey: apiKey,
        environment: environment
      });
      
      providerCache.set('pinecone', client);
      return client;
    } catch (error) {
      console.error('Failed to create Pinecone client:', error.message);
      throw error;
    }
  }

  /**
   * Create a LangChain manager
   * @returns {Promise<Object>} - Configured LangChain manager
   */
  async createLangchainManager() {
    if (providerCache.has('langchain')) {
      return providerCache.get('langchain');
    }
    
    try {
      const { LangChainManager } = require('../langchain/manager');
      const apiKey = await secretManager.getLangchainKey();
      
      if (!apiKey) {
        throw new Error('LangChain API key not available');
      }
      
      const manager = new LangChainManager(apiKey);
      providerCache.set('langchain', manager);
      return manager;
    } catch (error) {
      console.error('Failed to create LangChain manager:', error.message);
      throw error;
    }
  }

  /**
   * Create a Vertex AI client
   * @returns {Promise<Object>} - Configured Vertex AI client
   */
  async createVertexAIClient() {
    if (providerCache.has('vertexai')) {
      return providerCache.get('vertexai');
    }
    
    try {
      const { VertexAI } = require('@google-cloud/vertexai');
      const apiKey = await secretManager.getVertexAIKey();
      
      if (!apiKey) {
        throw new Error('Vertex AI key not available');
      }
      
      const projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';
      const location = process.env.GCP_LOCATION || 'us-west1';
      
      const vertexai = new VertexAI({
        project: projectId, 
        location: location,
        apiEndpoint: 'us-west1-aiplatform.googleapis.com'
      });
      
      providerCache.set('vertexai', vertexai);
      return vertexai;
    } catch (error) {
      console.error('Failed to create Vertex AI client:', error.message);
      throw error;
    }
  }

  /**
   * Create a client for a specific agent
   * @param {string} agentName - Name of the agent
   * @returns {Promise<Object>} - Configured agent client
   */
  async createAgentClient(agentName) {
    const cacheKey = `agent-${agentName}`;
    if (providerCache.has(cacheKey)) {
      return providerCache.get(cacheKey);
    }
    
    try {
      const apiKey = await secretManager.getAgentKey(agentName);
      
      if (!apiKey) {
        throw new Error(`API key for agent ${agentName} not available`);
      }
      
      // Determine agent type and create appropriate client
      if (agentName.startsWith('dr-')) {
        // Most Dr. agents use Anthropic/Claude
        const { Anthropic } = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey });
        providerCache.set(cacheKey, client);
        return client;
      } else if (agentName === 'mr-roark') {
        // Mr. Roark uses OpenAI
        const { OpenAI } = require('openai');
        const client = new OpenAI({ apiKey });
        providerCache.set(cacheKey, client);
        return client;
      } else {
        throw new Error(`Unknown agent type: ${agentName}`);
      }
    } catch (error) {
      console.error(`Failed to create client for agent ${agentName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get an embeddings provider
   * @param {string} provider - Provider to use for embeddings (openai|anthropic|vertexai)
   * @returns {Promise<Object>} - Configured embeddings provider
   */
  async getEmbeddingsProvider(provider = 'openai') {
    const cacheKey = `embeddings-${provider}`;
    if (providerCache.has(cacheKey)) {
      return providerCache.get(cacheKey);
    }
    
    try {
      switch (provider) {
        case 'openai': {
          const openai = await this.createOpenAIClient();
          const embeddingsProvider = {
            embedDocuments: async (texts) => {
              const response = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: texts
              });
              return response.data.map(item => item.embedding);
            },
            embedQuery: async (text) => {
              const response = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text
              });
              return response.data[0].embedding;
            }
          };
          providerCache.set(cacheKey, embeddingsProvider);
          return embeddingsProvider;
        }
        
        case 'anthropic': {
          // Note: This is for future use as Anthropic releases embedding APIs
          throw new Error('Anthropic embeddings not yet supported');
        }
        
        case 'vertexai': {
          const vertexai = await this.createVertexAIClient();
          const embeddingsProvider = {
            embedDocuments: async (texts) => {
              const model = vertexai.preview.getGenerativeModel({ 
                model: 'embedding-001'
              });
              
              // Process in batches if needed
              const embeddings = [];
              for (const text of texts) {
                const response = await model.embedContent(text);
                embeddings.push(response.embedding.values);
              }
              
              return embeddings;
            },
            embedQuery: async (text) => {
              const model = vertexai.preview.getGenerativeModel({ 
                model: 'embedding-001'
              });
              const response = await model.embedContent(text);
              return response.embedding.values;
            }
          };
          providerCache.set(cacheKey, embeddingsProvider);
          return embeddingsProvider;
        }
        
        default:
          throw new Error(`Unknown embeddings provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Failed to create embeddings provider for ${provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear provider cache
   * @param {string} [provider] - Specific provider to clear, or all if not specified
   */
  clearCache(provider) {
    if (provider) {
      providerCache.delete(provider);
    } else {
      providerCache.clear();
    }
  }
}

// Export singleton instance
module.exports = new ProviderFactory();