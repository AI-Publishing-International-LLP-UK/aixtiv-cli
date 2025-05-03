#!/bin/bash

# Deploy Model Context Protocol (MCP) server to drclaude.live
# This script uses the Dr. Claude Automation and Firebase to deploy to the drclaude.live domain

echo "🚀 Deploying Model Context Protocol (MCP) server to drclaude.live..."

# Step 1: Verify domain configuration
echo "Verifying drclaude.live domain configuration..."
./bin/aixtiv.js domain verify drclaude.live

# Step 2: Use Claude Automation to prepare repository
echo "Using Dr. Claude Automation to prepare and sync deployment..."
./bin/aixtiv.js claude:automation:github \
  --repository "Dr-Claude-Automation" \
  --action "sync" \
  --branch "main" \
  --organization "AI-Publishing-International-LLP-UK"

# Step 3: Configure firebase project for drclaude.live
echo "Configuring Firebase project for drclaude.live..."
firebase use api-for-warp-drive

# Step 4: Deploy to Firebase hosting and functions
echo "Deploying to Firebase hosting and functions..."
firebase deploy --only hosting,functions --project api-for-warp-drive

echo "✅ Model Context Protocol server deployment complete!"
echo "Your MCP server is now available at: https://drclaude.live/"
