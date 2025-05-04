#!/bin/bash

# Set default values
ENDPOINT=${CLAUDE_API_ENDPOINT:-"https://us-west1-aixtiv-symphony.cloudfunctions.net"}
API_KEY=${ANTHROPIC_API_KEY:-""}

# Create the URL
FULL_URL="${ENDPOINT}/dr-claude/projects/delegate"

echo "===== Dr. Claude API Test ====="
echo "Using endpoint: $FULL_URL"
echo "API key present: $(if [ -n "$API_KEY" ]; then echo "Yes"; else echo "No"; fi)"
echo "------------------------------"

# Create JSON payload
JSON_PAYLOAD='{
  "name": "Test Project",
  "description": "Testing Dr. Claude API endpoint",
  "priority": "medium",
  "tags": ["test", "api"],
  "operation": "projects-delegate"
}'

echo "Sending request..."
echo "Payload: $JSON_PAYLOAD"
echo "------------------------------"

# Send the request
curl -v -X POST \
  -H 'Content-Type: application/json' \
  -H "anthropic-api-key: $API_KEY" \
  -H 'anthropic-version: 2023-06-01' \
  -H 'x-agent-id: dr-claude-orchestrator' \
  "$FULL_URL" \
  --data "$JSON_PAYLOAD"

# Echo new line after request
echo ""
echo "------------------------------"
echo "Test complete"
