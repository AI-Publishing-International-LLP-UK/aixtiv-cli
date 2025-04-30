#!/bin/bash
# Script to run Cloud Build with proper configuration

# Default values
CONFIG_FILE="cloudbuild-final.yaml"
DEPLOYMENT_NAME="generative-ai-document-summarization"
REGION="us-west1"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --config)
      CONFIG_FILE="$2"
      shift
      shift
      ;;
    --deployment-name)
      DEPLOYMENT_NAME="$2"
      shift
      shift
      ;;
    --region)
      REGION="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --config FILE            Cloud Build configuration file (default: cloudbuild-final.yaml)"
      echo "  --deployment-name NAME    Deployment name (default: generative-ai-document-summarization)"
      echo "  --region REGION          Region (default: us-west1)"
      echo "  --help                   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate configuration file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file '$CONFIG_FILE' not found"
  exit 1
fi

# Run Cloud Build with substitutions
echo "Running Cloud Build with configuration: $CONFIG_FILE"
echo "Deployment Name: $DEPLOYMENT_NAME"
echo "Region: $REGION"

gcloud beta builds submit \
  --config="$CONFIG_FILE" \
  --substitutions="_DEPLOYMENT_NAME=$DEPLOYMENT_NAME,_REGION=$REGION" \
  --no-source

exit $?
