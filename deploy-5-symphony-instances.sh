#!/bin/bash
# deploy-5-symphony-instances.sh
# Automated deployment and monitoring of 5 Symphony interface instances
# Created: May 12, 2025

set -e

# Configuration
PROJECT_ID="api-for-warp-drive"
ENVIRONMENTS=("dev" "staging" "production" "demo" "sandbox")
BASE_DOMAIN="asoos.2100.cool"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="./logs/symphony-deployment-${TIMESTAMP}.log"

# Ensure log directory exists
mkdir -p ./logs

# Log function
log() {
  local message="[$(date +"%Y-%m-%d %H:%M:%S")] $1"
  echo "$message" | tee -a "$LOG_FILE"
}

# Health check function
check_health() {
  local env=$1
  local domain="${env}.symphony.${BASE_DOMAIN}"
  
  log "Checking health for $domain..."
  
  # Try up to 5 times with 10 second intervals
  for i in {1..5}; do
    if curl -s -o /dev/null -w "%{http_code}" "https://${domain}/health" | grep -q "200"; then
      log "✅ $domain is healthy"
      return 0
    else
      log "⏳ Waiting for $domain to become healthy (attempt $i/5)..."
      sleep 10
    fi
  done
  
  log "❌ $domain health check failed after 5 attempts"
  return 1
}

# Create monitoring dashboard
create_dashboard() {
  log "Creating monitoring dashboard for all Symphony instances..."
  
  # Define dashboard
  cat > ./temp-dashboard.json << EOL
{
  "displayName": "Symphony Instances Dashboard",
  "gridLayout": {
    "widgets": [
      {
        "title": "Symphony Instances Status",
        "xyChart": {
          "dataSets": [
$(for env in "${ENVIRONMENTS[@]}"; do
cat << EOF
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/symphony/status\" AND resource.label.environment=\"${env}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                },
                "unitOverride": "1"
              },
              "plotType": "LINE",
              "legendTemplate": "${env} Status"
            },
EOF
done)
          ],
          "timeshiftDuration": "0s",
          "yAxis": {
            "label": "Status (1=Healthy, 0=Down)",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "Response Time",
        "xyChart": {
          "dataSets": [
$(for env in "${ENVIRONMENTS[@]}"; do
cat << EOF
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/symphony/response_time\" AND resource.label.environment=\"${env}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                },
                "unitOverride": "ms"
              },
              "plotType": "LINE",
              "legendTemplate": "${env} Response Time"
            },
EOF
done)
          ],
          "timeshiftDuration": "0s",
          "yAxis": {
            "label": "Response Time (ms)",
            "scale": "LINEAR"
          }
        }
      },
      {
        "title": "User Satisfaction",
        "xyChart": {
          "dataSets": [
$(for env in "${ENVIRONMENTS[@]}"; do
cat << EOF
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/symphony/user_satisfaction\" AND resource.label.environment=\"${env}\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                },
                "unitOverride": "1"
              },
              "plotType": "LINE",
              "legendTemplate": "${env} User Satisfaction"
            },
EOF
done)
          ],
          "timeshiftDuration": "0s",
          "yAxis": {
            "label": "Satisfaction Score (0-100)",
            "scale": "LINEAR"
          }
        }
      }
    ]
  }
}
EOL

  # Create dashboard
  gcloud monitoring dashboards create --config-from-file=./temp-dashboard.json
  
  # Clean up
  rm ./temp-dashboard.json
  
  log "✅ Monitoring dashboard created"
}

