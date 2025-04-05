#!/bin/bash
set -e

echo "Creating global IP address..."
gcloud compute addresses create anthology-lb-ip \
  --global \
  --ip-version=IPV4 \
  --network-tier=PREMIUM

echo "Getting IP address..."
LB_IP=$(gcloud compute addresses describe anthology-lb-ip --global --format='get(address)')
echo "Load balancer IP: $LB_IP"

echo "Configuring DNS..."
gcloud deployment-manager deployments create anthology-infra \
  --config=infrastructure/dns/zone-setup.yaml \
  --properties="loadBalancerIP:$LB_IP"

echo "Setting up HTTP load balancing..."
gcloud compute forwarding-rules create anthology-lb-rule \
  --load-balancing-scheme=EXTERNAL \
  --network-tier=PREMIUM \
  --address=$LB_IP \
  --global \
  --target-https-proxy=anthology-https-proxy \
  --ports=443