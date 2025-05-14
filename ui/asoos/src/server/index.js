const express = require('express');
const cors = require('cors');
const path = require('path');
const authHandler = require('./auth-handler');
const universalDispatcherHandler = require('./universal-dispatcher-handler');
const resourceHandler = require('./resource-handler');
const agentHandler = require('./agent-handler');
const telemetryHandler = require('./telemetry-handler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Authentication routes
app.post('/api/auth/verify', authHandler.verifyAuth);
app.post('/api/auth/validate', authHandler.validateToken);
app.post('/api/auth/logout', authHandler.logout);

// Universal Dispatcher routes
app.post('/api/universal-dispatcher/message', universalDispatcherHandler.processMessage);
app.get('/api/universal-dispatcher/tasks', universalDispatcherHandler.getTasks);
app.put('/api/universal-dispatcher/tasks/:taskId', universalDispatcherHandler.updateTask);

// Resource routes
app.get('/api/resource/scan', resourceHandler.getResources);
app.get('/api/resource/:resourceId', resourceHandler.getResource);
app.post('/api/agent/grant', resourceHandler.grantAccess);
app.post('/api/agent/revoke', resourceHandler.revokeAccess);
app.post('/api/resource/create', resourceHandler.createResource);

// For any requests that don't match the above, send the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;