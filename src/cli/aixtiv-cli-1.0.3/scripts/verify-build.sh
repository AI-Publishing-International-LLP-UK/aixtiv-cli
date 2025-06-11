#!/bin/bash
# verify-build.sh - Script to verify the aixtiv-cli build and functionality

echo "🔍 Verifying aixtiv-cli build and repository status..."

# Check if we are in the correct directory
if [[ "$(basename "$PWD")" != "aixtiv-cli" ]]; then
  echo "❌ Error: Please run

