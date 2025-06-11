# CI/CD Workflow Fix Instructions

This document provides comprehensive solutions to fix the failing CI/CD workflows across repositories.

## Problem Identified

The workflow failures appear to be related to Google Cloud authentication across multiple repositories. The monitoring workflows are scheduled to run every 5-15 minutes and are failing consistently, suggesting:

1. Expired service account credentials
2. Incorrect permissions
3. Potential issues with the monitoring scripts themselves

## Solution 1: Update GCP Service Account Keys

This approach creates and updates the service account keys used for authentication.

### Instructions

```bash
# 1. Create new service account key (run for each repository)
gcloud iam service-accounts keys create key.json --iam-account=monitoring@api-for-warp-drive.iam.gserviceaccount.com

# 2. Add as GitHub Secret (run for each repository)
gh secret set GOOGLE_APPLICATION_CREDENTIALS --body="$(cat key.json)" --repo=AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY
gh secret set GOOGLE_APPLICATION_CREDENTIALS --body="$(cat key.json)" --repo=C2100-PR/aixtiv-symphony-opus1
gh secret set GOOGLE_APPLICATION_CREDENTIALS --body="$(cat key.json)" --repo=C2100-PR/code-gold-standards
gh secret set GOOGLE_APPLICATION_CREDENTIALS --body="$(cat key.json)" --repo=C2100-PR/content-management-system
gh secret set GOOGLE_APPLICATION_CREDENTIALS --body="$(cat key.json)" --repo=C2100-PR/c2100-PR

# 3. Delete the key.json file after adding it to GitHub secrets
rm key.json
```

## Solution 2: Use GitHub's OIDC for Keyless Authentication (Recommended)

This modern approach eliminates the need for long-lived service account keys by using OpenID Connect.

### Step 1: Set up Workload Identity Federation in GCP

```bash
# 1. Create a Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="api-for-warp-drive" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Create a Workload Identity Provider in that pool
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="api-for-warp-drive" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. Allow the provider to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "monitoring@api-for-warp-drive.iam.gserviceaccount.com" \
  --project="api-for-warp-drive" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/api-for-warp-drive/locations/global/workloadIdentityPools/github-pool/attribute.repository/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY"

# Repeat the above command for each repository with appropriate paths
```

### Step 2: Update Workflow Files

Replace the authentication section in each workflow file with:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v1
  with:
    workload_identity_provider: 'projects/api-for-warp-drive/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
    service_account: 'monitoring@api-for-warp-drive.iam.gserviceaccount.com'
```

## Solution 3: Fix Monitoring Script Issues

The monitoring script may have issues with how it accesses Google Cloud resources.

1. Update the script's dependencies:

   ```bash
   pip install --upgrade google-cloud-monitoring google-cloud-compute pandas
   ```

2. Ensure proper error handling in the script:
   ```python
   try:
      # Existing code
   except Exception as e:
      logging.error(f"Error in monitoring service: {str(e)}")
      # Optional: Add fallback behavior or notification
   ```

## Implementation Plan

1. Apply Solution 1 first (service account key update) as a quick fix
2. Implement Solution 2 (OIDC) as a more robust long-term solution
3. Concurrently apply Solution 3 to improve script reliability

## Verification

After applying each solution, manually trigger one workflow to verify the fix works before proceeding with the others.

```bash
# Trigger a workflow manually to test
gh workflow run monitoring.yml --repo=AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY
```

## Rollback Plan

If the solutions cause additional issues:

1. Temporarily disable the failing workflows:

   ```bash
   gh workflow disable monitoring.yml --repo=AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY
   ```

2. Restore previous service account keys if needed

## Dr. Lucy & Dr. Claude Automation Notes

These fixes align with the responsibilities of Dr. Lucy Automation and Dr. Claude Automation for CI/CD management. The authentication mechanisms have been designed to work seamlessly with the existing automation patterns.
