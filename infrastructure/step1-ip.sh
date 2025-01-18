#!/bin/bash
set -e

# Create global IP
gcloud compute addresses create anthology-lb-ip \
  --project=api-for-warp-drive \
  --global \
  --ip-version=IPV4 \
  --network-tier=PREMIUM

# Get and store IP
IP=$(gcloud compute addresses describe anthology-lb-ip \
  --project=api-for-warp-drive \
  --global \
  --format='get(address)')

echo "Created IP: $IP"

# Store IP for later use
echo $IP > .anthology-lb-ip