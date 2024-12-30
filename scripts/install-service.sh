#!/bin/bash

# Create systemd service file
sudo tee /etc/systemd/system/api-for-warp-drive.service << EOL
[Unit]
Description=API for Warp Drive
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/api-for-warp-drive
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable api-for-warp-drive
sudo systemctl restart api-for-warp-drive
