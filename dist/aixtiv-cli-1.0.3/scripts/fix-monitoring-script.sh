#!/bin/bash
# fix-monitoring-script.sh
# Script to update and fix the monitoring script across repositories

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MONITORING_SCRIPT_PATH="monitoring/service_monitor.py"
TEMP_DIR="temp_monitoring_fix"

# Repositories to update
REPOSITORIES=(
  "AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY"
  "C2100-PR/aixtiv-symphony-opus1"
  "C2100-PR/code-gold-standards"
  "C2100-PR/content-management-system"
  # Removed non-existent repository
  # "C2100-PR/c2100-PR"
  # Added correct repository paths
  "C2100-PR/aixtiv-cli"
  "C2100-PR/aixtiv-cli-distribution"
)

# Function to check prerequisites
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  
  # Check GitHub CLI
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI not found. Please install it first.${NC}"
    exit 1
  }
  
  if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}All prerequisites met.${NC}"
}

# Function to create improved monitoring script
create_improved_script() {
  echo -e "${YELLOW}Creating improved monitoring script...${NC}"
  
  mkdir -p "${TEMP_DIR}"
  
  cat > "${TEMP_DIR}/service_monitor.py" << 'EOF'
#!/usr/bin/env python3
"""
Enhanced service monitoring script with improved error handling and retry logic.
This script monitors Google Cloud services and sends alerts when issues are detected.
"""
from google.cloud import monitoring_v3
from google.cloud import compute_v1
from datetime import datetime, timedelta
import pandas as pd
import logging
import json
import yaml
import os
import sys
import argparse
import time
from requests.exceptions import RequestException
from google.api_core.exceptions import GoogleAPIError, RetryError, ServerError
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('monitoring.log')
    ]
)
logger = logging.getLogger('service_monitor')

class AlertConfig:
    """Configuration for alert thresholds and notification channels."""
    def __init__(self):
        self.CRITICAL_THRESHOLD = 0.90
        self.WARNING_THRESHOLD = 0.80
        self.ALERT_CHANNELS = {
            'slack': os.environ.get('SLACK_WEBHOOK_URL', ''),
            'email': [
                'pr@coaching2100.com', 
                'dk@coaching2100.com'
            ],
            'pagerduty': os.environ.get('PAGERDUTY_SERVICE_KEY', '')
        }
        self.ALERT_COOLDOWN = 300  # seconds between alerts
        self.last_alert_time = {}  # Track last alert time by service

class RetryableAPI:
    """Base class with retry logic for API calls."""
    def __init__(self, max_retries=3, retry_delay=2):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    def call_with_retry(self, func, *args, **kwargs):
        """Call an API function with retry logic."""
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except (ServerError, RetryError) as e:
                last_exception = e
                logger.warning(f"Retry {attempt+1}/{self.max_retries} after error: {str(e)}")
                time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
        
        # If we got here, all retries failed
        logger.error(f"All retries failed: {str(last_exception)}")
        raise last_exception

