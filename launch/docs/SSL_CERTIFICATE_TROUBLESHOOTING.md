# SSL Certificate Troubleshooting Guide

This document provides guidance for troubleshooting and resolving SSL certificate issues in the Aixtiv Symphony ecosystem.

## Common SSL Certificate Issues

### 1. Certificate Mismatch Error

**Symptoms:**

- Browser shows "Your connection is not private" error
- Error message indicates certificate is from a different domain (e.g., firebaseapp.com)
- Error code like NET::ERR_CERT_COMMON_NAME_INVALID

**Causes:**

- Firebase Hosting using default certificate instead of custom domain certificate
- Incomplete or incorrect DNS configuration
- Pending certificate provisioning or failed validation

**Resolution:**
Use the `fix-coaching2100-ssl.sh` script (adaptable for any domain) to:

1. Remove domain from Firebase Hosting
2. Re-add domain to trigger new certificate provisioning
3. Verify DNS configuration
4. Wait for certificate provisioning to complete

```bash
# Run the SSL fix script
./scripts/fix-coaching2100-ssl.sh
```

### 2. Expired SSL Certificate

**Symptoms:**

- Browser shows "Your connection is not private" error
- Error message indicates certificate has expired
- Error code like NET::ERR_CERT_DATE_INVALID

**Resolution:**
Force certificate renewal with Firebase Hosting:

```bash
# Replace with your domain and project values
firebase hosting:domain:update example.com --site example-com --project your-project-id --ssl=force
```

### 3. Missing SSL Certificate

**Symptoms:**

- Site loads over HTTP but not HTTPS
- Certificate not found when checking with OpenSSL

**Resolution:**
Provision a new SSL certificate:

```bash
# Using the Aixtiv CLI
aixtiv domain ssl-provision example.com --type firebase --project your-project-id
```

## Verification Methods

### Check Certificate Details

```bash
# Check certificate details using OpenSSL
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

### Verify Certificate Status in Firebase

```bash
# List domains and certificate status
firebase hosting:domain:list --site your-site-name --project your-project-id
```

## Region-Specific Considerations

All SSL certificates for the Aixtiv Symphony ecosystem should be provisioned in the `us-west1` region (Oregon), with resources in the `us-west1-b` zone for consistency.

Make sure your configuration reflects these region settings:

```json
{
  "project": {
    "id": "api-for-warp-drive",
    "regions": {
      "primary": "us-west1-b",
      "backup": {
        "region": "us-west1",
        "location": "Oregon"
      }
    }
  }
}
```

## Monitoring SSL Certificate Expiration

To prevent SSL certificate expiration issues, use the built-in SSL certificate monitoring:

```bash
# Check SSL certificate status for all domains
aixtiv domain ssl-check --all

# Set up regular monitoring (cron job)
0 0 * * * /path/to/aixtiv-cli/scripts/domain-ssl-check.sh > /path/to/ssl-check-log.txt
```

## Firebase Hosting vs. GCP Load Balancer Certificates

### Firebase Hosting

- Managed certificates with automatic renewal
- Limited to Firebase Hosting sites
- Best for static content and simple web applications

### GCP Load Balancer

- More control over certificate configuration
- Works with any GCP resource (VM instances, Cloud Run, etc.)
- Supports advanced routing options

Choose the appropriate option based on your deployment architecture.

## Troubleshooting Flowchart

1. **Identify Issue**: Determine the specific certificate error message
2. **Check Domain Configuration**: Verify DNS settings and Firebase/GCP configuration
3. **Check Certificate Status**: Use OpenSSL or Firebase/GCP tools to check certificate details
4. **Resolve Issue**: Apply the appropriate fix based on the identified problem
5. **Verify Resolution**: Wait for propagation and check certificate status again

Remember that certificate provisioning and DNS changes can take time to propagate (15-60 minutes or more).
