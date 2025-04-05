#!/bin/bash

# Show last 50 lines of logs
journalctl -u warp-drive-api.service -n 50 --no-pager

# Show memory and CPU usage
ps aux | grep warp-drive-api

# Show port status
netstat -tlpn | grep :3000

# Test the API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"coaching 2100 latest"}'
