#!/bin/bash
set -e

echo "Starting full deployment sequence..."

# 1. Deploy DNS and Load Balancer
gcloud deployment-manager deployments create anthology-infra --config=infrastructure/dns/zone-setup.yaml
LB_IP=$(gcloud compute addresses describe anthology-lb-ip --global --format='get(address)')

# 2. Configure Backend
gcloud compute backend-services update lb-ip-2100-cool-backend \
  --global \
  --enable-cdn \
  --session-affinity=CLIENT_IP \
  --timeout=60s

# 3. Set up DNS Records
gcloud dns record-sets transaction start --zone=main-zone
gcloud dns record-sets transaction add $LB_IP --name=2100.cool. --ttl=300 --type=A --zone=main-zone
gcloud dns record-sets transaction add $LB_IP --name=staging.2100.cool. --ttl=300 --type=A --zone=main-zone
gcloud dns record-sets transaction execute --zone=main-zone

# 4. Deploy Application
kubectl apply -f deployment/complete-setup.yaml

# 5. Monitor Deployment
echo "Monitoring deployment..."
while true; do
  # Check SSL
  SSL_STATUS=$(gcloud compute ssl-certificates describe sc2100cool --format='get(status)')
  echo "SSL Status: $SSL_STATUS"
  
  # Check DNS
  DNS_STATUS=$(dig +short 2100.cool)
  echo "DNS Status for 2100.cool: $DNS_STATUS"
  
  # Check Health
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://2100.cool/health || echo "pending")
  echo "Health Status: $HEALTH_STATUS"
  
  if [[ "$SSL_STATUS" == "ACTIVE" && ! -z "$DNS_STATUS" && "$HEALTH_STATUS" == "200" ]]; then
    echo "Deployment successful!"
    break
  fi
  
  sleep 30
  echo "---"
done