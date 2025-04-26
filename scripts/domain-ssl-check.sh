#!/bin/bash
# domain-ssl-check.sh - SSL Certificate Status Checker
# Part of the AIXTIV CLI domain management suite
# 
# This script checks SSL certificate status for domains managed by AIXTIV CLI
# and sends notifications for certificates nearing expiration.

set -e

# Configuration
DAYS_WARNING=30
DAYS_CRITICAL=14
LOG_FILE="/tmp/aixtiv-ssl-check.log"

# Notification settings (can be overridden with environment variables)
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}
EMAIL_RECIPIENT=${EMAIL_RECIPIENT:-""}

# Color output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Make sure log directory exists
mkdir -p $(dirname "$LOG_FILE")

echo "=============================================" >> "$LOG_FILE"
echo "SSL Certificate Check - $(date)" >> "$LOG_FILE"
echo "=============================================" >> "$LOG_FILE"

# Function to check a domain's SSL certificate
check_certificate() {
  local domain=$1
  echo -e "\nChecking SSL certificate for ${YELLOW}$domain${NC}..."
  echo "Checking SSL certificate for $domain..." >> "$LOG_FILE"
  
  # Get certificate information
  cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null | openssl x509 -noout -enddate -issuer -subject 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Could not retrieve SSL certificate for $domain${NC}"
    echo "ERROR: Could not retrieve SSL certificate for $domain" >> "$LOG_FILE"
    return 1
  fi
  
  # Extract expiration date
  end_date=$(echo "$cert_info" | grep 'notAfter=' | cut -d= -f2)
  end_epoch=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$end_date" +%s 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    # Try alternative date format
    end_epoch=$(date -j -f "%b  %d %H:%M:%S %Y %Z" "$end_date" +%s 2>/dev/null)
  fi
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Could not parse certificate date for $domain${NC}"
    echo "ERROR: Could not parse certificate date for $domain" >> "$LOG_FILE"
    return 1
  fi
  
  current_epoch=$(date +%s)
  seconds_diff=$((end_epoch - current_epoch))
  days_remaining=$((seconds_diff / 86400))
  
  # Extract issuer
  issuer=$(echo "$cert_info" | grep 'issuer=' | cut -d= -f2)
  
  # Display results
  if [ "$days_remaining" -lt 0 ]; then
    echo -e "${RED}EXPIRED: Certificate for $domain expired $((days_remaining * -1)) days ago!${NC}"
    echo "EXPIRED: Certificate for $domain expired $((days_remaining * -1)) days ago!" >> "$LOG_FILE"
    status="EXPIRED"
  elif [ "$days_remaining" -lt "$DAYS_CRITICAL" ]; then
    echo -e "${RED}CRITICAL: Certificate for $domain expires in $days_remaining days!${NC}"
    echo "CRITICAL: Certificate for $domain expires in $days_remaining days!" >> "$LOG_FILE"
    status="CRITICAL"
  elif [ "$days_remaining" -lt "$DAYS_WARNING" ]; then
    echo -e "${YELLOW}WARNING: Certificate for $domain expires in $days_remaining days${NC}"
    echo "WARNING: Certificate for $domain expires in $days_remaining days" >> "$LOG_FILE"
    status="WARNING"
  else
    echo -e "${GREEN}OK: Certificate for $domain expires in $days_remaining days${NC}"
    echo "OK: Certificate for $domain expires in $days_remaining days" >> "$LOG_FILE"
    status="OK"
  fi
  
  echo "Issuer: $issuer"
  echo "Expiration date: $end_date"
  echo "Issuer: $issuer" >> "$LOG_FILE"
  echo "Expiration date: $end_date" >> "$LOG_FILE"
  
  # Send notification if needed
  if [ "$status" != "OK" ]; then
    send_notification "$domain" "$status" "$days_remaining" "$end_date" "$issuer"
  fi
  
  return 0
}

# Function to send notification
send_notification() {
  local domain=$1
  local status=$2
  local days=$3
  local expiry_date=$4
  local issuer=$5
  
  # Log notification
  echo "Sending notification for $domain ($status - $days days)" >> "$LOG_FILE"
  
  # Send Slack notification if webhook provided
  if [ -n "$SLACK_WEBHOOK" ]; then
    local color
    case "$status" in
      "EXPIRED") color="danger" ;;
      "CRITICAL") color="danger" ;;
      "WARNING") color="warning" ;;
      *) color="good" ;;
    esac
    
    curl -s -X POST --data-urlencode "payload={\"attachments\": [{\"color\": \"$color\", \"title\": \"SSL Certificate Alert - $domain\", \"text\": \"*Status:* $status\n*Days Remaining:* $days\n*Expiry Date:* $expiry_date\n*Issuer:* $issuer\", \"footer\": \"AIXTIV SSL Monitor\"}]}" "$SLACK_WEBHOOK" >> "$LOG_FILE" 2>&1
  fi
  
  # Send email notification if recipient provided
  if [ -n "$EMAIL_RECIPIENT" ]; then
    echo "Subject: [AIXTIV] SSL Certificate Alert - $domain ($status)
    
SSL Certificate Alert for $domain

Status: $status
Days Remaining: $days
Expiry Date: $expiry_date
Issuer: $issuer

This notification was sent by the AIXTIV SSL Certificate Monitor.
" | mail -s "[AIXTIV] SSL Certificate Alert - $domain" "$EMAIL_RECIPIENT"
  fi
}

# Get domains from the AIXTIV CLI domain cache
DOMAINS_CACHE="$HOME/.aixtiv-cli/domain-cache.json"
if [ ! -f "$DOMAINS_CACHE" ]; then
  echo -e "${RED}ERROR: Domain cache not found. Run 'aixtiv domain list' to initialize the cache.${NC}"
  exit 1
fi

# Extract domain names from cache
DOMAINS=$(cat "$DOMAINS_CACHE" | grep -o '"name": "[^"]*"' | cut -d'"' -f4)

if [ -z "$DOMAINS" ]; then
  echo -e "${YELLOW}No domains found in the cache.${NC}"
  exit 0
fi

# Check certificates for all domains
echo "Found $(echo "$DOMAINS" | wc -l | tr -d ' ') domains in cache"
for domain in $DOMAINS; do
  check_certificate "$domain"
done

echo -e "\n${GREEN}SSL certificate check completed.${NC}"
echo "Check log at $LOG_FILE for details."