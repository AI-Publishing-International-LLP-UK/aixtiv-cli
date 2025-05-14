#!/bin/bash

# Updated service script with IAP tunnel access
set -e

# Service configuration
sudo systemctl stop api-warp-drive || true
sudo systemctl disable api-warp-drive || true

# Create service file
sudo cat > /etc/systemd/system/api-warp-drive.service << EOL
[Unit]
Description=API for Warp Drive
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/api-for-warp-drive
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl enable api-warp-drive
sudo systemctl start api-warp-drive