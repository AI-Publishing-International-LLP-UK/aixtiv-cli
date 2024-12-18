#!/bin/bash

# Setup script for api-for-warp-drive

# Enable required APIs
gcloud services enable customsearch.googleapis.com
gcloud services enable places-backend.googleapis.com

# Create service account
gcloud iam service-accounts create warp-drive-api \
    --display-name="Warp Drive API Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding api-for-warp-drive \
    --member="serviceAccount:warp-drive-api@api-for-warp-drive.iam.gserviceaccount.com" \
    --role="roles/serviceusage.serviceUsageConsumer"

# Create service account key
gcloud iam service-accounts keys create ./service-account-key.json \
    --iam-account=warp-drive-api@api-for-warp-drive.iam.gserviceaccount.com

# Set environment variables
export GOOGLE_CLOUD_PROJECT='api-for-warp-drive'
export GOOGLE_APPLICATION_CREDENTIALS='./service-account-key.json'

# Install dependencies
npm install