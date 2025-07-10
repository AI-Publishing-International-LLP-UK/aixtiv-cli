/**
 * Claude API Service Module
 * Provides abstracted API calls to Claude 4 with error handling,
 * exponential backoff retries, and request timeout logic.
 * Designed for RIX, CRX, and Co-Pilot agents in the Aixtiv Symphony ecosystem.
 * 
 * @module ClaudeAPIService
 * @version 1.0.0
 * @license PROPRIETARY
 * @author Aixtiv Symphony
 */

import { Anthropic } from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import winston from 'winston';
import NodeCache from 'node-cache';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Anthropic-specific configuration
dotenv.config({ path: path.join(__dirname, '.env.anthropic') });

/**
 * Configure Winston logger
 */
const logger = winston.createLogger({
  level: process.env.CLAUDE_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'claude-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/claude-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/claude-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
      silent: process.env.CLAUDE_ENABLE_DEBUG_LOGGING !== 'true'
    })
  ]
});

/**
 * Initialize cache for response caching
 */
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CLAUDE_CACHE_TTL_SECONDS) || 300,
  checkperiod: 60,
  useClones: false
});

/**
 * Rate limiting configuration
 */
class RateLimiter {
  constructor() {
    this.requests = [];
    this.maxRequests = parseInt(process.env.CLAUDE_RATE_LIMIT_PER_MINUTE) || 100;
    this.windowMs = 60 * 1000; // 1 minute
    this.burstLimit = parseInt(process.env.CLAUDE_BURST_LIMIT) || 20;
  }

  canMakeRequest() {
    const now = Date.now();
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check rate limits
    return this.requests.length < this.maxRequests;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }
}

/**
 * Main Claude API Service Class
 */
class ClaudeAPIService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: parseInt(process.env.CLAUDE_TIMEOUT_MS) || 30000,
    });

    this.config = {
      model: process.env.CLAUDE_MODEL || 'claude-4',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4096,
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.7,
      maxRetries: parseInt(process.env.CLAUDE_MAX_RETRIES) || 3,
      initialRetryDelay: parseInt(process.env.CLAUDE_INITIAL_RETRY_DELAY_MS) || 1000,
      maxRetryDelay: parseInt(process.env.CLAUDE_MAX_RETRY_DELAY_MS) || 10000,
      retryExponentialBase: parseInt(process.env.CLAUDE_RETRY_EXPONENTIAL_BASE) || 2,
    };

    this.rateLimiter = new RateLimiter();
    this.usageTracker = {
      totalRequests: 0,
      totalTokens: 0,
      errorCount: 0,
      averageResponseTime: 0
    };

    // Agent-specific system prompts
    this.systemPrompts = {
      rix: process.env.RIX_SYSTEM_PROMPT || "You are RIX, a Refined Intelligence Expert specialized in high-quality analysis and decision-making.",
      crx: process.env.CRX_SYSTEM_PROMPT || "You are CRX, a Customer Relations Expert focused on exceptional user experiences and support.",
      copilot: process.env.COPILOT_SYSTEM_PROMPT || "You are a Co-Pilot agent, providing intelligent assistance and collaboration."
    };

    logger.info('Claude API Service initialized', {
      model: this.config.model,
      region: process.env.CLAUDE_REGION || 'us-west1',
      cachingEnabled: process.env.CLAUDE_ENABLE_CACHING === 'true'
    });
  }

  /**
   * Exponential backoff delay calculation
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const delay = this.config.initialRetryDelay * Math.pow(this.config.retryExponentialBase, attempt);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate cache key for request
   * @param {string} method - Method name
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   */
  generateCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`;
  }

  /**
   * Core API request with retry logic and error handling
   * @param {Function} apiCall - The API call function
   * @param {Object} params - Parameters for the API call
   * @param {string} method - Method name for logging
   * @returns {Promise<Object>} API response
   */
  async makeAPIRequest(apiCall, params, method = 'unknown') {
    const startTime = Date.now();
    let lastError;

    // Check rate limiting
    if (!this.rateLimiter.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Check cache if enabled
    if (process.env.CLAUDE_ENABLE_CACHING === 'true') {
      const cacheKey = this.generateCacheKey(method, params);
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { method, cacheKey });
        return cached;
      }
    }

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Record request for rate limiting
        this.rateLimiter.recordRequest();

        logger.debug(`Attempting ${method} (attempt ${attempt + 1}/${this.config.maxRetries})`, params);

        const response = await apiCall();
        
        // Track successful request
        const responseTime = Date.now() - startTime;
        this.usageTracker.totalRequests++;
        this.usageTracker.averageResponseTime = 
          (this.usageTracker.averageResponseTime * (this.usageTracker.totalRequests - 1) + responseTime) / 
          this.usageTracker.totalRequests;

        // Cache response if enabled
        if (process.env.CLAUDE_ENABLE_CACHING === 'true') {
          const cacheKey = this.generateCacheKey(method, params);
          cache.set(cacheKey, response);
        }

        logger.info(`${method} successful`, {
          attempt: attempt + 1,
          responseTime,
          totalRequests: this.usageTracker.totalRequests
        });

        return response;

      } catch (error) {
        lastError = error;
        this.usageTracker.errorCount++;

        logger.warn(`${method} failed on attempt ${attempt + 1}`, {
          error: error.message,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries
        });

        // Don't retry on certain error types
        if (error.status === 401 || error.status === 403 || error.status === 400) {
          logger.error(`Non-retryable error for ${method}`, { error: error.message, status: error.status });
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === this.config.maxRetries - 1) {
          break;
        }

        // Calculate and apply exponential backoff delay
        const delay = this.calculateRetryDelay(attempt);
        logger.debug(`Retrying ${method} after ${delay}ms delay`);
        await this.sleep(delay);
      }
    }

    logger.error(`${method} failed after ${this.config.maxRetries} attempts`, {
      error: lastError.message,
      totalRequests: this.usageTracker.totalRequests,
      errorCount: this.usageTracker.errorCount
    });

    throw lastError;
  }

  /**
   * Send text message to Claude
   * @param {string} message - The message to send
   * @param {Object} options - Additional options
   * @param {string} options.agent - Agent type (rix, crx, copilot)
   * @param {string} options.systemPrompt - Custom system prompt
   * @param {number} options.maxTokens - Maximum tokens for response
   * @param {number} options.temperature - Temperature for response generation
   * @returns {Promise<Object>} Claude response
   */
  async sendText(message, options = {}) {
    const {
      agent = 'copilot',
      systemPrompt = this.systemPrompts[agent] || this.systemPrompts.copilot,
      maxTokens = this.config.maxTokens,
      temperature = this.config.temperature
    } = options;

    const params = {
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    };

    const apiCall = () => this.anthropic.messages.create(params);
    
    return await this.makeAPIRequest(apiCall, params, 'sendText');
  }

  /**
   * Perform code analysis with Claude
   * @param {string} code - Code to analyze
   * @param {Object} options - Analysis options
   * @param {string} options.language - Programming language
   * @param {string} options.analysisType - Type of analysis (review, security, performance, etc.)
   * @param {string} options.agent - Agent type performing analysis
   * @returns {Promise<Object>} Analysis results
   */
  async codeAnalysis(code, options = {}) {
    const {
      language = 'javascript',
      analysisType = 'review',
      agent = 'rix'
    } = options;

    const analysisPrompts = {
      review: `Please perform a comprehensive code review of the following ${language} code. Focus on:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Maintainability and readability
