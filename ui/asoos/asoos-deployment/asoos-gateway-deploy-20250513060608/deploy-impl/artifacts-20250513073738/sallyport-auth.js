/**
 * SallyPort Security Framework Authentication Module
 * 
 * This module implements the SallyPort security framework for passwordless authentication
 * with biometric and challenge-based verification.
 */

const crypto = require('crypto');
const https = require('https');
const winston = require('winston');

class SallyPortAuth {
  /**
   * Initialize the SallyPort authentication module
   * @param {Object} options Configuration options
   * @param {string} options.serviceId Service identifier for SallyPort
   * @param {string} options.apiEndpoint SallyPort API endpoint
   * @param {string} options.apiKey API key for SallyPort (if applicable)
   * @param {Object} options.logger Winston logger instance (optional)
   */
  constructor(options = {}) {
    this.serviceId = options.serviceId || 'asoos-default';
    this.apiEndpoint = options.apiEndpoint || 'https://sallyport.2100.cool/api/v1';
    this.apiKey = options.apiKey;
    
    // Set up logger or use provided logger
    this.logger = options.logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'sallyport-auth' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    // Initialize in-memory store for challenges and sessions
    // In production, this would be a Redis or database store
    this.challenges = new Map();
    this.sessions = new Map();
    
    // Challenge expiration time (5 minutes)
    this.challengeExpiryMs = 5 * 60 * 1000;
    
    // Session expiration time (24 hours)
    this.sessionExpiryMs = 24 * 60 * 60 * 1000;
    
    this.logger.info('SallyPort Authentication module initialized', { 
      serviceId: this.serviceId,
      endpoint: this.apiEndpoint
    });
  }

  /**
   * Create a new authentication challenge
   * @param {string} identifier User identifier (email, username, etc.)
   * @param {Object} deviceInfo Optional device information
   * @returns {Promise<Object>} Challenge object
   */
  async createChallenge(identifier, deviceInfo = {}) {
    this.logger.debug('Creating authentication challenge', { identifier });
    
    try {
      // Generate a unique challenge ID using UUIDv4 or similar
      const challengeId = crypto.randomUUID ? crypto.randomUUID() : 
        `challenge-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Create challenge with expiration (5 minutes)
      const now = new Date();
      const challenge = {
        id: challengeId,
        identifier,
        deviceInfo,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + this.challengeExpiryMs).toISOString(),
        serviceId: this.serviceId,
        verificationAttempts: 0,
        status: 'pending'
      };
      
      // In a real implementation, this would involve an API call to SallyPort
      // For now, we'll store it in memory
      this.challenges.set(challengeId, challenge);
      
      // Set expiration to clean up challenge
      setTimeout(() => {
        const storedChallenge = this.challenges.get(challengeId);
        if (storedChallenge && storedChallenge.status === 'pending') {
          this.challenges.delete(challengeId);
          this.logger.debug('Challenge expired and removed', { challengeId });
        }
      }, this.challengeExpiryMs);
      
      this.logger.info('Authentication challenge created', { 
        challengeId, 
        identifier: this._maskPII(identifier)
      });
      
      return {
        challengeId,
        status: 'pending',
        expiresAt: challenge.expiresAt
      };
    } catch (error) {
      this.logger.error('Error creating challenge', { 
        error: error.message, 
        stack: error.stack 
      });
      throw new Error(`Failed to create authentication challenge: ${error.message}`);
    }
  }

  /**
   * Verify an authentication response for a challenge
   * @param {string} challengeId Challenge ID
   * @param {Object} response Authentication response
   * @param {Object} response.biometricResponse Biometric verification data
   * @param {Object} response.deviceInfo Device information
   * @returns {Promise<Object>} Authentication result with token
   */
  async verifyChallenge(challengeId, response) {
    this.logger.debug('Verifying authentication challenge', { challengeId });
    
    try {
      // Get and validate challenge
      const challenge = this.challenges.get(challengeId);
      if (!challenge) {
        this.logger.warn('Challenge not found or expired', { challengeId });
        throw new Error('Challenge not found or expired');
      }
      
      // Check if challenge has expired
      if (new Date(challenge.expiresAt) < new Date()) {
        this.challenges.delete(challengeId);
        this.logger.warn('Challenge expired', { challengeId });
        throw new Error('Challenge expired');
      }
      
      // Validate the response
      // In a real implementation, this would validate biometrics or other factors
      challenge.verificationAttempts++;
      
      // In a production environment, we would:
      // 1. Call the SallyPort API to validate the biometric response
      // 2. Possibly use a hardware security module for verification
      // 3. Implement additional security checks based on device info
      
      // Generate token and user data
      const token = `sp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const userId = `user-${challenge.identifier.replace(/[^a-zA-Z0-9]/g, '-')}`;
      
      // Create user object (in a real system, this would be fetched from a database)
      // Using a sample user for demonstration
      const user = {
        id: userId,
        name: 'Mr. Phillip Corey Roark',
        email: challenge.identifier,
        role: 'CEO',
        avatar: null,
        lastLogin: new Date().toISOString()
      };
      
      // Create session
      const session = {
        token,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.sessionExpiryMs).toISOString(),
        deviceInfo: { ...challenge.deviceInfo, ...response.deviceInfo },
        challengeId
      };
      
      // Store session
      this.sessions.set(token, session);
      
      // Set session expiration
      setTimeout(() => {
        if (this.sessions.has(token)) {
          this.sessions.delete(token);
          this.logger.debug('Session expired and removed', { token: this._maskToken(token) });
        }
      }, this.sessionExpiryMs);
      
      // Mark challenge as completed
      challenge.status = 'completed';
      challenge.completedAt = new Date().toISOString();
      
      this.logger.info('Authentication successful', { 
        challengeId, 
        userId,
        token: this._maskToken(token)
      });
      
      return {
        success: true,
        token,
        user,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      this.logger.error('Error verifying challenge', { 
        challengeId,
        error: error.message, 
        stack: error.stack 
      });
      throw new Error(`Authentication verification failed: ${error.message}`);
    }
  }

