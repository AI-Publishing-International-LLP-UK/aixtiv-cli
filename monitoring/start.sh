#!/bin/bash
gcloud monitoring uptime-check create \
  --display-name="synth-monitor" \
  --host="${GITLAB_URL}" \
  --check-interval=300 \
  --timeout=10s \
  --regions=us-central1