/**
 * OAuth2 Service
 * 
 * Central service for managing OAuth2 authentication across multiple providers.
 * Handles token acquisition, refresh, and management for different integration points.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const secretManager = require('../secrets/secret-manager');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const admin = require('firebase-admin');

// Provider configurations
const PROVIDER_CONFIGS = {
  github: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user', 'workflow'],
    tokenRefreshThreshold: 3600 // 1 hour
  },
  atlassian: {
    authorizationEndpoint: 'https://auth.atlassian.com/authorize',
    tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
    scopes: ['read:jira-work', 'write:jira-work', 'read:confluence-content'],
    tokenRefreshThreshold: 3600 // 1 hour
  },
  google: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    tokenRefreshThreshold: 1800 // 30 minutes
  },
  firebase: {
    // Uses Google OAuth2 infrastructure
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
    tokenRefreshThreshold: 1800 // 30 minutes
  },
  gitlab: {
    authorizationEndpoint: 'https://gitlab.com/oauth/authorize',
    tokenEndpoint: 'https://gitlab.com/oauth/token',
    scopes: ['api', 'read_user', 'read_repository', 'write_repository'],
    tokenRefreshThreshold: 3600 // 1 hour
  }
};

/**
 * OAuth2 service for managing authentication across providers
 */
class OAuth2Service {
  constructor() {
    this.db = null;
    this.initialized = false;
    
    // In-memory token cache
    this.tokenCache = new Map();
  }
  
  /**
   * Initialize the OAuth2 service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize Firestore if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      this.db = admin.firestore();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize OAuth2 service:', error.message);
      throw error;
    }
  }
  
  /**
   * Get client credentials for a provider
   * @param {string} provider - Provider name
   * @returns {Promise<{clientId: string, clientSecret: string}>}
   */
  async getClientCredentials(provider) {
    try {
      const secretName = `oauth-${provider}-client`;
      const credentials = await secretManager.getSecret(secretName);
      return JSON.parse(credentials);
    } catch (error) {
      console.error(`Failed to get OAuth2 client credentials for ${provider}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Generate authorization URL for OAuth2 flow
   * @param {string} provider - Provider name
   * @param {string} redirectUri - Redirect URI after authorization
   * @param {string} state - State parameter for security
   * @param {string[]} [additionalScopes] - Additional scopes to request
   * @returns {Promise<string>} - Authorization URL
   */
  async getAuthorizationUrl(provider, redirectUri, state, additionalScopes = []) {
    await this.initialize();
    
    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth2 provider: ${provider}`);
    }
    
    const { clientId } = await this.getClientCredentials(provider);
    
    // Combine default scopes with additional scopes
    const scopes = [...config.scopes, ...additionalScopes];
    
    // Build the authorization URL
    const url = new URL(config.authorizationEndpoint);
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes.join(' '));
    url.searchParams.append('state', state);
    url.searchParams.append('response_type', 'code');
    
