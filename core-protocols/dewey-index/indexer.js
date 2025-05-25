/**
 * Dewey Digital Index - Document Indexer
 * 
 * Handles the document processing pipeline for the Dewey Digital Index system.
 * Processes documents, extracts metadata, chunks content, generates embeddings,
 * and stores indexed data in the FMS and vector database.
 * 
 * @module core-protocols/dewey-index/indexer
 */

const { performance } = require('perf_hooks');
const winston = require('winston');
const crypto = require('crypto');
const { promisify } = require('util');

// Configure logger
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
    new winston.transports.File({ filename: 'logs/dewey-indexer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/dewey-indexer.log' }),
  ],
});

/**
 * Document Indexer class
 * 
 * Processes documents and stores indexed data in the FMS and vector database.
 */
class Indexer {
  /**
   * Create a new Indexer instance
   * 
   * @param {Object} config - Configuration options
   * @param {Object} config.fms - Flight Memory System instance
   * @param {Object} config.vectorDB - Vector database instance
   * @param {Object} config.chunkingOptions - Content chunking options
   * @param {number} config.chunkingOptions.textMaxChunkSize - Maximum chunk size for text documents
   * @param {number} config.chunkingOptions.textOverlap - Chunk overlap for text documents
   * @param {Object} config.embeddingOptions - Embedding generation options
   * @param {string} config.embeddingOptions.model - Embedding model to use
   * @param {number} config.embeddingOptions.dimensions - Embedding dimensions
   */
  constructor(config = {}) {
    this.fms = config.fms;
    this.vectorDB = config.vectorDB;
    
    // Default chunking options
    this.chunkingOptions = {
      textMaxChunkSize: config.chunkingOptions?.textMaxChunkSize || 1000,
      textOverlap: config.chunkingOptions?.textOverlap || 200,
      codeMaxChunkSize: config.chunkingOptions?.codeMaxChunkSize || 1500,
      codeOverlap: config.chunkingOptions?.codeOverlap || 300,
    };
    
    // Default embedding options
    this.embeddingOptions = {
      model: config.embeddingOptions?.model || 'aixtiv-embedding-v1',
      dimensions: config.embeddingOptions?.dimensions || 1536,
      batchSize: config.embeddingOptions?.batchSize || 16,
    };
    
    // Performance metrics
    this.metrics = {
      documentsProcessed: 0,
      chunksGenerated: 0,
      embeddingsGenerated: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      processingErrors: 0,
    };
    
    logger.info('Dewey Indexer initialized', {
      chunkingOptions: this.chunkingOptions,
      embeddingOptions: this.embeddingOptions,
    });
  }

