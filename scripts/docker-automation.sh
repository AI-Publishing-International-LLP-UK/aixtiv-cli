#!/bin/bash

# Docker Automation Script for Aixtiv Symphony ASOOS
# Handles image refresh, container health, and service orchestration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/docker-automation.log"
MAX_IMAGE_AGE_DAYS=7
HEALTH_CHECK_INTERVAL=300  # 5 minutes

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Critical Aixtiv Symphony Services
CRITICAL_SERVICES=(
    "integration-gateway-js"
    "integration-gateway-vls-s2do-governance"
    "integration-gateway-wing-agents"
    "wing-jet-port"
    "integration-gateway-vls-dr-memoria-functions"
)

# Function to check if image is older than X days
is_image_stale() {
    local image_id=$1
    local max_age_seconds=$((MAX_IMAGE_AGE_DAYS * 24 * 3600))
    
    # Get image creation timestamp
    local created_timestamp=$(docker inspect --format='{{.Created}}' "$image_id" 2>/dev/null || echo "")
    
    if [[ -z "$created_timestamp" ]]; then
        return 1
    fi
    
    local created_epoch=$(date -d "$created_timestamp" +%s 2>/dev/null || echo "0")
    local current_epoch=$(date +%s)
    local age_seconds=$((current_epoch - created_epoch))
    
    [[ $age_seconds -gt $max_age_seconds ]]
}

# Function to get container health status
get_container_health() {
    local container_name=$1
    docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found"
}

# Function to restart failed containers
restart_failed_containers() {
    log "${BLUE}Checking for failed containers...${NC}"
    
    # Get all exited containers
    local exited_containers=$(docker ps -a --filter "status=exited" --format "{{.Names}}")
    
    for container in $exited_containers; do
        # Check if it's one of our critical services
        for service in "${CRITICAL_SERVICES[@]}"; do
            if [[ "$container" == *"$service"* ]]; then
                log "${YELLOW}Restarting failed container: $container${NC}"
                docker start "$container" || log "${RED}Failed to restart $container${NC}"
                sleep 2
            fi
        done
    done
}

# Function to check for stale images and rebuild
refresh_stale_images() {
    log "${BLUE}Checking for stale Docker images...${NC}"
    
    # Get all images with their IDs and repositories
    while IFS= read -r line; do
        local image_id=$(echo "$line" | awk '{print $3}')
        local repository=$(echo "$line" | awk '{print $1}')
        local tag=$(echo "$line" | awk '{print $2}')
        
        # Skip header and unnamed images
        [[ "$repository" == "REPOSITORY" ]] && continue
        [[ "$repository" == "<none>" ]] && continue
        
        # Check if this is one of our critical services
        for service in "${CRITICAL_SERVICES[@]}"; do
            if [[ "$repository" == *"$service"* ]]; then
                if is_image_stale "$image_id"; then
                    log "${YELLOW}Image $repository:$tag is stale (older than $MAX_IMAGE_AGE_DAYS days)${NC}"
                    rebuild_service_image "$repository" "$tag"
                fi
            fi
        done
    done < <(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}")
}

# Function to rebuild a specific service image
rebuild_service_image() {
    local repository=$1
    local tag=$2
    
    log "${BLUE}Rebuilding image: $repository:$tag${NC}"
    
    # Determine the service type and build context
    local build_context="$PROJECT_ROOT"
    local dockerfile_path="Dockerfile"
    
    # Check for service-specific Dockerfiles
    if [[ "$repository" == *"integration-gateway"* ]]; then
        build_context="$PROJECT_ROOT/integration/gateway"
        [[ -f "$build_context/Dockerfile" ]] || build_context="$PROJECT_ROOT"
    elif [[ "$repository" == *"wing"* ]]; then
        build_context="$PROJECT_ROOT/wing"
        [[ -f "$build_context/Dockerfile" ]] || build_context="$PROJECT_ROOT"
    fi
    
    # Stop containers using this image
    local containers_using_image=$(docker ps -a --filter "ancestor=$repository:$tag" --format "{{.Names}}")
    for container in $containers_using_image; do
        log "${YELLOW}Stopping container $container before rebuild${NC}"
        docker stop "$container" 2>/dev/null || true
    done
    
    # Build new image
    if docker build -t "$repository:$tag" "$build_context"; then
        log "${GREEN}Successfully rebuilt $repository:$tag${NC}"
        
        # Restart containers
        for container in $containers_using_image; do
            log "${BLUE}Restarting container $container with new image${NC}"
            docker start "$container" || log "${RED}Failed to restart $container${NC}"
        done
        
        # Clean up old image versions
        docker image prune -f --filter "label!=keep=true"
        
    else
        log "${RED}Failed to rebuild $repository:$tag${NC}"
    fi
}

