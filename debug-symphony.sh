#!/bin/bash
# Script to debug and start the Symphony API server

SYMPHONY_DIR="/Users/as/asoos/deploy-package/functions/symphony-api"
LOG_FILE="/Users/as/asoos/aixtiv-cli/symphony-debug.log"

# Clear previous log
> "$LOG_FILE"

echo "======= SYMPHONY API SERVER DEBUG =======" | tee -a "$LOG_FILE"
echo "Started at: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Check if directory exists
echo "Checking Symphony API directory..." | tee -a "$LOG_FILE"
if [ ! -d "$SYMPHONY_DIR" ]; then
  echo "ERROR: Symphony API directory not found at: $SYMPHONY_DIR" | tee -a "$LOG_FILE"
  exit 1
else
  echo "Directory found." | tee -a "$LOG_FILE"
  echo "Contents:" | tee -a "$LOG_FILE"
  ls -la "$SYMPHONY_DIR" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
fi

# Check if app.js exists
echo "Checking for app.js..." | tee -a "$LOG_FILE"
if [ ! -f "$SYMPHONY_DIR/app.js" ]; then
  echo "ERROR: app.js not found in Symphony API directory" | tee -a "$LOG_FILE"
  exit 1
else
  echo "app.js found." | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
fi

# Check if node_modules exists
echo "Checking node_modules directory..." | tee -a "$LOG_FILE"
if [ ! -d "$SYMPHONY_DIR/node_modules" ]; then
  echo "WARNING: node_modules directory not found. Installing dependencies..." | tee -a "$LOG_FILE"
  cd "$SYMPHONY_DIR" && npm install | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
else
  echo "node_modules directory found." | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
fi

# Check if port 3030 is in use
echo "Checking if port 3030 is already in use..." | tee -a "$LOG_FILE"
if lsof -i :3030 >> "$LOG_FILE" 2>&1; then
  echo "WARNING: Port 3030 is already in use. Please kill that process first." | tee -a "$LOG_FILE"
  echo "Use 'sudo lsof -i :3030' to see which process is using it" | tee -a "$LOG_FILE"
  echo "Then 'kill -9 PID' to kill the process" | tee -a "$LOG_FILE"
  lsof -i :3030 | tee -a "$LOG_FILE"
else
  echo "Port 3030 is available." | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
fi

# Check required dependencies
echo "Checking required npm packages..." | tee -a "$LOG_FILE"
for pkg in express cors body-parser; do
  if [ ! -d "$SYMPHONY_DIR/node_modules/$pkg" ]; then
    echo "WARNING: $pkg package not found. Installing..." | tee -a "$LOG_FILE"
    cd "$SYMPHONY_DIR" && npm install $pkg --save | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
  else
    echo "$pkg package found." | tee -a "$LOG_FILE"
  fi
done
echo "" | tee -a "$LOG_FILE"

# Try to start the server with debugging
echo "Attempting to start Symphony API server..." | tee -a "$LOG_FILE"
echo "==== SERVER OUTPUT BELOW ====" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "To start the server manually, run:" | tee -a "$LOG_FILE"
echo "cd $SYMPHONY_DIR && NODE_DEBUG=* node app.js" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "Once the server is running, visit http://localhost:3030 in your browser" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "Debug log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "======= END OF DEBUG SCRIPT =======" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Create a fixed version of app.js with better error handling
FIXED_APP_JS="$SYMPHONY_DIR/app_fixed.js"
cat > "$FIXED_APP_JS" << 'EOL'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3030;

console.log('Starting Symphony API server...');

// Check required dependencies
try {
  console.log('Checking required modules...');
  require.resolve('express');
  require.resolve('cors');
  require.resolve('body-parser');
  console.log('Required modules found.');
} catch (err) {
  console.error('ERROR: Missing required module. Please run npm install');
  console.error(err.message);
  process.exit(1);
}

// Check for API modules
const apiModules = {
  auth: './auth/api',
  visualization: './visualization/api',
  agents: './agents/api'
};

console.log('Checking API modules...');
Object.entries(apiModules).forEach(([name, path]) => {
  try {
    require.resolve(path);
    console.log(`✓ ${name} module found`);
  } catch (err) {
    console.warn(`✗ ${name} module not found: ${err.message}`);
    apiModules[name] = null;
  }
});

