#!/bin/bash
# Production deployment script for Symphony interface
# Usage: ./symphony-production-deploy.sh [environment]
# Where environment is one of: staging, production (defaults to staging)

set -e

ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PROJECT_ID="api-for-warp-drive"
GCR_IMAGE="gcr.io/${PROJECT_ID}/symphony-interface:${TIMESTAMP}"
DOMAIN="symphony.asoos.2100.cool"

echo "🚀 Starting Symphony interface deployment to ${ENVIRONMENT}"
echo "Build timestamp: ${TIMESTAMP}"

# Step 1: Build the application
echo "📦 Building Symphony interface..."
cd "$(dirname "$0")"
npm install

# Create production-optimized build
npm run build

# Step 2: Create Docker image
echo "🐳 Creating Docker image..."
docker build -t ${GCR_IMAGE} .

# Step 3: Push to Container Registry
echo "☁️ Pushing to Google Container Registry..."
docker push ${GCR_IMAGE}

# Step 4: Update Kubernetes deployment
echo "☸️ Updating Kubernetes deployment..."

# Connect to GKE cluster
gcloud container clusters get-credentials private-cluster-auto --zone us-west1-b --project ${PROJECT_ID}

# Update deployment YAML with new image
DEPLOY_YAML="./infrastructure/${ENVIRONMENT}/symphony-deployment.yaml"
sed -i "s|gcr.io/${PROJECT_ID}/symphony-interface:.*|${GCR_IMAGE}|g" ${DEPLOY_YAML}

# Apply deployment
kubectl apply -f ${DEPLOY_YAML}

# Step 5: Verify deployment
echo "✅ Verifying deployment..."
sleep 30  # Wait for deployment to stabilize

# Check deployment status
kubectl rollout status deployment/symphony-interface -n anthology-ai-${ENVIRONMENT}

# Step 6: Update DNS if production
if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo "🌐 Updating DNS records..."
  
  # Get Load Balancer IP
  LB_IP=$(kubectl get svc symphony-interface -n anthology-ai-production -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  
  # Update DNS A record
  gcloud dns record-sets transaction start --zone="asoos-2100-cool"
  gcloud dns record-sets transaction add ${LB_IP} \
    --name="${DOMAIN}." \
    --ttl=300 \
    --type=A \
    --zone="asoos-2100-cool"
  gcloud dns record-sets transaction execute --zone="asoos-2100-cool"
  
  echo "🔒 Configuring SSL..."
  # Apply certificate manager resources
  kubectl apply -f ./infrastructure/ssl/symphony-certificate.yaml
fi

# Step 7: Log deployment
echo "📝 Logging deployment..."
gcloud firestore documents create projects/${PROJECT_ID}/databases/(default)/documents/deployments/symphony-${TIMESTAMP} \
  --fields="status=SUCCESS,timestamp=$(date +%s),component=SYMPHONY_INTERFACE,version=${TIMESTAMP},environment=${ENVIRONMENT}"

# Step 8: Run zero-drift check
echo "🔄 Running zero-drift check..."
./scripts/verify-zero-drift.sh "symphony" "${ENVIRONMENT}"

echo "✨ Symphony interface successfully deployed to ${ENVIRONMENT}!"
echo "📊 Dashboard: https://console.cloud.google.com/monitoring/dashboards/builder/symphony-${ENVIRONMENT}"
if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo "🌎 Application URL: https://${DOMAIN}"
fi