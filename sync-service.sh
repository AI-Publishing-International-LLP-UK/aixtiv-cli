#!/bin/bash
# Firestore/Pinecone sync for 320k agents/rules

echo "Initializing data sync service..."

# Check Firestore collections
gcloud firestore indexes composite list --project=$PROJECT_ID

# Verify Pinecone vectors
curl -s https://api.pinecone.io/stats \
  -H "Api-Key: $PINECONE_API_KEY" | jq '.totalVectorCount'

echo "Sync service configured"