# Set up alert policies
create_alerts() {
  log "Creating alert policies for all Symphony instances..."
  
  for env in "${ENVIRONMENTS[@]}"; do
    # Create downtime alert
    gcloud alpha monitoring policies create \
      --display-name="Symphony ${env} Down" \
      --condition-filter="metric.type=\"custom.googleapis.com/symphony/status\" AND resource.label.environment=\"${env}\" AND metric.label.value<1" \
      --condition-threshold-value=0 \
      --condition-threshold-comparison=COMPARISON_LT \
      --condition-aggregations-alignment-period=300s \
      --condition-threshold-duration=300s \
      --notification-channels=projects/${PROJECT_ID}/notificationChannels/symphony-alerts \
      --documentation-content="Symphony ${env} instance is down. Check the instance at https://${env}.symphony.${BASE_DOMAIN}"
    
    # Create response time alert
    gcloud alpha monitoring policies create \
      --display-name="Symphony ${env} High Latency" \
      --condition-filter="metric.type=\"custom.googleapis.com/symphony/response_time\" AND resource.label.environment=\"${env}\"" \
      --condition-threshold-value=1000 \
      --condition-threshold-comparison=COMPARISON_GT \
      --condition-aggregations-alignment-period=300s \
      --condition-threshold-duration=300s \
      --notification-channels=projects/${PROJECT_ID}/notificationChannels/symphony-alerts \
      --documentation-content="Symphony ${env} instance is experiencing high latency. Check the instance at https://${env}.symphony.${BASE_DOMAIN}"
  done
  
  log "✅ Alert policies created"
}

# Main deployment function
deploy_instance() {
  local env=$1
  log "Deploying Symphony instance to ${env} environment..."
  
  # Run the deployment script
  ./symphony-production-deploy.sh ${env}
  
  # Check deployment health
  check_health "${env}"
  
  # Register the instance in Firestore for tracking
  gcloud firestore documents create projects/${PROJECT_ID}/databases/(default)/documents/symphony-instances/${env} \
    --fields="environment=${env},domain=${env}.symphony.${BASE_DOMAIN},deployed_at=$(date +%s),status=active"
    
  log "✅ Symphony instance deployed to ${env}"
}

