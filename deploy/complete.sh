#!/bin/bash
set -e

echo "Creating target HTTPS proxy..."
gcloud compute target-https-proxies create anthology-https-proxy \
  --global \
  --ssl-certificates=sc2100cool \
  --url-map=anthology-url-map

echo "Creating forwarding rule..."
gcloud compute forwarding-rules create anthology-lb-rule \
  --load-balancing-scheme=EXTERNAL \
  --global \
  --address=34.8.193.106 \
  --target-https-proxy=anthology-https-proxy \
  --ports=443

echo "Verifying components..."
gcloud compute forwarding-rules describe anthology-lb-rule --global
gcloud compute target-https-proxies describe anthology-https-proxy --global
gcloud compute url-maps describe anthology-url-map --global

echo "Testing endpoints..."
curl -k https://2100.cool/health || echo "Health check pending DNS propagation"