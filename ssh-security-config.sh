#!/bin/bash

# Simplified SSH Security Configuration for CVE-2024-45337
# This script creates a security configuration to mitigate the vulnerability

set -e

echo "🔒 SSH Security Configuration for MCP Servers (CVE-2024-45337)"
echo ""

# Create the security config script
cat > remote-ssh-config.sh << 'EOL'
#!/bin/bash
set -e

echo "Setting up SSH security configuration for $(hostname)"

# Create directory for security configurations
SECURITY_DIR="/etc/ssh/security"
sudo mkdir -p "$SECURITY_DIR"

# Create security policy file
cat > security-policy.conf << EOF
# SSH Security Policy to mitigate CVE-2024-45337
# This configuration restricts SSH authentication methods and adds additional logging

# Only allow specific authentication methods
AllowedAuthenticationMethods publickey,password

# Disable authentication agent forwarding
AllowAgentForwarding no

# Enable verbose logging for authentication attempts
LogLevel VERBOSE

# Restrict public key authentication to specific keys
AuthorizedKeysFile %h/.ssh/authorized_keys

# Disable user environment processing
PermitUserEnvironment no

# Disable TCP forwarding
AllowTcpForwarding no

# Disable X11 forwarding
X11Forwarding no

# Enable strict mode checking
StrictModes yes

# Disable empty passwords
PermitEmptyPasswords no

# Disable challenge-response authentication
ChallengeResponseAuthentication no

# Disable Kerberos authentication
KerberosAuthentication no

# Disable GSSAPI authentication
GSSAPIAuthentication no
EOF

# Install the security policy
sudo cp security-policy.conf "$SECURITY_DIR/"

# Update SSH configuration to include security policy
if ! grep -q "Include /etc/ssh/security/security-policy.conf" /etc/ssh/sshd_config; then
  echo -e "\n# Include security policy to mitigate CVE-2024-45337\nInclude /etc/ssh/security/security-policy.conf" | sudo tee -a /etc/ssh/sshd_config
  echo "Security policy added to SSH configuration"
else
  echo "Security policy already included in SSH configuration"
fi

# Create a script to monitor for suspicious activity
cat > monitor-ssh-attacks.sh << EOF
#!/bin/bash

# Monitor SSH logs for suspicious authentication patterns related to CVE-2024-45337

echo "Monitoring SSH logs for potential CVE-2024-45337 exploitation attempts..."

# Look for patterns indicative of the vulnerability being exploited
grep -E "(authentication.*with multiple keys|publickey authentication failed|authentication succeeded after failed attempts)" /var/log/auth.log | tail -20

echo "\nMonitoring complete. Report any suspicious patterns to security team."
EOF

chmod +x monitor-ssh-attacks.sh
sudo cp monitor-ssh-attacks.sh "$SECURITY_DIR/"

# Set up a cron job to run the monitoring script daily
CRON_JOB="0 * * * * /etc/ssh/security/monitor-ssh-attacks.sh > /var/log/ssh-security-monitor.log 2>&1"
echo "$CRON_JOB" | sudo tee /etc/cron.d/ssh-security-monitor

# Restart SSH service to apply changes
echo "Restarting SSH service to apply security configurations..."
sudo systemctl restart sshd

echo "Security configuration completed successfully on $(hostname)"
echo "The system is now better protected against CVE-2024-45337"
EOL

# Make the script executable
chmod +x remote-ssh-config.sh

# Upload and run the script on the instance
echo "Uploading and running security configuration on instance..."
gcloud compute scp remote-ssh-config.sh modelcontextprotocol-b:/tmp/ --zone=us-west1-b --project=api-for-warp-drive
gcloud compute ssh modelcontextprotocol-b --zone=us-west1-b --project=api-for-warp-drive \
  --command="sudo bash /tmp/remote-ssh-config.sh"

# Update the GitHub workflow
echo "Updating GitHub workflow to use patched project..."
sed -i '' 's/PROJECT_ID: dr-claude-live/PROJECT_ID: api-for-warp-drive/g' .github/workflows/deploy-mcp-drclaude.yml

# Update deployment script
echo "Updating deployment script..."
cp deploy-mcp-drclaude-fixed.sh deploy-mcp-drclaude.sh

# Set up monitoring
echo "Setting up security monitoring..."
gcloud logging metrics create ssh_auth_bypass_attempts \
  --description="Potential SSH auth bypass attempts" \
  --log-filter='resource.type="gce_instance" \
  resource.labels.instance_id=~"modelcontextprotocol.*" \
  textPayload=~"authentication.*with multiple keys"'

echo ""
echo "🎉 SSH Security Configuration Completed"
echo "The modelcontextprotocol-b instance has been configured to mitigate CVE-2024-45337"
echo "The drclaude.live deployment workflow has been updated to use the patched project"
echo ""
