#!/bin/bash
# Apply fix to cloudbuild-ci-cttt.yaml

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}================= Apply CloudBuild Fix ==================${NC}"

# Create backup of original file
echo -e "${BLUE}[INFO] Creating backup of original file...${NC}"
cp /Users/as/asoos/aixtiv-cli/cloudbuild-ci-cttt.yaml /Users/as/asoos/aixtiv-cli/cloudbuild-ci-cttt.yaml.bak
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to create backup file${NC}"
    exit 1
fi
echo -e "${GREEN}[SUCCESS] Backup created at cloudbuild-ci-cttt.yaml.bak${NC}"

# Apply the fix
echo -e "${BLUE}[INFO] Applying fix to cloudbuild-ci-cttt.yaml...${NC}"
cp /Users/as/asoos/aixtiv-cli/fixes/cloudbuild-ci-cttt.yaml.fix /Users/as/asoos/aixtiv-cli/cloudbuild-ci-cttt.yaml
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to apply fix${NC}"
    exit 1
fi
echo -e "${GREEN}[SUCCESS] Fix applied successfully${NC}"

# Verify the YAML file is valid
echo -e "${BLUE}[INFO] Verifying YAML syntax...${NC}"
python3 -c "import yaml; yaml.safe_load(open('/Users/as/asoos/aixtiv-cli/cloudbuild-ci-cttt.yaml', 'r'))" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] YAML validation failed. The fix may not have resolved all issues.${NC}"
    echo -e "${YELLOW}[WARN] You can revert to the backup using:${NC}"
    echo -e "${YELLOW}      cp /Users/as/asoos/aixtiv-cli/cloudbuild-ci-cttt.yaml.bak /Users/as/asoos/aixtiv-cli/cloudbuild-ci-cttt.yaml${NC}"
    exit 1
fi
echo -e "${GREEN}[SUCCESS] YAML syntax validation passed${NC}"

echo -e "${GREEN}[COMPLETE] Cloudbuild YAML file has been fixed${NC}"
echo
echo -e "${BLUE}The issue was:${NC}"
echo -e "${YELLOW}The file had a syntax error in the heredoc section for the domain configuration JSON.${NC}"
echo -e "${YELLOW}The original file used 'EOF' as the heredoc delimiter, but the same string appeared${NC}"
echo -e "${YELLOW}inside the JSON content, causing a parsing error.${NC}"
echo
echo -e "${BLUE}The fix:${NC}"
echo -e "${YELLOW}1. Changed the heredoc delimiter from 'EOF' to 'ENDCONFIG' to avoid conflicts${NC}"
echo -e "${YELLOW}2. Fixed proper YAML indentation in the file${NC}"
echo -e "${YELLOW}3. Ensured proper structure for multiline scripts${NC}"
echo
echo -e "${BLUE}You can now test the deployment with:${NC}"
echo -e "${GREEN}ci deploy --config cloudbuild-ci-cttt.yaml --env staging${NC}"
echo -e "${GREEN}=============================================${NC}"

# Make this script executable
chmod +x /Users/as/asoos/aixtiv-cli/fixes/apply-cloudbuild-fix.sh

exit 0
