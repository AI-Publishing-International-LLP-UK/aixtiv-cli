#!/bin/bash

# Service remediation script
for service in $(gcloud compute backend-services list --format='value(name)' --filter='name:gsmrsvd-rzpa7sugpfgdc5rx7tnx4r-*'); do
  gcloud compute health-checks create http ${service}-health-check \
    --request-path=/health \
    --port=8080
  
  gcloud compute network-endpoint-groups create ${service}-neg \
    --network=default \
    --subnet=default \
    --zone=us-west1-a

  gcloud compute backend-services update $service \
    --global \
    --health-checks=${service}-health-check
done