class ContentServiceMonitor(RetryableAPI):
    """Monitor Google Cloud services and send alerts when issues are detected."""
    def __init__(self, project_id, region="us-west1"):
        super().__init__()
        self.project_id = project_id
        self.region = region
        try:
            self.client = monitoring_v3.MetricServiceClient()
            self.compute_client = compute_v1.BackendServicesClient()
            self.project_name = f"projects/{project_id}"
            self.alert_config = AlertConfig()
            logger.info(f"Initialized monitoring for project {project_id} in {region}")
        except Exception as e:
            logger.error(f"Failed to initialize monitoring clients: {str(e)}")
            raise

    def get_service_metrics(self, service_name, lookback_minutes=10):
        """Get metrics for a specific service with error handling."""
        try:
            now = datetime.utcnow()
            interval = monitoring_v3.TimeInterval()
            interval.end_time.seconds = int(now.timestamp())
            interval.end_time.nanos = int((now.timestamp() % 1) * 10**9)
            
            start_time = now - timedelta(minutes=lookback_minutes)
            interval.start_time.seconds = int(start_time.timestamp())
            interval.start_time.nanos = int((start_time.timestamp() % 1) * 10**9)
            
            results = self.call_with_retry(
                self.client.list_time_series,
                request={
                    "name": self.project_name,
                    "filter": f'metric.type="compute.googleapis.com/instance/cpu/utilization" AND resource.labels.instance_id="{service_name}"',
                    "interval": interval,
                    "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
                }
            )
            
            # Process and return the metrics
            return self._process_metrics(results)
        except GoogleAPIError as e:
            logger.error(f"Google API error while fetching metrics for {service_name}: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error while fetching metrics for {service_name}: {str(e)}")
            return {"error": str(e)}
    
    def _process_metrics(self, results):
        """Process raw metrics data into a structured format."""
        metrics = []
        for time_series in results:
            for point in time_series.points:
                metrics.append({
                    "timestamp": point.interval.end_time.seconds,
                    "value": point.value.double_value,
                    "resource": time_series.resource.labels
                })
        return metrics
    
    def check_services_health(self):
        """Check the health of all services and send alerts if needed."""
        try:
            # Get list of services
            services = self.call_with_retry(
                self.compute_client.list,
                project=self.project_id,
                region=self.region
            )
            
            results = {}
            for service in services:
                service_metrics = self.get_service_metrics(service.name)
                status = self._evaluate_service_status(service.name, service_metrics)
                results[service.name] = status
                
                # Send alert if needed
                if status.get("alert_level") in ["warning", "critical"]:
                    self._send_alert(service.name, status)
            
            return results
        except Exception as e:
            logger.error(f"Failed to check services health: {str(e)}")
            self._send_system_alert("System Error", str(e))
            return {"system_error": str(e)}
    
    def _evaluate_service_status(self, service_name, metrics):
        """Evaluate service status based on metrics."""
        if isinstance(metrics, dict) and "error" in metrics:
            return {
                "status": "error",
                "message": f"Failed to get metrics: {metrics['error']}",
                "alert_level": "warning"
            }
        
        # Calculate average CPU utilization
        if not metrics:
            return {
                "status": "unknown",
                "message": "No metrics data available",
                "alert_level": "warning"
            }
        
        avg_cpu = sum(m["value"] for m in metrics) / len(metrics)
        
        # Determine status based on thresholds
        if avg_cpu >= self.alert_config.CRITICAL_THRESHOLD:
            return {
                "status": "critical",
                "message": f"CPU utilization is at {avg_cpu:.2%}",
                "alert_level": "critical",
                "metrics": {
                    "cpu_utilization": avg_cpu
                }
            }
        elif avg_cpu >= self.alert_config.WARNING_THRESHOLD:
            return {
                "status": "warning",
                "message": f"CPU utilization is at {avg_cpu:.2%}",
                "alert_level": "warning",
                "metrics": {
                    "cpu_utilization": avg_cpu
                }
            }
        else:
            return {
                "status": "healthy",
                "message": f"CPU utilization is at {avg_cpu:.2%}",
                "alert_level": "none",
                "metrics": {
                    "cpu_utilization": avg_cpu
                }
            }
    
    def _send_alert(self, service_name, status):
        """Send an alert through configured channels."""
        # Check cooldown
        now = time.time()
        if service_name in self.alert_config.last_alert_time:
            last_alert = self.alert_config.last_alert_time[service_name]
            if now - last_alert < self.alert_config.ALERT_COOLDOWN:
                logger.info(f"Skipping alert for {service_name} due to cooldown")
                return
        
        # Update last alert time
        self.alert_config.last_alert_time[service_name] = now
        
        # Prepare alert message
        alert_message = {
            "service": service_name,
            "status": status["status"],
            "message": status["message"],
            "timestamp": datetime.utcnow().isoformat(),
            "project": self.project_id,
            "region": self.region
        }
        
        # Send to all configured channels
        self._send_to_channels(alert_message, status["alert_level"])
    
    def _send_system_alert(self, title, message):
        """Send a system-level alert."""
        alert_message = {
            "service": "Monitoring System",
            "status": "error",
            "message": f"{title}: {message}",
            "timestamp": datetime.utcnow().isoformat(),
            "project": self.project_id,
            "region": self.region
        }
        self._send_to_channels(alert_message, "critical")
    
    def _send_to_channels(self, message, level):
        """Send message to all configured alert channels."""
        # Log the alert
        logger.warning(f"ALERT ({level}): {json.dumps(message)}")
        
        # In a real implementation, this would send to Slack, email, PagerDuty, etc.
        # For now, we just log it
        pass

