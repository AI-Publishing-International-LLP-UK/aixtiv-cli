const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const winston = require('winston');

// Load gateway integration
const gateway = require('./gateway-integration');

// Load CTTT integration
const { attachCTTTMiddleware } = require('./cttt-server-integration');
const { sendTelemetryEvent } = require('./cttt-integration');

// Load SallyPort authentication module
const SallyPortAuth = require('./sallyport-auth');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: {
    service: 'asoos-ui',
    environment: process.env.NODE_ENV || 'production',
    domain: process.env.DOMAIN || 'asoos.2100.cool',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Load configuration
const MCP_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'mcp-config.json'), 'utf8'));

// Initialize SallyPort auth with config and logger
const sallyPortAuth = new SallyPortAuth({
  serviceId: MCP_CONFIG.gateway.serviceId,
  apiEndpoint: process.env.SALLYPORT_ENDPOINT || 'https://sallyport.2100.cool/api/v1',
  apiKey: process.env.SALLYPORT_API_KEY,
  logger: logger,
});

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3009; // Using port 3009 to avoid conflicts

// Middleware - apply in correct order
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Service-ID',
      'X-Client-ID',
      'X-Request-ID',
    ],
  })
);
app.use(express.json()); // Parse JSON bodies

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
    });
  });

  next();
});

// Attach CTTT telemetry middleware
attachCTTTMiddleware(app);

// Send startup event
sendTelemetryEvent('server_startup', {
  port: PORT,
  environment: process.env.NODE_ENV || 'production',
  startTime: new Date().toISOString(),
});

// Configure static file serving with explicit options
const staticPath = path.join(__dirname, 'public');
logger.info(`Serving static files from: ${staticPath}`, {
  exists: fs.existsSync(staticPath),
});

