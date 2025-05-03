# Model Context Protocol (MCP) Server Deployment Guide

This document provides instructions for deploying the Model Context Protocol (MCP) server to drclaude.live using Firebase and GitHub Actions, with Dr. Claude Automation integration.

## Overview

The Model Context Protocol server is the intelligence backbone of the Aixtiv Symphony ecosystem, providing:

- Context-aware AI code generation
- Conversation memory and storage
- Real-time model metrics and performance data
- Integration with other ASOOS components

## Deployment Options

### Option 1: Manual Deployment

Use the included deployment script:

```bash
# Make sure the script is executable
chmod +x deploy-mcp-drclaude.sh

# Run the deployment script
./deploy-mcp-drclaude.sh
```

This script:
1. Verifies the drclaude.live domain configuration
2. Uses Dr. Claude Automation to prepare and sync deployment files
3. Configures the Firebase project for drclaude.live
4. Deploys to Firebase hosting and functions

### Option 2: GitHub Actions CI/CD Pipeline

Push your changes to the main branch, and the GitHub Actions workflow will automatically deploy:

1. The workflow is defined in `.github/workflows/deploy-mcp-drclaude.yml`
2. It triggers on pushes to the main branch that modify key files
3. You can also manually trigger deployment from the GitHub Actions tab

## Configuration Files

- **firebase-mcp.json**: Firebase configuration for hosting and functions
- **public/index.html**: Landing page for the MCP server
- **server.js**: Main server implementation for API endpoints
- **functions/**: Cloud functions for the MCP server operations

## Verifying Deployment

After deployment, verify the MCP server is functioning correctly:

1. Visit https://drclaude.live/ to check the landing page
2. Test API endpoints:
   - https://drclaude.live/claude-code-generate (POST)
   - https://drclaude.live/context-storage (GET/POST)
   - https://drclaude.live/model-metrics (GET)

## Testing the API

Use cURL or Postman to test the code generation endpoint:

```bash
curl -X POST https://drclaude.live/claude-code-generate \
  -H "Content-Type: application/json" \
  -d '{"task": "Create a function that calculates factorial", "language": "javascript"}'
```

## Troubleshooting

If you encounter deployment issues:

1. Check Firebase deployment logs:
   ```bash
   firebase deploy --only hosting,functions --project dr-claude-live --debug
   ```

2. Verify domain configuration:
   ```bash
   aixtiv domain verify drclaude.live
   ```

3. Check GitHub Actions workflow logs for CI/CD issues

## Firebase Project Configuration

The MCP server uses the Firebase project `dr-claude-live` configured for the domain drclaude.live. Make sure:

1. You have the necessary permissions for this project
2. The domain DNS settings point to Firebase hosting
3. SSL certificate is properly configured

## Integration with ASOOS

The MCP server integrates with the broader ASOOS ecosystem:

- Uses the Wing component for agent orchestration
- Leverages Integration Gateway for security
- Connects to the Flight Memory System (FMS) for context storage

---

For additional support, contact the Aixtiv Symphony support team or use the `aixtiv claude:status` command to check system status.
