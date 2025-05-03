# OAuth2 Implementation Plan for Claude API in Aixtiv CLI

## 1. Overview and Objectives

### Current State
The Aixtiv CLI currently authenticates with the Claude API using direct API key authentication. The API key is passed through the `anthropic-api-key` header in requests. This implementation has led to a 404 error when attempting to access the Claude API endpoint, suggesting potential issues with authentication or endpoint configuration.

### Objectives
- Implement OAuth2 authentication for all Claude API interactions
- Resolve the 404 error by properly authenticating with the Claude API endpoint
- Ensure backward compatibility for systems not yet migrated to OAuth2
- Maintain the existing security practices of the Aixtiv CLI
- Align with the ASOOS architecture principles and Dr. Claude Command Suite functionality

### Benefits
- Enhanced security through token-based authentication
- Reduced risk of credential exposure
- Fine-grained access control
- Automated token refresh
- Improved audit trail

## 2. New Files to be Created for OAuth2 Implementation

### `/lib/oauth2/client.js`
Central OAuth2 client implementation that handles authentication flows, token management, and requests.

### `/lib/oauth2/token-store.js`
Secure storage mechanism for OAuth2 tokens with encryption and refresh capabilities.

### `/lib/oauth2/providers/anthropic.js`
Anthropic-specific OAuth2 implementation details, including endpoints and scopes.

### `/config/oauth2-config.json`
Configuration file for OAuth2 providers, including client IDs, authorization endpoints, and default scopes.

### `/commands/auth/oauth2-login.js`
Command to initiate the OAuth2 authorization flow and obtain access tokens.

## 3. Modifications to Existing Files

### `/commands/claude/code/generate.js`
- Replace API key authentication with OAuth2 token-based authentication
- Implement fallback to API key when OAuth2 token is not available
- Add error handling specific to OAuth2 authentication failures
- Update request headers to include access token

### `/lib/auth.js`
- Add OAuth2 authentication methods
- Maintain compatibility with existing authentication methods
- Implement token validation and refresh functions

### `/commands/auth/verify.js`
- Enhance to support OAuth2 token verification
- Add commands to display OAuth2 token status

### `/fix-claude-endpoint.js` and `/fix-claude-api-usage.js`
- Update to support OAuth2 authentication
- Ensure backward compatibility

## 4. Environment Variable Changes

**New Environment Variables:**
- `CLAUDE_OAUTH_CLIENT_ID`: Client ID for OAuth2 authentication with Anthropic
- `CLAUDE_OAUTH_CLIENT_SECRET`: Client secret for OAuth2 authentication
- `CLAUDE_OAUTH_REDIRECT_URI`: Redirect URI for OAuth2 authorization flow
- `CLAUDE_OAUTH_SCOPE`: Scopes required for API access (default: "code:generate code:execute")
- `CLAUDE_OAUTH_TOKEN_ENDPOINT`: OAuth2 token endpoint URL
- `CLAUDE_OAUTH_AUTH_ENDPOINT`: OAuth2 authorization endpoint URL

**Updated Usage of Existing Variables:**
- `ANTHROPIC_API_KEY`: Maintain for backward compatibility
- `CLAUDE_API_ENDPOINT`: Support both API key and OAuth2 authentication

## 5. Configuration Updates

### Update `/config/api-config.json`:
```json
{
  "claude": {
    "api": {
      "endpoint": "https://api.anthropic.com/v1/messages",
      "version": "2023-06-01",
      "auth": {
        "type": "oauth2",
        "fallback": "api_key",
        "scopes": ["code:generate", "code:execute"]
      }
    }
  }
}
```

### Update `/cloud-config/claude.desktop.config.json`:
```json
{
  "servers": {
    "ctt-mcp": {
      "url": "https://us-west1-mcp.anthropic.com",
      "region": "us-west1-b",
      "project": "api-for-warp-drive",
      "auth": {
        "type": "oauth2",
        "client_id": "${CLAUDE_OAUTH_CLIENT_ID}",
        "token_endpoint": "https://auth.anthropic.com/oauth2/token",
        "auth_endpoint": "https://auth.anthropic.com/oauth2/authorize"
      },
      "services": {
        // ... existing services configuration ...
      }
    }
  }
}
```

