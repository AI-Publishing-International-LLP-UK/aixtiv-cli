# CI/CD CTTT Key Rotation System

## Overview

The CI/CD CTTT Key Rotation System provides automated, secure management of credentials and API keys across the Aixtiv ecosystem. This system is built on the Continuous Integration/Continuous Deployment with Comprehensive Testing and Telemetry Tracking (CTTT) pipeline to ensure zero downtime during credential rotation and maintain robust security posture.

![CTTT Key Rotation](../assets/cicd_key_rotation_logo.png)

## Key Features

- **Automated Key Rotation**: Schedule-based or on-demand rotation of service account keys and API keys
- **Pre/Post Validation**: Comprehensive testing before and after credential rotation
- **Zero-Downtime Rotation**: Seamless transition between old and new credentials
- **GCP Secret Manager Integration**: Secure storage and retrieval of sensitive credentials
- **Audit Logging**: Detailed tracking of all credential management operations
- **Health Monitoring**: Continuous verification of credential health and service connectivity
- **Rollback Capabilities**: Automated recovery if credential rotation fails

## Command Reference

### Secret Management

The following commands are available for secret management:

```bash
# List all secrets in the project
aixtiv claude:secrets -a list -p api-for-warp-drive

# Get a specific secret
aixtiv claude:secrets -a get -i secret-name -p api-for-warp-drive

# Create a new secret
aixtiv claude:secrets -a create -i new-secret -p api-for-warp-drive --value "secret-value"

# Delete a secret
aixtiv claude:secrets -a delete -i old-secret -p api-for-warp-drive

# Generate a secure random string
aixtiv claude:secrets -a generate -i new-random-secret -p api-for-warp-drive --length 32
```

### Key Rotation

The following commands manage automated key rotation:

```bash
# Rotate a service account key
aixtiv claude:secrets -a rotate-sa-key -i sa-key-secret -p api-for-warp-drive -s service-account@project-id.iam.gserviceaccount.com

# Rotate an API key
aixtiv claude:secrets -a rotate-api-key -i api-key-secret -p api-for-warp-drive -k api-key-name

# Setup automated rotation schedule
aixtiv claude:secrets -a setup-rotation -i secret-name -p api-for-warp-drive --schedule "{'interval': 'weekly', 'day': 'sunday', 'time': '01:00'}"
```

### CI/CD CTTT Integration

These commands integrate with the CI/CD CTTT pipeline:

```bash
# Run pre-rotation tests
aixtiv cicd:test:pre-rotation

# Run post-rotation tests
aixtiv cicd:test:post-rotation

# Verify all keys in the system
aixtiv cicd:verify:keys

# Verify a specific key
aixtiv cicd:verify:key api-for-warp-drive
```

## Key Rotation Process

The key rotation process follows these steps:

1. **Pre-Rotation Testing**

   - Verify current credentials are working
   - Test service connectivity with current keys
   - Create backup of current credentials

2. **Key Generation**

   - Generate new credentials (service account key or API key)
   - Store new credentials in Secret Manager
   - Apply appropriate IAM permissions

3. **Staged Deployment**

   - Deploy new credentials to non-critical services first
   - Verify functionality with new credentials
   - Gradually expand deployment to all services

4. **Post-Rotation Testing**

   - Verify all services work with new credentials
   - Test API integrations
   - Validate Firebase functions

5. **Cleanup**
   - Revoke old credentials after grace period
   - Update audit logs
   - Send notification of successful rotation

## CI/CD CTTT Pipeline Integration

The Key Rotation System is fully integrated with the CI/CD CTTT pipeline:

```
┌─────────────────────────────────────────────────────┐
│                CI/CD CTTT Pipeline                  │
└───────────┬───────────────────────────┬─────────────┘
            │                           │
┌───────────▼───────────┐     ┌─────────▼─────────────┐
│   Continuous Testing   │     │   Telemetry Tracking  │
│                       │     │                       │
│ ┌───────────────────┐ │     │ ┌───────────────────┐ │
│ │  Pre-Rotation     │ │     │ │  Key Health       │ │
│ │  Test Suite       │ │     │ │  Monitoring       │ │
│ └───────────────────┘ │     │ └───────────────────┘ │
│                       │     │                       │
│ ┌───────────────────┐ │     │ ┌───────────────────┐ │
│ │  Post-Rotation    │ │     │ │  Service          │ │
│ │  Test Suite       │ │     │ │  Connectivity     │ │
│ └───────────────────┘ │     │ └───────────────────┘ │
└───────────────────────┘     └───────────────────────┘
            │                           │
┌───────────▼───────────┐     ┌─────────▼─────────────┐
│    GCP Secret Manager  │     │    Key Rotation       │
│                       │     │    Orchestrator        │
└───────────────────────┘     └───────────────────────┘
```

