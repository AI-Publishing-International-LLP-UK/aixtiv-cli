#!/bin/bash

# Node.js Version Manager for Aixtiv Symphony ASOOS
# Monitors and updates Node.js versions across the system

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/node-version-manager.log"
TARGET_NODE_VERSION="18.20.0"  # LTS version
MIN_NODE_VERSION="18.0.0"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to compare version numbers
version_compare() {
    local version1=$1
    local version2=$2
    
    # Remove 'v' prefix if present
    version1=${version1#v}
    version2=${version2#v}
    
    # Use sort to compare versions
    if [[ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n1)" == "$version1" ]]; then
        if [[ "$version1" == "$version2" ]]; then
            return 1  # Equal
        else
            return 2  # version1 is older
        fi
    else
        return 0  # version1 is newer
    fi
}

# Function to check system Node.js version
check_system_node() {
    log "${BLUE}Checking system Node.js version...${NC}"
    
    if command -v node >/dev/null 2>&1; then
        local current_version=$(node --version)
        log "System Node.js version: $current_version"
        
        version_compare "$current_version" "v$MIN_NODE_VERSION"
        case $? in
            0|1)  # Current version is newer or equal to minimum
                log "${GREEN}✓ System Node.js version is acceptable${NC}"
                return 0
                ;;
            2)  # Current version is older than minimum
                log "${YELLOW}⚠ System Node.js version is outdated${NC}"
                return 1
                ;;
        esac
    else
        log "${RED}✗ Node.js not found on system${NC}"
        return 1
    fi
}

# Function to check Node.js in Docker containers
check_container_node() {
    log "${BLUE}Checking Node.js versions in Docker containers...${NC}"
    
    local outdated_containers=()
    
    # Get all running containers
    while IFS= read -r container; do
        if [[ -n "$container" ]]; then
            local node_version=$(docker exec "$container" node --version 2>/dev/null || echo "N/A")
            
            if [[ "$node_version" != "N/A" ]]; then
                log "Container $container: Node.js $node_version"
                
                version_compare "$node_version" "v$MIN_NODE_VERSION"
                case $? in
                    2)  # Version is outdated
                        log "${YELLOW}⚠ Container $container has outdated Node.js: $node_version${NC}"
                        outdated_containers+=("$container")
                        ;;
                    0|1)  # Version is acceptable
                        log "${GREEN}✓ Container $container Node.js version is acceptable${NC}"
                        ;;
                esac
            else
                log "${BLUE}ℹ Container $container does not have Node.js${NC}"
            fi
        fi
    done < <(docker ps --format "{{.Names}}")
    
    # Return list of outdated containers
    printf '%s\n' "${outdated_containers[@]}"
}

# Function to update system Node.js using nvm
update_system_node() {
    log "${BLUE}Updating system Node.js to version $TARGET_NODE_VERSION...${NC}"
    
    # Check if nvm is installed
    if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
        source "$HOME/.nvm/nvm.sh"
        
        # Install target version
        if nvm install "$TARGET_NODE_VERSION"; then
            nvm use "$TARGET_NODE_VERSION"
            nvm alias default "$TARGET_NODE_VERSION"
            log "${GREEN}✓ Successfully updated Node.js to $TARGET_NODE_VERSION${NC}"
            return 0
        else
            log "${RED}✗ Failed to install Node.js $TARGET_NODE_VERSION via nvm${NC}"
            return 1
        fi
    else
        log "${YELLOW}⚠ nvm not found, attempting alternative installation...${NC}"
        install_nvm_and_node
    fi
}

# Function to install nvm and Node.js
install_nvm_and_node() {
    log "${BLUE}Installing nvm and Node.js...${NC}"
    
    # Download and install nvm
    if curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash; then
        # Reload nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        
        # Install Node.js
        if nvm install "$TARGET_NODE_VERSION"; then
            nvm use "$TARGET_NODE_VERSION"
            nvm alias default "$TARGET_NODE_VERSION"
            log "${GREEN}✓ Successfully installed nvm and Node.js $TARGET_NODE_VERSION${NC}"
            return 0
        fi
    fi
    
    log "${RED}✗ Failed to install nvm and Node.js${NC}"
    return 1
}

# Function to update package.json engines field
update_package_engines() {
    local package_file="$PROJECT_ROOT/package.json"
    
    if [[ -f "$package_file" ]]; then
        log "${BLUE}Updating package.json engines field...${NC}"
        
        # Create backup
        cp "$package_file" "$package_file.backup.$(date +%s)"
        
        # Update engines field using Node.js script
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$package_file', 'utf8'));
            
            if (!pkg.engines) pkg.engines = {};
            pkg.engines.node = '>=$MIN_NODE_VERSION';
            
            fs.writeFileSync('$package_file', JSON.stringify(pkg, null, 2) + '\n');
            console.log('Updated package.json engines field');
        " && log "${GREEN}✓ Updated package.json engines field${NC}" || log "${RED}✗ Failed to update package.json${NC}"
    fi
}

