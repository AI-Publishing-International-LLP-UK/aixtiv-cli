const express = require('express');
const app = express();

const PORT = process.env.PORT || 3333;

// Add JSON support
app.use(express.json());

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Root path
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AIXTIV Symphony API running',
    endpoints: [
      '/claude-code-generate'
    ]
  });
});

// Mock endpoint for Claude code generation
app.post('/claude-code-generate', (req, res) => {
  const { task, language } = req.body;
  
  console.log(`Received code generation request for task: "${task}" in ${language}`);
  
  // Simple mock response
  const mockResponse = {
    status: 'completed',
    code: `// Generated ${language} code for: ${task}\n\nfunction helloWorld() {\n  console.log("Hello, world!");\n  return "Hello, world!";\n}\n\n// Call the function\nhelloWorld();`,
    explanation: `This is a simple ${language} function that logs and returns "Hello, world!".`
  };
  
  res.json(mockResponse);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Claude Code Generate API available at http://localhost:${PORT}/claude-code-generate`);
});