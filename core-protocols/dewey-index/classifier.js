/**
 * Dewey Digital Index - Document Classifier
 * 
 * Handles document classification for the Dewey Digital Index system.
 * Manages taxonomies, performs automatic classification, and handles
 * category hierarchies and tag management.
 * 
 * @module core-protocols/dewey-index/classifier
 */

const { performance } = require('perf_hooks');
const winston = require('winston');
const crypto = require('crypto');

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
    new winston.transports.File({ filename: 'logs/dewey-classifier-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/dewey-classifier.log' }),
  ],
});

/**
 * Document Classifier class
 * 
 * Classifies documents according to defined taxonomies.
 */
class Classifier {
  /**
   * Create a new Classifier instance
   * 
   * @param {Object} config - Configuration options
   * @param {Object} config.fms - Flight Memory System instance
   * @param {Object} config.vectorDB - Vector database instance
   * @param {Object} config.classificationOptions - Classification options
   * @param {number} config.classificationOptions.minConfidence - Minimum confidence threshold
   * @param {number} config.classificationOptions.maxCategories - Maximum number of categories to assign
   * @param {boolean} config.classificationOptions.useHierarchy - Whether to use hierarchical classification
   */
  constructor(config = {}) {
    this.fms = config.fms;
    this.vectorDB = config.vectorDB;
    
    // Default classification options
    this.classificationOptions = {
      minConfidence: config.classificationOptions?.minConfidence || 0.7,
      maxCategories: config.classificationOptions?.maxCategories || 5,
      maxTags: config.classificationOptions?.maxTags || 10,
      useHierarchy: config.classificationOptions?.useHierarchy !== false,
      autoTagging: config.classificationOptions?.autoTagging !== false,
    };
    
    // Default taxonomies
    this.taxonomies = {
      default: this._createDefaultTaxonomy(),
    };
    
    // Tag management
    this.tags = {
      global: new Set(),
      byCategory: {},
    };
    
    // Performance metrics
    this.metrics = {
      documentsClassified: 0,
      categoriesAssigned: 0,
      tagsAssigned: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      confidenceDistribution: {
        high: 0,    // 0.8 - 1.0
        medium: 0,  // 0.5 - 0.8
        low: 0,     // < 0.5
      },
      processingErrors: 0,
    };
    
    // Initialize
    this._init();
    
    logger.info('Dewey Classifier initialized', {
      classificationOptions: this.classificationOptions,
      taxonomyCount: Object.keys(this.taxonomies).length,
    });
  }

  /**
   * Initialize the classifier
   * 
   * @private
   */
  async _init() {
    try {
      // Load taxonomies from FMS
      await this._loadTaxonomies();
      
      // Load tags from FMS
      await this._loadTags();
    } catch (error) {
      logger.warn('Failed to initialize classifier from FMS, using defaults', {
        error: error.message,
      });
    }
  }

  /**
   * Process a document
   * 
   * @param {Object} document - Document to classify
   * @param {string} document.content - Document content
   * @param {Object} document.metadata - Document metadata
   * @param {string} document.type - Document type
   * @param {Object} options - Classification options
   * @param {string} options.taxonomy - Taxonomy name to use
   * @param {boolean} options.autoTagging - Whether to perform auto-tagging
   * @returns {Promise<Object>} Classification result
   */
  async process(document, options = {}) {
    const startTime = performance.now();
    
    try {
      logger.info('Classifying document', {
        type: document.type,
        contentLength: document.content?.length,
        options,
      });
      
      // Select taxonomy
      const taxonomyName = options.taxonomy || 'default';
      const taxonomy = this.taxonomies[taxonomyName];
      
      if (!taxonomy) {
        throw new Error(`Taxonomy '${taxonomyName}' not found`);
      }
      
      // Classify document
      const classifications = await this._classifyDocument(document, taxonomy, options);
      
      // Extract tags
      const tags = options.autoTagging !== false && this.classificationOptions.autoTagging
        ? await this._extractTags(document, classifications)
        : [];
      
      // Update metrics
      this.metrics.documentsClassified++;
      this.metrics.categoriesAssigned += classifications.length;
      this.metrics.tagsAssigned += tags.length;
      
      const processingTime = performance.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.documentsClassified;
      
      // Update confidence distribution metrics
      if (classifications.length > 0) {
        const avgConfidence = classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;
        if (avgConfidence >= 0.8) this.metrics.confidenceDistribution.high++;
        else if (avgConfidence >= 0.5) this.metrics.confidenceDistribution.medium++;
        else this.metrics.confidenceDistribution.low++;
      }
      
      logger.info('Document classification completed', {
        processingTime,
        categoryCount: classifications.length,
        tagCount: tags.length,
      });
      
      return {
        categories: classifications,
        tags,
        taxonomyName,
        confidence: classifications.length > 0
          ? classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length
          : 0,
        processingTime,
      };
    } catch (error) {
      logger.error('Document classification failed', {
        error: error.message,
        stack: error.stack,
      });
      
      this.metrics.processingErrors++;
      
      throw new Error(`Classification failed: ${error.message}`);
    }
  }

