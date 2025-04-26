# SSL Certificate Management in AIXTIV CLI

This document outlines the SSL certificate management capabilities in the AIXTIV CLI, including automatic provisioning, monitoring, and renewal.

## Overview

The AIXTIV CLI provides a comprehensive set of tools for managing SSL certificates across multiple domains in the AIXTIV Symphony ecosystem. The solution supports both Firebase Hosting and Google Cloud Platform (GCP) load balancer managed certificates.

## Components

### CLI Commands

The following commands are available for managing SSL certificates:

```bash
# Check SSL certificate status for a specific domain
aixtiv domain ssl-check drclaude.live

# Check all domains
aixtiv domain ssl-check --all

# Provision a new SSL certificate
aixtiv domain ssl-provision drclaude.live --type firebase
aixtiv domain ssl-provision drclaude.live --type gcp --project my-gcp-project

# Renew an SSL certificate
aixtiv domain ssl-renew drclaude.live
```

### SSL Certificate Check Script

The `scripts/domain-ssl-check.sh` script provides a comprehensive check of SSL certificates for all domains managed by the AIXTIV CLI. It includes:

- Certificate expiration date checking
- Warnings for certificates expiring within 30 days
- Critical alerts for certificates expiring within 14 days
- Notification capabilities (Slack and email)
- Detailed logs of certificate status

### Automated GitHub Actions Workflow

The `workflows/ssl-automation.yaml` workflow automates the following tasks:

1. **Daily Certificate Checks**: Runs the SSL certificate check script daily
2. **Certificate Provisioning**: Automatically provisions SSL certificates for:
   - Firebase Hosting sites
   - GCP load balancer managed certificates
3. **Monitoring and Notification**: Sends alerts for certificate issues

## Implementation Details

### Firebase Hosting Certificates

Firebase Hosting automatically provisions and renews SSL certificates when a custom domain is added to a site. The AIXTIV CLI automates this process by:

1. Creating a Firebase Hosting site for the domain (if it doesn't exist)
2. Adding the custom domain to the site
3. Monitoring the certificate status

### GCP Managed Certificates

For domains using Google Cloud Platform load balancers, the CLI manages Google-managed SSL certificates by:

1. Creating a new managed certificate for the domain
2. Associating the certificate with the appropriate load balancer
3. Monitoring the certificate status

### Certificate Monitoring

The monitoring system checks:

- Certificate validity
- Expiration dates
- Certificate issuer information
- Certificate chain validity

### Notifications

When certificates are approaching expiration, the system can send notifications through:

- Slack webhooks
- Email notifications
- GitHub Actions workflow summary

## Deployment Pipeline Integration

The SSL certificate provisioning is integrated into the deployment pipeline, ensuring that:

1. All custom domains are added and managed
2. SSL certificates are provisioned for each domain
3. HTTPS is validated and working correctly
4. Notifications are sent instantly if something breaks

## Environment Variables

The following environment variables can be configured:

- `FIREBASE_TOKEN`: Firebase CI login token
- `GCP_SA_KEY`: GCP service account key (JSON)
- `SLACK_WEBHOOK`: Slack webhook URL for notifications
- `SSL_ALERT_EMAIL`: Email address for certificate alerts

## Troubleshooting

### Common Issues

1. **DNS Verification**: Ensure that DNS records are correctly configured for domain verification
2. **Certificate Provisioning Delays**: Certificate provisioning may take up to 24 hours to complete
3. **Firebase Domain Limits**: Note that Firebase Hosting has limits on the number of custom domains per project

### Debugging Commands

```bash
# Check certificate details manually
openssl s_client -servername drclaude.live -connect drclaude.live:443

# Check DNS configuration
dig drclaude.live
dig www.drclaude.live

# Check Firebase Hosting domains
firebase hosting:domains:list --project dr-claude-live

# Check GCP managed certificates
gcloud compute ssl-certificates list --global
```

## Best Practices

1. **Regular Monitoring**: Set up the automated workflow to run daily
2. **Advance Renewal**: Renew certificates at least 30 days before expiration
3. **Documentation**: Keep DNS and certificate configuration documented
4. **Testing**: Regularly test HTTPS connectivity to all domains
5. **Alerts**: Configure alerts for certificate expiration

## References

- [Firebase Custom Domains Documentation](https://firebase.google.com/docs/hosting/custom-domain)
- [Google Cloud SSL Certificates Documentation](https://cloud.google.com/load-balancing/docs/ssl-certificates)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)