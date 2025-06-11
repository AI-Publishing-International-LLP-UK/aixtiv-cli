
// gateway-server.js — Aixtiv Symphony Integration Gateway
const express = require('express');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

const app = express();
const PORT = process.env.PORT || 3002;

// Logging setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'aixtiv-gateway' },
  transports: [new winston.transports.Console()]
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Load MCP config
let MCP_CONFIG = {};
try {
  MCP_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'mcp-config.json'), 'utf8'));
  logger.info('MCP configuration loaded', { domain: MCP_CONFIG.domain });
} catch (err) {
  logger.error('Failed to load MCP config', { error: err.message });
  process.exit(1);
}

// Static file serve (e.g., React UI, Vision Lake)
const staticPath = path.join(__dirname, 'public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  logger.info(`Serving static files from ${staticPath}`);
}

// Agent dispatch endpoint
app.post('/api/dispatch-card', async (req, res) => {
  const { cardId, targetAgent } = req.body;
  if (!cardId || !targetAgent) {
    return res.status(400).json({ status: 'error', message: 'cardId and targetAgent required' });
  }

  try {
    await firestore.collection('aixtiv_dispatch').add({
      cardId,
      targetAgent,
      timestamp: new Date().toISOString(),
      status: 'queued'
    });
    logger.info('Card dispatch queued', { cardId, targetAgent });
    res.json({ status: 'success', message: 'Dispatched successfully' });
  } catch (error) {
    logger.error('Dispatch error', { error: error.message });
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    symphony: MCP_CONFIG.symphony || {}
  });
});

// Cron status endpoint
let cardQueueCount = 0;
app.get('/api/card-cascade-status', (req, res) => {
  res.json({
    cardQueueCount,
    memoryPath: '/memoryc2100bplan',
    lastUpdate: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Aixtiv Gateway server running at http://localhost:${PORT}`, {
    port: PORT,
    domain: MCP_CONFIG.domain
  });
});
