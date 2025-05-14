#!/bin/bash
# CI CLI Installer Script
# This script installs the CI CLI tool for the CTTT (Continuous Testing and Telemetry Tracking) system

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set default configuration
PROJECT_ID="api-for-warp-drive"
INSTALL_DIR="/usr/local/bin"

echo -e "${GREEN}================= CI CLI Installer =================${NC}"
echo -e "${BLUE}Project ID: ${YELLOW}$PROJECT_ID${NC}"
echo -e "${GREEN}=================================================${NC}"

# Create the CI script
echo -e "${BLUE}[SETUP] Creating CI CLI script${NC}"

mkdir -p ./bin
CI_SCRIPT="./bin/ci"

cat > "$CI_SCRIPT" << 'CISCRIPT'
#!/bin/bash
# CI CLI - Command Line Interface for Continuous Integration, Deployment, Testing and Telemetry Tracking

# Color Constants
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"

# Function to show help message
show_help() {
    echo -e "${BLUE}CI CLI - Command Line Interface for CI/CD CTTT${NC}"
    echo ""
    echo "Usage: ci <command> [options]"
    echo ""
    echo "Commands:"
    echo "  deploy      Run deployment with CI/CD CTTT pipeline"
    echo "  test        Run tests through the CTTT system"
    echo "  telemetry   Manage telemetry data collection and viewing"
    echo "  status      Check status of CI/CD pipelines and deployments"
    echo "  logs        View logs from CI/CD processes"
    echo "  cdi         Continuous Deployment Integration commands"
    echo "  ctt         Continuous Testing and Telemetry commands"
    echo "  help        Show this help message"
    echo ""
    echo "Use 'ci <command> --help' for more information about a command"
}

# Function to run deployment
run_deploy() {
    local config_file="cloudbuild-ci-cttt.yaml"
    local environment="staging"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --config)
                config_file="$2"
                shift 2
                ;;
            --env)
                environment="$2"
                shift 2
                ;;
            --help)
                echo "Usage: ci deploy [options]"
                echo ""
                echo "Options:"
                echo "  --config FILE    Configuration file (default: cloudbuild-ci-cttt.yaml)"
                echo "  --env ENV        Deployment environment (default: staging)"
                echo "  --help           Show this help message"
                return 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                echo "Use 'ci deploy --help' for usage information"
                return 1
                ;;
        esac
    done

    # Run deployment script
    echo -e "${GREEN}Running deployment with config: ${YELLOW}$config_file${NC} and environment: ${YELLOW}$environment${NC}"
    
    if [ -f "./deploy-ci-cttt.sh" ]; then
        ./deploy-ci-cttt.sh --config "$config_file" --project "$PROJECT_ID"
    else
        echo -e "${RED}Deployment script not found.${NC}"
        echo -e "${BLUE}Looking for script in current directory...${NC}"
        
        # Try to find the script in the current path
        deploy_script=$(find . -name "deploy-ci-cttt.sh" -type f | head -n 1)
        
        if [ -n "$deploy_script" ]; then
            echo -e "${GREEN}Found script at: $deploy_script${NC}"
            $deploy_script --config "$config_file" --project "$PROJECT_ID"
        else
            echo -e "${RED}Could not find deploy-ci-cttt.sh script.${NC}"
            echo -e "${YELLOW}Please make sure you are in the correct directory or the script is in your PATH.${NC}"
            return 1
        fi
    fi
}

# Function to run the CDI commands
run_cdi() {
    if [ "$1" == "--help" ] || [ -z "$1" ]; then
        echo "Usage: ci cdi <command> [options]"
        echo ""
        echo "Commands:"
        echo "  setup       Set up Continuous Deployment Integration"
        echo "  status      Check CDI status"
        echo "  logs        View CDI logs"
        echo "  config      Configure CDI settings"
        echo ""
        echo "Use 'ci cdi <command> --help' for more information about a command"
        return 0
    fi

    local command="$1"
    shift

    case "$command" in
        setup)
            echo -e "${GREEN}Setting up Continuous Deployment Integration...${NC}"
            node cicd-cttt-symphony-integration.js
            ;;
        status)
            echo -e "${GREEN}Checking CDI status...${NC}"
            gcloud builds list --project="$PROJECT_ID" --filter="tags=cdi" --limit=5
            ;;
        logs)
            echo -e "${GREEN}Viewing CDI logs...${NC}"
            if [ -d "./logs" ]; then
                ls -la ./logs | grep cttt
                echo -e "${BLUE}Use 'cat ./logs/[LOGFILE]' to view a specific log file${NC}"
            else
                echo -e "${YELLOW}No logs directory found.${NC}"
            fi
            ;;
        config)
            echo -e "${GREEN}Configuring CDI...${NC}"
            if [ -f "./cloud-build/triggers/main-trigger.yaml" ]; then
                echo -e "${BLUE}Current configuration:${NC}"
                cat ./cloud-build/triggers/main-trigger.yaml
            else
                echo -e "${YELLOW}Configuration file not found.${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Unknown CDI command: $command${NC}"
            echo "Use 'ci cdi --help' for usage information"
            return 1
            ;;
    esac
}