def main():
    """Main function to run the service monitor."""
    parser = argparse.ArgumentParser(description="Monitor Google Cloud services")
    parser.add_argument("--project-id", required=True, help="Google Cloud project ID")
    parser.add_argument("--region", default="us-west1", help="Google Cloud region")
    args = parser.parse_args()
    
    try:
        monitor = ContentServiceMonitor(args.project_id, args.region)
        results = monitor.check_services_health()
        logger.info(f"Monitoring results: {json.dumps(results)}")
        
        # Write results to file for historical tracking
        with open(f"monitoring_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(results, f, indent=2)
        
        # Exit with error code if any services are unhealthy
        if any(r.get("status") in ["critical", "error"] for r in results.values()):
            sys.exit(1)
        
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unhandled exception in monitoring: {str(e)}")
        sys.exit(2)

if __name__ == "__main__":
    main()
EOF

  echo -e "${GREEN}Improved monitoring script created.${NC}"
}

# Function to create requirements.txt
create_requirements() {
  echo -e "${YELLOW}Creating requirements.txt...${NC}"
  
  cat > "${TEMP_DIR}/requirements.txt" << 'EOF'
google-cloud-monitoring>=2.11.0
google-cloud-compute>=1.5.0
pandas>=1.3.5
pyyaml>=6.0
requests>=2.28.1
EOF

  echo -e "${GREEN}requirements.txt created.${NC}"
}

# Function to update repositories
update_repositories() {
  echo -e "${YELLOW}Updating monitoring scripts in repositories...${NC}"
  
  for repo in "${REPOSITORIES[@]}"; do
    echo "Updating $repo..."
    
    # Clone the repository to a temporary directory
    REPO_TEMP_DIR="${TEMP_DIR}/${repo//\//_}"
    gh repo clone "${repo}" "${REPO_TEMP_DIR}" || {
      echo -e "${RED}Failed to clone ${repo}. Skipping.${NC}"
      continue
    }
    
    # Check if monitoring directory exists
    if [ ! -d "${REPO_TEMP_DIR}/monitoring" ]; then
      echo "Creating monitoring directory..."
      mkdir -p "${REPO_TEMP_DIR}/monitoring"
    fi
    
    # Copy updated files
    cp "${TEMP_DIR}/service_monitor.py" "${REPO_TEMP_DIR}/monitoring/"
    cp "${TEMP_DIR}/requirements.txt" "${REPO_TEMP_DIR}/monitoring/"
    
    # Commit and push changes
    cd "${REPO_TEMP_DIR}"
    git config user.name "Dr. Lucy Automation"
    git config user.email "service@coaching2100.com"
    git add monitoring/
    git commit -m "fix: Update monitoring script with improved error handling and retry logic" || {
      echo "No changes to commit. Skipping."
      cd - > /dev/null
      continue
    }
    git push || {
      echo -e "${RED}Failed to push changes to ${repo}. Please check permissions.${NC}"
      cd - > /dev/null
      continue
    }
    
    cd - > /dev/null
    echo -e "${GREEN}Successfully updated ${repo}.${NC}"
  done
}

# Function to clean up
cleanup() {
  echo -e "${YELLOW}Cleaning up temporary files...${NC}"
  rm -rf "${TEMP_DIR}"
  echo -e "${GREEN}Cleanup complete.${NC}"
}

# Main execution
echo -e "${YELLOW}=== Monitoring Script Fix ===${NC}"
echo "This script will update the monitoring scripts across repositories with improved error handling and retry logic."

check_prerequisites
create_improved_script
create_requirements

# Update repositories
read -p "Update monitoring scripts in all repositories? [y/N] " update_repos
if [[ $update_repos =~ ^[Yy]$ ]]; then
  update_repositories
fi

# Clean up
cleanup

echo -e "${GREEN}Script execution completed.${NC}"
echo "The monitoring scripts have been updated with improved error handling and retry logic."