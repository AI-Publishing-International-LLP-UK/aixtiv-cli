#!/bin/bash

# Deploy script for api-for-warp-drive

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start the server
npm start