# Set up automated reporting
setup_reporting() {
  log "Setting up automated reporting..."
  
  # Create reporting script
  cat > ./report-symphony-status.sh << EOL
#!/bin/bash
# Automated Symphony instances status report
# Generated on ${TIMESTAMP}

# Configuration
ENVIRONMENTS=(${ENVIRONMENTS[@]})
BASE_DOMAIN="${BASE_DOMAIN}"
PROJECT_ID="${PROJECT_ID}"
REPORT_PATH="./reports/symphony-status-\$(date +%Y%m%d).md"
REPORT_EMAIL="symphony-reports@example.com"

# Ensure reports directory exists
mkdir -p ./reports

# Create report heading
echo "# Symphony Instances Status Report" > \$REPORT_PATH
echo "Generated: \$(date)" >> \$REPORT_PATH
echo "" >> \$REPORT_PATH
echo "## Instance Status" >> \$REPORT_PATH
echo "" >> \$REPORT_PATH
echo "| Environment | Status | Response Time | User Satisfaction | Uptime |" >> \$REPORT_PATH
echo "|-------------|--------|---------------|-------------------|--------|" >> \$REPORT_PATH

# Get status for each environment
for env in "\${ENVIRONMENTS[@]}"; do
  # Get metrics from Cloud Monitoring
  STATUS=\$(gcloud monitoring metrics list --filter="metric.type=\"custom.googleapis.com/symphony/status\" AND resource.label.environment=\"\${env}\"" --format="value(points.value.int64Value)" | head -1 || echo "Unknown")
  RESPONSE_TIME=\$(gcloud monitoring metrics list --filter="metric.type=\"custom.googleapis.com/symphony/response_time\" AND resource.label.environment=\"\${env}\"" --format="value(points.value.doubleValue)" | head -1 || echo "Unknown")
  SATISFACTION=\$(gcloud monitoring metrics list --filter="metric.type=\"custom.googleapis.com/symphony/user_satisfaction\" AND resource.label.environment=\"\${env}\"" --format="value(points.value.doubleValue)" | head -1 || echo "Unknown")
  
  # Get instance uptime from Firestore
  DEPLOYED_AT=\$(gcloud firestore documents get projects/\${PROJECT_ID}/databases/\(default\)/documents/symphony-instances/\${env} --format="value(fields.deployed_at.integerValue)")
  NOW=\$(date +%s)
  UPTIME_SECONDS=\$((\$NOW - \$DEPLOYED_AT))
  UPTIME_DAYS=\$((\$UPTIME_SECONDS / 86400))
  
  # Format status indicator
  if [ "\$STATUS" == "1" ]; then
    STATUS_ICON="✅ Healthy"
  else
    STATUS_ICON="❌ Down"
  fi
  
  # Add to report
  echo "| \${env} | \${STATUS_ICON} | \${RESPONSE_TIME} ms | \${SATISFACTION}% | \${UPTIME_DAYS} days |" >> \$REPORT_PATH
done

echo "" >> \$REPORT_PATH
echo "## Recommendations" >> \$REPORT_PATH
echo "" >> \$REPORT_PATH
echo "Based on the current metrics, the following actions are recommended:" >> \$REPORT_PATH
echo "" >> \$REPORT_PATH

# Add recommendations based on status
for env in "\${ENVIRONMENTS[@]}"; do
  # Get metrics
  STATUS=\$(gcloud monitoring metrics list --filter="metric.type=\"custom.googleapis.com/symphony/status\" AND resource.label.environment=\"\${env}\"" --format="value(points.value.int64Value)" | head -1 || echo "Unknown")
  RESPONSE_TIME=\$(gcloud monitoring metrics list --filter="metric.type=\"custom.googleapis.com/symphony/response_time\" AND resource.label.environment=\"\${env}\"" --format="value(points.value.doubleValue)" | head -1 || echo "Unknown")
  
  if [ "\$STATUS" != "1" ]; then
    echo "- **\${env}**: Instance is down. Immediate investigation required." >> \$REPORT_PATH
  elif [ "\$RESPONSE_TIME" -gt "500" ]; then
    echo "- **\${env}**: High response time detected. Consider scaling resources." >> \$REPORT_PATH
  fi
done

# Email the report
mail -s "Symphony Status Report \$(date +%Y-%m-%d)" \$REPORT_EMAIL < \$REPORT_PATH || echo "Email sending failed, report available at \$REPORT_PATH"

# Also store report in Firestore
REPORT_CONTENT=\$(cat \$REPORT_PATH)
gcloud firestore documents create projects/\${PROJECT_ID}/databases/\(default\)/documents/symphony-reports/\$(date +%Y%m%d) \
  --fields="content=\$REPORT_CONTENT,generated_at=\$(date +%s)"

echo "Report generated at \$REPORT_PATH and sent to \$REPORT_EMAIL"
EOL
  
  chmod +x ./report-symphony-status.sh
  
  # Add to crontab
  (crontab -l 2>/dev/null || echo "") | grep -v "report-symphony-status.sh" | { cat; echo "0 9 * * * $(pwd)/report-symphony-status.sh"; } | crontab -
  
  log "✅ Automated reporting set up with daily execution at 9:00 AM"
}

# Main execution
log "Starting deployment of 5 Symphony instances..."

# Create monitoring infrastructure first
create_dashboard
create_alerts

# Deploy each instance
for env in "${ENVIRONMENTS[@]}"; do
  deploy_instance "${env}"
done

# Set up automated reporting
setup_reporting

# Final integration check
log "Performing final integration check..."
for env in "${ENVIRONMENTS[@]}"; do
  check_health "${env}"
done

log "✅ All 5 Symphony instances successfully deployed and monitored!"
log "Dashboard: https://console.cloud.google.com/monitoring/dashboards?project=${PROJECT_ID}"
log "Access instances at:"
for env in "${ENVIRONMENTS[@]}"; do
  log "- ${env}: https://${env}.symphony.${BASE_DOMAIN}"
done
log "Daily status reports will be generated at 9:00 AM"
log "Deployment log available at: $LOG_FILE"