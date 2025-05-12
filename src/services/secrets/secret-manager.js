/**
 * Secret Manager Integration for Aixtiv Symphony
 * 
 * Provides unified access to API keys and credentials from GCP Secret Manager
 * with support for multiple AI providers and integration points.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fs = require('fs');
const path = require('path');

// Project ID to use for GCP Secret Manager
const DEFAULT_PROJECT_ID = 'api-for-warp-drive';

// Secret name mappings for different providers
const SECRET_NAMES = {
  // OpenAI secrets
  openai: ['dr-lucy-openai-key', 'openai-api-key'],
  
  // Anthropic/Claude secrets
  anthropic: ['new-admin-anthropic', 'lucy-claude-01', 'anthropic-admin'],
  
  // Pinecone secrets
  pinecone: ['pineconeconnect'],
  
  // Langchain secrets
  langchain: ['langchain03_api_for_warp_drive', 'langchain02', 'langchain'],
  
  // Google AI/Vertex AI secrets
  vertexai: ['gemini_api_project_key'],
  
  // GitHub integration
  github: [
    'dr-lucy-automation-01-git', 
    'github-oauth-warp-drive', 
    'GITHUB_TOKEN',
    'github-personal-access-token'
  ],
  
  // Sallyport integration
  sallyport: ['SALLYPORT_AUTH_TOKEN'],
  
  // Integration secrets
  integration: ['INTEGRATION_TOKEN', 'integration-config'],
  
  // Specific agent secrets
  agents: {
    'dr-lucia': ['dr-lucy', 'dr-lucy-auto-key'],
    'dr-grant': ['dr-grant'],
    'dr-match': ['dr-match'],
    'dr-memoria': ['dr-memoria'],
    'dr-sabina': ['dr-sabina'],
    'dr-burby': ['dr-burby'],
    'dr-cypriot': ['dr-cypriot'],
    'mr-roark': ['mr-roark', 'mr-roark-openai-key'],
    'professor-lee': ['professor-lee']
  }
};

// Cache for secrets to reduce API calls
const secretsCache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Secret Manager class for accessing credentials across multiple providers
 */
class SecretManager {
  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || DEFAULT_PROJECT_ID;
    this.client = null;
    this.fallbackCredentials = null;
    this.initialized = false;
  }

  /**
   * Initialize the Secret Manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize GCP Secret Manager client
      this.client = new SecretManagerServiceClient();
      
      // Try to load local fallback credentials
      const credentialsPath = path.resolve(process.cwd(), 'config/openai-api-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        this.fallbackCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        console.log('Loaded fallback credentials from local configuration');
      }
    } catch (error) {
      console.warn('Failed to initialize Secret Manager:', error.message);
    }
    
    this.initialized = true;
  }

  /**
   * Get a secret value from GCP Secret Manager
   * @param {string} secretName - Name of the secret
   * @returns {Promise<string>} - Secret value
   */
  async getSecret(secretName) {
    await this.initialize();
    
    // Check cache first
    if (secretsCache.has(secretName)) {
      const { value, timestamp } = secretsCache.get(secretName);
      if (Date.now() - timestamp < CACHE_TTL) {
        return value;
      }
      secretsCache.delete(secretName);
    }
    
    try {
      if (!this.client) {
        throw new Error('GCP Secret Manager client not initialized');
      }
      
      // Access secret from GCP Secret Manager
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.client.accessSecretVersion({ name });
      const secretValue = version.payload.data.toString();
      
      // Cache the secret
      secretsCache.set(secretName, {
        value: secretValue,
        timestamp: Date.now()
      });
      
      return secretValue;
    } catch (error) {
      console.error(`Error retrieving secret ${secretName}:`, error.message);
      
      // Try fallback credentials if available
      if (this.fallbackCredentials && this.fallbackCredentials[secretName]) {
        return this.fallbackCredentials[secretName];
      }
      
      throw error;
    }
  }

  /**
   * Try multiple secret names in order until one works
   * @param {string[]} secretNames - Array of secret names to try
   * @returns {Promise<string>} - First successful secret value
   */
  async trySecrets(secretNames) {
    for (const secretName of secretNames) {
      try {
        return await this.getSecret(secretName);
      } catch (error) {
        // Continue to next secret name
        console.log(`Secret ${secretName} not available, trying next option`);
      }
    }
    
    // If we reach here, no secrets worked
    console.warn(`No secrets found among options: ${secretNames.join(', ')}`);
    return '';
  }

  /**
   * Get credentials for specific provider
   * @param {string} provider - Provider name
   * @returns {Promise<string>} - API key or credentials
   */
  async getProviderCredentials(provider) {
    const secretNames = SECRET_NAMES[provider];
    if (!secretNames) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    return this.trySecrets(secretNames);
  }

  /**
   * Get API key for OpenAI
   * @returns {Promise<string>} - OpenAI API key
   */
  async getOpenAIKey() {
    return this.getProviderCredentials('openai');
  }

  /**
   * Get API key for Anthropic/Claude
   * @returns {Promise<string>} - Anthropic API key
   */
  async getAnthropicKey() {
    return this.getProviderCredentials('anthropic');
  }

  /**
   * Get API key for Pinecone
   * @returns {Promise<string>} - Pinecone API key
   */
  async getPineconeKey() {
    return this.getProviderCredentials('pinecone');
  }

  /**
   * Get API key for Langchain
   * @returns {Promise<string>} - Langchain API key
   */
  async getLangchainKey() {
    return this.getProviderCredentials('langchain');
  }

  /**
   * Get API key for Vertex AI
   * @returns {Promise<string>} - Vertex AI API key
   */
  async getVertexAIKey() {
    return this.getProviderCredentials('vertexai');
  }

  /**
   * Get GitHub API token
   * @returns {Promise<string>} - GitHub API token
   */
  async getGitHubToken() {
    return this.getProviderCredentials('github');
  }

  /**
   * Get API key for a specific agent
   * @param {string} agentName - Name of the agent
   * @returns {Promise<string>} - Agent API key
   */
  async getAgentKey(agentName) {
    const agentSecrets = SECRET_NAMES.agents[agentName];
    if (!agentSecrets) {
      throw new Error(`Unknown agent: ${agentName}`);
    }
    
    return this.trySecrets(agentSecrets);
  }

  /**
   * Get Pinecone environment setting
   * @returns {Promise<string>} - Pinecone environment
   */
  async getPineconeEnvironment() {
    try {
      return await this.getSecret('pinecone-environment');
    } catch (error) {
      // Try fallback
      if (this.fallbackCredentials && this.fallbackCredentials.pinecone_environment) {
        return this.fallbackCredentials.pinecone_environment;
      }
      
      // Return default
      return 'us-west1-gcp';
    }
  }

  /**
   * Get credentials for OAuth2 integration
   * @param {string} service - Service name
   * @returns {Promise<Object>} - OAuth2 credentials
   */
  async getOAuth2Credentials(service) {
    try {
      const credentials = await this.getSecret(`oauth-${service}`);
      return JSON.parse(credentials);
    } catch (error) {
      console.error(`Failed to get OAuth2 credentials for ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all agent credentials
   * @returns {Promise<Object>} - Map of agent names to credentials
   */
  async getAllAgentCredentials() {
    const result = {};
    const agents = Object.keys(SECRET_NAMES.agents);
    
    for (const agent of agents) {
      try {
        result[agent] = await this.getAgentKey(agent);
      } catch (error) {
        console.warn(`Could not retrieve credentials for agent: ${agent}`);
        result[agent] = '';
      }
    }
    
    return result;
  }
}

// Export singleton instance
module.exports = new SecretManager();