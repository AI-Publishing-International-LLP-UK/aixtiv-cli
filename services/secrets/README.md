# Enhanced Secret Manager

A robust implementation of GCP Secret Manager with automated key rotation capabilities for the Aixtiv CLI. This module is part of Phase III: Agent Autonomy + Platform Automation.

## Features

- Secure credential management using Google Cloud Secret Manager
- Automated service account key rotation
- API key rotation with audit logging
- Secret versioning with access control
- Secure random string generation
- Rotation scheduling and automation
- Comprehensive audit logging

## Architecture

The Enhanced Secret Manager consists of several components:

1. **EnhancedSecretManager Class**: Core implementation with key rotation capabilities
2. **Provider Factory**: Abstracts provider-specific implementations
3. **Audit Logger**: Records all secret operations for security tracking
4. **Rotation Scheduler**: Manages automated rotation of credentials

## Integration Points

This module integrates with:

- **GCP Secret Manager**: For secure storage of credentials
- **IAM Service**: For service account key management
- **API Gateway**: For API key rotation
- **Firestore**: For tracking rotation history and audit logs
- **CLI Interface**: Via the `claude:secrets` command

## Usage

### Basic Usage

```javascript
const EnhancedSecretManager = require('./enhanced-secret-manager');

const secretManager = new EnhancedSecretManager({
  projectId: 'api-for-warp-drive',
  region: 'us-west1',
});

// Access a secret
const apiKey = await secretManager.accessSecret('my-api-key');

// Create or update a secret
await secretManager.setSecret('my-api-key', 'new-api-key-value');

// Delete a secret
await secretManager.deleteSecret('my-api-key');
```

### Key Rotation

```javascript
// Rotate a service account key
const result = await secretManager.rotateServiceAccountKey(
  'sa-key-secret',
  'service-account@api-for-warp-drive.iam.gserviceaccount.com',
  {
    keyType: 'json',
    deleteOldKey: true,
    maxKeyAge: 90, // days
  }
);

// Rotate an API key
const result = await secretManager.rotateApiKey('api-key-secret', 'my-api-key', {
  maxKeyAge: 30, // days
});
```

### Rotation Schedule

```javascript
const schedule = [
  {
    type: 'service-account-key',
    secretId: 'sa-key-secret',
    serviceAccountEmail: 'service-account@api-for-warp-drive.iam.gserviceaccount.com',
    interval: '90d',
    keyType: 'json',
    deleteOldKey: true,
  },
  {
    type: 'api-key',
    secretId: 'api-key-secret',
    apiKeyName: 'my-api-key',
    interval: '30d',
  },
];

const result = await secretManager.createRotationSchedule(schedule, {
  schedulePath: '/path/to/schedule.json',
});
```

## Security Considerations

1. **IAM Permissions**: The service account used requires the following roles:

   - `roles/secretmanager.admin`
   - `roles/iam.serviceAccountKeyAdmin`
   - `roles/serviceusage.serviceUsageAdmin`

2. **Audit Logging**: All operations are logged to the audit log file for security tracking.

3. **Key Management**:

   - Old service account keys are deleted after rotation by default
   - Secret versions are retained for audit purposes
   - Access to secrets is restricted and logged

4. **Rotation Best Practices**:
   - Service account keys: Rotate every 90 days
   - API keys: Rotate every 30-60 days
   - Application secrets: Rotate based on sensitivity

## Implementation Details

The implementation follows these security principles:

1. **Least Privilege**: Only required permissions are granted
2. **Defense in Depth**: Multiple layers of security controls
3. **Immutable Secrets**: Secrets are versioned, not modified
4. **Audit Trails**: All operations are logged for security review
5. **Automated Rotation**: Reduces human intervention and error

## Error Handling

The module implements comprehensive error handling:

- Network errors are retried with exponential backoff
- Validation errors provide clear error messages
- Rotation failures maintain the previous key until successful
- All operations are atomic to prevent partial updates

## Regional Configuration

All secrets are stored in the `us-west1` region to comply with organizational requirements.

## Integration with CI/CD

The Secret Manager can be integrated with CI/CD pipelines for automated key rotation. See the [setup-secret-manager.sh](../../scripts/setup-secret-manager.sh) script for automation examples.

## Related Documentation

- [GCP Secret Manager Documentation](docs/GCP_SECRET_MANAGER.md)
- [Command Implementation](../../commands/claude/secrets.js)
- [Setup Script](../../scripts/setup-secret-manager.sh)