# Function to monitor service health
monitor_service_health() {
    log "${BLUE}Monitoring service health...${NC}"
    
    # Check each critical service
    for service in "${CRITICAL_SERVICES[@]}"; do
        local containers=$(docker ps -a --filter "name=$service" --format "{{.Names}}")
        
        for container in $containers; do
            local status=$(get_container_health "$container")
            
            case $status in
                "running")
                    log "${GREEN}✓ $container is running${NC}"
                    ;;
                "exited")
                    log "${YELLOW}⚠ $container has exited, attempting restart${NC}"
                    docker start "$container" || log "${RED}Failed to restart $container${NC}"
                    ;;
                "not_found")
                    log "${RED}✗ $container not found${NC}"
                    ;;
                *)
                    log "${YELLOW}? $container status: $status${NC}"
                    ;;
            esac
        done
    done
}

# Function to clean up resources
cleanup_docker_resources() {
    log "${BLUE}Cleaning up Docker resources...${NC}"
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused images (keep recent ones)
    docker image prune -f --filter "until=24h"
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "${GREEN}Docker cleanup completed${NC}"
}

# Function to update Node.js in containers
update_node_versions() {
    log "${BLUE}Checking Node.js versions in containers...${NC}"
    
    # Check running containers for Node.js version
    for service in "${CRITICAL_SERVICES[@]}"; do
        local containers=$(docker ps --filter "name=$service" --format "{{.Names}}")
        
        for container in $containers; do
            local node_version=$(docker exec "$container" node --version 2>/dev/null || echo "N/A")
            log "Container $container Node.js version: $node_version"
            
            # If Node.js version is outdated, mark for rebuild
            if [[ "$node_version" != "N/A" ]] && [[ "$node_version" < "v18.0.0" ]]; then
                log "${YELLOW}Container $container has outdated Node.js: $node_version${NC}"
                # Mark image for rebuild by touching a flag file
                touch "/tmp/rebuild_$container"
            fi
        done
    done
}

# Function to send health report
send_health_report() {
    local report_file="/tmp/docker_health_report.txt"
    
    {
        echo "=== Aixtiv Symphony Docker Health Report ==="
        echo "Generated: $(date)"
        echo
        echo "=== Running Containers ==="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
        echo
        echo "=== Service Status ==="
        for service in "${CRITICAL_SERVICES[@]}"; do
            local containers=$(docker ps -a --filter "name=$service" --format "{{.Names}}\t{{.Status}}")
            echo "$service: $containers"
        done
        echo
        echo "=== Resource Usage ==="
        docker system df
        echo
        echo "=== Recent Log Entries ==="
        tail -20 "$LOG_FILE"
    } > "$report_file"
    
    # Optional: Send to monitoring endpoint or email
    # curl -X POST -H "Content-Type: text/plain" --data-binary @"$report_file" \
    #      "https://your-monitoring-endpoint.com/reports"
    
    log "${GREEN}Health report generated: $report_file${NC}"
}

# Main execution function
main() {
    local action=${1:-"health-check"}
    
    case $action in
        "health-check")
            monitor_service_health
            restart_failed_containers
            ;;
        "refresh-images")
            refresh_stale_images
            ;;
        "full-maintenance")
            log "${BLUE}Starting full Docker maintenance...${NC}"
            monitor_service_health
            restart_failed_containers
            refresh_stale_images
            update_node_versions
            cleanup_docker_resources
            send_health_report
            log "${GREEN}Full maintenance completed${NC}"
            ;;
        "cleanup")
            cleanup_docker_resources
            ;;
        "report")
            send_health_report
            ;;
        "restart-service")
            local service_name=$2
            if [[ -n "$service_name" ]]; then
                log "${BLUE}Restarting service: $service_name${NC}"
                docker restart $(docker ps --filter "name=$service_name" --format "{{.Names}}")
            else
                log "${RED}Please specify service name${NC}"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 {health-check|refresh-images|full-maintenance|cleanup|report|restart-service SERVICE_NAME}"
            echo
            echo "Commands:"
            echo "  health-check     - Monitor and restart failed containers"
            echo "  refresh-images   - Rebuild stale Docker images"
            echo "  full-maintenance - Complete maintenance cycle"
            echo "  cleanup          - Clean up unused Docker resources"
            echo "  report           - Generate health report"
            echo "  restart-service  - Restart specific service"
            exit 1
            ;;
    esac
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function with all arguments
main "$@"
