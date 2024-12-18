const express = require('express');
const { searchContent } = require('./services/search');

const app = express();
app.use(express.json());

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const results = await searchContent(query);
    res.json(results);
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});