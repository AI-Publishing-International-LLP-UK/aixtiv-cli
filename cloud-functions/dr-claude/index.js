const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Logging } = require('@google-cloud/logging');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore client
const firestore = new Firestore();

// Initialize Google Cloud Logging
const logging = new Logging();
const log = logging.log('dr-claude-function');

// Create Express app
const app = express();

// Configure middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Create a middleware for error handling and logging
const errorHandler = (err, req, res, next) => {
  const errorDetails = {
    severity: 'ERROR',
    message: err.message,
    stack: err.stack,
    endpoint: req.originalUrl,
    method: req.method,
    requestBody: req.body,
    timestamp: new Date().toISOString()
  };

  // Log error to Cloud Logging
  const entry = log.entry({ resource: { type: 'cloud_function' } }, errorDetails);
  log.write(entry);

  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
};

// Create request logger middleware
const requestLogger = (req, res, next) => {
  const logData = {
    severity: 'INFO',
    message: `Request received: ${req.method} ${req.originalUrl}`,
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  // Log request to Cloud Logging
  const entry = log.entry({ resource: { type: 'cloud_function' } }, logData);
  log.write(entry);

  next();
};

// Apply middleware
app.use(requestLogger);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'dr-claude',
    version: '1.0.0'
  });
});

// Projects delegate endpoint
app.post('/projects/delegate', async (req, res) => {
  try {
    // Extract request data
    const { 
      name, 
      description, 
      priority = 'medium', 
      deadline = null, 
      tags = [], 
      assigned_to = null,
      orchestrator = 'dr-claude'
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (!description) {
      return res.status(400).json({ error: 'Project description is required' });
    }

    // Generate unique project ID
    const project_id = uuidv4();
    const timestamp = new Date().toISOString();

    // Create project object
    const projectData = {
      project_id,
      name,
      description,
      priority,
      deadline,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()),
      assigned_to,
      orchestrator,
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp
    };

    // Store in Firestore
    const projectRef = firestore.collection('projects').doc(project_id);
    await projectRef.set(projectData);

    // Log successful delegation
    const logData = {
      severity: 'INFO',
      message: `Project delegation successful: ${project_id}`,
      project_id,
      project_name: name,
      timestamp
    };
    const entry = log.entry({ resource: { type: 'cloud_function' } }, logData);
    log.write(entry);

    // Return successful response
    res.status(200).json({
      status: 'created',
      project_id,
      created_at: timestamp,
      orchestrator,
      assigned_to,
      priority,
      deadline,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())
    });
  } catch (error) {
    next(error);
  }
});

// Apply error handler middleware
app.use(errorHandler);

// Export cloud function
exports.drClaude = app;