    return url.toString();
  }
  
  /**
   * Exchange authorization code for tokens
   * @param {string} provider - Provider name
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI used for authorization
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
   */
  async exchangeCodeForTokens(provider, code, redirectUri) {
    await this.initialize();
    
    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth2 provider: ${provider}`);
    }
    
    const { clientId, clientSecret } = await this.getClientCredentials(provider);
    
    // Exchange code for tokens
    const response = await axios.post(config.tokenEndpoint, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const { access_token, refresh_token, expires_in } = response.data;
    
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in
    };
  }
  
  /**
   * Store tokens for a user and provider
   * @param {string} userId - User ID 
   * @param {string} provider - Provider name
   * @param {Object} tokens - Token data
   * @returns {Promise<void>}
   */
  async storeUserTokens(userId, provider, tokens) {
    await this.initialize();
    
    const { accessToken, refreshToken, expiresIn } = tokens;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    // Store tokens in Firestore
    await this.db.collection('oauth_tokens').doc(`${userId}_${provider}`).set({
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also store in cache
    this.tokenCache.set(`${userId}_${provider}`, {
      accessToken,
      refreshToken,
      expiresAt
    });
  }
  
  /**
   * Store service tokens
   * @param {string} serviceName - Service name
   * @param {string} provider - Provider name
   * @param {Object} tokens - Token data
   * @returns {Promise<void>}
   */
  async storeServiceTokens(serviceName, provider, tokens) {
    await this.initialize();
    
    const { accessToken, refreshToken, expiresIn } = tokens;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    // Store token metadata in Firestore
    await this.db.collection('service_oauth_tokens').doc(`${serviceName}_${provider}`).set({
      serviceName,
      provider,
      // Don't store actual tokens here
      hasAccessToken: true,
      hasRefreshToken: !!refreshToken,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Store actual tokens in Secret Manager
    const secretId = `oauth-${serviceName}-${provider}`;
    
    try {
      await secretManager.createOrUpdateSecret(secretId, JSON.stringify({
        accessToken,
        refreshToken,
        expiresAt
      }));
    } catch (error) {
      console.error(`Failed to store service tokens in Secret Manager:`, error.message);
      throw error;
    }
    
    // Also store in cache
    this.tokenCache.set(`service_${serviceName}_${provider}`, {
      accessToken,
      refreshToken,
      expiresAt
    });
  }
  
  /**
   * Get access token for a user and provider, refreshing if needed
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @returns {Promise<string>} - Access token
   */
  async getUserAccessToken(userId, provider) {
    await this.initialize();
    
    // Check cache first
    const cacheKey = `${userId}_${provider}`;
    if (this.tokenCache.has(cacheKey)) {
      const cachedToken = this.tokenCache.get(cacheKey);
      
      // Check if token is still valid
      if (cachedToken.expiresAt > Date.now() + 60000) { // 1-minute buffer
        return cachedToken.accessToken;
      }
      
      // Token is expired or expiring soon, try to refresh
      if (cachedToken.refreshToken) {
        try {
          const newTokens = await this.refreshToken(provider, cachedToken.refreshToken);
          await this.storeUserTokens(userId, provider, newTokens);
          return newTokens.accessToken;
        } catch (error) {
          console.error(`Failed to refresh token for user ${userId} and provider ${provider}:`, error.message);
          // Fall through to fetch from storage
        }
      }
    }
    
    // Get token from Firestore
    const tokenDoc = await this.db.collection('oauth_tokens').doc(`${userId}_${provider}`).get();
    
    if (!tokenDoc.exists) {
      throw new Error(`No OAuth2 tokens found for user ${userId} and provider ${provider}`);
    }
    
    const tokenData = tokenDoc.data();
    
    // Check if token is still valid
    if (tokenData.expiresAt > Date.now() + 60000) { // 1-minute buffer
      // Store in cache and return
      this.tokenCache.set(cacheKey, {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt
      });
      
      return tokenData.accessToken;
    }
    
    // Token is expired, try to refresh
    if (tokenData.refreshToken) {
      try {
        const newTokens = await this.refreshToken(provider, tokenData.refreshToken);
        await this.storeUserTokens(userId, provider, newTokens);
        return newTokens.accessToken;
      } catch (error) {
        console.error(`Failed to refresh token for user ${userId} and provider ${provider}:`, error.message);
        throw new Error(`OAuth2 token expired and refresh failed for user ${userId} and provider ${provider}`);
      }
    } else {
      throw new Error(`OAuth2 token expired and no refresh token available for user ${userId} and provider ${provider}`);
    }
  }
  
  /**
   * Get access token for a service and provider, refreshing if needed
   * @param {string} serviceName - Service name
   * @param {string} provider - Provider name
   * @returns {Promise<string>} - Access token
   */
  async getServiceAccessToken(serviceName, provider) {
    await this.initialize();
    
    // Check cache first
    const cacheKey = `service_${serviceName}_${provider}`;
    if (this.tokenCache.has(cacheKey)) {
      const cachedToken = this.tokenCache.get(cacheKey);
      
      // Check if token is still valid
      if (cachedToken.expiresAt > Date.now() + 60000) { // 1-minute buffer
        return cachedToken.accessToken;
      }
      
      // Token is expired or expiring soon, try to refresh
      if (cachedToken.refreshToken) {
        try {
          const newTokens = await this.refreshToken(provider, cachedToken.refreshToken);
          await this.storeServiceTokens(serviceName, provider, newTokens);
          return newTokens.accessToken;
        } catch (error) {
          console.error(`Failed to refresh token for service ${serviceName} and provider ${provider}:`, error.message);
          // Fall through to fetch from storage
        }
      }
    }
    
    // Get token metadata from Firestore
    const tokenDoc = await this.db.collection('service_oauth_tokens').doc(`${serviceName}_${provider}`).get();
    
    if (!tokenDoc.exists) {
      throw new Error(`No OAuth2 tokens found for service ${serviceName} and provider ${provider}`);
    }
    
    // Get actual tokens from Secret Manager
    const secretId = `oauth-${serviceName}-${provider}`;
    
    try {
      const tokenDataStr = await secretManager.getSecret(secretId);
      const tokenData = JSON.parse(tokenDataStr);
      
      // Check if token is still valid
      if (tokenData.expiresAt > Date.now() + 60000) { // 1-minute buffer
        // Store in cache and return
        this.tokenCache.set(cacheKey, {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt
        });
        
        return tokenData.accessToken;
      }
      
      // Token is expired, try to refresh
      if (tokenData.refreshToken) {
        try {
          const newTokens = await this.refreshToken(provider, tokenData.refreshToken);
          await this.storeServiceTokens(serviceName, provider, newTokens);
          return newTokens.accessToken;
        } catch (error) {
          console.error(`Failed to refresh token for service ${serviceName} and provider ${provider}:`, error.message);
          throw new Error(`OAuth2 token expired and refresh failed for service ${serviceName} and provider ${provider}`);
        }
      } else {
        throw new Error(`OAuth2 token expired and no refresh token available for service ${serviceName} and provider ${provider}`);
      }
    } catch (error) {
      console.error(`Failed to get service tokens from Secret Manager:`, error.message);
      throw error;
    }
  }
  
  /**
   * Refresh an OAuth2 token
   * @param {string} provider - Provider name
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
   */
  async refreshToken(provider, refreshToken) {
    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth2 provider: ${provider}`);
    }
    
    const { clientId, clientSecret } = await this.getClientCredentials(provider);
    
    // Refresh token
    const response = await axios.post(config.tokenEndpoint, {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const { access_token, refresh_token, expires_in } = response.data;
    
    return {
      accessToken: access_token,
      // Some providers don't return a new refresh token
      refreshToken: refresh_token || refreshToken,
      expiresIn: expires_in
    };
  }
  
  /**
   * Revoke tokens for a user and provider
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @returns {Promise<void>}
   */
  async revokeUserTokens(userId, provider) {
    await this.initialize();
    
    // Get tokens from Firestore
    const tokenDoc = await this.db.collection('oauth_tokens').doc(`${userId}_${provider}`).get();
    
    if (!tokenDoc.exists) {
      return; // Nothing to revoke
    }
    
    const tokenData = tokenDoc.data();
    
    // Revoke tokens - implementation varies by provider
    try {
      await this._revokeProviderTokens(provider, tokenData.accessToken, tokenData.refreshToken);
    } catch (error) {
      console.error(`Failed to revoke tokens for provider ${provider}:`, error.message);
      // Continue to delete tokens even if revocation fails
    }
    
    // Delete tokens from Firestore
    await this.db.collection('oauth_tokens').doc(`${userId}_${provider}`).delete();
    
    // Remove from cache
    this.tokenCache.delete(`${userId}_${provider}`);
  }
  
  /**
   * Revoke tokens for a service and provider
   * @param {string} serviceName - Service name
   * @param {string} provider - Provider name
   * @returns {Promise<void>}
   */
  async revokeServiceTokens(serviceName, provider) {
    await this.initialize();
    
    // Get token metadata from Firestore
    const tokenDoc = await this.db.collection('service_oauth_tokens').doc(`${serviceName}_${provider}`).get();
    
    if (!tokenDoc.exists) {
      return; // Nothing to revoke
    }
    
    // Get actual tokens from Secret Manager
    const secretId = `oauth-${serviceName}-${provider}`;
    
    try {
      const tokenDataStr = await secretManager.getSecret(secretId);
      const tokenData = JSON.parse(tokenDataStr);
      
      // Revoke tokens - implementation varies by provider
      try {
        await this._revokeProviderTokens(provider, tokenData.accessToken, tokenData.refreshToken);
      } catch (error) {
        console.error(`Failed to revoke tokens for provider ${provider}:`, error.message);
        // Continue to delete tokens even if revocation fails
      }
      
      // Delete tokens from Secret Manager
      await secretManager.deleteSecret(secretId);
    } catch (error) {
      console.error(`Failed to get or delete service tokens from Secret Manager:`, error.message);
      // Continue to delete metadata even if token deletion fails
    }
    
    // Delete token metadata from Firestore
    await this.db.collection('service_oauth_tokens').doc(`${serviceName}_${provider}`).delete();
    
    // Remove from cache
    this.tokenCache.delete(`service_${serviceName}_${provider}`);
  }
  
  /**
   * Revoke tokens for a specific provider - implementation varies by provider
   * @param {string} provider - Provider name
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<void>}
   * @private
   */
  async _revokeProviderTokens(provider, accessToken, refreshToken) {
    switch (provider) {
      case 'github':
        // GitHub does not have a revocation endpoint, tokens must be deleted via API
        // This requires a PAT with delete_repo scope, which might not be available
        console.warn('GitHub token revocation is not implemented');
        break;
        
      case 'google':
      case 'firebase':
        // Google has a revocation endpoint
        await axios.post('https://oauth2.googleapis.com/revoke', `token=${accessToken}`, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        if (refreshToken) {
          await axios.post('https://oauth2.googleapis.com/revoke', `token=${refreshToken}`, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        }
        break;
        
      case 'atlassian':
        // Atlassian OAuth2 does not have a public revocation endpoint
        console.warn('Atlassian token revocation is not implemented');
        break;
        
      case 'gitlab':
        // GitLab has a revocation endpoint
        const { clientId, clientSecret } = await this.getClientCredentials(provider);
        
        await axios.post('https://gitlab.com/oauth/revoke', {
          client_id: clientId,
          client_secret: clientSecret,
          token: accessToken
        });
        break;
        
      default:
        console.warn(`Token revocation not implemented for provider ${provider}`);
    }
  }
  
  /**
   * Generate a random state parameter for OAuth2 flow
   * @returns {string} Random state parameter
   */
  generateState() {
    return uuidv4();
  }
}

// Export singleton instance
module.exports = new OAuth2Service();