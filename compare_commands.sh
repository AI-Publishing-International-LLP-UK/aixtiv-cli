#!/bin/bash

# Set terminal colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== COMMAND SET 1 =====${NC}"
echo -e "${BLUE}Command: cd /Users/as/asoos/aixtiv-cli${NC}"
cd /Users/as/asoos/aixtiv-cli
echo -e "${BLUE}Command: pwd${NC}"
pwd
echo -e "${BLUE}Command: ls -la | head -10${NC}"
ls -la | head -10

echo ""
echo -e "${GREEN}===== COMPARISON MESSAGE =====${NC}"
echo "Both command sets are identical and perform the same operations:"
echo "1. Navigate to the /Users/as/asoos/aixtiv-cli directory"
echo "2. Confirm the current working directory"
echo "3. List directory contents with hidden files (showing first 10 lines only for brevity)"
echo ""

echo -e "${GREEN}===== COMMAND SET 2 =====${NC}"
echo -e "${BLUE}Command: cd /Users/as/asoos/aixtiv-cli${NC}"
cd /Users/as/asoos/aixtiv-cli
echo -e "${BLUE}Command: pwd${NC}"
pwd
echo -e "${BLUE}Command: ls -la | head -10${NC}"
ls -la | head -10

echo ""
echo -e "${GREEN}===== EXPLANATION =====${NC}"
echo "The original commands were not working because:"
echo "1. Backticks (\`) are used for command substitution in shell scripts, not for quoting commands"
echo "2. The descriptive text was being interpreted as part of the command"
echo "3. The sudo command was unnecessary for these operations"
echo ""
echo "The correct way to execute these commands is to run them directly without backticks or mixing with descriptions."

