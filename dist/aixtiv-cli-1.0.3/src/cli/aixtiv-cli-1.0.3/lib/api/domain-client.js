/**
 * Domain API Client for Aixtiv CLI
 * 
 * Provides a comprehensive API client for domain management operations in the Aixtiv Symphony ecosystem.
 * Replaces all mock implementations with real API calls to the domain management service.
 * 
 * © 2025 AI Publishing International LLP
 */

const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { logAgentAction, getCurrentAgentId } = require('../agent-tracking');

// Maximum number of retry attempts for API calls
const MAX_RETRIES = 3;

// Default timeout for API calls (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Base retry delay in milliseconds
const BASE_RETRY_DELAY = 1000;

// Domain types supported by the system
const DOMAIN_TYPES = [
  'character', // Character-based domains (e.g., drclaude.live, queenlucy.live)
  'command',   // Command systems (e.g., dreamcommand.live, visioncommand.live)
  'wing',      // Wing domains (e.g., wing-1.live)
  'squadron',  // Squadron domains (e.g., squadron-1.live)
  'brand',     // Brand domains (e.g., coaching2100.com, 2100.cool)
  'aixtiv',    // Aixtiv family domains (e.g., aixtiv.com, aixtiv-symphony.com)
  'learning',  // Learning domains (e.g., academy2100.com, getready2100.com)
  'commerce',  // Commerce domains (e.g., giftshop2100.com, marketplace2100.com)
  'governance' // Governance domains (e.g., law2100.com, governance2100.com)
];

/**
 * Create a domain API client configured for the specified environment
 * @param {Object} options - Configuration options
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Object} Configured API client
 */