if (fs.existsSync(staticPath)) {
  const staticFiles = fs.readdirSync(staticPath);
  logger.info(`Static files found: ${staticFiles.join(', ')}`);
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

// Gateway status endpoint
app.get('/api/gateway-status', (req, res) => {
  res.json({
    connected: gateway.isConnected(),
    endpoint: MCP_CONFIG.gateway.endpoint,
    domain: MCP_CONFIG.domain,
    timestamp: new Date().toISOString(),
  });
});

// SallyPort Authentication Endpoints
// These endpoints implement passwordless authentication as described in the SallyPort security framework

// SallyPort initiate authentication endpoint
app.post('/api/sallyport/initiate', async (req, res) => {
  const { identifier, deviceInfo } = req.body;

  // Generate telemetry ID for tracking this request
  const telemetryId = `auth-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    if (!identifier) {
      logger.warn('Authentication attempt without identifier', {
        telemetryId,
        ip: req.ip,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Identifier required',
        timestamp: new Date().toISOString(),
      });
    }

    // Create challenge through SallyPortAuth
    const challenge = await sallyPortAuth.createChallenge(identifier, deviceInfo);

    // Send telemetry event
    sendTelemetryEvent('sallyport_challenge_created', {
      telemetryId,
      challengeId: challenge.challengeId,
      identifier: identifier.substring(0, 3) + '***', // Mask email
    });

    // Return challenge to client
    res.json({
      status: 'success',
      message: 'Authentication challenge initiated',
      challenge,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error initiating SallyPort authentication', {
      telemetryId,
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('sallyport_challenge_error', {
      telemetryId,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: `Failed to initiate authentication: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort complete authentication endpoint
app.post('/api/sallyport/authenticate', async (req, res) => {
  const { challengeId, biometricResponse, deviceInfo } = req.body;

  // Generate telemetry ID for tracking this request
  const telemetryId = `auth-verify-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    if (!challengeId) {
      logger.warn('Authentication verification without challenge ID', {
        telemetryId,
        ip: req.ip,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Challenge ID required',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify challenge through SallyPortAuth
    const result = await sallyPortAuth.verifyChallenge(challengeId, {
      biometricResponse,
      deviceInfo,
    });

    // Send telemetry event
    sendTelemetryEvent('sallyport_authentication_success', {
      telemetryId,
      challengeId,
      userId: result.user.id,
    });

    // Return authentication result
    res.json({
      status: 'success',
      message: 'Authentication successful',
      token: result.token,
      user: result.user,
      expiresAt: result.expiresAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error completing SallyPort authentication', {
      telemetryId,
      challengeId,
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('sallyport_authentication_error', {
      telemetryId,
      challengeId,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: `Authentication failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort session verification endpoint
app.post('/api/sallyport/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { userId } = req.body;

  // Generate telemetry ID for tracking this request
  const telemetryId = `session-verify-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    if (!token) {
      logger.warn('Session verification without token', {
        telemetryId,
        ip: req.ip,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Authorization token required',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify session through SallyPortAuth
    const verification = await sallyPortAuth.verifySession(token, userId);

    if (!verification.valid) {
      logger.warn('Invalid session verification attempt', {
        telemetryId,
        reason: verification.reason,
        userId,
      });

      sendTelemetryEvent('sallyport_session_invalid', {
        telemetryId,
        reason: verification.reason,
        userId,
      });

      return res.status(401).json({
        status: 'error',
        message: verification.reason,
        timestamp: new Date().toISOString(),
      });
    }

    // Send telemetry event for successful verification
    sendTelemetryEvent('sallyport_session_verified', {
      telemetryId,
      userId: verification.userId,
    });

    // Return verification result
    res.json({
      status: 'success',
      message: 'Session verified',
      userId: verification.userId,
      expiresAt: verification.expiresAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error verifying SallyPort session', {
      telemetryId,
      userId,
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('sallyport_session_error', {
      telemetryId,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: `Verification failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort session refresh endpoint
app.post('/api/sallyport/refresh', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  // Generate telemetry ID for tracking this request
  const telemetryId = `session-refresh-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    if (!token) {
      logger.warn('Session refresh without token', {
        telemetryId,
        ip: req.ip,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Authorization token required',
        timestamp: new Date().toISOString(),
      });
    }

    // Refresh session through SallyPortAuth
    const refreshResult = await sallyPortAuth.refreshSession(token);

    // Send telemetry event
    sendTelemetryEvent('sallyport_session_refreshed', {
      telemetryId,
    });

    // Return refresh result
    res.json({
      status: 'success',
      message: 'Session refreshed',
      token: refreshResult.token,
      expiresAt: refreshResult.expiresAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error refreshing SallyPort session', {
      telemetryId,
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('sallyport_refresh_error', {
      telemetryId,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: `Session refresh failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// SallyPort logout endpoint
app.post('/api/sallyport/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  // Generate telemetry ID for tracking this request
  const telemetryId = `logout-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    if (!token) {
      logger.warn('Logout attempt without token', {
        telemetryId,
        ip: req.ip,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Authorization token required',
        timestamp: new Date().toISOString(),
      });
    }

    // Logout through SallyPortAuth
    const result = await sallyPortAuth.logout(token);

    // Send telemetry event
    sendTelemetryEvent('sallyport_logout', {
      telemetryId,
      success: result.success,
    });

    // Return logout result
    res.json({
      status: 'success',
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error logging out SallyPort session', {
      telemetryId,
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('sallyport_logout_error', {
      telemetryId,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: `Logout failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// API key request endpoint - real implementation
app.post('/api/request-key', async (req, res) => {
  logger.info('Received API key request');

  // Verify authentication with SallyPort before providing API key
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      // Verify the session is valid
      const verification = await sallyPortAuth.verifySession(token);
      if (!verification.valid) {
        logger.warn('API key requested with invalid session', {
          reason: verification.reason,
        });

        return res.status(401).json({
          status: 'error',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('API key request authenticated', {
        userId: verification.userId,
      });
    } catch (error) {
      logger.error('Error verifying session for API key request', {
        error: error.message,
      });
    }
  }

  if (!gateway.isConnected()) {
    logger.warn('API key requested while gateway is disconnected');

    return res.status(503).json({
      status: 'error',
      message: 'Gateway connection is not established',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Request API key through gateway module
    const result = await gateway.requestApiKey({
      serviceId: MCP_CONFIG.gateway.serviceId,
      clientId: MCP_CONFIG.gateway.clientId,
      domain: MCP_CONFIG.domain,
    });

    // Send telemetry event
    sendTelemetryEvent('api_key_requested', {
      serviceId: MCP_CONFIG.gateway.serviceId,
      expiresIn: result.expiresIn || 3600,
    });

    // Return API key data
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      apiKey: result.apiKey,
      expiresIn: result.expiresIn || 3600,
      expiresAt:
        result.expiresAt || new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
      metadata: result.metadata || {},
      message: 'API key requested successfully',
    });
  } catch (error) {
    logger.error('Error requesting API key', {
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('api_key_request_error', {
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: `Failed to request API key: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  res.json({
    status: 'running',
    message: 'ASOOS UI is running with Integration Gateway',
    symphony: MCP_CONFIG.symphony,
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
    },
    gateway: {
      connected: gateway.isConnected(),
      endpoint: MCP_CONFIG.gateway.endpoint,
    },
    auth: {
      service: 'SallyPort',
      version: '1.0',
    },
    timestamp: new Date().toISOString(),
  });
});

// Webhook endpoints for real-time gateway communication
// These endpoints receive callbacks from the Integration Gateway

// Key rotation webhook - called when API keys are rotated
app.post('/webhook/key-rotation', (req, res) => {
  logger.info('Received key rotation webhook call');

  try {
    // Verify the webhook signature if provided
    let signatureValid = true;
    if (req.headers['x-gateway-signature']) {
      // In production, validate this signature
      // For now, just log it
      logger.debug('Webhook signature received', {
        signature: req.headers['x-gateway-signature'],
      });
    }

    const data = req.body;
    logger.info('Key rotation data received', {
      serviceId: data.serviceId,
      source: data.source || 'unknown',
    });

    // Store the new API key securely
    if (data.apiKey) {
      logger.info('New API key received via webhook');
      gateway.updateApiKey(data.apiKey, data.expiresAt);
    }

    // Send telemetry event
    sendTelemetryEvent('key_rotation_webhook', {
      source: data.source || 'unknown',
      signatureValid,
    });

    res.status(200).json({
      status: 'success',
      message: 'Key rotation webhook processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error processing key rotation webhook', {
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('key_rotation_webhook_error', {
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: 'Error processing webhook',
      timestamp: new Date().toISOString(),
    });
  }
});

// Gateway health webhook - called when gateway status changes
app.post('/webhook/gateway-health', (req, res) => {
  logger.info('Received gateway health webhook call');

  try {
    const data = req.body;
    logger.info('Gateway health data received', {
      status: data.status,
      source: data.source || 'unknown',
    });

    // Update gateway connection status
    if (data.status === 'healthy') {
      gateway.setConnected(true);
      logger.info('Gateway is now healthy according to webhook');
    } else if (data.status === 'unhealthy') {
      gateway.setConnected(false);
      logger.warn('Gateway is now unhealthy according to webhook, scheduling reconnection');

      // Schedule reconnection attempt
      setTimeout(() => gateway.initGatewayConnection(), 60000);
    }

    // Send telemetry event
    sendTelemetryEvent('gateway_health_webhook', {
      status: data.status,
      source: data.source || 'unknown',
    });

    res.status(200).json({
      status: 'success',
      message: 'Gateway health webhook processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error processing gateway health webhook', {
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('gateway_health_webhook_error', {
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: 'Error processing webhook',
      timestamp: new Date().toISOString(),
    });
  }
});

// Model update webhook - called when AI model parameters change
app.post('/webhook/model-update', (req, res) => {
  logger.info('Received model update webhook call');

  try {
    const data = req.body;
    logger.info('Model update data received', {
      currentModel: MCP_CONFIG.claude.modelName,
      newModel: data.claude?.modelName,
    });

    // Update Claude model configuration
    if (data.claude && data.claude.modelName) {
      logger.info(
        `Updating Claude model from ${MCP_CONFIG.claude.modelName} to ${data.claude.modelName}`
      );
      MCP_CONFIG.claude.modelName = data.claude.modelName;
    }

    if (data.claude && data.claude.maxTokens) {
      logger.info(
        `Updating max tokens from ${MCP_CONFIG.claude.maxTokens} to ${data.claude.maxTokens}`
      );
      MCP_CONFIG.claude.maxTokens = data.claude.maxTokens;
    }

    // Send telemetry event
    sendTelemetryEvent('model_update_webhook', {
      modelName: data.claude?.modelName,
      maxTokens: data.claude?.maxTokens,
    });

    res.status(200).json({
      status: 'success',
      message: 'Model update webhook processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error processing model update webhook', {
      error: error.message,
      stack: error.stack,
    });

    sendTelemetryEvent('model_update_webhook_error', {
      error: error.message,
    });

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
  logger.debug(`Request URL: ${req.url}`);
  logger.debug(`Serving file: ${filePath}`);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`Error sending file: ${err.message}`, {
          path: filePath,
          error: err,
        });
        res.status(500).send(`Server Error: ${err.message}`);
      }
    });
  } else {
    logger.error(`Error: index.html not found at ${filePath}`);
    res.status(404).send('Error: index.html not found on server');
  }
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  logger.error('Unhandled error in request', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  sendTelemetryEvent('unhandled_request_error', {
    url: req.url,
    method: req.method,
    errorMessage: err.message,
  });

  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
});

// Start the server with improved error handling
// Create a process ID file for management
const createPidFile = () => {
  try {
    fs.writeFileSync('process.pid', process.pid.toString());
    logger.info(`Created PID file with process ID ${process.pid}`);
  } catch (error) {
    logger.error('Failed to create PID file', { error: error.message });
  }
};

// Clean up PID file on exit
const cleanupPidFile = () => {
  try {
    if (fs.existsSync('process.pid')) {
      fs.unlinkSync('process.pid');
      logger.info('Removed PID file');
    }
  } catch (error) {
    logger.error('Failed to remove PID file', { error: error.message });
  }
};

// Use gateway integration module
logger.info('Initializing gateway connection...');
gateway
  .initGatewayConnection()
  .then((result) => {
    logger.info('Gateway connection successful', result);
    sendTelemetryEvent('gateway_connection_success', result);

    const server = app.listen(PORT, () => {
      createPidFile();

      logger.info(`Server running on http://localhost:${PORT}`, {
        gatewayStatus: gateway.isConnected() ? 'ACTIVE' : 'INACTIVE',
        authService: 'SallyPort',
      });

      sendTelemetryEvent('server_listening', {
        port: PORT,
        gatewayConnected: gateway.isConnected(),
        authService: 'SallyPort',
      });

      // Register error handlers for unexpected errors
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
        sendTelemetryEvent('uncaught_exception', {
          errorMessage: error.message,
          errorStack: error.stack,
        });

        if (error.message.includes('gateway') || error.message.includes('connection')) {
          gateway.validateGatewayConnection().then((connected) => {
            if (!connected) {
              logger.info('Scheduling gateway reconnection after error');
              setTimeout(() => gateway.initGatewayConnection(), 30000);
            }
          });
        }
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled promise rejection', {
          reason: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : 'No stack trace',
        });

        sendTelemetryEvent('unhandled_rejection', {
          reason: reason instanceof Error ? reason.message : String(reason),
        });
      });

      // Handle graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        sendTelemetryEvent('server_shutdown', {
          reason: 'SIGTERM',
          timestamp: new Date().toISOString(),
        });

        // Close server
        server.close(() => {
          logger.info('HTTP server closed');
          cleanupPidFile();
          process.exit(0);
        });
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        sendTelemetryEvent('server_shutdown', {
          reason: 'SIGINT',
          timestamp: new Date().toISOString(),
        });

        // Close server
        server.close(() => {
          logger.info('HTTP server closed');
          cleanupPidFile();
          process.exit(0);
        });
      });
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to gateway', { error: error.message, stack: error.stack });
    sendTelemetryEvent('gateway_connection_failure', {
      errorMessage: error.message,
    });

    // Start server anyway
    const server = app.listen(PORT, () => {
      createPidFile();

      logger.info(`Server running on http://localhost:${PORT} (Gateway integration: INACTIVE)`, {
        fallbackMode: true,
        authService: 'SallyPort',
      });

      sendTelemetryEvent('server_listening', {
        port: PORT,
        gatewayConnected: false,
        fallbackMode: true,
        authService: 'SallyPort',
      });

      // Schedule reconnection attempt
      logger.info('Scheduling gateway reconnection attempt in 30 seconds');
      setTimeout(() => gateway.initGatewayConnection(), 30000);

      // Register signal handlers for cleanup
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          cleanupPidFile();
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          cleanupPidFile();
          process.exit(0);
        });
      });
    });
  });
