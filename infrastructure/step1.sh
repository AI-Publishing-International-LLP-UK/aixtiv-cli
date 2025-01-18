#!/bin/bash
set -e

# Create global IP address
gcloud compute addresses create anthology-lb-ip \
  --global \
  --description="Global IP for Anthology Load Balancer"

# Verify creation and get IP
IP=$(gcloud compute addresses describe anthology-lb-ip --global --format='get(address)')

# Update forwarding rule config
cat > infrastructure/forwarding-rule.yaml << EOF
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeForwardingRule
metadata:
  name: anthology-lb-rule
  namespace: anthology-ai
spec:
  description: "Frontend forwarding rule for anthology-ai services"
  loadBalancingScheme: "EXTERNAL"
  portRange: "443"
  IPAddress: "$IP"
  target: "projects/api-for-warp-drive/global/targetHttpsProxies/anthology-https-proxy"
EOF

echo "Created IP: $IP"
echo "Updated forwarding rule configuration"