/**
 * Dewey Digital Index System
 * 
 * Core implementation of the Dewey Digital Index solution for the Aixtiv Symphony ecosystem.
 * Provides indexing, classification, and semantic search capabilities for digital assets.
 * Integrates with the Flight Memory System (FMS) and vector database for persistent storage.
 * 
 * @module core-protocols/dewey-index
 */

const winston = require('winston');
const { performance } = require('perf_hooks');

// Import sub-modules
const Indexer = require('./indexer');
const Classifier = require('./classifier');
const Search = require('./search');

// Import integrations
const FMSConnector = require('./integrations/fms-connector');
const VectorDBConnector = require('./integrations/vector-db');

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    }),
    new winston.transports.File({ filename: 'logs/dewey-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/dewey-combined.log' }),
  ],
});

/**
 * Main Dewey Digital Index class
 * 
 * Provides a unified interface for indexing, classifying, and searching digital assets.
 */
class DeweyIndex {
  /**
   * Create a new DeweyIndex instance
   * 
   * @param {Object} config - Configuration options
   * @param {Object} config.fms - Flight Memory System configuration
   * @param {Object} config.vectorDB - Vector database configuration
   * @param {Object} config.indexer - Indexer configuration
   * @param {Object} config.classifier - Classifier configuration
   * @param {Object} config.search - Search configuration
   */
  constructor(config = {}) {
    logger.info('Initializing Dewey Digital Index system');
    
    this.config = {
      fms: config.fms || {},
      vectorDB: config.vectorDB || {},
      indexer: config.indexer || {},
      classifier: config.classifier || {},
      search: config.search || {},
    };
    
    // Initialize performance metrics
    this.metrics = {
      indexing: {
        totalDocuments: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        successRate: 1.0,
      },
      classification: {
        totalClassifications: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        accuracy: 0,
      },
      search: {
        totalQueries: 0,
        totalProcessingTime: 0,
        averageLatency: 0,
        relevanceScore: 0,
      },
    };
    
    // Initialize connections and components
    try {
      // Connect to Flight Memory System
      this.fms = new FMSConnector(this.config.fms);
      
      // Connect to Vector Database
      this.vectorDB = new VectorDBConnector(this.config.vectorDB);
      
      // Initialize components with connections
      this.indexer = new Indexer({
        ...this.config.indexer,
        fms: this.fms,
        vectorDB: this.vectorDB,
      });
      
      this.classifier = new Classifier({
        ...this.config.classifier,
        fms: this.fms,
        vectorDB: this.vectorDB,
      });
      
      this.search = new Search({
        ...this.config.search,
        fms: this.fms,
        vectorDB: this.vectorDB,
      });
      
      logger.info('Dewey Digital Index system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Dewey Digital Index system', { error: error.message, stack: error.stack });
      throw new Error(`Dewey initialization failed: ${error.message}`);
    }
  }

  /**
   * Index a digital asset
   * 
   * @param {Object} document - Document to index
   * @param {string} document.content - Document content
   * @param {Object} document.metadata - Document metadata
   * @param {string} document.type - Document type
   * @param {Object} options - Indexing options
   * @returns {Promise<Object>} Indexed document with ID
   */
  async indexDocument(document, options = {}) {
    const startTime = performance.now();
    let success = false;
    
    try {
      logger.info('Indexing document', { 
        type: document.type, 
        size: document.content?.length,
        metadata: document.metadata 
      });
      
      // Index the document
      const result = await this.indexer.process(document, options);
      
      // Update metrics
      this.metrics.indexing.totalDocuments++;
      success = true;
      
      logger.info('Document indexed successfully', { 
        documentId: result.id,
        processingTime: performance.now() - startTime 
      });
      
      return result;
    } catch (error) {
      logger.error('Document indexing failed', { 
        error: error.message, 
        stack: error.stack,
        document: { type: document.type, metadata: document.metadata }
      });
      
      // Update metrics
      this.metrics.indexing.successRate = 
        (this.metrics.indexing.totalDocuments * this.metrics.indexing.successRate) / 
        (this.metrics.indexing.totalDocuments + 1);
      
      throw error;
    } finally {
      // Calculate processing time
      const processingTime = performance.now() - startTime;
      
      // Update metrics
      this.metrics.indexing.totalProcessingTime += processingTime;
      this.metrics.indexing.averageProcessingTime = 
        this.metrics.indexing.totalProcessingTime / 
        (this.metrics.indexing.totalDocuments || 1);
      
      // Log performance
      logger.debug('Document indexing performance', { 
        success,
        processingTime,
        averageTime: this.metrics.indexing.averageProcessingTime
      });
    }
  }

