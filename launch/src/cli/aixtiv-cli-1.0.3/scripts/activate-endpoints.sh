#!/bin/bash

config_file="config/bulk-activation.json"
endpoints=$(jq -r '.endpoints[] | "\(.name) \(.region) \(.machine_type)"' $config_file)

while read -r name region machine_type; do
  echo "Activating endpoint: $name"
  gcloud ai endpoints create \
    --region=$region \
    --display-name=$name \
    --machine-type=$machine_type
done <<< "$endpoints"