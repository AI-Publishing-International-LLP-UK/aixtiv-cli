#!/bin/bash

# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions-deploy \
    --display-name="GitHub Actions Deploy Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding api-for-warp-drive \
    --member="serviceAccount:github-actions-deploy@api-for-warp-drive.iam.gserviceaccount.com" \
    --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding api-for-warp-drive \
    --member="serviceAccount:github-actions-deploy@api-for-warp-drive.iam.gserviceaccount.com" \
    --role="roles/iap.tunnelResourceAccessor"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions-deploy@api-for-warp-drive.iam.gserviceaccount.com

echo "Service account key created as 'github-actions-key.json'"
echo "Please add this key to your GitHub repository secrets as 'GCP_SA_KEY'"