function createDomainClient(options = {}) {
  const env = options.env || process.env.NODE_ENV || 'prod';
  
  // Determine the base URL based on environment and region
  const region = process.env.AIXTIV_REGION || 'us-west1';
  const zone = process.env.AIXTIV_ZONE || 'us-west1-b';
  
  let baseURL;
  switch (env) {
    case 'dev':
      baseURL = process.env.DOMAIN_API_DEV_ENDPOINT || `https://domain-api-dev-dot-aixtiv-domain-mgmt.${region}.r.appspot.com`;
      break;
    case 'staging':
      baseURL = process.env.DOMAIN_API_STAGING_ENDPOINT || `https://domain-api-staging-dot-aixtiv-domain-mgmt.${region}.r.appspot.com`;
      break;
    case 'prod':
    default:
      baseURL = process.env.DOMAIN_API_ENDPOINT || `https://domain-api.${region}-c.aixtiv-domain-mgmt.cloud.goog`;
      break;
  }
  
  // Get API key from environment or keyfile
  const apiKey = getApiKey();
  
  // Create Axios instance with default configuration
  const client = axios.create({
    baseURL,
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'X-Aixtiv-Region': region,
      'X-Aixtiv-Zone': zone,
      'X-Aixtiv-Client': 'aixtiv-cli',
      'X-Aixtiv-Client-Version': require('../../package.json').version,
      'Authorization': `Bearer ${apiKey}`
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
    
    // Log the API request
    logApiRequest(config);
    
    return config;
  }, (error) => {
    return Promise.reject(error);
  });
  
  // Add response interceptor for error handling and retries
  client.interceptors.response.use((response) => {
    // Log successful responses if in verbose mode
    if (process.env.AIXTIV_VERBOSE === 'true') {
      logApiResponse(response);
    }
    
    return response;
  }, async (error) => {
    // Get the config and response from the error
    const { config, response } = error;
    
    // Log error response
    logApiError(error);
    
    // Skip retry for specific status codes or if retry is disabled
    if (response && [400, 401, 403, 404, 422].includes(response.status) || 
        config.__skipRetry) {
      return Promise.reject(error);
    }
    
    // Implement retry logic with exponential backoff
    config.__retryCount = config.__retryCount || 0;
    
    if (config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      
      // Calculate delay with exponential backoff
      const delay = BASE_RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
      
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
 * Get API key from environment or keyfile
 * @returns {string} API key
 * @throws {Error} If API key is not found
 */
function getApiKey() {
  // First check environment variable
  if (process.env.AIXTIV_DOMAIN_API_KEY) {
    return process.env.AIXTIV_DOMAIN_API_KEY;
  }
  
  // Then check general API key
  if (process.env.AIXTIV_API_KEY) {
    return process.env.AIXTIV_API_KEY;
  }
  
  // Finally, try to load from keyfile
  const keyfilePath = process.env.AIXTIV_API_KEYFILE || 
                     path.join(process.env.HOME || process.env.USERPROFILE, '.aixtiv', 'api-key.json');
  
  if (fs.existsSync(keyfilePath)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'));
      return keyData.domainApiKey || keyData.apiKey;
    } catch (error) {
      console.error('Error reading API key file:', error.message);
    }
  }
  
  throw new Error('API key not found. Please set AIXTIV_API_KEY or AIXTIV_DOMAIN_API_KEY environment variable, or create a keyfile at ~/.aixtiv/api-key.json');
}

/**
 * Log API request for debugging
 * @param {Object} config - Axios request configuration
 */
function logApiRequest(config) {
  if (process.env.AIXTIV_VERBOSE === 'true') {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    
    if (config.params && Object.keys(config.params).length > 0) {
      console.log('[API Params]', config.params);
    }
    
    if (config.data && Object.keys(config.data).length > 0) {
      // Mask sensitive data
      const maskedData = { ...config.data };
      if (maskedData.apiKey) maskedData.apiKey = '********';
      if (maskedData.key) maskedData.key = '********';
      if (maskedData.secret) maskedData.secret = '********';
      
      console.log('[API Data]', maskedData);
    }
  }
}

/**
 * Log API response for debugging
 * @param {Object} response - Axios response object
 */
function logApiResponse(response) {
  if (process.env.AIXTIV_VERBOSE === 'true') {
    console.log(`[API Response] ${response.status} ${response.statusText} - ${response.config.method.toUpperCase()} ${response.config.url}`);
    
    // Only log abbreviated response data for verbosity
    if (response.data) {
      const keys = Object.keys(response.data);
      if (keys.length > 0) {
        console.log(`[API Data] Keys: ${keys.join(', ')}`);
      }
    }
  }
}

/**
 * Log API error for debugging
 * @param {Error} error - Axios error object
 */
function logApiError(error) {
  const { config, response } = error;
  
  if (config) {
    console.error(`[API Error] ${config.method.toUpperCase()} ${config.url}`);
    
    if (response) {
      console.error(`[API Status] ${response.status} ${response.statusText}`);
      
      if (response.data && response.data.error) {
        console.error(`[API Message] ${response.data.error.message || response.data.error}`);
      }
    } else {
      console.error('[API Error]', error.message);
    }
  } else {
    console.error('[API Error]', error.message);
  }
  
  // Log retry count if present
  if (config && config.__retryCount > 0) {
    console.error(`[API Retry] Attempt ${config.__retryCount} of ${MAX_RETRIES}`);
  }
  
  // Record error in agent tracking if enabled
  logAgentAction('domain-api-error', {
    error: error.message,
    endpoint: config ? `${config.method.toUpperCase()} ${config.url}` : 'unknown',
    status: response ? response.status : 'network-error'
  });
}

/**
 * List domains with support for filtering
 * @param {Object} options - Options for listing domains
 * @param {string} options.type - Filter by domain type
 * @param {string} options.status - Filter by domain status
 * @param {string} options.search - Search term for domain names
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Promise<Array>} List of domains
 */
async function listDomains(options = {}) {
  const client = createDomainClient({ env: options.env });
  
  const params = {};
  if (options.type) params.type = options.type;
  if (options.status) params.status = options.status;
  if (options.search) params.search = options.search;
  
  try {
    logAgentAction('domain-list', { filters: params });
    const response = await client.get('/domains', { params });
    return response.data.domains || [];
  } catch (error) {
    throw new Error(`Failed to list domains: ${error.message}`);
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
  
  const client = createDomainClient({ env: options.env });
  
  try {
    logAgentAction('domain-get', { domain: domainName });
    const response = await client.get(`/domains/${encodeURIComponent(domainName)}`);
    return response.data.domain;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(`Domain ${domainName} not found`);
    }
    throw new Error(`Failed to get domain ${domainName}: ${error.message}`);
  }
}

/**
 * Add a new domain to the system
 * @param {string} domainName - Domain name
 * @param {Object} domainInfo - Domain information
 * @param {string} domainInfo.type - Domain type
 * @param {string} domainInfo.firebaseProject - Firebase project ID
 * @param {string} domainInfo.expiryDate - Expiry date (YYYY-MM-DD)
 * @param {Object} options - Options
 * @param {string} options.env - Environment (dev, staging, prod)
 * @returns {Promise<Object>} Operation result
 */
async function addDomain(domainName, domainInfo, options = {}) {
  if (!domainName) {
    throw new Error('Domain name is required');
  }
  
  if (!domainInfo.type || !DOMAIN_TYPES.includes(domainInfo.type)) {
    throw new Error(`Invalid domain type. Must be one of: ${DOMAIN_TYPES.join(', ')}`);
  }
  
  const client = createDomainClient({ env: options.env });
  
  // Validate expiry date format if provided
  if (domainInfo.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(domainInfo.expiryDate)) {
    throw new Error('Expiry date must be in YYYY-MM-DD format');
  }
  
  try {
    logAgentAction('domain-add', { 
      domain: domainName, 
      type: domainInfo.type,
      firebaseProject: domainInfo.firebaseProject
    });
    
    const response = await client.post('/domains', {
      name: domainName,
      ...domainInfo
    });
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      throw new Error(`Domain ${domainName} already exists`);
    }
    throw new Error(`Failed to add domain ${domainName}: ${error.message}`);
  }
}

/**
 * Update an existing domain
 * @param {string} domainName - Domain name

