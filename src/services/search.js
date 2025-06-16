/**
 * Unified Search Service for Aixtiv Symphony
 * Combines web search and semantic vector search capabilities
 * 
 * @module services/search
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 2.0.0
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fetch = require('node-fetch');
const { generateEmbeddings, searchPinecone, storeInPinecone } = require('../functions/pinecone-integration-updated');

class SearchService {
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = 'api-for-warp-drive';
    this.pineconeInitialized = false;
  }

  // Web search methods
  async getCredentials() {
    try {
      const [apiKeyVersion] = await this.client.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/google_custom_search_config/versions/latest`,
      });
      const [engineIdVersion] = await this.client.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/google_search_engine_id/versions/latest`,
      });

      return {
        apiKey: apiKeyVersion.payload.data.toString('utf8'),
        searchEngineId: engineIdVersion.payload.data.toString('utf8'),
      };
    } catch (error) {
      console.error('Credential retrieval error:', error);
      throw new Error('Failed to retrieve search credentials');
    }
  }

  async searchWeb(query, options = {}) {
    const {
      resultType = 'web',
      dateRestrict,
      exactTerms,
      excludeTerms,
      fileType,
      sort = 'relevance',
    } = options;

    try {
      const credentials = await this.getCredentials();
      const params = new URLSearchParams({
        key: credentials.apiKey,
        cx: credentials.searchEngineId,
        q: query,
        searchType: resultType,
        sort: sort,
      });

      if (dateRestrict) params.append('dateRestrict', dateRestrict);
      if (exactTerms) params.append('exactTerms', exactTerms);
      if (excludeTerms) params.append('excludeTerms', excludeTerms);
      if (fileType) params.append('fileType', fileType);

      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data;
    } catch (error) {
      console.error('Search execution error:', error);
      throw error;
    }
  }

  async multiSearch(query, searchTypes) {
    try {
      const results = {};
      for (const searchType of searchTypes) {
        results[searchType] = await this.searchWeb(query, { resultType: searchType });
      }
      return results;
    } catch (error) {
      console.error('Multi-search error:', error);
      throw error;
    }
  }

  // Semantic search methods with Pinecone
  async semanticSearch(query, indexName = 'aixtiv-default', filter = {}, topK = 10) {
    try {
      // Validate parameters
      if (!query || query.trim() === '') {
        throw new Error('Search query cannot be empty');
      }
      
      // Perform search in Pinecone
      const results = await searchPinecone(indexName, query, filter, topK);
      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      throw error;
    }
  }

  async userContextSearch(query, userId, indexName = 'aixtiv-memories', topK = 10) {
    if (!userId) {
      throw new Error('User ID is required for contextualized search');
    }
    
    // Create filter based on user ID
    const filter = { userId };
    
    return this.semanticSearch(query, indexName, filter, topK);
  }

  async agentContextSearch(query, agentId, indexName = 'aixtiv-prompts', topK = 10) {
    if (!agentId) {
      throw new Error('Agent ID is required for contextualized search');
    }
    
    // Create filter based on agent ID
    const filter = { agentId };
    
    return this.semanticSearch(query, indexName, filter, topK);
  }

  async combinedSearch(query, options = {}) {
    const {
      memories = { enabled: true, weight: 0.5, topK: 5 },
      prompts = { enabled: true, weight: 0.5, topK: 5 },
      knowledgebase = { enabled: false, weight: 0.3, topK: 5 },
      userId,
      agentId
    } = options;
    
    const searchPromises = [];
    const sources = [];
    
    // Add memory search if enabled
    if (memories.enabled) {
      const memoryFilter = userId ? { userId } : {};
      searchPromises.push(
        this.semanticSearch(query, 'aixtiv-memories', memoryFilter, memories.topK)
          .then(results => results.map(r => ({ ...r, score: r.score * memories.weight, source: 'memory' })))
      );
      sources.push('memories');
    }
    
    // Add prompt search if enabled
    if (prompts.enabled) {
      const promptFilter = agentId ? { agentId } : {};
      searchPromises.push(
        this.semanticSearch(query, 'aixtiv-prompts', promptFilter, prompts.topK)
          .then(results => results.map(r => ({ ...r, score: r.score * prompts.weight, source: 'prompt' })))
      );
      sources.push('prompts');
    }
    
    // Add knowledgebase search if enabled
    if (knowledgebase.enabled) {
      searchPromises.push(
        this.semanticSearch(query, 'aixtiv-knowledge', {}, knowledgebase.topK)
          .then(results => results.map(r => ({ ...r, score: r.score * knowledgebase.weight, source: 'knowledge' })))
      );
      sources.push('knowledgebase');
    }
    
    try {
      // Execute all searches in parallel
      const results = await Promise.all(searchPromises);
      
      // Prepare individual results by source
      const resultsBySource = {};
      results.forEach((sourceResults, index) => {
        resultsBySource[sources[index]] = sourceResults;
      });
      
      // Create combined and reranked results
      const combined = [].concat(...results)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxResults || 10);
      
      return {
        ...resultsBySource,
        combined
      };
    } catch (error) {
      console.error('Combined search error:', error);
      throw error;
    }
  }

  // Index web search results in Pinecone for future semantic search
  async indexWebSearchResults(query, searchResults, indexName = 'aixtiv-web-results') {
    try {
      if (!searchResults || !searchResults.items || searchResults.items.length === 0) {
        return { success: false, message: 'No search results to index' };
      }

      // Prepare items for indexing
      const items = searchResults.items.map(item => ({
        id: item.cacheId || `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        text: `${item.title} ${item.snippet}`,
        metadata: {
          title: item.title,
          url: item.link,
          displayLink: item.displayLink,
          snippet: item.snippet,
          searchQuery: query,
          timestamp: new Date().toISOString()
        }
      }));

      // Store in Pinecone
      const success = await storeInPinecone(indexName, items);
      return { 
        success, 
        count: items.length,
        message: success ? `Indexed ${items.length} search results successfully` : 'Failed to index search results'
      };
    } catch (error) {
      console.error('Error indexing web search results:', error);
      return { success: false, error: error.message };
    }
  }

  // Hybrid search combining web and semantic search
  async hybridSearch(query, options = {}) {
    try {
      const {
        webResults = { enabled: true, resultType: 'web', weight: 0.7 },
        semanticResults = { enabled: true, indexName: 'aixtiv-web-results', weight: 0.8 },
        maxResults = 10,
        indexResults = true
      } = options;
      
      const promises = [];
      
      // Add web search if enabled
      if (webResults.enabled) {
        promises.push(this.searchWeb(query, { resultType: webResults.resultType }));
      }
      
      // Add semantic search if enabled
      if (semanticResults.enabled) {
        promises.push(this.semanticSearch(query, semanticResults.indexName, {}, maxResults));
      }
      
      // Execute searches in parallel
      const [webSearchResults, semanticSearchResults] = await Promise.all(promises);
      
      // Index web results for future semantic searches if requested
      if (indexResults && webResults.enabled && webSearchResults.items && webSearchResults.items.length > 0) {
        this.indexWebSearchResults(query, webSearchResults).catch(err => {
          console.error('Background indexing error:', err);
        });
      }
      
      // Format and return the results
      return {
        web: webResults.enabled ? webSearchResults : null,
        semantic: semanticResults.enabled ? semanticSearchResults : null,
        query,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Hybrid search error:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();