  /**
   * Verify a session token
   * @param {string} token Session token
   * @param {string} userId User ID to validate (optional)
   * @returns {Promise<Object>} Session verification result
   */
  async verifySession(token, userId = null) {
    this.logger.debug('Verifying session', { token: this._maskToken(token) });
    
    try {
      // Get and validate session
      const session = this.sessions.get(token);
      if (!session) {
        this.logger.warn('Session not found or expired', { 
          token: this._maskToken(token)
        });
        return {
          valid: false,
          reason: 'Session not found or expired'
        };
      }
      
      // Check if session has expired
      if (new Date(session.expiresAt) < new Date()) {
        this.sessions.delete(token);
        this.logger.warn('Session expired', { 
          token: this._maskToken(token)
        });
        return {
          valid: false,
          reason: 'Session expired'
        };
      }
      
      // Check if session belongs to user (if provided)
      if (userId && session.userId !== userId) {
        this.logger.warn('Invalid session for user', { 
          token: this._maskToken(token),
          requestUserId: userId,
          sessionUserId: session.userId
        });
        return {
          valid: false,
          reason: 'Invalid session for user'
        };
      }
      
      // Update last activity
      session.lastActivity = new Date().toISOString();
      
      this.logger.debug('Session verified successfully', { 
        token: this._maskToken(token),
        userId: session.userId
      });
      
      return {
        valid: true,
        userId: session.userId,
        expiresAt: session.expiresAt,
        deviceInfo: session.deviceInfo
      };
    } catch (error) {
      this.logger.error('Error verifying session', { 
        token: this._maskToken(token),
        error: error.message, 
        stack: error.stack 
      });
      throw new Error(`Session verification failed: ${error.message}`);
    }
  }