## 6. Implementation Steps with Code Examples

### Step 1: Create OAuth2 Client Library

```javascript
// /lib/oauth2/client.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logAgentAction } = require('../agent-tracking');

class OAuth2Client {
  constructor(options) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
    this.tokenEndpoint = options.tokenEndpoint;
    this.authEndpoint = options.authEndpoint;
    this.scopes = options.scopes || [];
    this.tokenStore = options.tokenStore;
    this.provider = options.provider;
  }

  async getAuthorizationUrl() {
    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state
    });

    return `${this.authEndpoint}?${params.toString()}`;
  }

  async getTokenFromCode(code) {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 token request failed: ${error}`);
    }

    const tokenData = await response.json();
    await this.tokenStore.saveToken(this.provider, tokenData);
    return tokenData;
  }

  async refreshToken() {
    const currentToken = await this.tokenStore.getToken(this.provider);
    if (!currentToken || !currentToken.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentToken.refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 token refresh failed: ${error}`);
    }

    const tokenData = await response.json();
    // Preserve refresh token if not returned
    if (!tokenData.refresh_token && currentToken.refresh_token) {
      tokenData.refresh_token = currentToken.refresh_token;
    }
    await this.tokenStore.saveToken(this.provider, tokenData);
    return tokenData;
  }

  async getAccessToken() {
    try {
      const token = await this.tokenStore.getToken(this.provider);
      
      if (!token) {
        throw new Error('No access token available');
      }

      // Check if token is expired
      if (token.expires_at && token.expires_at < Date.now()) {
        return this.refreshToken();
      }

      return token;
    } catch (error) {
      logAgentAction('oauth2_token_error', {
        provider: this.provider,
        error: error.message
      });
      throw error;
    }
  }

  async fetchWithToken(url, options = {}) {
    try {
      const token = await this.getAccessToken();
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token.access_token}`
      };

      return fetch(url, {
        ...options,
        headers
      });
    } catch (error) {
      throw new Error(`OAuth2 authorized request failed: ${error.message}`);
    }
  }
}

module.exports = OAuth2Client;
```

### Step 2: Update Generate.js to Use OAuth2

```javascript
// Modified section from /commands/claude/code/generate.js
const OAuth2Client = require('../../../lib/oauth2/client');
const TokenStore = require('../../../lib/oauth2/token-store');
const config = require('../../../config/api-config.json');

// Initialize OAuth2 client for anthropic
const tokenStore = new TokenStore();
const anthropicOAuth = new OAuth2Client({
  clientId: process.env.CLAUDE_OAUTH_CLIENT_ID,
  clientSecret: process.env.CLAUDE_OAUTH_CLIENT_SECRET,
  redirectUri: process.env.CLAUDE_OAUTH_REDIRECT_URI,
  tokenEndpoint: process.env.CLAUDE_OAUTH_TOKEN_ENDPOINT || 'https://auth.anthropic.com/oauth2/token',
  authEndpoint: process.env.CLAUDE_OAUTH_AUTH_ENDPOINT || 'https://auth.anthropic.com/oauth2/authorize',
  scopes: (process.env.CLAUDE_OAUTH_SCOPE || 'code:generate code:execute').split(' '),
  tokenStore,
  provider: 'anthropic'
});

// Existing API endpoint configuration updated
const functionUrl = process.env.CLAUDE_API_ENDPOINT || process.env.DR_CLAUDE_API || 'https://api.anthropic.com/v1/messages';

