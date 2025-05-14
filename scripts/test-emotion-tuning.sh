#!/bin/bash
#
# Emotion Tuning System Test and Management Script
#
# This script provides easy access to test, deploy, and manage the emotion tuning system.
# Usage: ./scripts/test-emotion-tuning.sh [command]
#
# Commands:
#   test         Run emotion tuning tests
#   deploy       Deploy the emotion tuning system
#   integrate    Run the integration script for CI/CD
#   clean        Clean up test artifacts
#   status       Check the status of the emotion tuning system
#   help         Show this help message
#

set -e  # Exit on error

# Define colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Function to print header
print_header() {
  echo -e "${BLUE}=================================${NC}"
  echo -e "${BLUE}   Emotion Tuning System Tools   ${NC}"
  echo -e "${BLUE}=================================${NC}"
  echo ""
}

# Function to show help
show_help() {
  print_header
  echo "Usage: ./scripts/test-emotion-tuning.sh [command]"
  echo ""
  echo "Commands:"
  echo "  test         Run emotion tuning tests"
  echo "  deploy       Deploy the emotion tuning system"
  echo "  integrate    Run the integration script for CI/CD"
  echo "  clean        Clean up test artifacts"
  echo "  status       Check the status of the emotion tuning system"
  echo "  install      Install dependencies for emotion tuning"
  echo "  help         Show this help message"
  echo ""
}

# Function to run tests
run_tests() {
  echo -e "${BLUE}Running Emotion Tuning Tests...${NC}"

  # Create test results directory
  mkdir -p test-results/emotion-tuning

  # Run the basic test
  echo -e "${YELLOW}Running basic emotion tuning tests...${NC}"
  npm run test:emotion-tuning

  # Check result
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Basic emotion tuning tests passed successfully${NC}"
    echo "Basic emotion tuning tests passed successfully" > test-results/emotion-tuning/basic_summary.txt
  else
    echo -e "${RED}✗ Basic emotion tuning tests failed${NC}"
    echo "Basic emotion tuning tests failed" > test-results/emotion-tuning/basic_summary.txt
    exit 1
  fi

  # Run speech integration test
  echo -e "${YELLOW}Running speech integration tests...${NC}"
  node test/emotion-tuning-speech-integration-test.js

  # Check result
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Speech integration tests passed successfully${NC}"
    echo "Speech integration tests passed successfully" > test-results/emotion-tuning/speech_integration_summary.txt
  else
    echo -e "${RED}✗ Speech integration tests failed${NC}"
    echo "Speech integration tests failed" > test-results/emotion-tuning/speech_integration_summary.txt
    exit 1
  fi

  echo -e "${GREEN}✓ All emotion tuning tests passed successfully${NC}"
  echo "All emotion tuning tests passed successfully" > test-results/emotion-tuning/summary.txt
}

# Function to deploy
deploy_system() {
  echo -e "${BLUE}Deploying Emotion Tuning System...${NC}"
  
  # Build the application
  npm run build
  
  # Create the deployment directory
  mkdir -p public/aixtiv-cli-latest
  
  # Copy files to deployment directory
  cp dist/aixtiv-cli-*.tar.gz public/aixtiv-cli-latest/ || echo "No tar.gz files found"
  cp dist/aixtiv-cli-*.zip public/aixtiv-cli-latest/ || echo "No zip files found"
  
  # Run Firebase deploy if available
  if command -v firebase &> /dev/null; then
    firebase deploy --only hosting --project=api-for-warp-drive || echo "Firebase deploy failed"
  else
    echo -e "${YELLOW}Firebase CLI not found. Skipping deployment to Firebase.${NC}"
  fi
  
  echo -e "${GREEN}✓ Deployment package created in public/aixtiv-cli-latest/${NC}"
}

# Function to run integration
run_integration() {
  echo -e "${BLUE}Running Integration Script for CI/CD...${NC}"
  
  # Check if the integration script exists
  if [ -f "cicd/emotion-tuning-integration.js" ]; then
    node cicd/emotion-tuning-integration.js --environment=production
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Integration script executed successfully${NC}"
    else
      echo -e "${RED}✗ Integration script failed${NC}"
      exit 1
    fi
  else
    echo -e "${RED}✗ Integration script not found: cicd/emotion-tuning-integration.js${NC}"
    exit 1
  fi
}

