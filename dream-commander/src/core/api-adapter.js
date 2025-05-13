/**
 * Dream Commander - API Adapter
 * 
 * Core API adapter for the Dream Commander system, allowing direct
 * interaction with the message processing pipeline from the CLI or API.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/default.json').dreamCommander;

// Initialize firebase admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class ApiAdapter {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the API adapter
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing Dream Commander API Adapter...');
    
    try {
      // Ensure collections exist
      const collections = [
        'dream_commander_messages',
        'dream_commander_tasks',
        'dream_commander_workflows',
        'dream_commander_requirements'
      ];
      
      // Check and create collections if needed
      for (const collection of collections) {
        const snapshot = await db.collection(collection).limit(1).get();
        console.log(`Collection ${collection} ${snapshot.empty ? 'created' : 'exists'}`);
      }
      
      this.initialized = true;
      console.log('Dream Commander API Adapter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize API Adapter:', error.message);
      throw error;
    }
  }

  /**
   * Submit a message to Dream Commander
   * @param {Object} message - Message object
   * @param {Object} options - Submission options
   * @returns {Object} - Submission result
   */
  async submitMessage(message, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Create normalized message
      const normalizedMessage = this.normalizeMessage(message, options);
      
      // Store in Firestore
      await db.collection('dream_commander_messages').doc(normalizedMessage.id).set(normalizedMessage);
      
      console.log(`Message ${normalizedMessage.id} submitted successfully`);
      
      return {
        success: true,
        messageId: normalizedMessage.id,
        timestamp: normalizedMessage.timestamp
      };
    } catch (error) {
      console.error('Error submitting message:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalize message format
   * @param {Object} message - Input message
   * @param {Object} options - Submission options
   * @returns {Object} - Normalized message
   */
  normalizeMessage(message, options) {
    const now = new Date().toISOString();
    const messageId = options.messageId || message.id || uuidv4();
    
    // Set channel based on options or default to API
    const channel = options.channel || 'api';
    
    // Create base message structure
    const normalizedMessage = {
      id: messageId,
      channel: channel,
      timestamp: now,
      status: 'received',
      processingPath: ['received'],
      metadata: {
        ...message.metadata,
        submittedVia: 'cli',
        submittedBy: options.user || process.env.USER || 'unknown'
      }
    };
    
    // Handle content based on channel
    switch (channel) {
      case 'api':
        normalizedMessage.content = typeof message.content === 'string' 
          ? message.content 
          : message.content || 'Empty message';
        break;
        
      case 'email':
        normalizedMessage.content = {
          subject: message.subject || options.subject || 'No Subject',
          body: message.content || message.body || 'Empty email body'
        };
        break;
        
      case 'sms':
        normalizedMessage.content = {
          text: message.content || message.text || 'Empty SMS message',
          from: message.from || options.from || 'unknown'
        };
        break;
        
      default:
        normalizedMessage.content = message.content || 'Empty message';
    }
    
    // Set sender information
    normalizedMessage.sender = message.sender || {
      type: 'cli',
      user: options.user || process.env.USER || 'unknown'
    };
    
    return normalizedMessage;
  }

  /**
   * Get message by ID
   * @param {string} messageId - Message ID
   * @returns {Object} - Message object
   */
  async getMessage(messageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const messageDoc = await db.collection('dream_commander_messages').doc(messageId).get();
      
      if (!messageDoc.exists) {
        throw new Error(`Message ${messageId} not found`);
      }
      
      return messageDoc.data();
    } catch (error) {
      console.error(`Error getting message ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get recent messages
   * @param {Object} options - Query options
   * @returns {Array} - Messages
   */
  async getRecentMessages(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const {
        limit = 10,
        channel,
        status,
        startDate,
        endDate,
        sort = 'desc'
      } = options;
      
      // Build query
      let query = db.collection('dream_commander_messages')
        .orderBy('timestamp', sort)
        .limit(parseInt(limit));
      
      // Apply filters
      if (channel) {
        query = query.where('channel', '==', channel);
      }
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (startDate) {
        query = query.where('timestamp', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('timestamp', '<=', endDate);
      }
      
      // Execute query
      const snapshot = await query.get();
      
      // Parse results
      const messages = [];
      snapshot.forEach(doc => {
        messages.push(doc.data());
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting recent messages:', error.message);
      throw error;
    }
  }

  /**
   * Get message statistics
   * @param {Object} options - Query options
   * @returns {Object} - Statistics
   */
  async getMessageStats(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const {
        period = 'day',
        channel,
        startDate,
        endDate
      } = options;
      
      // Calculate date range
      const now = new Date();
      let queryStartDate;
      let queryEndDate = now.toISOString();
      
      if (startDate && endDate) {
        queryStartDate = startDate;
        queryEndDate = endDate;
      } else {
        // Calculate based on period
        switch (period) {
          case 'hour':
            queryStartDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            break;
          case 'day':
            queryStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'week':
            queryStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'month':
            queryStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
          default:
            queryStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
        }
      }
      
      // Build query
      let query = db.collection('dream_commander_messages')
        .where('timestamp', '>=', queryStartDate)
        .where('timestamp', '<=', queryEndDate);
      
      // Apply channel filter if provided
      if (channel) {
        query = query.where('channel', '==', channel);
      }
      
      // Execute query
      const snapshot = await query.get();
      
      // Aggregate stats
      const stats = {
        total: snapshot.size,
        byChannel: {},
        byStatus: {},
        byDay: {},
        avgProcessingTime: 0
      };
      
      // Calculate statistics
      let totalProcessingTime = 0;
      let processedCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Count by channel
        if (!stats.byChannel[data.channel]) {
          stats.byChannel[data.channel] = 0;
        }
        stats.byChannel[data.channel]++;
        
        // Count by status
        if (!stats.byStatus[data.status]) {
          stats.byStatus[data.status] = 0;
        }
        stats.byStatus[data.status]++;
        
        // Count by day
        const day = data.timestamp.split('T')[0];
        if (!stats.byDay[day]) {
          stats.byDay[day] = 0;
        }
        stats.byDay[day]++;
        
        // Calculate processing time for completed messages
        if (data.status === 'completed' && data.completedAt) {
          const start = new Date(data.timestamp);
          const end = new Date(data.completedAt);
          const processingTime = end - start;
          
          totalProcessingTime += processingTime;
          processedCount++;
        }
      });
      
      // Calculate average processing time
      if (processedCount > 0) {
        stats.avgProcessingTime = Math.round(totalProcessingTime / processedCount);
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting message statistics:', error.message);
      throw error;
    }
  }

  /**
   * Get system configuration
   * @returns {Object} - Configuration
   */
  async getConfiguration() {
    try {
      // Try to get configuration from Firestore
      const configDoc = await db.collection('dream_commander_config').doc('system').get();
      
      if (!configDoc.exists) {
        // Return default configuration
        return config;
      }
      
      return configDoc.data();
    } catch (error) {
      console.error('Error getting configuration:', error.message);
      // Return default configuration on error
      return config;
    }
  }

  /**
   * Update system configuration
   * @param {Object} newConfig - New configuration
   * @returns {Object} - Update result
   */
  async updateConfiguration(newConfig) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get current configuration
      const configDoc = await db.collection('dream_commander_config').doc('system').get();
      const currentConfig = configDoc.exists ? configDoc.data() : config;
      
      // Merge configurations
      const mergedConfig = this.mergeConfigurations(currentConfig, newConfig);
      
      // Save to Firestore
      await db.collection('dream_commander_config').doc('system').set(mergedConfig);
      
      return {
        success: true,
        message: 'Configuration updated successfully'
      };
    } catch (error) {
      console.error('Error updating configuration:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Merge configurations recursively
   * @param {Object} target - Target configuration
   * @param {Object} source - Source configuration
   * @returns {Object} - Merged configuration
   */
  mergeConfigurations(target, source) {
    const output = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = this.mergeConfigurations(output[key] || {}, value);
      } else {
        output[key] = value;
      }
    }
    
    return output;
  }
}

module.exports = new ApiAdapter();