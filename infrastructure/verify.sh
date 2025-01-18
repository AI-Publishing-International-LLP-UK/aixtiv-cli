#!/bin/bash
set -e

echo "Checking SSL Certificate..."
gcloud compute ssl-certificates list | grep sc2100cool

echo "Verifying Load Balancer..."
if ! gcloud compute forwarding-rules describe anthology-lb-rule --global; then
    echo "Failed: Load balancer missing"
fi

echo "Checking Backend..."
gcloud compute backend-services describe lb-ip-2100-cool-backend --global

echo "Verifying DNS Records..."
if ! gcloud dns record-sets list --zone=2100-cool; then
    echo "Failed: DNS zone missing"
fi

echo "Testing Endpoints..."
curl -v https://2100.cool/health
curl -v https://staging.2100.cool/health

echo "Checking Deployments..."
kubectl get deployments -n anthology-ai