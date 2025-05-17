# Docker Security Compliance Documentation

This document explains the security improvements made to the `asoos-powerup:aixtiv-symphony-v1.3` Docker image to address compliance requirements in Google Container Registry.

## Table of Contents

1. [Overview](#overview)
2. [Non-Root User Configuration](#non-root-user-configuration)
3. [Supply Chain Attestation](#supply-chain-attestation)
4. [Validation](#validation)
5. [Best Practices](#best-practices)

## Overview

Two important security compliance issues were addressed in our Docker image:

1. **Missing non-root user configuration** - The image was running as root, which is a security risk.
2. **Missing supply chain attestation** - The image lacked verification of its origin and build process.

These improvements enhance security and ensure compliance with Google Cloud Platform's security best practices.

## Non-Root User Configuration

### Why It's Important

Running containers as root is a security risk because:

- If an attacker compromises the application, they get root access to the container
- Root in the container may gain elevated permissions on the host in case of container breakout
- It violates the principle of least privilege

### Implementation Details

The Dockerfile has been updated to use the non-root `node` user that comes with the official Node.js Alpine image:

```dockerfile
# Set proper ownership for the application files
RUN chown -R node:node /app

# Switch to non-root user
USER node
```

This ensures that:

- The application runs with the minimum required permissions
- The container follows security best practices
- All application files are owned by the non-root user

### Testing Non-Root Configuration

To verify the non-root user configuration, you can:

1. Run the container locally:
   ```bash
   docker run --rm gcr.io/api-for-warp-drive/aixtiv-cli:latest id
   ```

2. The output should confirm the container is running as the `node` user (UID typically 1000) instead of root (UID 0).

## Supply Chain Attestation

### Why It's Important

Supply chain attestation:

- Verifies the image was built by trusted systems
- Prevents tampering or unauthorized modifications
- Provides audit trails for security compliance
- Ensures only authorized images are deployed

### Implementation Details

Binary Authorization and attestations have been integrated into our CI/CD pipeline:

1. **Setup Binary Authorization Prerequisites**:
   - Key rings and keys for signing attestations
   - Attestor configuration for validating images

2. **Attestation Creation**:
   - Every image build generates a cryptographic attestation
   - The attestation is signed with a secure key
   - The attestation is attached to the image in GCR

3. **Deployment Enforcement**:
   - Cloud Run deployment uses the attested image
   - Binary Authorization can verify attestations before deployment

### Viewing Attestations

To view attestations for an image:

```bash
gcloud container binauthz attestations list \
  --attestor=aixtiv-attestor \
  --attestor-project=api-for-warp-drive \
  --artifact-url=gcr.io/api-for-warp-drive/aixtiv-cli:[TAG]
```

## Validation

After deployment, you can validate both security improvements:

1. **Non-Root User Validation**:

   ```bash
   # Check the container's user by connecting and running id
   gcloud beta run jobs execute check-aixtiv-user \
     --region=us-west1 \
     --image=gcr.io/api-for-warp-drive/aixtiv-cli:latest \
     --command="id" \
     --wait
   ```

2. **Attestation Validation**:

   ```bash
   # List attestations for the deployed image
   gcloud container binauthz attestations list \
     --attestor=aixtiv-attestor \
     --attestor-project=api-for-warp-drive \
     --artifact-url=gcr.io/api-for-warp-drive/aixtiv-cli:latest
   ```

## Best Practices

For maintaining these security improvements:

1. **Non-Root User Best Practices**:
   - Always test the application with non-root users during development
   - Set appropriate file permissions for any new files/directories
   - Use volume mounts with correct permissions for persistent data

2. **Supply Chain Attestation Best Practices**:
   - Regularly rotate attestation keys
   - Implement detailed attestation policies
   - Include vulnerability scanning in the CI/CD pipeline
   - Conduct regular audits of the attestation process

---

These security improvements ensure our Docker images comply with best practices and security requirements, providing better protection against security threats and ensuring a verifiable software supply chain.

