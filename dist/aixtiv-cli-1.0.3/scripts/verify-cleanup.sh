#!/bin/bash

# List remaining secrets
echo "Listing remaining secrets:"
gcloud secrets list --format="table(name)"

# Check service status
echo "\nChecking service status:"
systemctl status warp-drive-api

# Test Google search
echo "\nTesting Google search:"
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test search"}'