- Security concerns

Code to analyze:
\`\`\`${language}
${code}
\`\`\``,
      
      security: `Please perform a security analysis of the following ${language} code. Focus on:
- Security vulnerabilities
- Input validation issues
- Authentication and authorization
- Data exposure risks
- Injection attack vectors

Code to analyze:
\`\`\`${language}
${code}
\`\`\``,
      
      performance: `Please analyze the performance of the following ${language} code. Focus on:
- Performance bottlenecks
- Memory usage optimization
- Algorithmic efficiency
- Resource utilization
- Scalability considerations

Code to analyze:
\`\`\`${language}
${code}
\`\`\``
    };

    const prompt = analysisPrompts[analysisType] || analysisPrompts.review;
    
    return await this.sendText(prompt, {
      agent,
      systemPrompt: `${this.systemPrompts[agent]} You are performing ${analysisType} analysis of ${language} code. Provide detailed, actionable feedback.`
    });
  }

  /**
   * Process structured task request
   * @param {Object} task - Task definition
   * @param {string} task.type - Task type
   * @param {Object} task.parameters - Task parameters
   * @param {string} task.context - Task context
   * @param {Object} options - Processing options
   * @param {string} options.agent - Agent to handle the task
   * @returns {Promise<Object>} Task results
   */
  async structuredTaskRequest(task, options = {}) {
    const { agent = 'rix' } = options;
    const { type, parameters, context } = task;

    const structuredPrompt = `
Task Type: ${type}
Context: ${context}
Parameters: ${JSON.stringify(parameters, null, 2)}

Please process this structured task and provide a comprehensive response that includes:
1. Task understanding and interpretation
2. Detailed analysis or processing results
3. Actionable recommendations or next steps
4. Any relevant considerations or caveats

Format your response as a structured JSON object with the following schema:
{
  "taskId": "unique_identifier",
  "status": "completed|failed|partial",
  "results": {},
  "analysis": "",
  "recommendations": [],
  "metadata": {
    "processingTime": "",
    "confidence": 0.0,
    "agent": "${agent}"
  }
}`;

    return await this.sendText(structuredPrompt, {
      agent,
      systemPrompt: `${this.systemPrompts[agent]} You are processing structured tasks for the Aixtiv Symphony system. Always respond with valid JSON.`,
      temperature: 0.3 // Lower temperature for more consistent structured responses
    });
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageTracker,
      cacheStats: {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses
      },
      rateLimitStatus: {
        requestsInWindow: this.rateLimiter.requests.length,
        maxRequests: this.rateLimiter.maxRequests,
        canMakeRequest: this.rateLimiter.canMakeRequest()
      }
    };
  }

  /**
   * Health check for the service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const testResponse = await this.sendText('Health check', {
        agent: 'copilot',
        maxTokens: 50
      });
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'claude-api',
        version: '1.0.0',
        region: process.env.CLAUDE_REGION || 'us-west1',
        lastResponse: testResponse ? 'success' : 'failed',
        usageStats: this.getUsageStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'claude-api',
        error: error.message,
        usageStats: this.getUsageStats()
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.flushAll();
    logger.info('Cache cleared');
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    this.usageTracker = {
      totalRequests: 0,
      totalTokens: 0,
      errorCount: 0,
      averageResponseTime: 0
    };
    logger.info('Usage statistics reset');
  }
}

// Export singleton instance
const claudeAPIService = new ClaudeAPIService();

export default claudeAPIService;
export { ClaudeAPIService };
