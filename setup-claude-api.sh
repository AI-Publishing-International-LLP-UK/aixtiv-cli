#!/bin/bash

# Script to set up Claude API integration for Aixtiv CLI
echo "======================================================"
echo "Setting up Claude API integration for Aixtiv CLI"
echo "======================================================"

# Check if ANTHROPIC_API_KEY is already set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  # Ask for API key if not already set
  echo -n "Enter your Anthropic API key: "
  read -s API_KEY
  echo ""
  
  if [ -z "$API_KEY" ]; then
    echo "Error: API key is required."
    exit 1
  fi
  
  # Export the API key to the current session
  export ANTHROPIC_API_KEY="$API_KEY"
  
  # Add to .zshrc or .bashrc for persistence
  echo -n "Do you want to save the API key to your shell profile? (y/n): "
  read SAVE_TO_PROFILE
  
  if [ "$SAVE_TO_PROFILE" = "y" ] || [ "$SAVE_TO_PROFILE" = "Y" ]; then
    if [ -f "$HOME/.zshrc" ]; then
      echo "export ANTHROPIC_API_KEY=\"$API_KEY\"" >> "$HOME/.zshrc"
      echo "API key added to ~/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
      echo "export ANTHROPIC_API_KEY=\"$API_KEY\"" >> "$HOME/.bashrc"
      echo "API key added to ~/.bashrc"
    else
      echo "Could not find shell profile. Please manually add the following line to your shell profile:"
      echo "export ANTHROPIC_API_KEY=\"$API_KEY\""
    fi
  else
    echo "Remember to set the ANTHROPIC_API_KEY environment variable before using Claude code generation."
  fi
else
  echo "ANTHROPIC_API_KEY is already set in your environment."
fi

# Test the API connection
echo "Testing connection to Anthropic API..."

TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello Claude"}]
  }' \
  https://api.anthropic.com/v1/messages)

if [ "$TEST_RESULT" = "200" ]; then
  echo "Success! Connected to Anthropic API."
else
  echo "Warning: Could not connect to Anthropic API. HTTP status: $TEST_RESULT"
  echo "Please check your API key and try again."
fi

echo ""
echo "======================================================"
echo "Setup complete!"
echo "Try generating code with: aixtiv claude:code:generate -t \"Create a simple Node.js server\""
echo "======================================================"