// Modified fetch request to use OAuth2
try {
  let response;
  try {
    // Try OAuth2 authentication first
    response = await anthropicOAuth.fetchWithToken(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'X-Agent-ID': getCurrentAgentId() // Add agent ID in headers for tracking
      },
      body: JSON.stringify(payload),
      agent: httpsAgent, // SSL certificate validation option
      timeout: 15000 // 15 second timeout
    });
  } catch (oauthError) {
    console.warn(`OAuth2 authentication failed: ${oauthError.message}`);
    console.warn('Falling back to API key authentication...');
    
    // Fall back to API key authentication
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-api-key': process.env.ANTHROPIC_API_KEY || process.env.DR_CLAUDE_API || '',
        'anthropic-version': '2023-06-01',
        'X-Agent-ID': getCurrentAgentId() // Add agent ID in headers for tracking
      },
      body: JSON.stringify(payload),
      agent: httpsAgent, // SSL certificate validation option
      timeout: 15000 // 15 second timeout
    });
  }
  
  // Process response as before
  if (!response.ok) {
    // Capture the error response details
    try {
      const errorBody = await response.text();
      console.error(`Anthropic API Error (${response.status}):\n`, errorBody);
      throw new Error(`API responded with status ${response.status}: ${errorBody}`);
    } catch (e) {
      throw new Error(`API responded with status ${response.status}`);
    }
  }
  
  const jsonResponse = await response.json();
  // Rest of the code remains the same
} catch (error) {
  // Enhanced error handling for OAuth2 errors
  if (error.message.includes('oauth2') || error.message.includes('token')) {
    console.error(chalk.red('\nAuthentication error:'), error.message);
    console.error(chalk.yellow('\nTry re-authenticating with:'));
    console.error('  aixtiv auth:oauth2-login --provider=anthropic');
  } else if (error.message.includes('ECONNREFUSED') || 
      error.message.includes('404') || 
      error.message.includes('timeout') ||
      error.message.includes('network')) {
    
    console.warn(chalk.yellow("\nCould not reach Claude API endpoint. Using local fallback generator."));
    
    // Use fallback generator
    const fallbackResult = fallbackGenerator.generateCode(task, language || 'javascript');
  } else {
    throw error;
  }
}
```

### Step 3: Create OAuth2 Login Command

```javascript
// /commands/auth/oauth2-login.js
const { Command } = require('commander');
const open = require('open');
const http = require('http');
const url = require('url');
const chalk = require('chalk');
const { OAuth2Client } = require('../../lib/oauth2/client');
const { TokenStore } = require('../../lib/oauth2/token-store');
const { logAgentAction } = require('../../lib/agent-tracking');

module.exports = function(program) {
  program
    .command('auth:oauth2-login')
    .description('Authenticate with an OAuth2 provider')
    .option('-p, --provider <provider>', 'OAuth2 provider (e.g., anthropic)')
    .option('-s, --scopes <scopes>', 'Space-separated OAuth2 scopes')
    .option('-n, --non-interactive', 'Generate login URL without launching browser')
    .action(async (options) => {
      const provider = options.provider || 'anthropic';
      const tokenStore = new TokenStore();
      
      // Get configuration based on provider
      const config = getProviderConfig(provider);
      
      const oauth2Client = new OAuth2Client({
        clientId: process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`] || config.client_id,
        clientSecret: process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`] || config.client_secret,
        redirectUri: process.env[`${provider.toUpperCase()}_OAUTH_REDIRECT_URI`] || config.redirect_uri || 'http://localhost:3000/oauth/callback',
        tokenEndpoint: process.env[`${provider.toUpperCase()}_OAUTH_TOKEN_ENDPOINT`] || config.token_endpoint,
        authEndpoint: process.env[`${provider.toUpperCase()}_OAUTH_AUTH_ENDPOINT`] || config.auth_endpoint,
        scopes: options.scopes ? options.scopes.split(' ') : config.scopes,
        tokenStore,
        provider
      });
      
      const authUrl = await oauth2Client.getAuthorizationUrl();
      
      if (options.nonInteractive) {
        console.log(chalk.green('Please visit the following URL to authorize:'));
        console.log(chalk.cyan(authUrl));
        console.log(chalk.yellow('\nThen run:'));
        console.log(chalk.yellow(`aixtiv auth:oauth2-callback

