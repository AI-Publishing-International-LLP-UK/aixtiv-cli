const express = require('express');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002; // Changed to port 3002

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create a simple route for demonstration
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'ASOOS UI API is running',
    timestamp: new Date().toISOString()
  });
});

// Create a simple HTML page for demonstration
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ASOOS UI Demo</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        header {
          background-color: #000;
          color: #00b7ff;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        h1 {
          margin: 0;
        }
        .content {
          background-color: white;
          border-radius: 8px;
          padding: 2rem;
          margin-top: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .agent {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        .agent-icon {
          width: 50px;
          height: 50px;
          background-color: #00b7ff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          color: white;
          font-size: 1.5rem;
        }
        .btn {
          background-color: #00b7ff;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>ASOOS</h1>
        <div>Mr. Phillip Corey Roark, CEO</div>
      </header>
      <div class="container">
        <div class="content">
          <h2>ASOOS Demo Interface</h2>
          <p>The Aixtiv Symphony Orchestrating OS is now running in demonstration mode.</p>
          
          <h3>Active Agents</h3>
          <div class="agent">
            <div class="agent-icon">QB</div>
            <div>
              <div><strong>QB Lucy</strong></div>
              <div>Professional Mode</div>
            </div>
          </div>
          
          <h3>S2DO Tasks</h3>
          <ul>
            <li>Update sales dashboard with Q3 results</li>
            <li>Schedule review meeting with marketing team</li>
            <li>Finalize integration with new CRM system</li>
          </ul>
          
          <button class="btn">Authenticate with SallyPort</button>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});