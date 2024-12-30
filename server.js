const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});