  /**
   * Logout / Invalidate a session
   * @param {string} token Session token
   * @returns {Promise<Object>} Logout result
   */
  async logout(token) {
    this.logger.debug('Logging out session', { token: this._maskToken(token) });
    
    try {
      // Get session for logging
      const session = this.sessions.get(token);
      
      // Delete session
      const deleted = this.sessions.delete(token);
      
      if (session) {
        this.logger.info('Session logged out', { 
          token: this._maskToken(token),
          userId: session.userId
        });
      }
      
      return {
        success: deleted,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error logging out session', { 
        token: this._maskToken(token),
        error: error.message
      });
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Refresh a session token, extending its lifetime
   * @param {string} token Session token
   * @returns {Promise<Object>} Refresh result with new token
   */
  async refreshSession(token) {
    this.logger.debug('Refreshing session', { token: this._maskToken(token) });
    
    try {
      // Get and validate session
      const session = this.sessions.get(token);
      if (!session) {
        this.logger.warn('Session not found for refresh', { 
          token: this._maskToken(token)
        });
        throw new Error('Session not found or expired');
      }
      
      // Check if session has expired
      if (new Date(session.expiresAt) < new Date()) {
        this.sessions.delete(token);
        this.logger.warn('Attempt to refresh expired session', { 
          token: this._maskToken(token)
        });
        throw new Error('Session expired');
      }
      
      // Generate new token
      const newToken = `sp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Create new session with extended expiration
      const newSession = {
        ...session,
        token: newToken,
        previousToken: token,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.sessionExpiryMs).toISOString(),
        refreshedAt: new Date().toISOString()
      };
      
      // Store new session and remove old one
      this.sessions.set(newToken, newSession);
      this.sessions.delete(token);
      
      // Set new session expiration
      setTimeout(() => {
        if (this.sessions.has(newToken)) {
          this.sessions.delete(newToken);
          this.logger.debug('Refreshed session expired and removed', { 
            token: this._maskToken(newToken)
          });
        }
      }, this.sessionExpiryMs);
      
      this.logger.info('Session refreshed successfully', { 
        oldToken: this._maskToken(token),
        newToken: this._maskToken(newToken),
        userId: session.userId
      });
      
      return {
        success: true,
        token: newToken,
        expiresAt: newSession.expiresAt
      };
    } catch (error) {
      this.logger.error('Error refreshing session', { 
        token: this._maskToken(token),
        error: error.message, 
        stack: error.stack 
      });
      throw new Error(`Session refresh failed: ${error.message}`);
    }
  }

  /**
   * Make a secure request to the SallyPort API
   * @param {string} endpoint API endpoint path
   * @param {string} method HTTP method
   * @param {Object} data Request data
   * @returns {Promise<Object>} API response data
   * @private
   */
  async _makeApiRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.apiEndpoint}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': `SallyPort-SDK/1.0 (Node.js/${process.version})`,
          'X-Service-ID': this.serviceId
        }
      };
      
      if (this.apiKey) {
        options.headers['X-API-Key'] = this.apiKey;
      }
      
      const req = https.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(responseData);
              resolve(parsedData);
            } catch (e) {
              reject(new Error(`Failed to parse response: ${e.message}`));
            }
          } else {
            let errorMessage = `API request failed with status ${res.statusCode}`;
            try {
              const errorData = JSON.parse(responseData);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              // Use default error message
            }
            reject(new Error(errorMessage));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * Mask personally identifiable information (PII) for logging
   * @param {string} value Value to mask
   * @returns {string} Masked value
   * @private
   */
  _maskPII(value) {
    if (!value) return value;
    
    // Mask email addresses
    if (value.includes('@')) {
      const [username, domain] = value.split('@');
      return `${username.substring(0, 3)}***@${domain}`;
    }
    
    // Mask other values
    if (value.length > 6) {
      return `${value.substring(0, 3)}***${value.substring(value.length - 3)}`;
    }
    
    return '***';
  }

  /**
   * Mask token for logging
   * @param {string} token Token to mask
   * @returns {string} Masked token
   * @private
   */
  _maskToken(token) {
    if (!token) return token;
    
    if (token.length > 10) {
      return `${token.substring(0, 5)}***${token.substring(token.length - 5)}`;
    }
    
    return '***';
  }
}

module.exports = SallyPortAuth;