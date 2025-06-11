/**
 * Integration Gateway Connection for ASOOS
 * 
 * This module provides real integration with the gateway service
 * at https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway
 */

const https = require('https');
const crypto = require('crypto');

// Gateway configuration - imported from environment or configuration file
const GATEWAY_CONFIG = {
  // Gateway endpoint information
  endpoint: process.env.GATEWAY_ENDPOINT || "https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway",
  
  // Service identifiers
  serviceId: "asoos-ui",
  clientId: "asoos-2100-cool",
  
  // Connection parameters
  connectionParams: {
    domain: "asoos.2100.cool",
    region: "us-west1",
    project: "api-for-warp-drive"
  },
  
  // Key rotation settings
  keyRotation: {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    backupKeys: 2
  },
  
  // Claude integration settings
  claudeIntegration: {
    modelProvider: "anthropic",
    modelName: "claude-3-5-sonnet",
    maxTokens: 4096,
    temperature: 0.7
  },
  
  // Symphony integration configuration
  symphonyIntegration: {
    mode: "zero-drift",
    alwaysOn: true,
    bondedAgent: true
  }
};

// Track active connections
let gatewayConnected = false;
let lastConnectionAttempt = null;
let pendingConnection = null;

/**
 * Initializes connection to the integration gateway
 * This is a real implementation that connects to the actual gateway service
 * @returns {Promise<Object>} Connection status
 */
async function initGatewayConnection() {
  // Don't start a new connection if one is in progress
  if (pendingConnection) return pendingConnection;
  
  console.log("Initializing connection to integration gateway...");
  lastConnectionAttempt = new Date();
  
  pendingConnection = new Promise((resolve, reject) => {
    // Generate a request ID for tracking
    const requestId = `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-ID': GATEWAY_CONFIG.serviceId,
        'X-Client-ID': GATEWAY_CONFIG.clientId,
        'X-Request-ID': requestId
      },
      timeout: 10000 // 10 second timeout
    };
    
    const requestBody = JSON.stringify({
      serviceId: GATEWAY_CONFIG.serviceId,
      clientId: GATEWAY_CONFIG.clientId,
      domain: GATEWAY_CONFIG.connectionParams.domain,
      region: GATEWAY_CONFIG.connectionParams.region,
      timestamp: new Date().toISOString()
    });
    
    const req = https.request(
      `${GATEWAY_CONFIG.endpoint}/connect`, 
      requestOptions, 
      (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(data);
              gatewayConnected = true;
              pendingConnection = null;
              resolve({
                status: "connected",
                timestamp: new Date().toISOString(),
                serviceId: GATEWAY_CONFIG.serviceId,
                ...parsedData
              });
            } catch (e) {
              gatewayConnected = false;
              pendingConnection = null;
              reject(new Error(`Failed to parse gateway response: ${e.message}`));
            }
          } else {
            gatewayConnected = false;
            pendingConnection = null;
            reject(new Error(`Gateway returned status code ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    
    req.on('error', (error) => {
      gatewayConnected = false;
      pendingConnection = null;
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      gatewayConnected = false;
      pendingConnection = null;
      reject(new Error('Gateway connection timed out'));
    });
    
    req.write(requestBody);
    req.end();
  });
  
  return pendingConnection;
}

/**
 * Validates the current gateway connection
 * This actually checks the connection status with the real gateway
 * @returns {Promise<boolean>} Whether the connection is valid
 */
async function validateGatewayConnection() {
  console.log("Validating integration gateway connection...");
  
  // If we don't have a connection or it's been more than 5 minutes, reconnect
  if (!gatewayConnected || !lastConnectionAttempt || 
      (new Date() - lastConnectionAttempt) > 5 * 60 * 1000) {
    try {
      await initGatewayConnection();
      return true;
    } catch (err) {
      console.error("Failed to reconnect to gateway:", err.message);
      return false;
    }
  }
  
  return gatewayConnected;
}

/**
 * Requests a temporary API key from the gateway
 * This makes a real request to the integration gateway service
 * @param {Object} options Optional parameters for the request
 * @param {string} options.userId User ID making the request
 * @param {Object} options.metadata Additional metadata for the key
 * @returns {Promise<Object>} API key information
 */
async function fetchApiKeyFromGateway(options = {}) {
  console.log("Requesting API key from integration gateway...");
  
  // Ensure connection is valid before requesting a key
  if (!gatewayConnected) {
    await initGatewayConnection();
  }
  
  return new Promise((resolve, reject) => {
    // Generate a request ID for tracking
    const requestId = `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-ID': GATEWAY_CONFIG.serviceId,
        'X-Client-ID': GATEWAY_CONFIG.clientId,
        'X-Request-ID': requestId
      },
      timeout: 10000 // 10 second timeout
    };
    
    const requestBody = JSON.stringify({
      serviceId: GATEWAY_CONFIG.serviceId,
      clientId: GATEWAY_CONFIG.clientId,
      domain: GATEWAY_CONFIG.connectionParams.domain,
      userId: options.userId || 'anonymous',
      purpose: 'claude-api-access',
      metadata: options.metadata || {
        application: 'asoos-ui',
        modelName: GATEWAY_CONFIG.claudeIntegration.modelName,
        timestamp: new Date().toISOString()
      }
    });
    
    const req = https.request(
      `${GATEWAY_CONFIG.endpoint}/api-keys`, 
      requestOptions, 
      (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(data);
              
              // Update connection status
              gatewayConnected = true;
              
              resolve({
                apiKey: parsedData.apiKey || parsedData.key,
                expiresIn: parsedData.expiresIn || 3600,
                expiresAt: parsedData.expiresAt,
                keyId: parsedData.keyId || requestId,
                metadata: parsedData.metadata || {},
                ...parsedData
              });
            } catch (e) {
              reject(new Error(`Failed to parse gateway response: ${e.message}`));
            }
          } else {
            // Handle specific error codes
            if (res.statusCode === 429) {
              reject(new Error('Rate limit exceeded. Try again later.'));
            } else if (res.statusCode === 403) {
              reject(new Error('Access denied. Check service credentials.'));
              // Update connection status since our credentials might be invalid
              gatewayConnected = false;
            } else {
              reject(new Error(`Gateway returned status code ${res.statusCode}: ${data}`));
            }
          }
        });
      }
    );
    
    req.on('error', (error) => {
      // Network errors generally mean the gateway is unreachable
      gatewayConnected = false;
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request for API key timed out'));
    });
    
    req.write(requestBody);
    req.end();
  });
}

module.exports = {
  GATEWAY_CONFIG,
  initGatewayConnection,
  validateGatewayConnection,
  fetchApiKeyFromGateway,
  isConnected: () => gatewayConnected
};