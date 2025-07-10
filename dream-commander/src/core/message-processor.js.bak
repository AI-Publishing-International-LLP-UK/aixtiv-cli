/**
 * Dream Commander - Message Processor
 *
 * Core message processing pipeline for handling incoming messages
 * from multiple channels and routing them through the classification
 * and routing systems.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const EventEmitter = require('events');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/default.json').dreamCommander;

class MessageProcessor extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.processingStats = {
      processed: 0,
      failed: 0,
      channelCounts: {},
      averageLatency: 0,
    };

    // Initialize Firestore if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    this.db = admin.firestore();
  }

  /**
   * Initialize the message processor
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing Dream Commander Message Processor...');

    try {
      // Load classification and routing modules
      this.classifier = require('../classification/classifier');
      this.router = require('../routing/router');

      // Initialize sub-components
      await this.classifier.initialize();
      await this.router.initialize();

      // Set up event listeners
      this.on('message:received', this.processMessage.bind(this));
      this.on('message:classified', this.routeMessage.bind(this));
      this.on('message:routed', this.finalizeMessage.bind(this));
      this.on('message:error', this.handleError.bind(this));

      this.initialized = true;
      console.log('Dream Commander Message Processor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Message Processor:', error.message);
      throw error;
    }
  }

  /**
   * Process an incoming message
   * @param {Object} message - The normalized message object
   */
  async processMessage(message) {
    // Validate message
    if (!this.validateMessage(message)) {
      this.emit('message:error', new Error('Invalid message format'), message);
      return;
    }

    const startTime = Date.now();
    const messageId = message.id || uuidv4();

    try {
      console.log(`Processing message ${messageId} from channel ${message.channel}`);

      // Add metadata
      const enrichedMessage = {
        ...message,
        id: messageId,
        timestamp: message.timestamp || new Date().toISOString(),
        status: 'processing',
        processingPath: ['received'],
      };

      // Store in database
      await this.storeMessage(enrichedMessage);

      // Update stats
      this.updateStats(enrichedMessage.channel);

      // Send to classification
      this.emit('message:classified', enrichedMessage);

      const endTime = Date.now();
      console.log(`Initial message processing completed in ${endTime - startTime}ms`);
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error.message);
      this.emit('message:error', error, message);
    }
  }

  /**
   * Route a classified message
   * @param {Object} message - The classified message
   */
  async routeMessage(message) {
    try {
      console.log(`Routing message ${message.id} based on classification`);

      // Add routing step to processing path
      message.processingPath.push('classified');
      message.status = 'routing';

      // Update message in database
      await this.updateMessage(message);

      // Call routing system
      const routingResult = await this.router.routeMessage(message);

      // Add routing result to message
      message.routing = routingResult;
      message.processingPath.push('routed');
      message.status = 'routed';

      // Update message in database
      await this.updateMessage(message);

      // Emit routed event
      this.emit('message:routed', message);
    } catch (error) {
      console.error(`Error routing message ${message.id}:`, error.message);
      this.emit('message:error', error, message);
    }
  }

  /**
   * Finalize message processing
   * @param {Object} message - The routed message
   */
  async finalizeMessage(message) {
    try {
      console.log(`Finalizing message ${message.id}`);

      // Mark message as completed
      message.processingPath.push('completed');
      message.status = 'completed';
      message.completedAt = new Date().toISOString();

      // Update message in database
      await this.updateMessage(message);

      console.log(`Message ${message.id} processing completed successfully`);
    } catch (error) {
      console.error(`Error finalizing message ${message.id}:`, error.message);
      this.emit('message:error', error, message);
    }
  }

  /**
   * Handle processing errors
   * @param {Error} error - The error object
   * @param {Object} message - The message being processed
   */
  async handleError(error, message) {
    try {
      console.error(`Error processing message:`, error.message);

      // Update stats
      this.processingStats.failed++;

      if (message && message.id) {
        // Mark message as failed
        message.status = 'failed';
        message.error = {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        };

        // Update message in database
        await this.updateMessage(message);

        console.log(`Message ${message.id} marked as failed`);
      }
    } catch (additionalError) {
      console.error('Error in error handler:', additionalError.message);
    }
  }

  /**
   * Validate message format
   * @param {Object} message - The message to validate
   * @returns {boolean} - Whether the message is valid
   */
  validateMessage(message) {
    // Check required fields
    if (!message) return false;
    if (!message.channel) return false;
    if (!message.content) return false;

    // Validate channel
    const validChannels = ['api', 'email', 'sms', 'linkedin', 'threads'];
    if (!validChannels.includes(message.channel)) return false;

    return true;
  }

  /**
   * Store message in database
   * @param {Object} message - The message to store
   */
  async storeMessage(message) {
    const collection = config.storage.documentDatabase.collections.messages;
    await this.db.collection(collection).doc(message.id).set(message);
  }

  /**
   * Update message in database
   * @param {Object} message - The message to update
   */
  async updateMessage(message) {
    const collection = config.storage.documentDatabase.collections.messages;
    await this.db.collection(collection).doc(message.id).update(message);
  }

  /**
   * Update processing statistics
   * @param {string} channel - The message channel
   */
  updateStats(channel) {
    this.processingStats.processed++;

    // Update channel counts
    if (!this.processingStats.channelCounts[channel]) {
      this.processingStats.channelCounts[channel] = 0;
    }
    this.processingStats.channelCounts[channel]++;
  }

  /**
   * Get current processing statistics
   * @returns {Object} - Processing statistics
   */
  getStats() {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   */
  resetStats() {
    this.processingStats = {
      processed: 0,
      failed: 0,
      channelCounts: {},
      averageLatency: 0,
    };
  }
}

module.exports = new MessageProcessor();
