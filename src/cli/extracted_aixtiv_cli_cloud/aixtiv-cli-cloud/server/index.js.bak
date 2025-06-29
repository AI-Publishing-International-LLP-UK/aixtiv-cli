const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/status', (req, res) => {
  res.send({ status: 'Aixtiv CLI Cloud Interface running' });
});

app.post('/run', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).send({ error: 'No command provided' });

  const exec = require('child_process').exec;
  exec(command, (error, stdout, stderr) => {
    if (error) return res.status(500).send({ error: stderr });
    res.send({ output: stdout });
  });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
