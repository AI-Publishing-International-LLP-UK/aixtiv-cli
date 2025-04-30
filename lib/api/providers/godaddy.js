/**
 * GoDaddy API Client for Aixtiv CLI
 * 
 * Provides a comprehensive API client for GoDaddy domain operations.
 * Handles domain registrations, DNS management, and domain information.
 * 
 * © 2025 AI Publishing International LLP
 */

const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { logAgentAction, getCurrentAgentId } = require('../../agent-tracking');

// GoDaddy API base URL
const GODADDY_API_BASE_URL = 'https://api.godaddy.com/v1';

// Maximum number of retry attempts for API calls
const MAX_RETRIES = 3;

// Default timeout for API calls (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Base retry delay in milliseconds
const BASE_RETRY_DELAY = 1000;

// Common DNS record types
const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'];

/**
 * Create a GoDaddy API client configured for the specified environment
 * @param {Object} options - Configuration options
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Object} Configured API client
 */
function createGoDaddyClient(options = {}) {
  const env = options.env || process.env.NODE_ENV || 'prod';
  
  // Get API credentials
  const { apiKey, apiSecret } = getGoDaddyCredentials();
  
  // Create Axios instance with default configuration
  const client = axios.create({
    baseURL: GODADDY_API_BASE_URL,
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `sso-key ${apiKey}:${apiSecret}`,
      'X-Aixtiv-Client': 'aixtiv-cli',
      'X-Aixtiv-Client-Version': require('../../../package.json').version
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: env !== 'dev' // Allow self-signed certs in dev
    })
  });
  
  // Add request interceptor for logging and context preparation
  client.interceptors.request.use(async (config) => {
    // Add agent tracking information
    const agentId = getCurrentAgentId();
    if (agentId) {
      config.headers['X-Aixtiv-Agent-ID'] = agentId;
    }
    
    // Add Model Context Protocol information if operating in test mode
    if (process.env.MODEL_CONTEXT_PROTOCOL === 'enabled') {
      config.headers['X-Model-Context-Protocol'] = 'enabled';
      config.headers['X-Claude-Automation-Session'] = process.env.CLAUDE_AUTOMATION_SESSION || 'default';
    }
    
    // Get shopper ID if needed and add to headers
    if (config.url.startsWith('/domains') && !config.headers['X-Shopper-Id']) {
      const shopperId = await getShopperId(client);
      if (shopperId) {
        config.headers['X-Shopper-Id'] = shopperId;
      }
    }
    
    // Log the API request
    logGoDaddyApiRequest(config);
    
    return config;
  }, (error) => {
    return Promise.reject(error);
  });
  
  // Add response interceptor for error handling and retries
  client.interceptors.response.use((response) => {
    // Log successful responses if in verbose mode
    if (process.env.AIXTIV_VERBOSE === 'true') {
      logGoDaddyApiResponse(response);
    }
    
    return response;
  }, async (error) => {
    // Get the config and response from the error
    const { config, response } = error;
    
    // Log error response
    logGoDaddyApiError(error);
    
    // Skip retry for specific status codes or if retry is disabled
    if (response && [400, 401, 403, 404, 422].includes(response.status) || 
        config.__skipRetry) {
      return Promise.reject(error);
    }
    
    // Handle rate limiting (429 Too Many Requests)
    if (response && response.status === 429) {
      const retryAfter = parseInt(response.headers['retry-after'], 10) || 5;
      config.__retryDelay = retryAfter * 1000;
    }
    
    // Implement retry logic with exponential backoff
    config.__retryCount = config.__retryCount || 0;
    
    if (config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      
      // Calculate delay with exponential backoff or use retry-after header
      const delay = config.__retryDelay || BASE_RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
      
      console.log(`Retrying request (${config.__retryCount}/${MAX_RETRIES}) after ${delay}ms: ${config.method.toUpperCase()} ${config.url}`);
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Make a new request
      return client(config);
    }
    
    // If we've exhausted retries, reject with the original error
    return Promise.reject(error);
  });
  
  return client;
}

/**
 * Get GoDaddy API credentials from environment variables or keyfile
 * @returns {Object} API key and secret
 * @throws {Error} If API credentials are not found
 */
function getGoDaddyCredentials() {
  // Check environment variables
  if (process.env.GODADDY_API_KEY && process.env.GODADDY_API_SECRET) {
    return {
      apiKey: process.env.GODADDY_API_KEY,
      apiSecret: process.env.GODADDY_API_SECRET
    };
  }
  
  // Try to load from keyfile
  const keyfilePath = process.env.GODADDY_API_KEYFILE || 
                     path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv', 'godaddy-api-key.json');
  
  if (fs.existsSync(keyfilePath)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'));
      return {
        apiKey: keyData.apiKey,
        apiSecret: keyData.apiSecret
      };
    } catch (error) {
      console.error('Error reading GoDaddy API key file:', error.message);
    }
  }
  
  throw new Error('GoDaddy API credentials not found. Please set GODADDY_API_KEY and GODADDY_API_SECRET environment variables, or create a keyfile at ~/.aixtiv/godaddy-api-key.json');
}

/**
 * Get shopper ID for GoDaddy API requests
 * @param {Object} client - API client
 * @returns {Promise<string>} Shopper ID
 */
