const express = require('express');
const path = require('path');
const fs = require('fs');

// Load configuration
const MCP_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'mcp-config.json'), 'utf8'));

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());

// Configure static file serving with explicit options
const staticPath = path.join(__dirname, 'public');
console.log(`Serving static files from: ${staticPath}`);
console.log(`Directory exists: ${fs.existsSync(staticPath)}`);

if (fs.existsSync(staticPath)) {
  const staticFiles = fs.readdirSync(staticPath);
  console.log(`Static files found: ${staticFiles.join(', ')}`);
}

app.use(
  express.static(staticPath, {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['html', 'htm'],
    index: 'index.html',
    maxAge: '1d',
    redirect: false,
    setHeaders: function (res, path, stat) {
      res.set('x-timestamp', Date.now());
    },
  })
);

// Gateway connection status
let gatewayConnected = false;
let connectionAttempts = 0;

// Real gateway connection implementation
async function connectToGateway() {
  console.log('Connecting to integration gateway...');
  console.log(`Gateway endpoint: ${MCP_CONFIG.gateway.endpoint}`);

  try {
    // Make an actual HTTP request to the gateway
    const https = require('https');

    return new Promise((resolve, reject) => {
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-ID': MCP_CONFIG.gateway.serviceId,
          'X-Client-ID': MCP_CONFIG.gateway.clientId,
        },
      };

      const req = https.request(MCP_CONFIG.gateway.endpoint + '/status', requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Successfully connected to gateway');
            gatewayConnected = true;
            resolve({
              status: 'connected',
              timestamp: new Date().toISOString(),
              response: data,
            });
          } else {
            console.error(`Gateway connection failed with status: ${res.statusCode}`);
            gatewayConnected = false;
            reject(new Error(`Gateway responded with status code ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error connecting to gateway:', error.message);
        gatewayConnected = false;
        reject(error);
      });

      req.on('timeout', () => {
        console.error('Gateway connection timed out');
        req.destroy();
        gatewayConnected = false;
        reject(new Error('Gateway connection timed out'));
      });

      req.end();
    });
  } catch (error) {
    console.error('Error initiating gateway connection:', error.message);
    gatewayConnected = false;
    throw error;
  }
}

// Gateway status endpoint
app.get('/api/gateway-status', (req, res) => {
  res.json({
    connected: gatewayConnected,
    endpoint: MCP_CONFIG.gateway.endpoint,
    domain: MCP_CONFIG.domain,
    timestamp: new Date().toISOString(),
  });
});

// SallyPort Authentication Endpoints
// These endpoints implement passwordless authentication as described in the SallyPort security framework

// SallyPort session storage (in memory for now, use Redis or similar in production)
const sallyportSessions = new Map();
const sallyportChallenges = new Map();

// SallyPort initiate authentication endpoint
app.post('/api/sallyport/initiate', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        message: 'Identifier required',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate a unique challenge ID
    const challengeId = crypto.randomUUID
      ? crypto.randomUUID()
      : `challenge-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Create challenge with expiration (5 minutes)
    const challenge = {
      id: challengeId,
      identifier,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    };

    // Store challenge
    sallyportChallenges.set(challengeId, challenge);

    // Set expiration to clean up challenge
    setTimeout(
      () => {
        if (sallyportChallenges.has(challengeId)) {
          sallyportChallenges.delete(challengeId);
        }
      },
      5 * 60 * 1000
    );

    res.json({
      status: 'success',
      message: 'Authentication challenge initiated',
      challenge,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error initiating SallyPort authentication:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to initiate authentication: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort complete authentication endpoint
app.post('/api/sallyport/authenticate', async (req, res) => {
  try {
    const { challengeId, biometricResponse, deviceInfo } = req.body;

    if (!challengeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Challenge ID required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get and validate challenge
    const challenge = sallyportChallenges.get(challengeId);
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Challenge not found or expired',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if challenge has expired
    if (new Date(challenge.expiresAt) < new Date()) {
      sallyportChallenges.delete(challengeId);
      return res.status(401).json({
        status: 'error',
        message: 'Challenge expired',
        timestamp: new Date().toISOString(),
      });
    }

    // In a real implementation, this would verify biometrics or another passwordless factor
    // For this demo, we're automating the verification

    // Generate token and user data
    const token = `sp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const userId = `user-${challenge.identifier.replace(/[^a-zA-Z0-9]/g, '-')}`;

    // Create user object (in a real system, this would be fetched from a database)
    const user = {
      id: userId,
      name: 'Mr. Phillip Corey Roark',
      email: challenge.identifier,
      role: 'CEO',
      avatar: null,
      lastLogin: new Date().toISOString(),
    };

    // Store session
    sallyportSessions.set(token, {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      deviceInfo,
    });

    // Clean up challenge
    sallyportChallenges.delete(challengeId);

    // Return token and user data
    res.json({
      status: 'success',
      message: 'Authentication successful',
      token,
      user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error completing SallyPort authentication:', error);
    res.status(500).json({
      status: 'error',
      message: `Authentication failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort session verification endpoint
app.post('/api/sallyport/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and userId required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get and validate session
    const session = sallyportSessions.get(token);
    if (!session) {
      return res.status(401).json({
        status: 'error',
        message: 'Session not found or expired',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if session belongs to user
    if (session.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid session for user',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      sallyportSessions.delete(token);
      return res.status(401).json({
        status: 'error',
        message: 'Session expired',
        timestamp: new Date().toISOString(),
      });
    }

    // Session is valid
    res.json({
      status: 'success',
      message: 'Session verified',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error verifying SallyPort session:', error);
    res.status(500).json({
      status: 'error',
      message: `Verification failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort logout endpoint
app.post('/api/sallyport/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      sallyportSessions.delete(token);
    }

    res.json({
      status: 'success',
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging out SallyPort session:', error);
    res.status(500).json({
      status: 'error',
      message: `Logout failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// API key request endpoint - real implementation
app.post('/api/request-key', async (req, res) => {
  console.log('Received API key request');

  if (!gatewayConnected) {
    return res.status(503).json({
      status: 'error',
      message: 'Gateway connection is not established',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const https = require('https');
    const requestBody = JSON.stringify({
      serviceId: MCP_CONFIG.gateway.serviceId,
      clientId: MCP_CONFIG.gateway.clientId,
      domain: MCP_CONFIG.domain,
    });

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'X-Service-ID': MCP_CONFIG.gateway.serviceId,
        'X-Client-ID': MCP_CONFIG.gateway.clientId,
      },
    };

    const apiKeyRequest = new Promise((resolve, reject) => {
      const req = https.request(
        MCP_CONFIG.gateway.endpoint + '/api-keys',
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
                resolve(parsedData);
              } catch (e) {
                reject(new Error('Failed to parse gateway response'));
              }
            } else {
              reject(new Error(`Gateway responded with status code ${res.statusCode}`));
            }
          });
        }
      );

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });

    const result = await apiKeyRequest;

    // Store the API key securely in memory (in production, consider using a more secure storage)
    const apiKey = result.apiKey || result.key || result.token;
    if (!apiKey) {
      throw new Error('No API key received from gateway');
    }

    // Return real API key data from the gateway
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      apiKey: apiKey,
      expiresIn: result.expiresIn || 3600,
      expiresAt:
        result.expiresAt || new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
      metadata: result.metadata || {},
      message: 'API key requested successfully',
    });
  } catch (error) {
    console.error('Error requesting API key:', error.message);
    res.status(500).json({
      status: 'error',
      message: `Failed to request API key: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'ASOOS UI is running with Integration Gateway',
    symphony: MCP_CONFIG.symphony,
    timestamp: new Date().toISOString(),
  });
});

// Webhook endpoints for real-time gateway communication
// These endpoints receive callbacks from the Integration Gateway

// Key rotation webhook - called when API keys are rotated
app.post('/webhook/key-rotation', (req, res) => {
  console.log('Received key rotation webhook call');
  try {
    // Verify the webhook signature if provided
    if (req.headers['x-gateway-signature']) {
      // In production, validate this signature
      console.log('Webhook signature:', req.headers['x-gateway-signature']);
    }

    const data = req.body;
    console.log('Key rotation data received:', data);

    // Store the new API key securely
    if (data.apiKey) {
      console.log('New API key received via webhook');
      // In a real implementation, store this securely
    }

    res.status(200).json({
      status: 'success',
      message: 'Key rotation webhook processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing key rotation webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing webhook',
      timestamp: new Date().toISOString(),
    });
  }
});

// Gateway health webhook - called when gateway status changes
app.post('/webhook/gateway-health', (req, res) => {
  console.log('Received gateway health webhook call');
  try {
    const data = req.body;
    console.log('Gateway health data received:', data);

    // Update gateway connection status
    if (data.status === 'healthy') {
      gatewayConnected = true;
      console.log('Gateway is now healthy according to webhook');
    } else if (data.status === 'unhealthy') {
      gatewayConnected = false;
      console.log('Gateway is now unhealthy according to webhook, scheduling reconnection');
      scheduleReconnection();
    }

    res.status(200).json({
      status: 'success',
      message: 'Gateway health webhook processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing gateway health webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing webhook',
      timestamp: new Date().toISOString(),
    });
  }
});

// Model update webhook - called when AI model parameters change
app.post('/webhook/model-update', (req, res) => {
  console.log('Received model update webhook call');
  try {
    const data = req.body;
    console.log('Model update data received:', data);

    // Update Claude model configuration
    if (data.claude && data.claude.modelName) {
      console.log(
        `Updating Claude model from ${MCP_CONFIG.claude.modelName} to ${data.claude.modelName}`
      );
      MCP_CONFIG.claude.modelName = data.claude.modelName;
    }

    if (data.claude && data.claude.maxTokens) {
      console.log(
        `Updating max tokens from ${MCP_CONFIG.claude.maxTokens} to ${data.claude.maxTokens}`
      );
      MCP_CONFIG.claude.maxTokens = data.claude.maxTokens;
    }

    res.status(200).json({
      status: 'success',
      message: 'Model update webhook processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing model update webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing webhook',
      timestamp: new Date().toISOString(),
    });
  }
});

// Default route with improved error handling
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  console.log(`Request URL: ${req.url}`);
  console.log(`Serving file: ${filePath}`);
  console.log(`File exists: ${fs.existsSync(filePath)}`);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file: ${err.message}`);
        res.status(500).send(`Server Error: ${err.message}`);
      }
    });
  } else {
    console.error(`Error: index.html not found at ${filePath}`);
    res.status(404).send('Error: index.html not found on server');
  }
});

// Maximum retry attempts
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVAL = 5000; // 5 seconds

// Retry logic for gateway connection with exponential backoff
async function connectWithRetry(attempt = 1) {
  try {
    console.log(`Gateway connection attempt ${attempt} of ${MAX_RETRY_ATTEMPTS}...`);
    const result = await connectToGateway();
    console.log('Gateway connection successful:', result);
    return result;
  } catch (error) {
    console.error(`Connection attempt ${attempt} failed:`, error.message);

    if (attempt < MAX_RETRY_ATTEMPTS) {
      const backoffTime = RETRY_INTERVAL * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${backoffTime / 1000} seconds...`);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(connectWithRetry(attempt + 1));
        }, backoffTime);
      });
    } else {
      console.error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached. Giving up.`);
      throw error;
    }
  }
}

// Scheduled reconnection if connection is lost
function scheduleReconnection() {
  if (gatewayConnected) return; // Don't schedule if already connected

  console.log('Scheduling gateway reconnection attempt...');
  setTimeout(async () => {
    try {
      await connectWithRetry();
      console.log('Gateway reconnection successful');
    } catch (error) {
      console.error('Reconnection failed:', error.message);
      // Schedule another reconnection attempt
      scheduleReconnection();
    }
  }, 60000); // Try to reconnect every minute
}

// Start the server with improved error handling
connectWithRetry()
  .then((result) => {
    console.log('Gateway connection result:', result);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Gateway integration: ${gatewayConnected ? 'ACTIVE' : 'INACTIVE'}`);

      // Register error handlers for unexpected errors
      process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);

        if (error.message.includes('gateway') || error.message.includes('connection')) {
          gatewayConnected = false;
          scheduleReconnection();
        }
      });
    });
  })
  .catch((error) => {
    console.error('Failed to connect to gateway after multiple attempts:', error.message);

    // Start server anyway
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Gateway integration: INACTIVE (connection failed)');

      // Schedule reconnection attempts
      scheduleReconnection();
    });
  });
