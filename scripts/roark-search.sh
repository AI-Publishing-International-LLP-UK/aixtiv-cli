#!/bin/bash

BASE_URL="http://localhost:3000/api/search"

# Professional Background Search
echo "\n1. Professional Background Search:"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" (CEO OR founder OR entrepreneur OR visionary)"}'

# Recent Activities Search
echo "\n\n2. Recent Activities Search:"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" coaching leadership", "options": {"dateRestrict": "m6"}}'

# Digital Presence Search
echo "\n\n3. Digital Presence & Technology Search:"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" technology artificial intelligence"}'

# Innovation Search
echo "\n\n4. Innovation & Development Search:"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" innovation development future"}'

# Leadership & Mentoring Search
echo "\n\n5. Leadership & Coaching Search:"
curl -X POST "${BASE_URL}/web" \
  -H "Content-Type: application/json" \
  -d '{"query":"\"Phillip Corey Roark\" leadership mentor coach"}'