# Function to clean up
clean_artifacts() {
  echo -e "${BLUE}Cleaning Up Test Artifacts...${NC}"
  
  # Remove test results directory
  rm -rf test-results/emotion-tuning
  
  # Remove any temporary files
  find src/services/emotion-tuning -name "*.tmp" -delete
  
  echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Function to check status
check_status() {
  echo -e "${BLUE}Checking Emotion Tuning System Status...${NC}"
  
  # Check if emotion tuning files exist
  if [ -d "src/services/emotion-tuning" ] && [ -f "commands/copilot/emotion.js" ]; then
    echo -e "${GREEN}✓ Emotion Tuning System is installed${NC}"
  else
    echo -e "${RED}✗ Emotion Tuning System is not installed${NC}"
    exit 1
  fi
  
  # Check if emotion tuning is registered in bin/aixtiv.js
  if grep -q "copilot:emotion" bin/aixtiv.js; then
    echo -e "${GREEN}✓ Emotion Tuning is registered in aixtiv-cli${NC}"
  else
    echo -e "${RED}✗ Emotion Tuning is not registered in aixtiv-cli${NC}"
    exit 1
  fi
  
  # Check if tests exist
  if [ -f "test/emotion-tuning-test.js" ]; then
    echo -e "${GREEN}✓ Basic emotion tuning tests are available${NC}"
  else
    echo -e "${RED}✗ Basic emotion tuning tests are not available${NC}"
    exit 1
  fi

  # Check if speech integration tests exist
  if [ -f "test/emotion-tuning-speech-integration-test.js" ]; then
    echo -e "${GREEN}✓ Speech integration tests are available${NC}"
  else
    echo -e "${YELLOW}⚠ Speech integration tests are not available${NC}"
  fi
  
  # Check if CI/CD integration exists
  if [ -f "cicd/emotion-tuning-integration.js" ]; then
    echo -e "${GREEN}✓ CI/CD integration is available${NC}"
  else
    echo -e "${YELLOW}⚠ CI/CD integration is not available${NC}"
  fi
  
  # Check if npm scripts are registered
  if grep -q "test:emotion-tuning" package.json; then
    echo -e "${GREEN}✓ Emotion Tuning npm scripts are registered${NC}"
  else
    echo -e "${YELLOW}⚠ Emotion Tuning npm scripts are not registered${NC}"
  fi
  
  echo -e "${GREEN}✓ Emotion Tuning System status check completed${NC}"
}

# Function to install dependencies
install_dependencies() {
  echo -e "${BLUE}Installing Emotion Tuning Dependencies...${NC}"
  
  # Check required dependencies
  local missing_deps=0
  
  echo "Checking for required dependencies..."
  
  # Check for @google-cloud/language
  if ! grep -q "@google-cloud/language" package.json; then
    echo -e "${YELLOW}⚠ Missing @google-cloud/language dependency${NC}"
    missing_deps=1
  fi
  
  # Check for @google-cloud/speech
  if ! grep -q "@google-cloud/speech" package.json; then
    echo -e "${YELLOW}⚠ Missing @google-cloud/speech dependency${NC}"
    missing_deps=1
  fi
  
  # Check for @google-cloud/text-to-speech
  if ! grep -q "@google-cloud/text-to-speech" package.json; then
    echo -e "${YELLOW}⚠ Missing @google-cloud/text-to-speech dependency${NC}"
    missing_deps=1
  fi
  
  # Install missing dependencies if needed
  if [ $missing_deps -eq 1 ]; then
    echo -e "${BLUE}Installing missing dependencies...${NC}"
    npm install --save @google-cloud/language @google-cloud/speech @google-cloud/text-to-speech
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
    else
      echo -e "${RED}✗ Failed to install dependencies${NC}"
      exit 1
    fi
  else
    echo -e "${GREEN}✓ All required dependencies are installed${NC}"
  fi
}

# Main function
main() {
  # Check command
  case "$1" in
    test)
      print_header
      run_tests
      ;;
    deploy)
      print_header
      run_tests
      deploy_system
      ;;
    integrate)
      print_header
      run_tests
      run_integration
      ;;
    clean)
      print_header
      clean_artifacts
      ;;
    status)
      print_header
      check_status
      ;;
    install)
      print_header
      install_dependencies
      ;;
    help|"")
      show_help
      ;;
    *)
      echo -e "${RED}Invalid command: $1${NC}"
      show_help
      exit 1
      ;;
  esac
}

# Call main function with all arguments
main "$@"