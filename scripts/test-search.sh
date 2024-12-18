#!/bin/bash

# Test various search types for Phillip Corey Roark

BASE_URL="http://localhost:3000/api/search"

# Test 1: Basic web search
echo "\nTest 1: Basic web search"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" business"}'

# Test 2: Recent content
echo "\nTest 2: Recent content search"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\"", "options": {"dateRestrict": "m6"}}'

# Test 3: Professional background
echo "\nTest 3: Professional background search"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" (CEO OR founder OR executive)"}'

# Test 4: Publications or documents
echo "\nTest 4: Publications search"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\"", "options": {"fileType": "pdf"}}'

# Test 5: Multi-type search
echo "\nTest 5: Multi-type comprehensive search"
curl -X POST "${BASE_URL}/multi" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\"", "searchTypes": ["web", "news"]}'
