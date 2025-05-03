#!/bin/bash
echo "===========================================" 
echo "Running Quick Aixtiv Symphony Tests"
echo "===========================================" 

# 1. Test Firebase deployment
echo -e "\n\n1. Testing Firebase Hosting deployment:"
curl -s -o /dev/null -w "Status Code: %{http_code}" https://drclaude-live.web.app

# 2. Check agent system
echo -e "\n\n2. Testing agent activation status:"
find . -name "activate*.sh" | sort

# 3. Test bin utilities
echo -e "\n\n3. Testing CLI tools:"
./bin/aixtiv.js --version

# 4. Check MCP server
echo -e "\n\n4. Testing MCP endpoints:"
curl -s -X POST https://drclaude-live.web.app/claude-code-generate \
  -H "Content-Type: application/json" \
  -d '{"task": "Create a function that calculates factorial", "language": "javascript"}' \
  | grep -i "error\|not found\|success" || echo "Endpoint not responding correctly"

# 5. Check integration components
echo -e "\n\n5. Testing integration components availability:"
ls -la ./core-protocols || echo "Core protocols not found"
ls -la ./integration || echo "Integration gateway not found"

# 6. Check domain configuration
echo -e "\n\n6. Testing domain configuration:"
./bin/aixtiv.js domain verify drclaude.live

# Output summary
echo -e "\n\n===========================================" 
echo "Test Summary"
echo "===========================================" 
echo "Time: $(date)"
echo "Directory: $(pwd)"
echo "User: $(whoami)"
