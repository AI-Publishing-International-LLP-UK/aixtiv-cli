# GCP Secret Manager Integration

This document describes the Google Cloud Platform (GCP) Secret Manager integration with Aixtiv CLI.

## Overview

The Aixtiv CLI provides a secure way to manage secrets, API keys, and service account credentials through the GCP Secret Manager. This implementation includes:

- Secure storage of sensitive credentials
- Automated API key rotation
- Service account key rotation with lifecycle management
- Audit logging for security operations
- Access control and permission management

## Installation

The GCP Secret Manager integration is part of Phase III: Agent Autonomy + Platform Automation and is included in the Aixtiv CLI package version 1.0.3 and later.

## Authentication

Before using the GCP Secret Manager commands, you need to authenticate with Google Cloud:

```bash
# Set up application default credentials
gcloud auth application-default login

# Or set GOOGLE_APPLICATION_CREDENTIALS environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## Command Usage

### List Secrets

List all secrets in the project:

```bash
aixtiv claude:secrets -a list -p api-for-warp-drive
```

List with detailed information:

```bash
aixtiv claude:secrets -a list -p api-for-warp-drive --detailed
```

### Create Secrets

Create a new secret:

```bash
aixtiv claude:secrets -a create -i my-secret -p api-for-warp-drive --value "my-secret-value"
```

Create from file:

```bash
aixtiv claude:secrets -a create -i my-secret -p api-for-warp-drive --fromFile /path/to/secret.txt
```

Interactive mode:

```bash
aixtiv claude:secrets -a create -i my-secret -p api-for-warp-drive --interactive
```

### Access Secrets

Get a secret value:

```bash
aixtiv claude:secrets -a get -i my-secret -p api-for-warp-drive
```

Get a specific version:

```bash
aixtiv claude:secrets -a get -i my-secret -p api-for-warp-drive -v 2
```

Export to file:

```bash
aixtiv claude:secrets -a get -i my-secret -p api-for-warp-drive --export "/path/to/export.txt"
```

### Delete Secrets

Delete a secret:

```bash
aixtiv claude:secrets -a delete -i my-secret -p api-for-warp-drive
```

Delete a specific version:

```bash
aixtiv claude:secrets -a delete -i my-secret -p api-for-warp-drive -v 2
```

### Service Account Key Rotation

Rotate a service account key:

```bash
aixtiv claude:secrets -a rotate-sa-key -i sa-key-secret -p api-for-warp-drive -s service-account@api-for-warp-drive.iam.gserviceaccount.com
```

Dry run (no changes):

```bash
aixtiv claude:secrets -a rotate-sa-key -i sa-key-secret -p api-for-warp-drive -s service-account@api-for-warp-drive.iam.gserviceaccount.com --dryRun
```

Customize rotation options:

```bash
aixtiv claude:secrets -a rotate-sa-key -i sa-key-secret -p api-for-warp-drive -s service-account@api-for-warp-drive.iam.gserviceaccount.com --keyType json --deleteOldKey true --maxKeyAge 30
```

### API Key Rotation

Rotate an API key:

```bash
aixtiv claude:secrets -a rotate-api-key -i api-key-secret -p api-for-warp-drive -k my-api-key
```

### Setup Rotation Schedule

Create a rotation schedule from a JSON file:

```bash
aixtiv claude:secrets -a setup-rotation -p api-for-warp-drive --scheduleFile /path/to/schedule.json
```

### Generate Secure Strings

Generate a random secure string:

```bash
aixtiv claude:secrets -a generate --length 40
```

With custom character set:

```bash
aixtiv claude:secrets -a generate --length 32 --charset "A-Za-z0-9!@#$%^&*"
```

### View Audit Log

View the audit log:

```bash
aixtiv claude:secrets -a audit
```

Filter by secret:

```bash
aixtiv claude:secrets -a audit -i my-secret
```

## Rotation Schedule Format

The rotation schedule is a JSON array of objects with the following structure:

```json
[
  {
    "type": "service-account-key",
    "secretId": "sa-key-secret",
    "serviceAccountEmail": "service-account@api-for-warp-drive.iam.gserviceaccount.com",
    "interval": "30d",
    "keyType": "json",
    "deleteOldKey": true
  },
  {
    "type": "api-key",
    "secretId": "api-key-secret",
    "apiKeyName": "my-api-key",
    "interval": "90d"
  }
]
```

## Security Best Practices

1. Rotate service account keys at least every 90 days
2. Use the automated rotation feature for critical API keys
3. Enable audit logging for all secret operations
4. Use the minimal required permissions for service accounts
5. Store rotation schedules securely
6. Use separate projects for development and production secrets

## Google Cloud Region Configuration

All secrets are stored in the `us-west1` region to comply with organizational requirements. This ensures that:

- All GCP resources remain in the designated region
- Regional compliance requirements are satisfied
- Consistent latency for accessing secrets from services in the same region

For zone-specific resources, use `us-west1-b` as the primary zone.

## Integration with CI/CD CTTT

The GCP Secret Manager integration includes CI/CD CTTT (Continuous Integration/Continuous Deployment with Comprehensive Testing and Telemetry Tracking) capabilities for automatic key rotation:

```yaml
# Example CI/CD CTTT Workflow
name: API Key Rotation - CI/CD CTTT Integrated
on:
  schedule:
    - cron: '0 0 1 * *' # Monthly
  workflow_dispatch:
    inputs:
      secretId:
        description: 'Specific secret ID to rotate'
        required: false
      runCttt:
        description: 'Run CI/CD CTTT pipeline after rotation'
        type: boolean
        default: true
  repository_dispatch:
    types: [cttt-security-scan]

jobs:
  rotate-keys:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Authenticate with Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.SERVICE_ACCOUNT_EMAIL }}
      - name: Run Automated Key Rotation
        run: aixtiv claude:secrets -a rotate-api-key -i api-key-secret -p api-for-warp-drive -k my-api-key

  # Integrated with CTTT Pipeline
  trigger-cttt:
    needs: rotate-keys
    runs-on: ubuntu-latest
    steps:
      - name: Run CTTT Health Checks
        run: npm run cli -- cicd:test:run --suite security
      - name: Verify API Keys
        run: npm run cli -- cicd:verify:keys
      - name: Deploy Updates
        run: npm run cli -- cicd:deploy --environment production --region us-west1
```

### Setting Up CI/CD CTTT Integration

To set up the CI/CD CTTT integration for key rotation:

```bash
# Run the setup script
./scripts/setup-cicd-key-rotation.sh

# Verify the setup
gh workflow view key-rotation.yml

# Test the CTTT pipeline
npm run cicd:test:pre-rotation
```

### Key Verification

The integration includes automatic verification of rotated keys:

```bash
# Verify all keys in the rotation schedule
npm run cicd:verify:keys

# Verify a specific key
npm run cicd:verify:key api-for-warp-drive my-secret-id
```

### Monitoring and Telemetry

The CI/CD CTTT integration provides comprehensive monitoring and telemetry:

```bash
# View key rotation metrics
aixtiv cicd:metrics --component key-rotation

# Generate a detailed report
aixtiv cicd:report --component key-rotation --period 30d
```

## Related Documentation

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [IAM Best Practices](https://cloud.google.com/iam/docs/using-iam-securely)
- [Key Rotation Best Practices](https://cloud.google.com/kms/docs/key-rotation)
