const express = require('express');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();
const winston = require('winston');
const packageJson = require('./package.json');
const app = express();

const PORT = process.env.PORT || 3333;

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Validate required environment variables
const requiredEnvVars = ['PROJECT_ID', 'SERVICE_ACCOUNT', 'DR_CLAUDE_API'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Add JSON and URL-encoded form support
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, { 
    ip: req.ip, 
    userAgent: req.get('user-agent') 
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error', { error: err.message, stack: err.stack });
  res.status(500).json({ 
    status: 'error', 
    message: 'An internal server error occurred',
    requestId: req.id
  });
});

// Graceful error handling
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  // Give time for logs to be written before potential restart
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { 
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : 'No stack trace available'
  });
});

// Execute CLI command helper function
function executeCliCommand(command, args = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, 'bin', 'aixtiv.js');
    
    // Convert args object to CLI arguments string
    const argsString = Object.entries(args)
      .map(([key, value]) => `--${key}=${value}`)
      .join(' ');
    
    const fullCommand = `node ${cliPath} ${command} ${argsString}`;
    logger.debug(`Executing CLI command: ${fullCommand}`);

    const childProcess = exec(fullCommand, { timeout }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`CLI execution error`, { command, error: error.message, stderr });
        return reject(error);
      }

      try {
        // Try to parse as JSON if possible
        try {
          const jsonOutput = JSON.parse(stdout);
          return resolve(jsonOutput);
        } catch (e) {
          // If not JSON, return as text
          return resolve({ output: stdout.trim() });
        }
      } catch (parseError) {
        logger.error(`CLI output parse error`, { command, error: parseError.message });
        reject(parseError);
      }
    });
  });
}

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: packageJson.version,
    timestamp: new Date().toISOString()
  });
});

// Root path with API documentation
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AIXTIV CLI API running',
    version: packageJson.version,
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        description: 'Health check endpoint for monitoring'
      },
      {
        path: '/claude-code-generate',
        method: 'POST',
        description: 'Generate code using Claude AI',
        body: { task: 'string', language: 'string' }
      },
      {
        path: '/api/agent/grant',
        method: 'POST',
        description: 'Grant agent access to a resource',
        body: { email: 'string', agent: 'string', resource: 'string', type: 'string (optional)' }
      },
      {
        path: '/api/agent/revoke',
        method: 'POST',
        description: 'Revoke agent access to a resource',
        body: { email: 'string', agent: 'string', resource: 'string' }
      },
      {
        path: '/api/auth/verify',
        method: 'POST',
        description: 'Verify authentication with SallyPort',
        body: { email: 'string (optional)', agent: 'string (optional)' }
      },
      {
        path: '/api/copilot/list',
        method: 'GET',
        description: 'List co-pilots linked to a principal',
        query: { email: 'string (optional)', status: 'string (optional)' }
      },
      {
        path: '/api/claude/project/list',
        method: 'GET',
        description: 'List Claude projects',
        query: { status: 'string (optional)', tags: 'string (optional)', priority: 'string (optional)', limit: 'number (optional)' }
      }
    ]
  });
});

// Keep the existing Claude code generation endpoint
app.post('/claude-code-generate', (req, res) => {
  const { task, language } = req.body;

  logger.info(`Received code generation request`, { task, language });

  // Call the actual CLI command instead of mock response
  executeCliCommand('claude:code:generate', { 
    task, 
    language: language || 'javascript' 
  })
  .then(result => {
    res.json(result);
  })
  .catch(error => {
    logger.error('Code generation failed', { error: error.message });
    res.status(500).json({ 
      status: 'error', 
      message: 'Code generation failed', 
      error: error.message 
    });
  });
});

// Add API endpoint for agent:grant command
app.post('/api/agent/grant', (req, res) => {
  const { email, agent, resource, type = 'full' } = req.body;
  
  if (!email || !agent || !resource) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required parameters: email, agent, and resource are required' 
    });
  }

  executeCliCommand('agent:grant', { email, agent, resource, type })
    .then(result => {
      res.json({ status: 'success', result });
    })
    .catch(error => {
      logger.error('Agent grant failed', { error: error.message });
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to grant agent access', 
        error: error.message 
      });
    });
});

// Add API endpoint for agent:revoke command
app.post('/api/agent/revoke', (req, res) => {
  const { email, agent, resource } = req.body;
  
  if (!email || !agent || !resource) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required parameters: email, agent, and resource are required' 
    });
  }

  executeCliCommand('agent:revoke', { email, agent, resource })
    .then(result => {
      res.json({ status: 'success', result });
    })
    .catch(error => {
      logger.error('Agent revoke failed', { error: error.message });
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to revoke agent access', 
        error: error.message 
      });
    });
});

// Add API endpoint for auth:verify command
app.post('/api/auth/verify', (req, res) => {
  const { email, agent } = req.body;
  
  if (!email && !agent) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'At least one of email or agent is required' 
    });
  }

  const args = {};
  if (email) args.email = email;
  if (agent) args.agent = agent;

  executeCliCommand('auth:verify', args)
    .then(result => {
      res.json({ status: 'success', result });
    })
    .catch(error => {
      logger.error('Auth verification failed', { error: error.message });
      res.status(500).json({ 
        status: 'error', 
        message: 'Authentication verification failed', 
        error: error.message 
      });
    });
});

// Add API endpoint for copilot:list command
app.get('/api/copilot/list', (req, res) => {
  const { email, status = 'active' } = req.query;
  
  const args = { status };
  if (email) args.email = email;

  executeCliCommand('copilot:list', args)
    .then(result => {
      res.json({ status: 'success', result });
    })
    .catch(error => {
      logger.error('Copilot list failed', { error: error.message });
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to list copilots', 
        error: error.message 
      });
    });
});

// Add API endpoint for claude:project:list command
app.get('/api/claude/project/list', (req, res) => {
  const { status = 'active', tags, priority, limit = '20' } = req.query;
  
  const args = { status, limit };
  if (tags) args.tags = tags;
  if (priority) args.priority = priority;

  executeCliCommand('claude:project:list', args)
    .then(result => {
      res.json({ status: 'success', result });
    })
    .catch(error => {
      logger.error('Claude project list failed', { error: error.message });
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to list Claude projects', 
        error: error.message 
      });
    });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API documentation available at http://localhost:${PORT}/`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
});