## Pre-Rotation Testing

Pre-rotation tests ensure that the system is in a good state before beginning key rotation:

1. **Secret Accessibility Test**: Verify that secrets can be accessed
2. **Service Connection Test**: Verify all services are reachable
3. **Credential Validation Test**: Verify current credentials are valid
4. **API Integration Test**: Verify API integrations are functioning

## Post-Rotation Testing

Post-rotation tests verify that the system remains functional after key rotation:

1. **New Secret Accessibility Test**: Verify new secrets are accessible
2. **New Credential Validation Test**: Verify new credentials are valid
3. **Service Connection Test**: Verify all services work with new credentials
4. **API Integration Test**: Verify API integrations still function
5. **Firebase Function Test**: Verify Firebase functions work with new credentials

## Rotation Scheduling

Keys can be rotated on different schedules:

| Credential Type      | Default Rotation | Recommended Frequency |
| -------------------- | ---------------- | --------------------- |
| Service Account Keys | 90 days          | 30-90 days            |
| API Keys             | 180 days         | 90-180 days           |
| OAuth Client Secrets | 365 days         | 180-365 days          |
| Firebase API Keys    | 180 days         | 90-180 days           |

Schedules can be customized based on security requirements and operational needs.

## Security Considerations

The Key Rotation System implements these security best practices:

1. **Principle of Least Privilege**: Each service account has only the permissions it needs
2. **Key Isolation**: Each environment (dev, staging, prod) has separate credentials
3. **Secure Storage**: All keys stored in GCP Secret Manager with strict access controls
4. **Automated Revocation**: Old keys are automatically revoked after a grace period
5. **Audit Logging**: All key operations are logged for security audit purposes
6. **Regular Validation**: Continuous monitoring ensures key health and validity

## Integration Examples

### Rotating Service Account Keys

```bash
# Rotate a service account key with CTTT integration
aixtiv claude:secrets -a rotate-sa-key -i analytics-sa-key -p api-for-warp-drive -s analytics@api-for-warp-drive.iam.gserviceaccount.com
```

Output:

```
Starting service account key rotation with CTTT integration...
✅ Pre-rotation tests passed successfully
✅ Generated new service account key
✅ Stored new key in Secret Manager
✅ Updated 5 services with new key
✅ Post-rotation tests passed successfully
✅ Old key scheduled for deletion in 7 days
Rotation complete: Secret 'analytics-sa-key' has been rotated successfully
```

### Rotating API Keys

```bash
# Rotate an API key with CTTT integration
aixtiv claude:secrets -a rotate-api-key -i anthropic-api-key -p api-for-warp-drive -k anthropic-production
```

Output:

```
Starting API key rotation with CTTT integration...
✅ Pre-rotation tests passed successfully
✅ Generated new API key
✅ Stored new key in Secret Manager
✅ Updated 3 services with new key
✅ Post-rotation tests passed successfully
✅ Old key scheduled for deletion in 7 days
Rotation complete: Secret 'anthropic-api-key' has been rotated successfully
```

## Troubleshooting

| Issue                       | Solution                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| Pre-rotation tests failing  | Verify current credentials are valid and services are accessible |
| Post-rotation tests failing | Check service configuration for hardcoded credentials            |
| Service not using new key   | Verify service is properly configured to use Secret Manager      |
| Key rotation timeout        | Check for long-running operations that may block rotation        |
| Permission errors           | Verify service account has necessary IAM permissions             |

## Best Practices

1. **Regular Rotation**: Set up automated schedules for all credentials
2. **Phased Rotation**: Rotate one credential type at a time
3. **Testing**: Run pre/post rotation tests for every rotation
4. **Monitoring**: Set up alerts for failed rotations
5. **Documentation**: Keep an inventory of all credentials and their rotation schedules
6. **Emergency Process**: Have a documented process for emergency key rotation

## Command Scripts

The system includes npm scripts for common operations:

```json
"scripts": {
  "cicd:test:pre-rotation": "node tests/cttt/security/pre-rotation.test.js",
  "cicd:test:post-rotation": "node tests/cttt/security/post-rotation.test.js",
  "cicd:verify:keys": "node scripts/verify-keys.js",
  "cicd:verify:key": "node scripts/verify-keys.js api-for-warp-drive"
}
```

## Support

For assistance with the Key Rotation System:

- Contact: security@coaching2100.com
- Reference: CTTT Key Rotation v1.0
- Documentation: https://docs.aixtiv.ai/cttt-key-rotation
