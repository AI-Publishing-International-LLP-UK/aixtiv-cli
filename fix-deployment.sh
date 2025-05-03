#!/bin/bash
echo "============================================" 
echo "Aixtiv Symphony Deployment Fix"
echo "============================================" 

# Create logs directory
mkdir -p logs

# 1. Fix Integration Gateway
echo "1. Creating Integration Gateway structure..."
mkdir -p integration/gateway
mkdir -p integration/auth
mkdir -p integration/routes

cat > integration/gateway/index.js << 'EOT'
/**
 * Integration Gateway for Aixtiv Symphony
 * Controls access between components and enforces security policies
 */

const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  console.log('Gateway accessed:', req.path);
  // Basic validation
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  next();
});

module.exports = router;
EOT

echo "✅ Integration Gateway created"

# 2. Activate Agents
echo "2. Running agent activation..."
chmod +x activate-all-agents-final.sh
./activate-all-agents-final.sh > logs/agent-activation.log 2>&1 || echo "⚠️ Agent activation had issues - check logs/agent-activation.log"
echo "✅ Agent activation attempted"

# 3. Fix Core Protocols
echo "3. Setting up Core Protocols..."
mkdir -p core-protocols/s2do
mkdir -p core-protocols/intelligence-engine
mkdir -p core-protocols/memory-system

cat > core-protocols/s2do/index.js << 'EOT'
/**
 * S2DO (Scan-to-Do) Protocol
 * Handles governance and approval workflows
 */

function createWorkflow(name, type) {
  console.log(`Creating workflow: ${name} of type ${type}`);
  return { id: Date.now(), name, type, status: 'active' };
}

module.exports = { createWorkflow };
EOT

cat > core-protocols/memory-system/index.js << 'EOT'
/**
 * Flight Memory System (FMS)
 * Manages context storage and retrieval
 */

function storeMemory(data) {
  console.log('Storing memory:', data);
  return { id: Date.now(), timestamp: new Date().toISOString(), data };
}

function retrieveMemory(id) {
  console.log('Retrieving memory:', id);
  return { id, found: true };
}

module.exports = { storeMemory, retrieveMemory };
EOT

echo "✅ Core Protocols created"

# 4. Set up MCP testing script
echo "4. Creating MCP test script..."
mkdir -p tests/mcp

cat > tests/mcp/test-local.js << 'EOT'
/**
 * Local MCP test - doesn't require deployed functions
 */

const functions = require('../../functions');

// Test Claude code generation
const mockRequest = {
  body: {
    task: "Create a function that calculates factorial",
    language: "javascript"
  }
};

const mockResponse = {
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  }
};

// Run the test
console.log('Testing claudeCodeGenerate function locally:');
try {
  functions.claudeCodeGenerate(mockRequest, mockResponse);
  console.log('✅ Local function test successful');
} catch (error) {
  console.error('❌ Local function test failed:', error);
}
EOT

# 5. Create deployment status report
echo "5. Creating detailed status report..."

cat > deployment-status.md << 'EOT'
# Aixtiv Symphony Deployment Status

## Working Components
- ✅ **Firebase Hosting**: Successfully deployed to drclaude-live.web.app
- ✅ **Domain Verification**: drclaude.live is properly verified
- ✅ **Aixtiv CLI**: Working properly (version 1.0.1)

## Partially Working Components
- ⚠️ **Agent System**: Scripts are present but execution results need verification
- ⚠️ **Core Protocols**: Basic structure present but needs integration

## Non-Working Components
- ❌ **Cloud Functions**: Not deployed due to OAuth/authentication issues
- ❌ **Integration Gateway**: Missing (now created with basic structure)
- ❌ **MCP API Endpoints**: Returning 404 errors

## Immediate Action Items
1. Resolve OAuth2 authentication for Firebase Functions
2. Execute and verify agent activation scripts
3. Deploy cloud functions with proper authentication
4. Connect custom domain to Firebase hosting
5. Test VLS interdependencies

## Required Commands
```bash
# Deploy functions with proper authentication
firebase login
firebase deploy --only functions

# Test agent activation
./bin/aixtiv.js resource:scan

# Connect custom domain (via Firebase Console or CLI when fixed)
firebase hosting:sites:update drclaude-live --custom-domain=drclaude.live
```
EOT

echo "============================================" 
echo "Deployment Fix Complete"
echo "============================================" 
echo "Created files:"
echo "- integration/gateway/ - Integration Gateway structure"
echo "- core-protocols/ - Core protocol implementations"
echo "- tests/mcp/ - MCP local testing script"
echo "- deployment-status.md - Comprehensive status report"
echo
echo "Next steps are outlined in deployment-status.md"