# Function to check npm version compatibility
check_npm_compatibility() {
    log "${BLUE}Checking npm compatibility...${NC}"
    
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        log "npm version: $npm_version"
        
        # Update npm to latest compatible version
        if npm install -g npm@latest; then
            local new_npm_version=$(npm --version)
            log "${GREEN}✓ Updated npm to version $new_npm_version${NC}"
        else
            log "${YELLOW}⚠ Failed to update npm${NC}"
        fi
    else
        log "${RED}✗ npm not found${NC}"
    fi
}

# Function to validate project dependencies
validate_project_dependencies() {
    log "${BLUE}Validating project dependencies...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if package-lock.json exists
    if [[ -f "package-lock.json" ]]; then
        # Clear npm cache and reinstall
        npm cache clean --force
        rm -rf node_modules
        npm install
        
        log "${GREEN}✓ Reinstalled project dependencies${NC}"
    else
        log "${YELLOW}⚠ No package-lock.json found, running npm install${NC}"
        npm install
    fi
    
    # Run audit and fix
    npm audit fix --force || log "${YELLOW}⚠ Some audit issues could not be fixed automatically${NC}"
}

# Function to create Node.js monitoring cron job
setup_monitoring_cron() {
    log "${BLUE}Setting up Node.js version monitoring cron job...${NC}"
    
    local cron_script="$SCRIPT_DIR/node-version-manager.sh"
    local cron_entry="0 */6 * * * $cron_script check-all > /var/log/node-version-cron.log 2>&1"
    
    # Add cron job if it doesn't exist
    (crontab -l 2>/dev/null | grep -F "$cron_script" || echo "$cron_entry") | crontab -
    
    log "${GREEN}✓ Node.js monitoring cron job configured${NC}"
}

# Function to generate Node.js status report
generate_status_report() {
    local report_file="/tmp/node_version_report.txt"
    
    {
        echo "=== Aixtiv Symphony Node.js Version Report ==="
        echo "Generated: $(date)"
        echo "Target Node.js Version: $TARGET_NODE_VERSION"
        echo "Minimum Node.js Version: $MIN_NODE_VERSION"
        echo
        
        echo "=== System Node.js ==="
        if command -v node >/dev/null 2>&1; then
            echo "Version: $(node --version)"
            echo "Path: $(which node)"
        else
            echo "Node.js not found on system"
        fi
        echo
        
        echo "=== Container Node.js Versions ==="
        while IFS= read -r container; do
            if [[ -n "$container" ]]; then
                local version=$(docker exec "$container" node --version 2>/dev/null || echo "N/A")
                echo "$container: $version"
            fi
        done < <(docker ps --format "{{.Names}}")
        echo
        
        echo "=== npm Version ==="
        if command -v npm >/dev/null 2>&1; then
            echo "Version: $(npm --version)"
        else
            echo "npm not found"
        fi
        echo
        
        echo "=== Project Dependencies Status ==="
        if [[ -f "$PROJECT_ROOT/package.json" ]]; then
            cd "$PROJECT_ROOT"
            echo "Dependencies outdated:"
            npm outdated || echo "No outdated dependencies found"
        fi
    } > "$report_file"
    
    log "${GREEN}Node.js status report generated: $report_file${NC}"
    cat "$report_file"
}

# Main execution function
main() {
    local action=${1:-"check-all"}
    
    case $action in
        "check-system")
            check_system_node
            ;;
        "check-containers")
            check_container_node
            ;;
        "check-all")
            log "${BLUE}Starting comprehensive Node.js version check...${NC}"
            check_system_node
            local outdated_containers=$(check_container_node)
            
            if [[ -n "$outdated_containers" ]]; then
                log "${YELLOW}Found containers with outdated Node.js versions${NC}"
                echo "$outdated_containers"
            fi
            ;;
        "update-system")
            update_system_node
            check_npm_compatibility
            update_package_engines
            validate_project_dependencies
            ;;
        "update-containers")
            log "${BLUE}Updating containers with outdated Node.js...${NC}"
            # This will trigger Docker image rebuilds via the docker automation script
            bash "$SCRIPT_DIR/docker-automation.sh" refresh-images
            ;;
        "full-update")
            log "${BLUE}Starting full Node.js update process...${NC}"
            update_system_node
            check_npm_compatibility
            update_package_engines
            validate_project_dependencies
            bash "$SCRIPT_DIR/docker-automation.sh" refresh-images
            log "${GREEN}Full Node.js update completed${NC}"
            ;;
        "setup-monitoring")
            setup_monitoring_cron
            ;;
        "report")
            generate_status_report
            ;;
        "validate-deps")
            validate_project_dependencies
            ;;
        *)
            echo "Usage: $0 {check-system|check-containers|check-all|update-system|update-containers|full-update|setup-monitoring|report|validate-deps}"
            echo
            echo "Commands:"
            echo "  check-system      - Check system Node.js version"
            echo "  check-containers  - Check Node.js versions in containers"
            echo "  check-all         - Check both system and containers"
            echo "  update-system     - Update system Node.js and dependencies"
            echo "  update-containers - Rebuild containers with updated Node.js"
            echo "  full-update       - Complete Node.js update process"
            echo "  setup-monitoring  - Setup automatic monitoring"
            echo "  report            - Generate comprehensive status report"
            echo "  validate-deps     - Validate and update project dependencies"
            exit 1
            ;;
    esac
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function with all arguments
main "$@"
