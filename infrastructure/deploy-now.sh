#!/bin/bash
set -e

# Deploy zone and get IP
gcloud deployment-manager deployments create anthology-infra --config=infrastructure/dns/zone-setup.yaml
LB_IP=$(gcloud compute addresses describe anthology-lb-ip --global --format='get(address)')

# Update backend service
gcloud compute backend-services update lb-ip-2100-cool-backend \
  --global \
  --enable-cdn \
  --session-affinity=CLIENT_IP \
  --timeout=60s \
  --connection-draining-timeout=60s

# Configure DNS records
gcloud dns record-sets transaction start --zone=main-zone
gcloud dns record-sets transaction add $LB_IP --name=2100.cool. --ttl=300 --type=A --zone=main-zone
gcloud dns record-sets transaction add staging.$LB_IP --name=staging.2100.cool. --ttl=300 --type=A --zone=main-zone
gcloud dns record-sets transaction execute --zone=main-zone

# Deploy application stack
kubectl apply -f deployment/complete-setup.yaml

# Wait for certificate
while [[ $(gcloud compute ssl-certificates describe sc2100cool --format='get(status)') == "PROVISIONING" ]]; do
  echo "Waiting for SSL certificate..."
  sleep 30
done

echo "Deployment complete. Testing endpoints..."
curl -v https://2100.cool/health