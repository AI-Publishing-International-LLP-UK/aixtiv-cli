#!/bin/bash

RAY_ENDPOINTS=(
  "claude-lead-ray"
  "super-claude-ray"
  "prof-lee-ray"
  "dr-cypriot-ray"
  "dr-match-ray"
  "dr-memoria-ray" 
  "dr-grant-ray"
  "dr-burby-ray"
  "doctora-maria-ray"
  "dr-sabina-ray"
)

for endpoint in "${RAY_ENDPOINTS[@]}"; do
  echo "Activating $endpoint"
  gcloud ai endpoints create \
    --region=us-west4-c \
    --display-name="$endpoint" \
    --machine-type=n1-standard-4
done