  /**
   * Classify a document
   * 
   * @param {Object} document - Document to classify
   * @param {Object} taxonomy - Taxonomy to use
   * @param {Object} options - Classification options
   * @returns {Promise<Array>} Classification results
   * @private
   */
  async _classifyDocument(document, taxonomy, options = {}) {
    const { content = '', type = 'text', metadata = {} } = document;
    const minConfidence = options.minConfidence || this.classificationOptions.minConfidence;
    const maxCategories = options.maxCategories || this.classificationOptions.maxCategories;
    const useHierarchy = options.useHierarchy !== undefined 
      ? options.useHierarchy 
      : this.classificationOptions.useHierarchy;
    
    // Extract features from document
    const features = this._extractFeatures(content, type);
    
    // Match features against taxonomy categories
    const matches = [];
    
    // Iterate through categories
    for (const category of taxonomy.categories) {
      // Calculate confidence score
      const confidence = this._calculateConfidence(features, category);
      
      if (confidence >= minConfidence) {
        matches.push({
          categoryId: category.id,
          categoryName: category.name,
          path: category.path,
          confidence,
        });
      }
      
      // Process child categories if using hierarchy
      if (useHierarchy && category.children) {
        for (const childCategory of category.children) {
          // For child categories, consider the parent's match as well
          const childConfidence = this._calculateConfidence(features, childCategory);
          
          // Apply hierarchical boost: if parent matches well, boost child confidence
          const hierarchyBoost = confidence > minConfidence ? 0.1 : 0;
          const adjustedConfidence = childConfidence + hierarchyBoost;
          
          if (adjustedConfidence >= minConfidence) {
            matches.push({
              categoryId: childCategory.id,
              categoryName: childCategory.name,
              path: childCategory.path,
              confidence: adjustedConfidence,
            });
          }
        }
      }
    }
    
    // Sort by confidence (descending) and limit to max categories
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxCategories);
  }

  /**
   * Extract tags from document
   * 
   * @param {Object} document - Document to extract tags from
   * @param {Array} classifications - Classification results
   * @returns {Promise<Array>} Extracted tags
   * @private
   */
  async _extractTags(document, classifications) {
    const { content = '', type = 'text', metadata = {} } = document;
    const maxTags = this.classificationOptions.maxTags;
    
    // Extract candidate tags from content
    const candidateTags = this._extractCandidateTags(content, type);
    
    // Get related tags from classifications
    const relatedTags = new Set();
    for (const classification of classifications) {
      const categoryId = classification.categoryId;
      const categoryTags = this.tags.byCategory[categoryId] || [];
      
      for (const tag of categoryTags) {
        relatedTags.add(tag);
      }
    }
    
    // Combine candidates with related tags
    const tagScores = {};
    
    // Score candidate tags
    for (const tag of candidateTags) {
      // Base score for extracted tags
      tagScores[tag.text] = tag.score;
    }
    
    // Boost scores for related tags
    for (const tag of relatedTags) {
      if (tagScores[tag]) {
        // Boost existing tag
        tagScores[tag] += 0.2;
      } else {
        // Add related tag with base score
        tagScores[tag] = 0.5;
      }
    }
    
    // Sort by score and convert to tag objects
    return Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTags)
      .map(([text, score]) => ({
        text,
        confidence: score,
      }));
  }

  /**
   * Extract candidate tags from content
   * 
   * @param {string} content - Document content
   * @param {string} type - Document type
   * @returns {Array} Candidate tags
   * @private
   */
  _extractCandidateTags(content, type) {
    // In a real implementation, this would use NLP techniques
    // For now, use a simple keyword extraction approach
    
    // Simple stopwords list
    const stopwords = new Set([
      'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with',
      'by', 'about', 'as', 'of', 'from', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'this', 'that', 'these', 'those',
    ]);
    
    // Extract words and normalize
    let words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word));
    
    // Count word frequencies
    const wordCounts = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Extract multi-word phrases for more meaningful tags
    const phrases = this._extractPhrases(content);
    for (const phrase of phrases) {
      if (phrase.length > 0) {
        wordCounts[phrase] = (wordCounts[phrase] || 0) + 2; // Boost phrases
      }
    }
    
    // Convert to candidate tags with scores
    const candidates = Object.entries(wordCounts)
      .map(([text, count]) => ({
        text,
        score: count / words.length,
      }))
      .filter(tag => tag.score > 0.01) // Filter low-score tags
      .sort((a, b) => b.score - a.score);
    
    return candidates;
  }

  /**
   * Extract multi-word phrases from content
   * 
   * @param {string} content - Document content
   * @returns {Array} Extracted phrases
   * @private
   */
  _extractPhrases(content) {
    // Simple noun phrase extraction (pairs of adjective+noun or noun+noun)
    const phrases = [];
    
    // Use regex to find potential noun phrases
    // This is a simplified approach; a real implementation would use NLP
    const phraseMatches = content.match(/\b[A-Z][a-z]{1,15} [A-Z]?[a-z]{1,15}\b/g) || [];
    
    return phraseMatches.map(phrase => phrase.toLowerCase());
  }

  /**
   * Extract features from document content
   * 
   * @param {string} content - Document content
   * @param {string} type - Document type
   * @returns {Object} Extracted features
   * @private
   */
  _extractFeatures(content, type) {
    // In a real implementation, this would use more sophisticated NLP
    // For now, use a simple bag-of-words approach
    
    // Simple stopwords list
    const stopwords = new Set([
      'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with',
      'by', 'about', 'as', 'of', 'from', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'this', 'that', 'these', 'those',
    ]);
    
    // Extract words and normalize
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word));
    
    // Count word frequencies and normalize
    const wordCounts = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Create document feature vector
    const features = {
      wordCounts,
      wordFrequencies: {},
      topWords: [],
    };
    
    // Calculate word frequencies
    for (const [word, count] of Object.entries(wordCounts)) {
      features.wordFrequencies[word] = count / words.length;
    }
    
    // Extract top words
    features.topWords = Object.entries(features.wordFrequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
    
    return features;
  }

  /**
   * Calculate confidence score for category match
   * 
   * @param {Object} features - Document features
   * @param {Object} category - Taxonomy category
   * @returns {number} Confidence score (0-1)
   * @private
   */
  _calculateConfidence(features, category) {
    // In a real implementation, this would use more sophisticated algorithms
    // For now, use a simple vector similarity approach
    
    if (!category.features || !category.features.topWords) {
      return 0;
    }
    
    // Calculate overlap between document top words and category keywords
    const categoryWords = new Set(category.features.topWords);
    let matchCount = 0;
    
    for (const word of features.topWords) {
      if (categoryWords.has(word)) {
        matchCount++;
      }
    }
    
    // Calculate Jaccard similarity
    const union = new Set([...features.topWords, ...category.features.topWords]);
    const similarity = matchCount / union.size;
    
    // Apply category weights
    return similarity * (category.weight || 1.0);
  }

  /**
   * Create default taxonomy
   * 
   * @returns {Object} Default taxonomy
   * @private
   */
  _createDefaultTaxonomy() {
    return {
      id: 'default',
      name: 'Default Taxonomy',
      description: 'Default general-purpose taxonomy',
      categories: [
        {
          id: 'technology',
          name: 'Technology',
          path: '/technology',
          weight: 1.0,
          features: {
            topWords: [
              'software', 'hardware', 'technology', 'computer', 'digital',
              'data', 'system', 'network', 'internet', 'application',
              'device', 'cloud', 'algorithm', 'interface', 'programming',
            ],
          },
          children: [
            {
              id: 'technology.software',
              name: 'Software',
              path: '/technology/software',
              weight: 1.0,
              features: {
                topWords: [
                  'software', 'application', 'programming', 'code', 'development',
                  'algorithm', 'function', 'library', 'framework', 'api',
                  'interface', 'compiler', 'language', 'script', 'runtime',
                ],
              },
            },
            {
              id: 'technology.hardware',
              name: 'Hardware',
              path: '/technology/hardware',
              weight: 1.0,
              features: {
                topWords: [
                  'hardware', 'device', 'processor', 'memory', 'storage',
                  'computer', 'server', 'network', 'circuit', 'electronics',
                  'peripheral', 'chip', 'cpu', 'gpu', 'motherboard',
                ],
              },
            },
            {
              id: 'technology.ai',
              name: 'Artificial Intelligence',
              path: '/technology/ai',
              weight: 1.0,
              features: {
                topWords: [
                  'artificial', 'intelligence', 'machine', 'learning', 'neural',
                  'network', 'deep', 'model', 'algorithm', 'training',
                  'prediction', 'classification', 'recognition', 'computer', 'vision',
                ],
              },
            },
          ],
        },
        {
          id: 'business',
          name: 'Business',
          path: '/business',
          weight: 1.0,
          features: {
            topWords: [
              'business', 'company', 'market', 'management', 'strategy',
              'enterprise', 'organization', 'corporate', 'investment', 'financial',
              'commercial', 'product', 'service', 'customer', 'revenue',
            ],
          },
          children: [
            {
              id: 'business.finance',
              name: 'Finance',
              path: '/business/finance',
              weight: 1.0,
              features: {
                topWords: [
                  'finance', 'investment', 'financial', 'market', 'stock',
                  'asset', 'capital', 'fund', 'banking', 'trading',
                  'currency', 'economy', 'portfolio', 'wealth', 'transaction',
                ],
              },
            },
            {
              id: 'business.marketing',
              name: 'Marketing',
              path: '/business/marketing',
              weight: 1.0,
              features: {
                topWords: [
                  'marketing', 'brand', 'customer', 'product', 'advertising',
                  'campaign', 'consumer', 'market', 'sales', 'promotion',
                  'strategy', 'digital', 'social', 'content', 'audience',
                ],
              },
            },
          ],
        },
        {
          id: 'science',
          name: 'Science',
          path: '/science',
          weight: 1.0,
          features: {
            topWords: [
              'science', 'research', 'scientific', 'study', 'experiment',
              'theory', 'analysis', 'data', 'discovery', 'observation',
              'laboratory', 'investigation', 'method', 'evidence', 'hypothesis',
            ],
          },
          children: [
            {
              id: 'science.physics',
              name: 'Physics',
              path: '/science/physics',
              weight: 1.0,
              features: {
                topWords: [
                  'physics', 'energy', 'force', 'quantum', 'particle',
                  'matter', 'theory', 'relativity', 'mechanics', 'motion',
                  'field', 'wave', 'electromagnetic', 'universe', 'atomic',
                ],
              },
            },
            {
              id: 'science.biology',
              name: 'Biology',
              path: '/science/biology',
              weight: 1.0,
              features: {
                topWords: [
                  'biology', 'cell', 'organism', 'genetic', 'evolution',
                  'species', 'molecular', 'dna', 'protein', 'ecology',
                  'system', 'structure', 'function', 'tissue', 'biological',
                ],
              },
            },
          ],
        },
      ],
      version: '1.0',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Load taxonomies from FMS
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _loadTaxonomies() {
    try {
      logger.info('Loading taxonomies from FMS');
      
      const result = await this.fms.retrieveMemory({
        type: 'dewey-taxonomies',
        key: 'all-taxonomies',
      });
      
      if (result && result.data) {
        this.taxonomies = result.data;
        logger.info('Taxonomies loaded successfully', {
          count: Object.keys(this.taxonomies).length,
        });
      } else {
        logger.info('No taxonomies found in FMS, using defaults');
      }
    } catch (error) {
      logger.warn('Failed to load taxonomies from FMS', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Load tags from FMS
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _loadTags() {
    try {
      logger.info('Loading tags from FMS');
      
      const result = await this.fms.retrieveMemory({
        type: 'dewey-tags',
        key: 'all-tags',
      });
      
      if (result && result.data) {
        this.tags = result.data;
        logger.info('Tags loaded successfully', {
          globalCount: this.tags.global.size,
          categoryCount: Object.keys(this.tags.byCategory).length,
        });
      } else {
        logger.info('No tags found in FMS, using defaults');
      }
    } catch (error) {
      logger.warn('Failed to load tags from FMS', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Save taxonomies to FMS
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _saveTaxonomies() {
    try {
      logger.info('Saving taxonomies to FMS');
      
      await this.fms.storeMemory({
        type: 'dewey-taxonomies',
        key: 'all-taxonomies',
        data: this.taxonomies,
      });
      
      logger.info('Taxonomies saved successfully');
    } catch (error) {
      logger.error('Failed to save taxonomies to FMS', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Save tags to FMS
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _saveTags() {
    try {
      logger.info('Saving tags to FMS');
      
      await this.fms.storeMemory({
        type: 'dewey-tags',
        key: 'all-tags',
        data: this.tags,
      });
      
      logger.info('Tags saved successfully');
    } catch (error) {
      logger.error('Failed to save tags to FMS', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get a taxonomy
   * 
   * @param {string} taxonomyId - Taxonomy ID
   * @returns {Object} Taxonomy
   */
  getTaxonomy(taxonomyId = 'default') {
    return this.taxonomies[taxonomyId];
  }

  /**
   * Create a new taxonomy
   * 
   * @param {Object} taxonomy - Taxonomy definition
   * @returns {Promise<Object>} Created taxonomy
   */
  async createTaxonomy(taxonomy) {
    if (!taxonomy.id) {
      throw new Error('Taxonomy ID is required');
    }
    
    if (this.taxonomies[taxonomy.id]) {
      throw new Error(`Taxonomy with ID '${taxonomy.id}' already exists`);
    }
    
    // Add metadata
    const newTaxonomy = {
      ...taxonomy,
      version: '1.0',
      createdAt: new Date().toISOString(),
    };
    
    // Store taxonomy
    this.taxonomies[taxonomy.id] = newTaxonomy;
    
    // Save to FMS
    await this._saveTaxonomies();
    
    logger.info('New taxonomy created', {
      taxonomyId: taxonomy.id,
      name: taxonomy.name,
    });
    
    return newTaxonomy;
  }

  /**
   * Update a taxonomy
   * 
   * @param {string} taxonomyId - Taxonomy ID
   * @param {Object} updates - Taxonomy updates
   * @returns {Promise<Object>} Updated taxonomy
   */
  async updateTaxonomy(taxonomyId, updates) {
    const taxonomy = this.taxonomies[taxonomyId];
    
    if (!taxonomy) {
      throw new Error(`Taxonomy with ID '${taxonomyId}' not found`);
    }
    
    // Update taxonomy
    const updatedTaxonomy = {
      ...taxonomy,
      ...updates,
      version: parseFloat(taxonomy.version || '1.0') + 0.1,
      updatedAt: new Date().toISOString(),
    };
    
    // Store updated taxonomy
    this.taxonomies[taxonomyId] = updatedTaxonomy;
    
    // Save to FMS
    await this._saveTaxonomies();
    
    logger.info('Taxonomy updated', {
      taxonomyId,
      newVersion: updatedTaxonomy.version,
    });
    
    return updatedTaxonomy;
  }

  /**
   * Delete a taxonomy
   * 
   * @param {string} taxonomyId - Taxonomy ID
   * @returns {Promise<boolean>} Success
   */
  async deleteTaxonomy(taxonomyId) {
    if (taxonomyId === 'default') {
      throw new Error('Cannot delete the default taxonomy');
    }
    
    if (!this.taxonomies[taxonomyId]) {
      throw new Error(`Taxonomy with ID '${taxonomyId}' not found`);
    }
    
    // Delete taxonomy
    delete this.taxonomies[taxonomyId];
    
    // Save to FMS
    await this._saveTaxonomies();
    
    logger.info('Taxonomy deleted', { taxonomyId });
    
    return true;
  }

  /**
   * Add a category to a taxonomy
   * 
   * @param {string} taxonomyId - Taxonomy ID
   * @param {Object} category - Category definition
   * @param {string} parentId - Parent category ID (optional)
   * @returns {Promise<Object>} Updated taxonomy
   */
  async addCategory(taxonomyId, category, parentId = null) {
    const taxonomy = this.taxonomies[taxonomyId];
    
    if (!taxonomy) {
      throw new Error(`Taxonomy with ID '${taxonomyId}' not found`);
    }
    
    if (!category.id) {
      throw new Error('Category ID is required');
    }
    
    // Set path based on parent
    if (parentId) {
      const parent = this._findCategory(taxonomy.categories, parentId);
      
      if (!parent) {
        throw new Error(`Parent category with ID '${parentId}' not found`);
      }
      
      // Set path
      category.path = `${parent.path}/${category.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Add to parent's children
      parent.children = parent.children || [];
      parent.children.push(category);
    } else {
      // Top-level category
      category.path = `/${category.name.toLowerCase().replace(/\s+/g, '-')}`;
      taxonomy.categories.push(category);
    }
    
    // Update version
    taxonomy.version = parseFloat(taxonomy.version || '1.0') + 0.1;
    taxonomy.updatedAt = new Date().toISOString();
    
    // Save to FMS
    await this._saveTaxonomies();
    
    logger.info('Category added to taxonomy', {
      taxonomyId,
      categoryId: category.id,
      path: category.path,
    });
    
    return taxonomy;
  }

  /**
   * Find a category in a taxonomy
   * 
   * @param {Array} categories - Categories to search
   

