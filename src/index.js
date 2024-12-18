const express = require('express');
const {webSearch} = require('./services/search');
const {localSearch} = require('./services/places');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'warp-drive-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.post('/api/search', async (req, res) => {
  try {
    const results = await webSearch(req.body.query, req.body.count);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/local-search', async (req, res) => {
  try {
    const results = await localSearch(req.body.query, req.body.location);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});