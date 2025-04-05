#!/bin/bash
set -e

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_dns() {
  local domain=$1
  local ip=$(dig +short $domain)
  if [[ -z "$ip" ]]; then
    log "DNS not propagated for $domain"
    return 1
  fi
  log "DNS propagated for $domain: $ip"
  return 0
}

check_ssl() {
  local status=$(gcloud compute ssl-certificates describe sc2100cool --global --format='get(status)')
  if [[ "$status" != "ACTIVE" ]]; then
    log "SSL certificate not ready: $status"
    return 1
  fi
  log "SSL certificate active"
  return 0
}

check_health() {
  local endpoint=$1
  local response=$(curl -s -o /dev/null -w "%{http_code}" https://$endpoint/health)
  if [[ "$response" != "200" ]]; then
    log "Health check failed for $endpoint: $response"
    return 1
  fi
  log "Health check passed for $endpoint"
  return 0
}

deploy_infrastructure() {
  log "Starting deployment"
  
  # Create DNS zone and get IP
  gcloud deployment-manager deployments create anthology-infra --config=infrastructure/dns/zone-setup.yaml
  LB_IP=$(gcloud compute addresses describe anthology-lb-ip --global --format='get(address)')
  log "Load balancer IP: $LB_IP"

  # Update backend service
  gcloud compute backend-services update lb-ip-2100-cool-backend \
    --global \
    --enable-cdn \
    --session-affinity=CLIENT_IP \
    --timeout=60s
  log "Backend service updated"

  # Create forwarding rule
  gcloud compute forwarding-rules create anthology-lb-rule \
    --load-balancing-scheme=EXTERNAL \
    --global \
    --address=$LB_IP \
    --target-https-proxy=anthology-https-proxy \
    --ports=443
  log "Forwarding rule created"

  # Deploy application
  kubectl apply -f deployment/complete-setup.yaml
  log "Application deployed"
}

monitor_deployment() {
  local max_attempts=60
  local attempt=1
  local check_interval=30

  while [ $attempt -le $max_attempts ]; do
    log "Attempt $attempt of $max_attempts"

    # Check DNS propagation
    check_dns "2100.cool" && \
    check_dns "staging.2100.cool" && \
    check_ssl && \
    check_health "2100.cool" && \
    check_health "staging.2100.cool" && {
      log "All checks passed successfully"
      return 0
    }

    attempt=$((attempt + 1))
    sleep $check_interval
  done

  log "Deployment checks failed after $max_attempts attempts"
  return 1
}

# Execute deployment
deploy_infrastructure
monitor_deployment