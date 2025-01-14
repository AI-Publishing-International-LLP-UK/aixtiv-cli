# API Monitoring System for Coaching 2100

## Repository Information
- Organization: c2100-pr
- Project: api-for-warp-drive

## Administrators
- Owner: pr@coaching2100.com
- Editor: dk@coaching2100.com

## Setup
1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment:
```bash
export GOOGLE_CLOUD_PROJECT=api-for-warp-drive
export GITHUB_ORG=c2100-pr
```

3. Run monitoring:
```bash
python monitoring/service_monitor.py --project-id api-for-warp-drive
```

## GitHub Actions
- Automated monitoring every 5 minutes
- Manual trigger available
- Environment: production

## Alerts Configuration
- Critical threshold: 90%
- Warning threshold: 95%
- Alert cooldown: 5 minutes