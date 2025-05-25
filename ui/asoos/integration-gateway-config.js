/**
 * Integration Gateway Configuration for ASOOS
 * 
 * This module provides configuration for the Integration Gateway
 * that manages API keys and swapping for the ASOOS application.
 */

// Gateway configuration
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
  },
  
  // Stripe integration configuration
  stripeIntegration: {
    enabled: true,
    keyRotationEnabled: true,
    environment: process.env.NODE_ENV || "development",
    endpoint: process.env.STRIPE_API_ENDPOINT || "https://api.stripe.com/v1",
    telemetryOptOut: process.env.STRIPE_CLI_TELEMETRY_OPTOUT === '1',
    region: "us-west1",
    // Key validation pattern for Stripe API keys
    keyPattern: /^sk_(test|live)_[0-9a-zA-Z]{24,}$/
  }
};

/**
 * Initializes connection to the integration gateway
 * @returns {Promise<Object>} Connection status
 */
async function initGatewayConnection() {
  console.log("Initializing connection to integration gateway...");
  
  // In a real implementation, this would make an API call to the gateway
  return {
    status: "connected",
    timestamp: new Date().toISOString(),
    serviceId: GATEWAY_CONFIG.serviceId,
    message: "Successfully connected to integration gateway"
  };
}

/**
 * Requests a temporary API key from the gateway
 * @param {string} service - The service to request a key for (default, stripe, etc.)
 * @returns {Promise<Object>} API key information
 */
async function requestApiKey(service = "default") {
  console.log(`Requesting ${service} API key from integration gateway...`);
  
  // Handle Stripe API key specifically
  if (service === "stripe") {
    // In a real implementation, this would securely fetch the Stripe API key
    // from the gateway's key management system
    
    // Verify the Stripe integration is enabled
    if (!GATEWAY_CONFIG.stripeIntegration.enabled) {
      throw new Error("Stripe integration is not enabled");
    }
    
    const environment = GATEWAY_CONFIG.stripeIntegration.environment;
    const isProduction = environment === "production";
    
    return {
      status: "success",
      keyType: isProduction ? "live" : "test",
      expiresIn: 3600, // 1 hour in seconds
      timestamp: new Date().toISOString(),
      service: "stripe",
      telemetryOptOut: GATEWAY_CONFIG.stripeIntegration.telemetryOptOut
    };
  }
  
  // Default API key handling (existing functionality)
  return {
    status: "success",
    expiresIn: 3600, // 1 hour in seconds
    timestamp: new Date().toISOString()
  };
}

/**
 * Validates the current gateway connection
 * @param {string} service - The service to validate (default, stripe, etc.)
 * @returns {Promise<boolean>} Whether the connection is valid
 */
async function validateGatewayConnection(service = "default") {
  console.log(`Validating integration gateway connection for ${service}...`);
  
  // Validate Stripe connection specifically
  if (service === "stripe" && GATEWAY_CONFIG.stripeIntegration.enabled) {
    try {
      // In a real implementation, this would validate the Stripe connection
      // by checking the API key format and potentially making a test request
      
      // Validate that we're using the correct key type for the environment
      const environment = GATEWAY_CONFIG.stripeIntegration.environment;
      const isProduction = environment === "production";
      
      // Example validation: ensure we're using a live key in production
      // and test key in non-production environments
      const stripeKey = process.env.STRIPE_API_KEY || "";
      const isLiveKey = stripeKey.startsWith("sk_live_");
      
      if (isProduction && !isLiveKey) {
        console.warn("Warning: Using a test key in production environment");
      } else if (!isProduction && isLiveKey) {
        console.warn("Warning: Using a live key in non-production environment");
      }
      
      // Validate the key format using the pattern
      const isValidFormat = GATEWAY_CONFIG.stripeIntegration.keyPattern.test(stripeKey);
      if (!isValidFormat) {
        console.error("Invalid Stripe API key format");
        return false;
      }
      
      console.log("✅ Stripe connection validated successfully");
      return true;
    } catch (error) {
      console.error("Failed to validate Stripe connection:", error.message);
      return false;
    }
  }
  
  // Default connection validation (existing functionality)
  return true;
}

/**
 * Validates a Stripe API key format
 * @param {string} apiKey - The Stripe API key to validate
 * @returns {boolean} Whether the key format is valid
 */
function validateStripeApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  return GATEWAY_CONFIG.stripeIntegration.keyPattern.test(apiKey);
}

/**
 * Gets the appropriate Stripe environment based on the API key
 * @param {string} apiKey - The Stripe API key
 * @returns {string} The environment ('test' or 'live')
 */
function getStripeEnvironment(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'unknown';
  }
  
  if (apiKey.startsWith('sk_test_')) {
    return 'test';
  } else if (apiKey.startsWith('sk_live_')) {
    return 'live';
  }
  
  return 'unknown';
}

module.exports = {
  GATEWAY_CONFIG,
  initGatewayConnection,
  requestApiKey,
  validateGatewayConnection,
  validateStripeApiKey,
  getStripeEnvironment
};