# Function to run CTT commands
run_ctt() {
    if [ "$1" == "--help" ] || [ -z "$1" ]; then
        echo "Usage: ci ctt <command> [options]"
        echo ""
        echo "Commands:"
        echo "  test        Run tests through the CTTT system"
        echo "  telemetry   Manage telemetry data"
        echo "  status      Check CTTT status"
        echo "  logs        View CTTT logs"
        echo ""
        echo "Use 'ci ctt <command> --help' for more information about a command"
        return 0
    fi

    local command="$1"
    shift

    case "$command" in
        test)
            echo -e "${GREEN}Running tests through CTTT...${NC}"
            if [ -d "./tests" ]; then
                echo -e "${BLUE}Available test configurations:${NC}"
                find ./tests -name "*.json" -o -name "*.js" | grep -v "node_modules"
                echo -e "${YELLOW}Use 'ci ctt test --config [CONFIG_FILE]' to run a specific test configuration${NC}"
            else
                echo -e "${YELLOW}No tests directory found.${NC}"
            fi
            ;;
        telemetry)
            echo -e "${GREEN}Managing telemetry data...${NC}"
            if [ -d "./config/telemetry" ]; then
                echo -e "${BLUE}Available telemetry configurations:${NC}"
                ls -la ./config/telemetry
            else
                echo -e "${YELLOW}No telemetry configuration directory found.${NC}"
            fi
            ;;
        status)
            echo -e "${GREEN}Checking CTTT status...${NC}"
            gcloud scheduler jobs list --project="$PROJECT_ID" | grep symphony
            ;;
        logs)
            echo -e "${GREEN}Viewing CTTT logs...${NC}"
            if [ -d "./logs" ]; then
                ls -la ./logs | grep test
                echo -e "${BLUE}Use 'cat ./logs/[LOGFILE]' to view a specific log file${NC}"
            else
                echo -e "${YELLOW}No logs directory found.${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Unknown CTT command: $command${NC}"
            echo "Use 'ci ctt --help' for usage information"
            return 1
            ;;
    esac
}

# Main execution
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

command="$1"
shift

case "$command" in
    deploy)
        run_deploy "$@"
        ;;
    test)
        echo -e "${GREEN}Running tests...${NC}"
        echo -e "${YELLOW}This functionality is mapped to 'ci ctt test'${NC}"
        run_ctt "test" "$@"
        ;;
    telemetry)
        echo -e "${GREEN}Managing telemetry...${NC}"
        echo -e "${YELLOW}This functionality is mapped to 'ci ctt telemetry'${NC}"
        run_ctt "telemetry" "$@"
        ;;
    status)
        echo -e "${GREEN}Checking CI/CD status...${NC}"
        gcloud builds list --project="$PROJECT_ID" --limit=5
        ;;
    logs)
        echo -e "${GREEN}Viewing CI/CD logs...${NC}"
        if [ -d "./logs" ]; then
            ls -la ./logs | head -n 20
            echo -e "${BLUE}Use 'cat ./logs/[LOGFILE]' to view a specific log file${NC}"
        else
            echo -e "${YELLOW}No logs directory found.${NC}"
        fi
        ;;
    cdi)
        run_cdi "$@"
        ;;
    ctt)
        run_ctt "$@"
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $command${NC}"
        show_help
        exit 1
        ;;
esac

exit $?
CISCRIPT

# Make the CI script executable
chmod +x "$CI_SCRIPT"

echo -e "${GREEN}[SUCCESS] CI CLI script created at $CI_SCRIPT${NC}"

# Create symbolic link to make it available in PATH
echo -e "${BLUE}[SETUP] Creating symbolic link for easy access${NC}"

# Add to user's bin directory
mkdir -p ~/bin
CI_USER_BIN=~/bin/ci

if [ -f "$CI_USER_BIN" ]; then
    echo -e "${YELLOW}[WARN] CI CLI already exists at $CI_USER_BIN, updating...${NC}"
    rm "$CI_USER_BIN"
fi

ln -s "$(pwd)/$CI_SCRIPT" "$CI_USER_BIN"
chmod +x "$CI_USER_BIN"

echo -e "${GREEN}[SUCCESS] CI CLI installed at $CI_USER_BIN${NC}"

# Check if ~/bin is in PATH
if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    echo -e "${YELLOW}[WARN] ~/bin is not in your PATH${NC}"
    echo -e "${BLUE}[INFO] Adding ~/bin to your PATH in ~/.zshrc${NC}"
    
    # Add it to .zshrc
    echo '' >> ~/.zshrc
    echo '# Added by CI CLI installer' >> ~/.zshrc
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
    
    echo -e "${YELLOW}[IMPORTANT] Please run 'source ~/.zshrc' or start a new terminal to use the 'ci' command${NC}"
else
    echo -e "${GREEN}[INFO] ~/bin is already in your PATH${NC}"
fi

echo -e "${GREEN}============== Installation Complete ==============${NC}"
echo -e "${BLUE}[USAGE] You can now use the CI CLI with the following commands:${NC}"
echo -e "${YELLOW}ci help${NC} - Show help information"
echo -e "${YELLOW}ci deploy${NC} - Deploy using CI/CD CTTT pipeline"
echo -e "${YELLOW}ci cdi${NC} - Continuous Deployment Integration commands"
echo -e "${YELLOW}ci ctt${NC} - Continuous Testing and Telemetry commands"
echo -e "${YELLOW}ci status${NC} - Check CI/CD pipeline status"
echo -e "${GREEN}=================================================${NC}"

# Exit successfully
exit 0