  /**
   * Classify a document
   * 
   * @param {Object} document - Document to classify
   * @param {string} document.content - Document content
   * @param {Object} document.metadata - Document metadata
   * @param {Object} options - Classification options
   * @param {string} options.taxonomy - Taxonomy to use for classification
   * @returns {Promise<Object>} Classification results
   */
  async classifyDocument(document, options = {}) {
    const startTime = performance.now();
    let success = false;
    
    try {
      logger.info('Classifying document', { 
        size: document.content?.length,
        metadata: document.metadata,
        options 
      });
      
      // Classify the document
      const result = await this.classifier.process(document, options);
      
      // Update metrics
      this.metrics.classification.totalClassifications++;
      success = true;
      
      logger.info('Document classified successfully', { 
        categories: result.categories,
        confidence: result.confidence,
        processingTime: performance.now() - startTime 
      });
      
      return result;
    } catch (error) {
      logger.error('Document classification failed', { 
        error: error.message, 
        stack: error.stack,
        document: { metadata: document.metadata }
      });
      
      throw error;
    } finally {
      // Calculate processing time
      const processingTime = performance.now() - startTime;
      
      // Update metrics
      this.metrics.classification.totalProcessingTime += processingTime;
      this.metrics.classification.averageProcessingTime = 
        this.metrics.classification.totalProcessingTime / 
        (this.metrics.classification.totalClassifications || 1);
      
      // Log performance
      logger.debug('Document classification performance', { 
        success,
        processingTime,
        averageTime: this.metrics.classification.averageProcessingTime
      });
    }
  }

  /**
   * Search for relevant documents
   * 
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {string} options.mode - Search mode: 'semantic', 'keyword', or 'hybrid'
   * @param {number} options.limit - Maximum number of results
   * @param {Object} options.filters - Filters to apply to search
   * @returns {Promise<Array>} Search results
   */
  async search(query, options = {}) {
    const startTime = performance.now();
    let success = false;
    
    try {
      logger.info('Performing search', { query, options });
      
      // Perform search
      const results = await this.search.execute(query, options);
      
      // Update metrics
      this.metrics.search.totalQueries++;
      success = true;
      
      logger.info('Search completed successfully', { 
        resultCount: results.length,
        processingTime: performance.now() - startTime 
      });
      
      return results;
    } catch (error) {
      logger.error('Search failed', { 
        error: error.message, 
        stack: error.stack,
        query, 
        options 
      });
      
      throw error;
    } finally {
      // Calculate processing time
      const processingTime = performance.now() - startTime;
      
      // Update metrics
      this.metrics.search.totalProcessingTime += processingTime;
      this.metrics.search.averageLatency = 
        this.metrics.search.totalProcessingTime / 
        (this.metrics.search.totalQueries || 1);
      
      // Log performance
      logger.debug('Search performance', { 
        success,
        processingTime,
        averageLatency: this.metrics.search.averageLatency
      });
    }
  }

  /**
   * Get performance metrics
   * 
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Check health of Dewey system
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Check FMS connection
      const fmsStatus = await this.fms.checkConnection();
      
      // Check Vector DB connection
      const vectorDBStatus = await this.vectorDB.checkConnection();
      
      return {
        status: fmsStatus.connected && vectorDBStatus.connected ? 'healthy' : 'degraded',
        components: {
          fms: fmsStatus,
          vectorDB: vectorDBStatus,
        },
        metrics: this.getMetrics(),
      };
    } catch (error) {
      logger.error('Health check failed', { error: error.message, stack: error.stack });
      
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Integrate indexed knowledge with conversation context
   * 
   * @param {Object} context - Conversation context
   * @param {Object} options - Integration options
   * @returns {Promise<Object>} Enhanced context
   */
  async enhanceContext(context, options = {}) {
    try {
      logger.info('Enhancing conversation context with Dewey knowledge', { 
        sessionId: context.sessionId,
        options 
      });
      
      // Extract relevant information from context
      const { lastInput = '', interactions = [] } = context;
      
      // Create search query from context
      const query = lastInput;
      
      // Search for relevant knowledge
      const searchResults = await this.search(query, {
        mode: 'semantic',
        limit: options.maxResults || 5,
        minRelevance: options.minRelevance || 0.7,
      });
      
      // Enhance context with relevant knowledge
      const enhancedContext = {
        ...context,
        deweyKnowledge: {
          relevantDocuments: searchResults,
          timestamp: new Date().toISOString(),
        },
      };
      
      logger.info('Context enhanced successfully', { 
        sessionId: context.sessionId,
        documentCount: searchResults.length 
      });
      
      return enhancedContext;
    } catch (error) {
      logger.error('Context enhancement failed', { 
        error: error.message, 
        stack: error.stack,
        sessionId: context.sessionId 
      });
      
      // Return original context on error
      return context;
    }
  }
}

module.exports = {
  DeweyIndex,
  logger,
};

