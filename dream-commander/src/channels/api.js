/**
 * Dream Commander - API Channel
 *
 * API channel implementation for handling incoming requests
 * through REST endpoints. Supports high-volume message ingestion
 * with rate limiting and authentication.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const messageProcessor = require('../core/message-processor');
const config = require('../../config/default.json').dreamCommander;

class ApiChannel {
  constructor() {
    this.initialized = false;
    this.app = express();
    this.port = config.channels.api.port || 3040;
    this.stats = {
      received: 0,
      errors: 0,
      rateLimited: 0,
    };
  }

  /**
   * Initialize the API channel
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing Dream Commander API Channel...');

    try {
      // Initialize message processor
      await messageProcessor.initialize();

      // Configure middleware
      this.configureMiddleware();

      // Set up routes
      this.setupRoutes();

      // Start server
      this.startServer();

      this.initialized = true;
      console.log(`Dream Commander API Channel initialized on port ${this.port}`);
    } catch (error) {
      console.error('Failed to initialize API Channel:', error.message);
      throw error;
    }
  }

  /**
   * Configure Express middleware
   */
  configureMiddleware() {
    // JSON body parser
    this.app.use(
      bodyParser.json({
        limit: config.channels.api.maxRequestSize || '10mb',
      })
    );

    // Rate limiters
    const standardLimiter = rateLimit({
      windowMs: config.channels.api.rateLimits.standard.windowMs,
      max: config.channels.api.rateLimits.standard.max,
      standardHeaders: true,
      keyGenerator: (req) => {
        return req.headers['x-api-key'] || req.ip;
      },
      handler: (req, res) => {
        this.stats.rateLimited++;
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(config.channels.api.rateLimits.standard.windowMs / 1000),
        });
      },
    });

    const premiumLimiter = rateLimit({
      windowMs: config.channels.api.rateLimits.premium.windowMs,
      max: config.channels.api.rateLimits.premium.max,
      standardHeaders: true,
      keyGenerator: (req) => {
        return req.headers['x-api-key'] || req.ip;
      },
      handler: (req, res) => {
        this.stats.rateLimited++;
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(config.channels.api.rateLimits.premium.windowMs / 1000),
        });
      },
    });

    // Apply standard rate limiter to all routes
    this.app.use(standardLimiter);

    // Apply premium rate limiter to premium routes
    this.app.use('/api/v1/premium', this.authenticatePremium.bind(this), premiumLimiter);

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, X-API-Key, Authorization'
      );

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }

      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[API] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * Set up API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Stats endpoint
    this.app.get('/stats', (req, res) => {
      res.json({
        ...this.stats,
        processorStats: messageProcessor.getStats(),
      });
    });

    // Message submission endpoint
    this.app.post('/api/v1/message', this.authenticateRequest.bind(this), async (req, res) => {
      try {
        const result = await this.handleMessage(req.body, req.headers['x-api-key']);
        res.json(result);
      } catch (error) {
        console.error('Error handling message:', error.message);
        this.stats.errors++;
        res.status(500).json({ error: error.message });
      }
    });

    // Premium message submission (higher limits, priority processing)
    this.app.post(
      '/api/v1/premium/message',
      this.authenticatePremium.bind(this),
      async (req, res) => {
        try {
          const result = await this.handleMessage(req.body, req.headers['x-api-key'], true);
          res.json(result);
        } catch (error) {
          console.error('Error handling premium message:', error.message);
          this.stats.errors++;
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Batch submission endpoint
    this.app.post(
      '/api/v1/messages/batch',
      this.authenticateRequest.bind(this),
      async (req, res) => {
        try {
          if (!Array.isArray(req.body)) {
            throw new Error('Batch submission requires an array of messages');
          }

          const results = await Promise.all(
            req.body.map((message) => this.handleMessage(message, req.headers['x-api-key']))
          );

          res.json(results);
        } catch (error) {
          console.error('Error handling batch messages:', error.message);
          this.stats.errors++;
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Webhook configuration endpoint
    this.app.post('/api/v1/webhooks', this.authenticateRequest.bind(this), (req, res) => {
      const { url, events, secret } = req.body;

      if (!url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Invalid webhook configuration' });
      }

      // TODO: Store webhook configuration in database

      res.json({
        status: 'success',
        message: 'Webhook configured successfully',
        webhookId: uuidv4(),
      });
    });

    // Catch-all for undefined routes
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('API Error:', err);
      this.stats.errors++;
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }

  /**
   * Start the API server
   */
  startServer() {
    this.server = this.app.listen(this.port, () => {
      console.log(`Dream Commander API Channel listening on port ${this.port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Handle incoming message
   * @param {Object} data - Message data
   * @param {string} apiKey - API key from request
   * @param {boolean} isPremium - Whether this is a premium request
   * @returns {Object} - Processing result
   */
  async handleMessage(data, apiKey, isPremium = false) {
    this.stats.received++;

    // Validate message data
    if (!data.content) {
      throw new Error('Message content is required');
    }

    // Create normalized message object
    const message = {
      id: data.id || uuidv4(),
      channel: 'api',
      content: data.content,
      timestamp: new Date().toISOString(),
      sender: {
        apiKey,
        ip: data.ip,
        isPremium,
      },
      metadata: {
        ...data.metadata,
        priority: isPremium ? 'high' : data.metadata?.priority || 'normal',
      },
    };

    // Submit message to processor
    messageProcessor.emit('message:received', message);

    // Return confirmation
    return {
      status: 'received',
      messageId: message.id,
      timestamp: message.timestamp,
    };
  }

  /**
   * Authenticate API request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  authenticateRequest(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // TODO: Implement proper API key validation against database
    // Simple example implementation:
    if (apiKey.length < 10) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
  }

  /**
   * Authenticate premium API request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  authenticatePremium(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // TODO: Implement proper premium API key validation against database
    // Simple example implementation:
    if (apiKey.length < 20) {
      return res.status(403).json({ error: 'Premium access required' });
    }

    next();
  }

  /**
   * Gracefully shutdown the server
   */
  shutdown() {
    console.log('Shutting down API server...');

    if (this.server) {
      this.server.close(() => {
        console.log('API server closed');
      });
    }
  }

  /**
   * Get current API channel statistics
   * @returns {Object} - Channel statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset API channel statistics
   */
  resetStats() {
    this.stats = {
      received: 0,
      errors: 0,
      rateLimited: 0,
    };
  }
}

module.exports = new ApiChannel();
