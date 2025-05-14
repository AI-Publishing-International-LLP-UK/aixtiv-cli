#!/bin/bash

# Import agent tracking utilities
source "$(dirname "$0")/../bin/agent-tracking.sh"

# Default agent ID if not set
AGENT_ID=${AGENT_ID:-"UNSPECIFIED_AGENT"}

log_agent_action "deploy_start" "Starting deployment process"

# Update packages
log_agent_action "system_update" "Running apt-get update"
sudo apt-get update

# Install Node.js dependencies
log_agent_action "dependency_install" "Running npm install"
npm install

# Setup systemd service
log_agent_action "service_setup" "Creating systemd service file"
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
Environment=AGENT_ID=${AGENT_ID}

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and start service
log_agent_action "service_reload" "Reloading systemd daemon"
sudo systemctl daemon-reload

log_agent_action "service_enable" "Enabling warp-drive-api service"
sudo systemctl enable warp-drive-api

log_agent_action "service_restart" "Restarting warp-drive-api service"
sudo systemctl restart warp-drive-api

# Show service status
log_agent_action "service_status" "Checking warp-drive-api service status"
systemctl status warp-drive-api

log_agent_action "deploy_complete" "Deployment completed successfully"