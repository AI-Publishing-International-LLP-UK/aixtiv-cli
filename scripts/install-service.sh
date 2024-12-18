#!/bin/bash

# Create systemd service file
sudo cat > /etc/systemd/system/warp-drive-api.service << EOL
[Unit]
Description=Warp Drive API Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/api-for-warp-drive
Environment=NODE_ENV=production
Environment=GOOGLE_CLOUD_PROJECT=api-for-warp-drive
Environment=GOOGLE_APPLICATION_CREDENTIALS=/home/api-for-warp-drive/service-account-key.json
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable warp-drive-api
sudo systemctl start warp-drive-api