// Check static files directory
const publicDir = path.join(__dirname, '../public');
console.log(`Checking public directory: ${publicDir}`);
try {
  fs.accessSync(publicDir, fs.constants.R_OK);
  console.log('✓ Public directory found');
} catch (err) {
  console.warn(`✗ Public directory not found: ${err.message}`);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
try {
  app.use(express.static(publicDir));
  console.log('✓ Static file middleware configured');
} catch (err) {
  console.warn(`✗ Static file middleware error: ${err.message}`);
}

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
console.log('Setting up API routes...');
Object.entries(apiModules).forEach(([name, modulePath]) => {
  if (modulePath) {
    try {
      const module = require(modulePath);
      app.use(`/api/${name}`, module);
      console.log(`✓ Registered /api/${name} routes`);
    } catch (err) {
      console.error(`✗ Failed to register /api/${name} routes: ${err.message}`);
    }
  }
});

// Fallback route for API
app.use('/api/*', (req, res) => {
  console.log(`Warning: API route not found: ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Fallback route for static files
app.use('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Create mock API responses if needed
const mockApiResponses = (app) => {
  console.log('Setting up mock API responses...');
  
  // Auth mock
  app.post('/api/auth/authenticate', (req, res) => {
    console.log('Mock auth called with:', req.body);
    res.json({
      success: true,
      sessionId: 'mock-session-123',
      user: {
        username: req.body.username || 'mockuser',
        name: req.body.username === 'roark' ? 'Phillip Corey Roark' : 'Mock User',
        role: 'admin'
      }
    });
  });

  // Visualization mock
  app.get('/api/visualization/symphony', (req, res) => {
    res.json({
      success: true,
      data: {
        components: [
          { id: 1, name: 'Integration Gateway', status: 'Online', connections: 5 },
          { id: 2, name: 'Authentication Service', status: 'Online', connections: 3 },
          { id: 3, name: 'Dr. Claude Orchestrator', status: 'Online', connections: 7 },
          { id: 4, name: 'SallyPort Security', status: 'Online', connections: 2 },
          { id: 5, name: 'Jetport API', status: 'Online', connections: 4 },
          { id: 6, name: 'Anthology System', status: 'Online', connections: 6 }
        ],
        metrics: {
          totalRequests: 1253,
          averageResponseTime: 145,
          errorRate: 0.02,
          activeUsers: 42
        }
      }
    });
  });

  // Add other mock endpoints as needed
  app.get('/api/visualization/greenscreen', (req, res) => {
    res.json({
      success: true,
      data: {
        layers: [
          { id: 1, name: 'Background' },
          { id: 2, name: 'Foreground' },
          { id: 3, name: 'Effects' }
        ],
        effects: [
          { id: 1, name: 'Blur', enabled: true },
          { id: 2, name: 'Chroma Key', enabled: true },
          { id: 3, name: 'Shadows', enabled: false },
          { id: 4, name: 'Highlights', enabled: true },
          { id: 5, name: 'Color Correction', enabled: false },
          { id: 6, name: 'Noise Reduction', enabled: true }
        ]
      }
    });
  });

  app.get('/api/visualization/orchestrator', (req, res) => {
    res.json({
      success: true,
      data: {
        logs: [
          { timestamp: Date.now() - 5000, message: 'Dr. Claude Orchestrator initializing...' },
          { timestamp: Date.now() - 4000, message: 'Establishing connection to Integration Gateway' },
          { timestamp: Date.now() - 3000, message: 'Dr. Claude Orchestrator online and monitoring' },
          { timestamp: Date.now() - 2000, message: 'Domain health check completed: All domains online' },
          { timestamp: Date.now() - 1000, message: 'Processing system events: 0 critical, 2 warnings' }
        ],
        stats: {
          domains: 12,
          activeMonitors: 4,
          processedEvents: 342,
          healthScore: 98
        }
      }
    });
  });

  app.get('/api/visualization/memory', (req, res) => {
    res.json({
      success: true,
      data: {
        nodes: [
          { id: 1, type: 'input', connections: [4, 5] },
          { id: 2, type: 'input', connections: [4] },
          { id: 3, type: 'input', connections: [6] },
          { id: 4, type: 'processing', connections: [7, 8] },
          { id: 5, type: 'processing', connections: [7, 9] },
          { id: 6, type: 'processing', connections: [9] },
          { id: 7, type: 'memory', connections: [10, 11] },
          { id: 8, type: 'memory', connections: [10] },
          { id: 9, type: 'memory', connections: [11] },
          { id: 10, type: 'output', connections: [] },
          { id: 11, type: 'output', connections: [] }
        ],
        stats: {
          memoryUnits: 124,
          connections: 425,
          activePaths: 18
        }
      }
    });
  });

  app.get('/api/visualization/agents', (req, res) => {
    res.json({
      success: true,
      data: {
        agents: [
          { id: 1, name: 'Dr. Memoria', system: 'Anthology', load: 75 },
          { id: 2, name: 'Dr. Sabina', system: 'Dream Commander', load: 45 },
          { id: 3, name: 'Dr. Roark', system: 'Wish Vision', load: 60 },
          { id: 4, name: 'Dr. Grant', system: 'Sally Port', load: 40 },
          { id: 5, name: 'Dr. Match', system: 'Bid Suite', load: 55 },
          { id: 6, name: 'Dr. Lucy', system: 'Flight Memory System', load: 80 }
        ],
        system: {
          version: '2.0.3',
          load: 0.62
        }
      }
    });
  });
  
  console.log('Mock API responses configured');
};

// Start server
try {
  // Check for actual API modules first
  const hasRealApiModules = Object.values(apiModules).some(module => module !== null);
  
  // If no real API modules, use mock responses
  if (!hasRealApiModules) {
    console.log('No API modules found, using mock responses');
    mockApiResponses(app);
  }
  
  const server = app.listen(port, () => {
    console.log(`Symphony Local API running at http://localhost:${port}`);
    console.log(`Dr. Claude Orchestrator active and monitoring system`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${port} is already in use. Please close the application using this port.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
EOL

echo "Created fixed version of app.js with better error handling at: $FIXED_APP_JS" | tee -a "$LOG_FILE"
echo "To use this fixed version, run:" | tee -a "$LOG_FILE"
echo "cd $SYMPHONY_DIR && node app_fixed.js" | tee -a "$LOG_FILE"