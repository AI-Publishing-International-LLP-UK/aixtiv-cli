const express = require('express');
const searchService = require('../services/search');
const router = express.Router();

router.post('/web', async (req, res) => {
  try {
    const { query, options } = req.body;
    const results = await searchService.searchWeb(query, options);
    res.json(results);
  } catch (error) {
    console.error('Search route error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/multi', async (req, res) => {
  try {
    const { query, searchTypes } = req.body;
    const results = await searchService.multiSearch(query, searchTypes);
    res.json(results);
  } catch (error) {
    console.error('Multi-search route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;