# Aixtiv CLI Deployment Guide

This document provides instructions for deploying the Aixtiv CLI using GitHub Actions CI/CD pipeline to Google Cloud Run.

## Table of Contents

1. [Deployment Architecture Overview](#deployment-architecture-overview)
2. [Setting Up GitHub Repository Secrets](#setting-up-github-repository-secrets)
3. [Manually Triggering Deployments](#manually-triggering-deployments)
4. [Verifying Deployments](#verifying-deployments)
5. [Dockerfile Explanation](#dockerfile-explanation)
6. [Local Testing Before Deployment](#local-testing-before-deployment)

## Deployment Architecture Overview

The Aixtiv CLI deployment architecture consists of the following components:

- **GitHub Actions**: CI/CD pipeline that builds, tests, and deploys the application
- **Google Container Registry (GCR)**: Stores Docker images of the application
- **Google Cloud Run**: Hosts the application as a serverless container
- **Node.js Application**: The Aixtiv CLI tool packaged as both a CLI and API service

The deployment flow is as follows:

1. Changes are pushed to the main branch (or deployment is manually triggered)
2. GitHub Actions workflow is activated
3. Code is checked out, dependencies installed, and tests run
4. Docker image is built based on the Dockerfile
5. Image is pushed to Google Container Registry
6. New deployment is created in Google Cloud Run
7. Traffic is routed to the new deployment

## Setting Up GitHub Repository Secrets

The GitHub Actions workflow requires several repository secrets to authenticate with Google Cloud Platform. Here's how to set them up:

### Required Secrets

1. **GCP_PROJECT**: Your Google Cloud Project ID
2. **WORKLOAD_IDENTITY_POOL**: The Workload Identity Pool ID
3. **WORKLOAD_IDENTITY_PROVIDER**: The Workload Identity Provider ID

### Step-by-Step Instructions

1. **Create a GCP Service Account**:

   ```bash
   gcloud iam service-accounts create github-actions-deploy \
     --display-name="GitHub Actions Deploy"
   ```

2. **Grant Necessary Permissions**:

   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

3. **Set Up Workload Identity Federation**:

   ```bash
   # Create a Workload Identity Pool
   gcloud iam workload-identity-pools create "github-actions-pool" \
     --project="YOUR_PROJECT_ID" \
     --location="global" \
     --display-name="GitHub Actions Pool"

   # Get the Workload Identity Pool ID
   export WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe "github-actions-pool" \
     --project="YOUR_PROJECT_ID" \
     --location="global" \
     --format="value(name)")

   # Create a Workload Identity Provider in the pool
   gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
     --project="YOUR_PROJECT_ID" \
     --location="global" \
     --workload-identity-pool="github-actions-pool" \
     --display-name="GitHub Actions Provider" \
     --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
     --issuer-uri="https://token.actions.githubusercontent.com"

   # Get the Workload Identity Provider ID
   export WORKLOAD_IDENTITY_PROVIDER_ID=$(gcloud iam workload-identity-pools providers describe "github-actions-provider" \
     --project="YOUR_PROJECT_ID" \
     --location="global" \
     --workload-identity-pool="github-actions-pool" \
     --format="value(name)")
   ```

4. **Add IAM Binding for Authentication**:

   ```bash
   gcloud iam service-accounts add-iam-policy-binding "github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --project="YOUR_PROJECT_ID" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/YOUR_GITHUB_USERNAME/aixtiv-cli"
   ```

5. **Add Secrets to GitHub Repository**:

   Go to your GitHub repository > Settings > Secrets and Variables > Actions > New repository secret, and add:

   - Name: `GCP_PROJECT`
     Value: `YOUR_PROJECT_ID`
   - Name: `WORKLOAD_IDENTITY_POOL`
     Value: (the value after "workloadIdentityPools/" in the WORKLOAD_IDENTITY_POOL_ID)
   - Name: `WORKLOAD_IDENTITY_PROVIDER`
     Value: (the value after "providers/" in the WORKLOAD_IDENTITY_PROVIDER_ID)

## Manually Triggering Deployments

You can manually trigger a deployment using the GitHub Actions workflow:

1. Navigate to your GitHub repository
2. Go to the "Actions" tab
3. Select the "Aixtiv CLI Build & Deploy" workflow
4. Click "Run workflow"
5. Select the branch (usually main)
6. Choose the environment (staging or production)
7. Click "Run workflow"

## Verifying Deployments

After a deployment completes, verify it was successful by:

1. **Check GitHub Actions Logs**:

   - Navigate to the Actions tab in your repository
   - Look for the latest run of the "Aixtiv CLI Build & Deploy" workflow
   - Ensure all steps show a green checkmark

2. **Check Cloud Run Service**:

   ```bash
   gcloud run services describe aixtiv-cli --region us-west1 --project YOUR_PROJECT_ID
   ```

3. **Test the API Endpoints**:

   ```bash
   # Get the service URL
   export SERVICE_URL=$(gcloud run services describe aixtiv-cli \
     --region us-west1 \
     --project YOUR_PROJECT_ID \
     --format="value(status.url)")

   # Test the health endpoint
   curl $SERVICE_URL/health

   # Test the root endpoint to see available API routes
   curl $SERVICE_URL
   ```

## Dockerfile Explanation

The Dockerfile for Aixtiv CLI is designed to build a Node.js application container:

```dockerfile
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Make the CLI executable
RUN chmod +x ./bin/aixtiv.js

# Set up environment for Cloud Build/Run
ENV PORT=8080
EXPOSE ${PORT}

# Start command - run the server
CMD ["node", "server.js"]
```

Key aspects:

- Uses lightweight Alpine Node.js 18 image
- Optimizes Docker layer caching by installing dependencies before copying code
- Sets up the executable permissions for the CLI tool
- Exposes port 8080 for the API server
- Runs the server.js file which exposes API endpoints

## Local Testing Before Deployment

Test your changes locally before deployment:

### Testing the CLI

```bash
# Install dependencies
npm install

# Make the CLI executable
chmod +x bin/aixtiv.js

# Run the CLI tool
./bin/aixtiv.js help

# Test environment variable validation
npm run validate-env
```

### Testing the API Server

```bash
# Start the API server
npm start

# Test the health endpoint
curl http://localhost:3333/health

# Test the API documentation
curl http://localhost:3333
```

### Testing the Docker Container

```bash
# Build the Docker image
docker build -t aixtiv-cli-local .

# Run the Docker container
docker run -p 8080:8080 --env-file .env aixtiv-cli-local

# Test the container's API
curl http://localhost:8080/health
```

### Building the Distribution Package

```bash
# Run the build script
npm run build

# Verify the built packages
ls -la dist/
```

By following this deployment guide, you'll be able to successfully set up CI/CD for Aixtiv CLI and deploy it to Google Cloud Run.
