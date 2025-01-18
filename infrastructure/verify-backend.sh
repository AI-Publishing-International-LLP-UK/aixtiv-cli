#!/bin/bash
set -e

# Verify backend service
gcloud compute backend-services describe lb-ip-2100-cool-backend --global > /tmp/backend.json
if ! grep -q '"enableCdn": true' /tmp/backend.json; then
  echo "CDN not enabled"
  exit 1
fi
if ! grep -q '"timeoutSec": "60"' /tmp/backend.json; then
  echo "Timeout not set to 60s"
  exit 1
fi
if ! grep -q '"sessionAffinity": "CLIENT_IP"' /tmp/backend.json; then
  echo "Session affinity not set"
  exit 1
fi

# Verify health check
gcloud compute health-checks describe tcp-443-health-check --global > /tmp/health.json
if ! grep -q '"checkIntervalSec": 5' /tmp/health.json; then
  echo "Health check interval not set"
  exit 1
fi

# Verify security policy
gcloud compute security-policies describe anthology-security --global > /tmp/security.json
if ! grep -q 'throttle' /tmp/security.json; then
  echo "Security rules not applied"
  exit 1
fi

echo "All configurations verified"