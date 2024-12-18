#!/bin/bash

# Test search endpoint
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"coaching 2100"}' | jq .