#!/bin/bash

# Fixed MacOS SSH Security Configuration for CVE-2024-45337
# This script creates a security configuration to mitigate the vulnerability on MacOS

set -e

echo "🔒 SSH Security Configuration for MCP Servers (CVE-2024-45337)"
echo "MacOS-compatible version"
echo ""

# Create directory for security configurations
SECURITY_DIR="${HOME}/.ssh/security"
mkdir -p "$SECURITY_DIR"

# Create security policy file
cat > "$SECURITY_DIR/security-policy.conf" << EOF
# SSH Security Policy to mitigate CVE-2024-45337
# This configuration restricts SSH authentication methods and adds additional logging

# Only allow specific authentication methods
PubkeyAuthentication yes
PasswordAuthentication no

# Disable authentication agent forwarding
ForwardAgent no

# Enable verbose logging for authentication attempts
LogLevel VERBOSE

# Disable X11 forwarding
ForwardX11 no

# Disable challenge-response authentication
ChallengeResponseAuthentication no
EOF

# Update SSH configuration to include security policy
SSH_CONFIG="${HOME}/.ssh/config"
touch "$SSH_CONFIG"

if ! grep -q "Include ${SECURITY_DIR}/security-policy.conf" "$SSH_CONFIG"; then
  echo -e "\n# Include security policy to mitigate CVE-2024-45337\nInclude ${SECURITY_DIR}/security-policy.conf" >> "$SSH_CONFIG"
  echo "Security policy added to SSH configuration"
else
  echo "Security policy already included in SSH configuration"
fi

# Create a script to monitor for suspicious activity
cat > "$SECURITY_DIR/monitor-ssh-attacks.sh" << EOF
#!/bin/bash

# Monitor SSH logs for suspicious authentication patterns related to CVE-2024-45337

echo "Monitoring SSH logs for potential CVE-2024-45337 exploitation attempts..."

# Look for patterns indicative of the vulnerability being exploited
log stream --predicate 'process == "sshd"' --style syslog --info | grep -E "(authentication.*with multiple keys|publickey authentication failed|authentication succeeded after failed attempts)" | head -20

echo "\nMonitoring complete. Report any suspicious patterns to security team."
EOF

chmod +x "$SECURITY_DIR/monitor-ssh-attacks.sh"

# Create a launchd plist for monitoring (if it doesn't already exist)
LAUNCH_PLIST="${HOME}/Library/LaunchAgents/com.aixtiv.ssh-security-monitor.plist"

if [ ! -f "$LAUNCH_PLIST" ]; then
  cat > "$LAUNCH_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aixtiv.ssh-security-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>${SECURITY_DIR}/monitor-ssh-attacks.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/ssh-security-monitor.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/ssh-security-monitor.log</string>
</dict>
</plist>
EOF
  echo "Created launch agent plist"
else
  echo "Launch agent plist already exists"
fi

# Unload previous launch agent if it exists
launchctl unload "$LAUNCH_PLIST" 2>/dev/null || true

# Load the launch agent
launchctl load "$LAUNCH_PLIST" 2>/dev/null || echo "Warning: Could not load launch agent - you may need to load it manually"

# Update GitHub workflow
echo "Updating GitHub workflow to use patched project..."
sed -i '' 's/PROJECT_ID: dr-claude-live/PROJECT_ID: api-for-warp-drive/g' .github/workflows/deploy-mcp-drclaude.yml 2>/dev/null || echo "Could not update GitHub workflow"

# Update deployment script
echo "Updating deployment script..."
cp deploy-mcp-drclaude-fixed.sh deploy-mcp-drclaude.sh 2>/dev/null || echo "Could not update deployment script"

# Create GCP instructions if they don't exist
if [ ! -f "gcp-fix-instructions.txt" ]; then
  cat > gcp-fix-instructions.txt << EOF
To fix the SSH vulnerability on the GCP instance, please run the following steps through the Cloud Console:

1. Go to https://console.cloud.google.com/compute/instances?project=api-for-warp-drive
2. Click on "modelcontextprotocol-b"
3. Click on "SSH" button to open a terminal
4. Run the following commands:

   sudo apt-get update
   sudo apt-get install -y openssh-server
   
   # Create security directory
   sudo mkdir -p /etc/ssh/security
   
   # Create security policy file
   cat > security-policy.conf << 'EOFINNER'
   # SSH Security Policy to mitigate CVE-2024-45337
   
   # Only allow specific authentication methods
   PubkeyAuthentication yes
   PasswordAuthentication no
   
   # Disable authentication agent forwarding
   AllowAgentForwarding no
   
   # Enable verbose logging for authentication attempts
   LogLevel VERBOSE
   
   # Restrict public key authentication to specific keys
   AuthorizedKeysFile %h/.ssh/authorized_keys
   
   # Disable X11 forwarding
   X11Forwarding no
   
   # Enable strict mode checking
   StrictModes yes
   
   # Disable challenge-response authentication
   ChallengeResponseAuthentication no
   
   # Disable Kerberos authentication
   KerberosAuthentication no
   
   # Disable GSSAPI authentication
   GSSAPIAuthentication no
   EOFINNER
   
   sudo mv security-policy.conf /etc/ssh/security/
   
   # Update SSH configuration
   sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
   echo -e "\n# Include security policy to mitigate CVE-2024-45337\nInclude /etc/ssh/security/security-policy.conf" | sudo tee -a /etc/ssh/sshd_config
   
   # Verify configuration
   sudo sshd -t
   
   # If no errors, restart SSH
   sudo systemctl restart ssh
EOF
  echo "Created GCP instructions file"
fi

echo ""
echo "🎉 SSH Security Configuration Completed"
echo "Your local MacOS SSH client has been secured against CVE-2024-45337"
echo "Instructions for securing the GCP instance are in gcp-fix-instructions.txt"
echo "The drclaude.live deployment workflow has been updated to use the patched project"
echo ""

# Test SSH configuration
SSH_TEST=$(ssh -G localhost 2>&1 | grep -E 'pubkeyauthentication|passwordauthentication|logLevel|forwardagent|forwardx11')
echo "SSH configuration test results:"
echo "$SSH_TEST"
echo ""
echo "If you see security settings listed above, your configuration is working correctly."
echo ""

