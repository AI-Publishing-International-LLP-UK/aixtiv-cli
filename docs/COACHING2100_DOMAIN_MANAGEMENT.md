# Coaching2100 Domain Management System

This document describes the Coaching2100-specific domain management system that has been integrated into the CI/CD pipeline and autoscaling infrastructure.

## Overview

The Coaching2100 Domain Management System provides automated management of GoDaddy domains specifically for the Coaching2100 organization. It handles the following tasks:

1. Fetching domains from GoDaddy specifically for the Coaching2100 account
2. Categorizing domains into domain families (character, brand, aixtiv, learning, flight, etc.)
3. Assigning domains to appropriate Firebase projects based on family
4. Verifying domain connections and DNS settings
5. Generating comprehensive reports of domain status

## Integration Points

The system has been integrated at several key points:

1. **CI/CD Pipeline** - The domain management system runs automatically as part of both:

   - GitHub Actions workflow (`github-ci-cd-pipeline.yaml`)
   - Cloud Build CI/CTTT pipeline (`cloudbuild-ci-cttt.yaml`)

2. **Standalone Pipeline** - A dedicated pipeline can be run independently:

   - Cloud Build domain autoscale pipeline (`cloudbuild-domain-autoscale.yaml`)
   - GitHub Actions workflow (`domain-autoscale-pipeline.yaml`)

3. **CLI Commands** - Manual commands are available for override or testing:
   - `domain:godaddy:list --organization "Coaching2100"` - List Coaching2100 domains
   - `domain:godaddy:organize` - Organize domains into families and projects

## Configuration

The Coaching2100 domain management is configured in `config/domain/coaching2100-domain-config.json`, which specifies:

- Organization details (name, display name, account ID)
- Domain family patterns and their corresponding Firebase projects
- DNS settings for domain verification
- Cache settings for optimal performance

### Domain Families

The following domain families are recognized:

| Family    | Pattern                                    | Project            | Description                                 |
| --------- | ------------------------------------------ | ------------------ | ------------------------------------------- |
| character | `^(dr\|professor\|mr\|mrs\|ms\|coach)`     | anthology-ai       | Character domains for Coaching 2100 agents  |
| aixtiv    | `^(aixtiv\|symphony)`                      | api-for-warp-drive | Aixtiv platform domains                     |
| learning  | `^(learn\|tutor\|course\|class\|training)` | learning-pathway   | Learning and educational domains            |
| brand     | `^(coaching2100\|c2100\|anthology)`        | brand-site         | Coaching 2100 brand domains                 |
| flight    | `^(flight\|fly\|pilot\|aviation)`          | flight-school      | Flight school domains                       |
| default   | `.*`                                       | api-for-warp-drive | Default domain family for unmatched domains |

## Automation

The domain management system runs automatically:

1. As part of the CI/CD pipeline on every push to main
2. Daily at 2:00 AM UTC via scheduled trigger
3. When manually triggered through the GitHub Actions UI or gcloud command

## Security and Authentication

The system uses organization-specific credentials stored in Secret Manager:

- `coaching2100-godaddy-api-credentials` - GoDaddy API credentials for Coaching2100
- Firebase service account authentication via gcloud credentials

## Monitoring and Reporting

The system generates detailed reports on each run:

1. JSON reports in `reports/domain-autoscale/`
2. Logging to agent tracking system with Coaching2100-specific identifiers
3. Firestore document entries for each run
4. Cloud Storage artifacts for historical tracking

## Troubleshooting

If issues occur with the domain management system:

1. Check the logs in the agent tracking system with the prefix `coaching2100_domain`
2. Review the most recent report in `reports/domain-autoscale/`
3. Verify GoDaddy API credentials and Firebase authentication
4. Check the domain configuration file for accuracy

## Manual Override

In case manual intervention is needed:

1. Run individual phases of the pipeline with:

   ```
   python automation/domain-autoscale-integration.py \
     --project-id api-for-warp-drive \
     --agent-id COACHING2100_DOMAIN_OVERRIDE \
     --phase [fetch|categorize|assign|verify|full]
   ```

2. Use the CLI commands for direct control:
   ```
   node bin/aixtiv.js domain:godaddy:list --organization "Coaching2100" --refresh
   node bin/aixtiv.js domain:godaddy:organize --output domain-org.json --dry-run
   ```

## Zero-Drift Verification

The Coaching2100 domain management system includes a zero-drift verification mechanism to ensure that all domains are correctly assigned to their designated projects according to the domain family configuration.

### What is Zero-Drift?

Zero-drift means that there is no deviation between the expected domain assignments (based on domain family patterns) and the actual assignments in Firebase projects. This ensures perfect configuration consistency.

### Verification Process

The zero-drift verification process:

1. Loads the Coaching2100 domain configuration
2. Fetches all domains from GoDaddy for the Coaching2100 organization
3. Categorizes domains into families based on pattern matching
4. Checks the actual Firebase project assignments
5. Calculates any drift between expected and actual assignments
6. Generates a comprehensive verification report

### Integration Points

Zero-drift verification is integrated at multiple points:

1. **CI/CD Pipeline**: Runs automatically after domain autoscaling in both GitHub Actions and Cloud Build pipelines
2. **Daily Cron Job**: Runs at 3:00 AM UTC (after the domain autoscale job at 2:00 AM)
3. **Manual Execution**: Can be run manually via `scripts/verify-zero-drift.sh`

### Drift Handling

If drift is detected:

1. A warning is logged but the pipeline continues
2. A detailed report is generated in the `reports/domain-autoscale/` directory
3. Notification is sent to the monitoring system
4. At next domain autoscale run, the system will attempt to correct the drift automatically

### Verification Reports

Reports include:

- Timestamp of verification
- Total number of domains checked
- Number of correctly assigned domains
- Drift count and percentage
- Zero-drift status (achieved or not)
- Detailed breakdown of any drift detected

## Future Improvements

Planned enhancements for the Coaching2100 domain management system:

1. Enhanced analytics and visualization of domain usage
2. Machine learning for better domain family categorization
3. Integration with DNS health monitoring systems
4. Automated cost optimization for domain renewals
5. Predictive drift prevention using historical patterns
6. Automated recovery procedures for persistent drift issues
