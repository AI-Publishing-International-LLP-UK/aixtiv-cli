#!/bin/bash

# Ensure latest code
git pull

# Install dependencies if needed
npm install

# Set up service account and environment
export GOOGLE_APPLICATION_CREDENTIALS=/home/api-for-warp-drive/service-account-key.json
export NODE_ENV=production

# Execute searches
echo "Starting comprehensive search for Phillip Corey Roark..."

# Professional Search
echo -e "\n\n1. Professional & Leadership:"
curl -s -X POST http://localhost:3000/api/search/web \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" (CEO OR founder OR visionary OR leadership)"}'

# Recent Activities
echo -e "\n\n2. Recent Activities:"
curl -s -X POST http://localhost:3000/api/search/web \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\"", "options": {"dateRestrict": "m6"}}'

# Digital Presence
echo -e "\n\n3. Technology & Innovation:"
curl -s -X POST http://localhost:3000/api/search/web \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" (technology OR \"artificial intelligence\" OR innovation)"}'

# Development & Future
echo -e "\n\n4. Development & Vision:"
curl -s -X POST http://localhost:3000/api/search/web \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" (development OR future OR vision)"}'

# Coaching & Mentoring
echo -e "\n\n5. Coaching & Mentoring:"
curl -s -X POST http://localhost:3000/api/search/web \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" (coaching OR mentoring OR teaching)"}'