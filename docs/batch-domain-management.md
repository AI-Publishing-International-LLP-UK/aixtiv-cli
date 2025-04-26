# Batch Domain Management for AIXTIV CLI

This document outlines how to manage and provision SSL certificates for large batches of domains using the AIXTIV CLI's batch processing scripts.

## Overview

For organizations managing large numbers of domains (like the 245+ domains in the AIXTIV Symphony ecosystem), the CLI provides batch processing capabilities to:

1. Import multiple domains into the AIXTIV CLI domain management system
2. Provision SSL certificates for multiple domains at once
3. Check SSL certificate status for all domains

## Available Scripts

### 1. Bulk Domain Import

The `bulk-domain-import.sh` script imports a list of domains from a text file into the AIXTIV CLI domain cache.

```bash
# Basic usage
./scripts/bulk-domain-import.sh domains/coaching2100-domains.txt

# With all parameters
./scripts/bulk-domain-import.sh domains/all-domains.txt character aixtiv-symphony true
```

Parameters:
1. `domains_file`: Path to file containing domains (one per line)
2. `domain_type`: Domain type (default: brand)
3. `firebase_project`: Firebase project ID (default: aixtiv-symphony)
4. `provision_ssl`: 'true' or 'false' - provision SSL after import (default: false)

### 2. Batch SSL Provisioning

The `batch-ssl-provision.sh` script provisions SSL certificates for multiple domains from a text file.

```bash
# Basic usage
./scripts/batch-ssl-provision.sh domains/coaching2100-domains.txt

# With all parameters
./scripts/batch-ssl-provision.sh domains/all-domains.txt firebase aixtiv-symphony false
```

Parameters:
1. `domains_file`: Path to file containing domains (one per line)
2. `provision_type`: 'firebase' or 'gcp' (default: firebase)
3. `project_id`: Firebase or GCP project ID (default: aixtiv-symphony)
4. `dry_run`: 'true' or 'false' - if true, just print commands without executing (default: false)

## Domain File Format

The domain files should be simple text files with one domain per line. Comments can be added with `#`:

```
# This is a comment
domain1.com
domain2.org
domain3.net
# Another comment
domain4.ai
```

## Step-by-Step Usage for 245+ Domains

### Step 1: Prepare Domain Files

Organize your domains into appropriate category files or use a single comprehensive file:

```bash
# Create category-specific files
mkdir -p domains
touch domains/character-domains.txt
touch domains/command-domains.txt
# ... etc

# Or use a single comprehensive file
touch domains/all-domains.txt
```

### Step 2: Import Domains in Batches

Import domains in smaller batches to ensure successful processing:

```bash
# Import character domains
./scripts/bulk-domain-import.sh domains/character-domains.txt character aixtiv-symphony false

# Import command domains
./scripts/bulk-domain-import.sh domains/command-domains.txt command aixtiv-symphony false

# ... etc
```

### Step 3: Provision SSL Certificates

After importing domains, provision SSL certificates:

```bash
# Provision for character domains
./scripts/batch-ssl-provision.sh domains/character-domains.txt firebase aixtiv-symphony false

# Provision for command domains
./scripts/batch-ssl-provision.sh domains/command-domains.txt firebase aixtiv-symphony false

# ... etc
```

Or provision for all domains at once (may take time):

```bash
./scripts/batch-ssl-provision.sh domains/all-domains.txt firebase aixtiv-symphony false
```

### Step 4: Verify Certificate Status

After provisioning, check the status of all SSL certificates:

```bash
aixtiv domain ssl-check --all
```

Or run the dedicated check script:

```bash
./scripts/domain-ssl-check.sh
```

## Handling Domain Verification

When provisioning large numbers of domains with Firebase Hosting, many of them will require domain verification. You can:

1. Use Firebase's domain verification process (adding TXT records to DNS)
2. Set up automated verification through the GitHub Actions workflow

## GitHub Actions Integration

For continuous management of large domain sets, the included GitHub Actions workflow (`workflows/ssl-automation.yaml`) will:

1. Automatically check certificate status daily
2. Provision/renew certificates for all domains
3. Send notifications for any certificate issues

Set up the workflow with:

```bash
git add workflows/ssl-automation.yaml
git commit -m "Add SSL automation workflow"
git push
```

## Best Practices for Large Domain Sets

When managing 245+ domains:

1. **Batch Processing**: Process domains in batches of 50-75 to avoid rate limiting
2. **Domain Categorization**: Organize domains by type/category for easier management
3. **Monitoring**: Set up comprehensive monitoring with Slack/email alerts
4. **Automation**: Use GitHub Actions for scheduled checks and renewals
5. **DNS Management**: Maintain a centralized DNS management approach
6. **Documentation**: Keep detailed records of all domains and their configuration
7. **Regular Audits**: Periodically audit domains to ensure they're still needed/used

## Troubleshooting Batch Operations

If batch operations fail:

1. **Check Logs**: Review logs at `/tmp/aixtiv-batch-ssl-provision.log` and `/tmp/aixtiv-bulk-domain-import.log`
2. **Rate Limiting**: If you encounter rate limiting, increase the sleep delay in the scripts
3. **Firebase/GCP CLI**: Ensure you're authenticated with Firebase and GCP CLI
4. **DNS Issues**: Verify DNS is correctly configured for domains
5. **Manual Verification**: Some domains may require manual verification steps

## Example: Processing coaching2100.com Family

To process the coaching2100.com family of domains:

```bash
# Import domains
./scripts/bulk-domain-import.sh domains/coaching2100-domains.txt brand coaching2100-com false

# Provision SSL certificates
./scripts/batch-ssl-provision.sh domains/coaching2100-domains.txt firebase coaching2100-com false

# Check status
aixtiv domain ssl-check --all
```