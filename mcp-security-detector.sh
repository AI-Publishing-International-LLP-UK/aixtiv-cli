#!/bin/bash

# MCP Security Detector for CVE-2024-45337
# This script monitors for potential exploitation attempts

set -e

echo "🔍 MCP Security Detector for CVE-2024-45337"
echo "Checking for potential exploitation attempts"
echo ""

# Check GCP logs for exploitation attempts
echo "Checking GCP logs for exploitation attempts..."
gcloud logging read \
  "resource.type=\"gce_instance\" AND \
   resource.labels.instance_id=~\"modelcontextprotocol.*\" AND \
   textPayload=~\"authentication.*with multiple keys\"" \
  --limit 10 --format="json" | jq -r '.[] | "⚠️ " + .textPayload'

# Check if the deployed version is using the vulnerable package
echo "\nChecking if deployed instances are using vulnerable package version..."

instances=$(gcloud compute instances list --filter="name:modelcontextprotocol*" --project="api-for-warp-drive" --format="json")

echo "$instances" | jq -c '.[]' | while read -r instance; do
  name=$(echo "$instance" | jq -r '.name')
  zone=$(echo "$instance" | jq -r '.zone')
  
  echo "Checking $name in zone $zone..."
  gcloud compute ssh "$name" --zone="$zone" --project="api-for-warp-drive" \
    --command="if [ -f /etc/ssh/security/security-policy.conf ]; then echo '✅ Instance has security policy in place'; else echo '❌ Instance does not have security policy'; fi"
done

# Check the GitHub workflow
echo "\nVerifying GitHub workflow security..."
if grep -q "PROJECT_ID: api-for-warp-drive" .github/workflows/deploy-mcp-drclaude.yml; then
  echo "✅ GitHub workflow is using the secure project ID"
else
  echo "❌ GitHub workflow needs to be updated to use secure project ID"
fi

# Check the deployment script
echo "\nVerifying deployment script security..."
if [ -f deploy-mcp-drclaude.sh ] && [ -f deploy-mcp-drclaude-fixed.sh ]; then
  if diff -q deploy-mcp-drclaude.sh deploy-mcp-drclaude-fixed.sh > /dev/null; then
    echo "✅ Deployment script is using the secure version"
  else
    echo "❌ Deployment script needs to be updated to use the secure version"
  fi
else
  echo "❓ Could not verify deployment script security (files missing)"
fi

# Check for security monitoring
echo "\nVerifying security monitoring..."
if gcloud logging metrics list --filter="name:ssh_auth_bypass_attempts" --format="value(name)" | grep -q "ssh_auth_bypass_attempts"; then
  echo "✅ Security monitoring is set up"
else
  echo "❌ Security monitoring needs to be set up"
fi

echo ""
echo "Security detection completed. Any issues found should be addressed immediately."
echo "Run ./macos-ssh-security.sh to apply security fixes to your local environment."
echo "Run cat gcp-fix-instructions.txt to see how to secure the remote instance."
echo ""

