#!/bin/bash

# Update packages
sudo apt-get update

# Install Node.js dependencies
npm install

# Setup systemd service
sudo tee /etc/systemd/system/warp-drive-api.service << EOL
[Unit]
Description=Warp Drive API Service
After=network.target

[Service]
WorkingDirectory=/home/api-for-warp-drive
ExecStart=/usr/bin/npm start
Restart=always
User=root
Environment=GOOGLE_APPLICATION_CREDENTIALS=/home/api-for-warp-drive/service-account-key.json

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable warp-drive-api
sudo systemctl restart warp-drive-api

# Show service status
systemctl status warp-drive-api