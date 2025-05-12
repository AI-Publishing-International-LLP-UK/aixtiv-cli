#!/bin/bash
# Script to install dependencies for the Symphony API server
cd /Users/as/asoos/deploy-package/functions/symphony-api/
echo "Installing dependencies for Symphony API server..."
npm install
echo "Dependencies installed."
echo "To start the server, run: /Users/as/asoos/aixtiv-cli/start-symphony.sh"