#!/bin/bash

sudo tee /etc/systemd/system/api-for-warp-drive.service << EOL
[Unit]
Description=API for Warp Drive
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/api-for-warp-drive
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl daemon-reload
sudo systemctl enable api-for-warp-drive
sudo systemctl restart api-for-warp-drive
