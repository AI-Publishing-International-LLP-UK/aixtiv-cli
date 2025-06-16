# Dr. Claude Orchestrator
# Firebase Domain Autoscaling in Aixtiv Symphony

This document describes the Firebase Domain Autoscaling integration for the Aixtiv CLI, which automates the verification and management of domains during autoscaling events.

## Overview

The Firebase Domain Autoscaling system automatically verifies and connects domains to Firebase hosting during autoscaling events. This ensures that as new agent domains are created or scaled, they are properly verified and connected to the appropriate Firebase hosting projects.

## Key Features

- **Automatic Domain Verification**: Automatically verifies domains with Firebase Hosting
- **DNS Record Generation**: Generates the necessary DNS records for domain verification
- **Project Mapping**: Maps domain types to the appropriate Firebase projects
- **Retry Mechanism**: Implements retries for domain verification with configurable parameters
- **Detailed Logging**: Provides comprehensive logs of verification attempts and results
- **Autoscaling Integration**: Can be integrated with existing autoscaling workflows

## Prerequisites

- Firebase CLI installed and authenticated
- Access to manage DNS records for the domains
- Appropriate permissions for the Firebase projects
- Node.js 14+ and npm

## Installation

The Firebase Domain Autoscaling script is included in the Aixtiv CLI package. No additional installation is required.

## Usage

### Command Line

```bash
# Verify all pending domains
node /Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains.js

# Force verification of all domains (including already verified ones)
node /Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains.js --force

# Perform a dry run (no changes, just report what would be done)
node /Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains.js --dry-run

# Verbose logging
node /Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains.js --verbose
```

### Integration with Aixtiv CLI

The domain autoscaling functionality can be integrated into the Aixtiv CLI using the following command:

```bash
aixtiv domain:autoscale-verify [options]
```

Options:
- `--force`: Force verification of all domains
- `--dry-run`: Perform a dry run without making changes
- `--verbose`: Enable verbose logging

### Programmatic Usage

```javascript
const { handleAutoscaling } = require('/Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains');

async function runAutoscaling() {
  const options = {
    force: false,
    dryRun: false,
    logLevel: 'info'
  };
  
  const results = await handleAutoscaling(options);
  console.log(`Verified: ${results.verified.length}, Failed: ${results.failed.length}`);
}

runAutoscaling();
```

## Firebase Project Mapping

The script maps domain types to specific Firebase projects as follows:

| Domain Type | Firebase Project       |
|-------------|------------------------|
| character   | api-for-warp-drive     |
| command     | api-for-warp-drive     |
| wing        | api-for-warp-drive     |
| squadron    | api-for-warp-drive     |
| brand       | coaching2100-com       |
| aixtiv      | aixtiv-symphony        |
| learning    | academy2100-com        |
| commerce    | giftshop2100-com       |
| governance  | api-for-warp-drive     |

The default project (used if a domain type is not in the mapping) is `api-for-warp-drive`.

## Domain Verification Process

1. **Domain Loading**: Domains are loaded from the domain cache
2. **Status Check**: Each domain's verification status is checked
3. **DNS Record Generation**: For unverified domains, verification DNS records are generated
4. **Firebase Integration**: Domains are added to the appropriate Firebase project
5. **Verification Monitoring**: The system periodically checks if domains have been verified
6. **Status Update**: Domain status is updated in the cache based on verification results

## Logs and Reporting

Verification logs are stored in `~/.aixtiv-cli/logs/verification/` with timestamps. Each log contains:

- Date and time of verification attempt
- Total domains processed
- Verification status for each domain
- Summary of successful and failed verifications

## Integration with Autoscaling Workflows

To integrate with autoscaling workflows, add the following line to your autoscaling script:

```bash
node /Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains.js
```

For Kubernetes-based autoscaling, you can add it as a post-scale hook:

```yaml
spec:
  containers:
  - name: domain-verifier
    image: node:16
    command: ["node", "/scripts/autoscale-verify-firebase-domains.js"]
```

## Troubleshooting

### Common Issues

1. **Verification Timeout**: If domains fail to verify within the retry period, check:
   - DNS propagation status
   - Correct DNS record format
   - Firebase project permissions

2. **Firebase CLI Authentication**: Ensure Firebase CLI is authenticated:
   ```bash
   firebase login
   ```

3. **Domain Cache Issues**: If the domain cache is corrupt or missing, it can be regenerated:
   ```bash
   aixtiv domain:clean-cache
   ```

### Logging

To enable verbose logging for troubleshooting:

```bash
node /Users/as/asoos/aixtiv-cli/scripts/autoscale-verify-firebase-domains.js --verbose
```

## Configuration

The script's behavior can be configured by modifying the `CONFIG` object in the script:

```javascript
const CONFIG = {
  // Maximum retry attempts for domain verification
  MAX_RETRIES: 3,
  
  // Delay between verification attempts (in milliseconds)
  RETRY_DELAY: 10000, // 10 seconds
  
  // Maximum time to wait for domain verification (in milliseconds)
  VERIFICATION_TIMEOUT: 300000, // 5 minutes
};
```

## Security Considerations

- The script requires Firebase CLI authentication to manage domains
- DNS records are created for domain verification
- Firebase project mapping should align with security boundaries

## Related Documentation

- [Firebase Hosting Custom Domains](https://firebase.google.com/docs/hosting/custom-domain)
- [DNS Configuration Guide](https://firebase.google.com/docs/hosting/custom-domain#dns-configuration)
- [Domain Management in Aixtiv CLI](./batch-domain-management.md)