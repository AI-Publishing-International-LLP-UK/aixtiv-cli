#!/bin/bash
set -e

# Configure forwarding rule
gcloud compute forwarding-rules create anthology-lb-rule \
  --load-balancing-scheme=EXTERNAL \
  --global \
  --address=34.8.193.106 \
  --target-https-proxy=anthology-https-proxy \
  --ports=443

# Update DNS records
gcloud dns record-sets transaction start --zone=main-zone
gcloud dns record-sets transaction add 34.8.193.106 --name=2100.cool. --ttl=300 --type=A --zone=main-zone
gcloud dns record-sets transaction add 34.8.193.106 --name=staging.2100.cool. --ttl=300 --type=A --zone=main-zone
gcloud dns record-sets transaction execute --zone=main-zone