async function getShopperId(client) {
  // Use cached shopper ID if available
  if (process.env.GODADDY_SHOPPER_ID) {
    return process.env.GODADDY_SHOPPER_ID;
  }
  
  // Try to get shopper ID from the API
  try {
    const config = {
      url: '/shoppers/current',
      method: 'get',
      __skipRetry: true, // Skip retry for this request
      headers: client.defaults.headers
    };
    
    const response = await axios(config);
    return response.data.shopperId;
  } catch (error) {
    console.error('Failed to get GoDaddy shopper ID:', error.message);
    return null;
  }
}

/**
 * Log GoDaddy API request for debugging
 * @param {Object} config - Axios request configuration
 */
function logGoDaddyApiRequest(config) {
  if (process.env.AIXTIV_VERBOSE === 'true') {
    console.log(`[GoDaddy API Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    
    if (config.params && Object.keys(config.params).length > 0) {
      console.log('[GoDaddy API Params]', config.params);
    }
    
    if (config.data && Object.keys(config.data).length > 0) {
      // Mask sensitive data
      const maskedData = { ...config.data };
      if (maskedData.apiKey) maskedData.apiKey = '********';
      if (maskedData.key) maskedData.key = '********';
      if (maskedData.secret) maskedData.secret = '********';
      
      console.log('[GoDaddy API Data]', maskedData);
    }
  }
}

/**
 * Log GoDaddy API response for debugging
 * @param {Object} response - Axios response object
 */
function logGoDaddyApiResponse(response) {
  if (process.env.AIXTIV_VERBOSE === 'true') {
    console.log(`[GoDaddy API Response] ${response.status} ${response.statusText} - ${response.config.method.toUpperCase()} ${response.config.url}`);
    
    // Only log abbreviated response data for verbosity
    if (response.data) {
      const keys = Array.isArray(response.data) 
        ? ['array', 'length: ' + response.data.length] 
        : Object.keys(response.data);
      
      if (keys.length > 0) {
        console.log(`[GoDaddy API Data] Keys: ${keys.join(', ')}`);
      }
    }
  }
}

/**
 * Log GoDaddy API error for debugging
 * @param {Error} error - Axios error object
 */
function logGoDaddyApiError(error) {
  const { config, response } = error;
  
  if (config) {
    console.error(`[GoDaddy API Error] ${config.method.toUpperCase()} ${config.url}`);
    
    if (response) {
      console.error(`[GoDaddy API Status] ${response.status} ${response.statusText}`);
      
      if (response.data) {
        console.error(`[GoDaddy API Message] ${JSON.stringify(response.data)}`);
      }
    } else {
      console.error('[GoDaddy API Error]', error.message);
    }
  } else {
    console.error('[GoDaddy API Error]', error.message);
  }
  
  // Log retry count if present
  if (config && config.__retryCount > 0) {
    console.error(`[GoDaddy API Retry] Attempt ${config.__retryCount} of ${MAX_RETRIES}`);
  }
  
  // Record error in agent tracking if enabled
  logAgentAction('godaddy-api-error', {
    error: error.message,
    endpoint: config ? `${config.method.toUpperCase()} ${config.url}` : 'unknown',
    status: response ? response.status : 'network-error'
  });
}

/**
 * List all domains in the GoDaddy account
 * @param {Object} options - List options
 * @param {string} options.statuses - Filter by domain status (e.g. 'ACTIVE')
 * @param {number} options.limit - Maximum number of domains to return
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Promise<Array>} List of domains
 */
async function listDomains(options = {}) {
  const client = createGoDaddyClient({ env: options.env });
  
  // Build parameters
  const params = {};
  if (options.statuses) params.statuses = options.statuses;
  if (options.limit) params.limit = options.limit;
  if (options.offset) params.offset = options.offset;
  
  try {
    logAgentAction('godaddy-list-domains', { filters: params });
    const response = await client.get('/domains', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to list GoDaddy domains: ${error.message}`);
  }
}

/**
 * Get detailed information for a specific domain
 * @param {string} domainName - Domain name
 * @param {Object} options - Options
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Promise<Object>} Domain details
 */
async function getDomain(domainName, options = {}) {
  if (!domainName) {
    throw new Error('Domain name is required');
  }
  
  const client = createGoDaddyClient({ env: options.env });
  
  try {
    logAgentAction('godaddy-get-domain', { domain: domainName });
    const response = await client.get(`/domains/${encodeURIComponent(domainName)}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(`Domain ${domainName} not found in GoDaddy account`);
    }
    throw new Error(`Failed to get domain ${domainName} from GoDaddy: ${error.message}`);
  }
}

/**
 * Get DNS records for a domain
 * @param {string} domainName - Domain name
 * @param {Object} options - Options
 * @param {string} options.type - Record type (A, AAAA, CNAME, MX, TXT, etc.)
 * @param {string} options.name - Record name (e.g., 'www', '@')
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Promise<Array>} DNS records
 */
async function getDnsRecords(domainName, options = {}) {
  if (!domainName) {
    throw new Error('Domain name is required');
  }
  
  const client = createGoDaddyClient({ env: options.env });
  
  let url = `/domains/${encodeURIComponent(domainName)}/records`;
  
  // Add type and name if provided
  if (options.type) {
    url += `/${options.type}`;
    if (options.name) {
      url += `/${options.name}`;
    }
  }
  
  try {
    logAgentAction('godaddy-get-dns-records', { 
      domain: domainName,
      type: options.type,
      name: options.name
    });
    
    const response = await client.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      