  /**
   * Process a document
   * 
   * @param {Object} document - Document to process
   * @param {string} document.content - Document content
   * @param {Object} document.metadata - Document metadata
   * @param {string} document.type - Document type (text, code, pdf, etc.)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async process(document, options = {}) {
    const startTime = performance.now();
    const documentId = this._generateDocumentId(document);
    
    try {
      logger.info('Processing document', {
        documentId,
        type: document.type,
        contentLength: document.content?.length,
      });
      
      // 1. Extract and enhance metadata
      const enhancedMetadata = await this._extractMetadata(document, options);
      
      // 2. Chunk content
      const chunks = await this._chunkContent(document, options);
      
      // 3. Generate embeddings
      const embeddedChunks = await this._generateEmbeddings(chunks, options);
      
      // 4. Store in FMS
      const fmsResult = await this._storeInFMS(documentId, document, enhancedMetadata, embeddedChunks);
      
      // 5. Store in vector database
      const vectorDBResult = await this._storeInVectorDB(documentId, embeddedChunks);
      
      // Update metrics
      this.metrics.documentsProcessed++;
      this.metrics.chunksGenerated += chunks.length;
      this.metrics.embeddingsGenerated += embeddedChunks.length;
      
      const processingTime = performance.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.documentsProcessed;
      
      logger.info('Document processing completed', {
        documentId,
        processingTime,
        chunkCount: chunks.length,
      });
      
      return {
        id: documentId,
        metadata: enhancedMetadata,
        chunkCount: chunks.length,
        processingTime,
        storedInFMS: fmsResult.success,
        storedInVectorDB: vectorDBResult.success,
      };
    } catch (error) {
      logger.error('Document processing failed', {
        documentId,
        error: error.message,
        stack: error.stack,
      });
      
      this.metrics.processingErrors++;
      
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  /**
   * Generate a unique document ID
   * 
   * @param {Object} document - Document to generate ID for
   * @returns {string} Unique document ID
   * @private
   */
  _generateDocumentId(document) {
    const { metadata = {}, type = 'unknown' } = document;
    const { title = '', author = '', source = '', timestamp = Date.now() } = metadata;
    
    // Generate hash from content and metadata
    const contentSample = document.content ? document.content.substring(0, 1000) : '';
    const hashInput = `${contentSample}|${title}|${author}|${source}|${timestamp}|${type}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
    
    // Create ID with type prefix and timestamp
    const timestampStr = new Date(timestamp).toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    return `dewey-${type}-${timestampStr}-${hash}`;
  }

  /**
   * Extract and enhance metadata from document
   * 
   * @param {Object} document - Document to extract metadata from
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Enhanced metadata
   * @private
   */
  async _extractMetadata(document, options = {}) {
    const { metadata = {}, content = '', type = 'unknown' } = document;
    
    // Start with provided metadata
    const enhancedMetadata = {
      ...metadata,
      deweyIndexed: true,
      indexTimestamp: new Date().toISOString(),
      documentType: type,
      contentLength: content.length,
    };
    
    // Add document-type specific metadata
    switch (type) {
      case 'text':
        enhancedMetadata.wordCount = content.split(/\s+/).length;
        enhancedMetadata.readingTime = Math.ceil(enhancedMetadata.wordCount / 200); // minutes
        break;
        
      case 'code':
        enhancedMetadata.lineCount = content.split('\n').length;
        enhancedMetadata.language = metadata.language || this._detectCodeLanguage(content);
        break;
        
      case 'pdf':
        // PDF-specific metadata extraction would go here
        break;
        
      case 'image':
        // Image-specific metadata extraction would go here
        break;
    }
    
    // Apply auto-classification if enabled
    if (options.autoClassify) {
      try {
        // This would integrate with the Classifier module
        // enhancedMetadata.classifications = await classifier.classify(document);
        enhancedMetadata.classifications = ['auto-classification-placeholder'];
      } catch (error) {
        logger.warn('Auto-classification failed', { error: error.message });
      }
    }
    
    return enhancedMetadata;
  }

  /**
   * Detect programming language from code content
   * 
   * @param {string} content - Code content
   * @returns {string} Detected language
   * @private
   */
  _detectCodeLanguage(content) {
    // Simple heuristic-based language detection
    // In a real implementation, this would be more sophisticated
    
    const fileExtensionPatterns = {
      javascript: [/function\s+\w+\s*\(/, /const\s+\w+\s*=/, /import\s+.*\s+from\s+/, /export\s+/],
      typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*\w+\[\]/, /class\s+\w+\s*implements/],
      python: [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /#\s*\w+/],
      java: [/public\s+class/, /private\s+\w+\s*\(/, /package\s+\w+/, /import\s+\w+\.\w+/],
      go: [/func\s+\w+\s*\(/, /package\s+\w+/, /import\s+\(.*\)/, /type\s+\w+\s+struct/],
      rust: [/fn\s+\w+\s*\(/, /struct\s+\w+/, /impl\s+\w+/, /use\s+\w+::\w+/],
      html: [/<html>/, /<div>/, /<script>/, /<head>/],
      css: [/\.\w+\s*{/, /@media/, /\#\w+\s*{/, /:\s*hover/],
    };
    
    for (const [language, patterns] of Object.entries(fileExtensionPatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return language;
      }
    }
    
    return 'unknown';
  }

  /**
   * Chunk document content
   * 
   * @param {Object} document - Document to chunk
   * @param {Object} options - Chunking options
   * @returns {Promise<Array>} Chunks
   * @private
   */
  async _chunkContent(document, options = {}) {
    const { content = '', type = 'text', metadata = {} } = document;
    
    // Skip chunking if no content
    if (!content || content.length === 0) {
      return [];
    }
    
    // Use document-type specific chunking strategy
    let chunks = [];
    switch (type) {
      case 'text':
        chunks = this._chunkText(content, options);
        break;
        
      case 'code':
        chunks = this._chunkCode(content, metadata.language, options);
        break;
        
      case 'pdf':
        // PDF chunking would go here
        chunks = this._chunkText(content, options); // Fallback to text chunking
        break;
        
      default:
        chunks = this._chunkText(content, options); // Default to text chunking
    }
    
    // Add metadata to each chunk
    return chunks.map((chunk, index) => ({
      id: `${document.id || this._generateDocumentId(document)}-chunk-${index}`,
      content: chunk,
      index,
      documentType: type,
      metadata: {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));
  }

  /**
   * Chunk text content
   * 
   * @param {string} text - Text to chunk
   * @param {Object} options - Chunking options
   * @returns {Array<string>} Text chunks
   * @private
   */
  _chunkText(text, options = {}) {
    const maxChunkSize = options.maxChunkSize || this.chunkingOptions.textMaxChunkSize;
    const overlap = options.overlap || this.chunkingOptions.textOverlap;
    
    // Simple chunking by sentence with overlap
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed max size, start new chunk
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        
        // Start new chunk with overlap from previous chunk
        const words = currentChunk.split(' ');
        const overlapWordCount = Math.min(Math.ceil(overlap / 5), words.length); // Approx 5 chars per word
        currentChunk = words.slice(-overlapWordCount).join(' ') + ' ';
      }
      
      currentChunk += sentence;
    }
    
    // Add final chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Chunk code content
   * 
   * @param {string} code - Code to chunk
   * @param {string} language - Programming language
   * @param {Object} options - Chunking options
   * @returns {Array<string>} Code chunks
   * @private
   */
  _chunkCode(code, language = 'unknown', options = {}) {
    const maxChunkSize = options.maxChunkSize || this.chunkingOptions.codeMaxChunkSize;
    const overlap = options.overlap || this.chunkingOptions.codeOverlap;
    
    // Split by function/class definitions or by blocks of lines
    const lines = code.split('\n');
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;
    
    // Language-specific chunking patterns
    const functionStartPatterns = {
      javascript: /^\s*(function|class|const\s+\w+\s*=\s*function|const\s+\w+\s*=\s*\(.*\)\s*=>)/,
      typescript: /^\s*(function|class|interface|type\s+\w+\s*=|const\s+\w+\s*=\s*function|const\s+\w+\s*=\s*\(.*\)\s*=>)/,
      python: /^\s*(def|class)\s+\w+/,
      java: /^\s*(public|private|protected)?\s*(static)?\s*(class|interface|enum|void|[A-Z][a-zA-Z0-9_]*)\s+\w+/,
      go: /^\s*func\s+\w+/,
      rust: /^\s*(fn|struct|impl|trait)\s+\w+/,
    };
    
    const pattern = functionStartPatterns[language] || /^\s*\S+/;
    
    // Process line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If line starts a new function/class and we have content, finalize current chunk
      if (pattern.test(line) && currentChunk.length > 0 && currentSize > maxChunkSize / 2) {
        chunks.push(currentChunk.join('\n'));
        
        // Start new chunk with overlap
        const overlapLineCount = Math.min(Math.ceil(overlap / 20), currentChunk.length); // Approx 20 chars per line
        currentChunk = currentChunk.slice(-overlapLineCount);
        currentSize = currentChunk.join('\n').length;
      }
      
      // Add line to current chunk
      currentChunk.push(line);
      currentSize += line.length + 1; // +1 for newline
      
      // If chunk exceeds max size, finalize it
      if (currentSize >= maxChunkSize && i < lines.length - 1) {
        chunks.push(currentChunk.join('\n'));
        
        // Start new chunk with overlap
        const overlapLineCount = Math.min(Math.ceil(overlap / 20), currentChunk.length);
        currentChunk = currentChunk.slice(-overlapLineCount);
        currentSize = currentChunk.join('\n').length;
      }
    }
    
    // Add final chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }
    
    return chunks;
  }

  /**
   * Generate embeddings for chunks
   * 
   * @param {Array} chunks - Content chunks
   * @param {Object} options - Embedding options
   * @returns {Promise<Array>} Chunks with embeddings
   * @private
   */
  async _generateEmbeddings(chunks, options = {}) {
    if (chunks.length === 0) {
      return [];
    }
    
    logger.info('Generating embeddings', { chunkCount: chunks.length });
    
    // Get embedding options
    const model = options.embeddingModel || this.embeddingOptions.model;
    const batchSize = options.batchSize || this.embeddingOptions.batchSize;
    
    // Process in batches
    const embeddedChunks = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const contents = batch.map(chunk => chunk.content);
      
      try {
        // In a real implementation, this would call an embedding service
        // For now, we'll simulate embedding generation with random vectors
        const embeddings = await this._simulateEmbeddings(contents, model);
        
        // Add embeddings to chunks
        for (let j = 0; j < batch.length; j++) {
          embeddedChunks.push({
            ...batch[j],
            embedding: embeddings[j],
          });
        }
        
        logger.debug('Batch embedding completed', {
          batchSize: batch.length,
          startIndex: i,
        });
      } catch (error) {
        logger.error('Embedding generation failed for batch', {
          startIndex: i,
          batchSize: batch.length,
          error: error.message,
        });
        
        // Add chunks without embeddings
        for (const chunk of batch) {
          embeddedChunks.push({
            ...chunk,
            embedding: null,
            embeddingError: error.message,
          });
        }
      }
    }
    
    logger.info('Embedding generation completed', {
      totalChunks: chunks.length,
      embeddedChunks: embeddedChunks.filter(c => c.embedding).length,
      failedChunks: embeddedChunks.filter(c => !c.embedding).length,
    });
    
    return embeddedChunks;
  }

  /**
   * Simulate embedding generation (for development/testing)
   * 
   * @param {Array<string>} contents - Text contents
   * @param {string} model - Embedding model
   * @returns {Promise<Array>} Simulated embeddings
   * @private
   */
  async _simulateEmbeddings(contents, model) {
    const dimensions = this.embeddingOptions.dimensions;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 50 + contents.length * 5));
    
    // Generate random embeddings
    return contents.map(content => {
      // Use content hash as seed for pseudo-randomness
      const hash = crypto.createHash('md5').update(content).digest('hex');
      const seed = parseInt(hash.substring(0, 8), 16);
      
      // Generate deterministic "random" vector based on content
      const random = seedRandom(seed);
      const embedding = Array.from({ length: dimensions }, () => random() * 2 - 1);
      
      // Normalize to unit length
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / magnitude);
    });
    
    /**
     * Simple seeded random number generator
     * @param {number} seed - Random seed
     * @returns {Function} Random number generator
     */
    function seedRandom(seed) {
      return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    }
  }

  /**
   * Store document and chunks in FMS
   * 
   * @param {string} documentId - Document ID
   * @param {Object} document - Original document
   * @param {Object} metadata - Enhanced metadata
   * @param {Array} chunks - Document chunks
   * @returns {Promise<Object>} Storage result
   * @private
   */
  async _storeInFMS(documentId, document, metadata, chunks) {
    try {
      logger.info('Storing document in FMS', { documentId, chunkCount: chunks.length });
      
      // Store document metadata
      const documentRecord = {
        id: documentId,
        type: document.type,
        metadata,
        timestamp: new Date().toISOString(),
        chunkCount: chunks.length,
      };
      
      await this.fms.storeMemory({
        type: 'dewey-document',
        key: documentId,
        data: documentRecord,
      });
      
      // Store chunks (without embeddings to save space)
      const chunkRecords = chunks.map(chunk => ({
        id: chunk.id,
        documentId,
        index: chunk.index,
        content: chunk.content,
        metadata: chunk.metadata,
        hasEmbedding: !!chunk.embedding,
      }));
      
      await this.fms.storeMemory({
        type: 'dewey-chunks',
        key: `${documentId}-chunks`,
        data: chunkRecords,
      });
      
      logger.info('Document stored in FMS successfully', { documentId });
      
      return { success: true, documentId };
    } catch (error) {
      logger.error('Failed to store document in FMS', {
        documentId,
        error: error.message,
        stack: error.stack,
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Store embeddings in vector database
   * 
   * @param {string} documentId - Document ID
   * @param {Array} chunks - Document chunks with embeddings
   * @returns {Promise<Object>} Storage result
   * @private
   */
  async _storeInVectorDB(documentId, chunks) {
    try {
      const embeddings = chunks.filter(chunk => chunk.embedding);
      
      if (embeddings.length === 0) {
        logger.warn('No embeddings to store in vector database', { documentId });
        return { success: false, reason: 'no-embeddings' };
      }
      
      logger.info('Storing embeddings in vector database', {
        documentId,
        embeddingCount: embeddings.length,
      });
      
      // Prepare vectors for storage
      const vectors = embeddings.map(chunk => ({
        id: chunk.id,
        vector: chunk.embedding,
        metadata: {
          documentId,
          chunkIndex: chunk.index,
          documentType: chunk.metadata.documentType,
          content: chunk.content.substring(0, 100) + '...', // Preview
        },
      }));
      
      // Store in vector database
      await this.vectorDB.upsert(vectors);
      
      logger.info('Embeddings stored in vector database successfully', {
        documentId,
        embeddingCount: embeddings.length,
      });
      
      return { success: true, embeddingCount: embeddings.length };
    } catch (error) {
      logger.error('Failed to store embeddings in vector database', {
        documentId,
        error: error.message,
        stack: error.stack,
      });
      
      return { success: false, error: error.message };
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
    };
  }
}

module.exports = Indexer;

