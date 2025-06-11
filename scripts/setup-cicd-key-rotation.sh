#!/bin/bash
# Setup script for CI/CD CTTT integration with GCP Secret Manager and key rotation
# Part of Phase III: Agent Autonomy + Platform Automation

set -e

# Configuration
GCP_PROJECT="api-for-warp-drive"
REGION="us-west1"
GITHUB_ORG="AI-Publishing-International-LLP-UK"
GITHUB_REPO="aixtiv-cli"
CTTT_CONFIG_FILE="config/cttt-key-rotation.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "============================================="
echo "  CI/CD CTTT Integration for Key Rotation"
echo "  Phase III: Agent Autonomy + Platform Automation"
echo "============================================="
echo -e "${NC}"

# Check for required commands
for cmd in gcloud gh npm jq; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}Error: $cmd is required but not installed.${NC}"
    echo "Please install the required tools and try again."
    exit 1
  fi
done

# Check current gcloud configuration
echo -e "${YELLOW}Checking gcloud configuration...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project)

if [ "$CURRENT_PROJECT" != "$GCP_PROJECT" ]; then
  echo -e "${YELLOW}Current project is set to: $CURRENT_PROJECT${NC}"
  echo -e "${YELLOW}Switching to project: $GCP_PROJECT${NC}"
  gcloud config set project $GCP_PROJECT
fi

# Check GitHub authentication
echo -e "${YELLOW}Checking GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
  echo -e "${RED}GitHub CLI is not authenticated.${NC}"
  echo "Please run 'gh auth login' and try again."
  exit 1
fi

# Create GitHub Actions secrets
echo -e "${YELLOW}Setting up GitHub Actions secrets for CTTT integration...${NC}"

# Create Workload Identity Federation for GitHub Actions
echo -e "${YELLOW}Creating Workload Identity Pool for GitHub Actions...${NC}"
POOL_NAME="github-actions-pool"
POOL_ID="${POOL_NAME}"
PROVIDER_NAME="github-provider"
PROVIDER_ID="${PROVIDER_NAME}"

# Check if the pool already exists
if ! gcloud iam workload-identity-pools describe "${POOL_ID}" --location="global" &> /dev/null; then
  echo -e "${YELLOW}Creating Workload Identity Pool: ${POOL_ID}${NC}"
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool" \
    --description="Identity pool for GitHub Actions"
else
  echo -e "${GREEN}Workload Identity Pool already exists: ${POOL_ID}${NC}"
fi

# Get the full resource name of the pool
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe "${POOL_ID}" \
  --location="global" \
  --format="value(name)")

# Check if the provider already exists
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_ID}" &> /dev/null; then
  echo -e "${YELLOW}Creating Workload Identity Provider: ${PROVIDER_ID}${NC}"
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_ID}" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --issuer-uri="https://token.actions.githubusercontent.com"
else
  echo -e "${GREEN}Workload Identity Provider already exists: ${PROVIDER_ID}${NC}"
fi

# Create service account for GitHub Actions
SERVICE_ACCOUNT_NAME="github-cicd-cttt"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

echo -e "${YELLOW}Checking for service account: ${SERVICE_ACCOUNT_EMAIL}${NC}"
if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" &> /dev/null; then
  echo -e "${YELLOW}Creating service account: ${SERVICE_ACCOUNT_EMAIL}${NC}"
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --display-name="GitHub CI/CD CTTT Service Account" \
    --description="Service account for GitHub Actions CI/CD CTTT"
else
  echo -e "${GREEN}Service account already exists: ${SERVICE_ACCOUNT_EMAIL}${NC}"
fi

# Grant required permissions to the service account
echo -e "${YELLOW}Setting up IAM permissions...${NC}"
gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.admin" \
  --condition=None

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/iam.serviceAccountKeyAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/serviceusage.serviceUsageAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/firebase.admin" \
  --condition=None

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/cloudbuild.builds.editor" \
  --condition=None

# Allow service account impersonation from GitHub Actions
REPO="${GITHUB_ORG}/${GITHUB_REPO}"
echo -e "${YELLOW}Allowing GitHub Actions from ${REPO} to impersonate service account...${NC}"
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT_EMAIL}" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}" \
  --role="roles/iam.workloadIdentityUser" \
  --condition=None

# Set GitHub secrets
echo -e "${YELLOW}Setting GitHub secrets for CI/CD CTTT integration...${NC}"
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_ID}" \
  --format="value(name)")

echo -e "${YELLOW}Setting WORKLOAD_IDENTITY_PROVIDER secret...${NC}"
gh secret set WORKLOAD_IDENTITY_PROVIDER --body "${WORKLOAD_IDENTITY_PROVIDER}" --repo "${REPO}"

echo -e "${YELLOW}Setting SERVICE_ACCOUNT_EMAIL secret...${NC}"
gh secret set SERVICE_ACCOUNT_EMAIL --body "${SERVICE_ACCOUNT_EMAIL}" --repo "${REPO}"

# Generate GitHub personal access token for repository_dispatch events
echo -e "${YELLOW}Setting up repository dispatch token...${NC}"
echo -e "${GREEN}Please create a GitHub Personal Access Token with repo scope and enter it below:${NC}"
echo -e "${YELLOW}This token will be used for repository_dispatch events between workflows.${NC}"
read -s -p "Enter GitHub Personal Access Token: " REPO_DISPATCH_TOKEN
echo

if [ -z "$REPO_DISPATCH_TOKEN" ]; then
  echo -e "${RED}No token provided. Skipping this step.${NC}"
  echo -e "${YELLOW}You will need to manually set the REPO_DISPATCH_TOKEN secret in your GitHub repository.${NC}"
else
  echo -e "${YELLOW}Setting REPO_DISPATCH_TOKEN secret...${NC}"
  gh secret set REPO_DISPATCH_TOKEN --body "${REPO_DISPATCH_TOKEN}" --repo "${REPO}"
  echo -e "${GREEN}REPO_DISPATCH_TOKEN secret set successfully.${NC}"
fi

# Create or update CTTT test suites for key rotation
echo -e "${YELLOW}Creating CTTT test suites for key rotation...${NC}"

TEST_SUITES_DIR="tests/cttt/security"
mkdir -p "${TEST_SUITES_DIR}"

# Create pre-rotation test suite
PRE_ROTATION_SUITE="${TEST_SUITES_DIR}/pre-rotation.test.js"
cat > "${PRE_ROTATION_SUITE}" << 'EOF'
/**
 * Pre-rotation security tests for CTTT pipeline
 * 
 * These tests verify that the system is in a good state before key rotation
 */
const { execSync } = require('child_process');
const assert = require('assert');

describe('Security Pre-Rotation Tests', () => {
  it('should verify secrets are accessible', async () => {
    const secretsExist = execSync('aixtiv claude:secrets -a list -p api-for-warp-drive');
    assert(secretsExist.toString().includes('Found'), 'Secrets should be accessible');
  });

  it('should verify service connections are working', async () => {
    const connections = execSync('aixtiv cicd:verify:connections');
    assert(connections.toString().includes('success'), 'Service connections should be working');
  });

  it('should verify current credentials', async () => {
    const credentials = execSync('aixtiv cicd:verify:credentials');
    assert(credentials.toString().includes('valid'), 'Current credentials should be valid');
  });
});
EOF

# Create post-rotation test suite
POST_ROTATION_SUITE="${TEST_SUITES_DIR}/post-rotation.test.js"
cat > "${POST_ROTATION_SUITE}" << 'EOF'
/**
 * Post-rotation security tests for CTTT pipeline
 * 
 * These tests verify that the system remains functional after key rotation
 */
const { execSync } = require('child_process');
const assert = require('assert');

describe('Security Post-Rotation Tests', () => {
  it('should verify new secrets are accessible', async () => {
    const secretsExist = execSync('aixtiv claude:secrets -a list -p api-for-warp-drive');
    assert(secretsExist.toString().includes('Found'), 'New secrets should be accessible');
  });

  it('should verify service connections with new credentials', async () => {
    const connections = execSync('aixtiv cicd:verify:connections');
    assert(connections.toString().includes('success'), 'Service connections should be working with new credentials');
  });

  it('should verify API integrations', async () => {
    const integrations = execSync('aixtiv cicd:verify:api-integrations');
    assert(integrations.toString().includes('success'), 'API integrations should be working');
  });

  it('should verify Firebase functions with new credentials', async () => {
    const functions = execSync('aixtiv cicd:verify:firebase-functions');
    assert(functions.toString().includes('success'), 'Firebase functions should be working');
  });
});
EOF

# Create key verification script
KEY_VERIFICATION_SCRIPT="scripts/verify-keys.js"
cat > "${KEY_VERIFICATION_SCRIPT}" << 'EOF'
#!/usr/bin/env node
/**
 * Verify keys after rotation
 * Part of CI/CD CTTT for GCP Secret Manager integration
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = path.join(process.cwd(), 'config', 'rotation-schedule.json');
const PROJECT_ID = process.argv[2] || 'api-for-warp-drive';
const SPECIFIC_SECRET = process.argv[3];

async function main() {
  console.log('Verifying keys after rotation...');
  
  try {
    // Load rotation schedule
    if (!fs.existsSync(CONFIG_FILE)) {
      console.error(`Rotation schedule file not found: ${CONFIG_FILE}`);
      process.exit(1);
    }
    
    const scheduleData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    
    // Filter for specific secret if provided
    const schedule = SPECIFIC_SECRET 
      ? scheduleData.rotation_schedules.filter(s => s.secretId === SPECIFIC_SECRET)
      : scheduleData.rotation_schedules;
    
    if (schedule.length === 0) {
      console.error(`No secrets to verify${SPECIFIC_SECRET ? ` with ID: ${SPECIFIC_SECRET}` : ''}`);
      process.exit(1);
    }
    
    // Verify each secret
    let allValid = true;
    const results = [];
    
    for (const item of schedule) {
      const result = await verifySecret(item, PROJECT_ID);
      results.push(result);
      
      if (!result.valid) {
        allValid = false;
      }
    }
    
    // Output results
    console.log('\nVerification Results:');
    console.table(results);
    
    // Exit with appropriate code
    if (!allValid) {
      console.error('Some keys failed verification!');
      process.exit(1);
    }
    
    console.log('All keys verified successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Error during key verification: ${error.message}`);
    process.exit(1);
  }
}

async function verifySecret(secretConfig, projectId) {
  const { secretId, type } = secretConfig;
  console.log(`Verifying ${type} secret: ${secretId}`);
  
  try {
    // Access the secret
    const accessResult = spawnSync('npx', [
      'aixtiv', 'claude:secrets',
      '-a', 'get',
      '-i', secretId,
      '-p', projectId,
      '--redact'
    ]);
    
    if (accessResult.status !== 0) {
      return {
        secretId,
        type,
        valid: false,
        error: 'Failed to access secret',
        details: accessResult.stderr.toString()
      };
    }
    
    // Verify service connection based on type
    if (type === 'service-account-key') {
      const serviceAccountEmail = secretConfig.serviceAccountEmail;
      const verifyResult = spawnSync('npx', [
        'aixtiv', 'cicd:verify:service-account',
        '--email', serviceAccountEmail
      ]);
      
      if (verifyResult.status !== 0) {
        return {
          secretId,
          type,
          valid: false,
          error: 'Service account verification failed',
          details: verifyResult.stderr.toString()
        };
      }
    } else if (type === 'api-key') {
      const apiKeyName = secretConfig.apiKeyName;
      const verifyResult = spawnSync('npx', [
        'aixtiv', 'cicd:verify:api-key',
        '--name', apiKeyName
      ]);
      
      if (verifyResult.status !== 0) {
        return {
          secretId,
          type,
          valid: false,
          error: 'API key verification failed',
          details: verifyResult.stderr.toString()
        };
      }
    }
    
    return {
      secretId,
      type,
      valid: true,
      lastVerified: new Date().toISOString()
    };
  } catch (error) {
    return {
      secretId,
      type,
      valid: false,
      error: error.message
    };
  }
}

main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
EOF

chmod +x "${KEY_VERIFICATION_SCRIPT}"

# Register the test suites and scripts with package.json
echo -e "${YELLOW}Updating package.json with CTTT scripts...${NC}"
if command -v jq &> /dev/null; then
  # Create backup
  cp package.json package.json.bak
  
  # Add scripts for CTTT testing
  jq '.scripts += {
    "cicd:test:pre-rotation": "jest tests/cttt/security/pre-rotation.test.js",
    "cicd:test:post-rotation": "jest tests/cttt/security/post-rotation.test.js",
    "cicd:verify:keys": "node scripts/verify-keys.js",
    "cicd:verify:key": "node scripts/verify-keys.js api-for-warp-drive"
  }' package.json.bak > package.json
  
  echo -e "${GREEN}Updated package.json with CTTT scripts.${NC}"
else
  echo -e "${YELLOW}jq not found, please manually update package.json with the following scripts:${NC}"
  echo "  \"cicd:test:pre-rotation\": \"jest tests/cttt/security/pre-rotation.test.js\","
  echo "  \"cicd:test:post-rotation\": \"jest tests/cttt/security/post-rotation.test.js\","
  echo "  \"cicd:verify:keys\": \"node scripts/verify-keys.js\","
  echo "  \"cicd:verify:key\": \"node scripts/verify-keys.js api-for-warp-drive\""
fi

# Update README with CI/CD CTTT integration information
echo -e "${YELLOW}Updating README with CI/CD CTTT integration information...${NC}"
README_SECTION="## CI/CD CTTT Integration for Secret Management

The GCP Secret Manager integration includes CI/CD CTTT (Continuous Integration/Continuous Deployment with Comprehensive Testing and Telemetry Tracking) capabilities for automatic key rotation:

\`\`\`bash
# View CI/CD CTTT status for key rotation
aixtiv cicd:status --component key-rotation

# Trigger a manual key rotation with CTTT integration
aixtiv cicd:trigger key-rotation --environment production

# Verify keys after rotation
aixtiv cicd:verify:keys
\`\`\`

This integration ensures that all credential rotations are automatically tested and deployed, reducing security risks and manual intervention.
"

# Check if README.md exists
if [ ! -f "README.md" ]; then
  echo -e "${YELLOW}README.md not found, creating it...${NC}"
  echo "# Aixtiv CLI" > README.md
fi

if grep -q "CI/CD CTTT Integration for Secret Management" README.md; then
  echo -e "${GREEN}README already contains CI/CD CTTT information.${NC}"
else
  echo -e "${README_SECTION}" >> README.md
  echo -e "${GREEN}Updated README with CI/CD CTTT information.${NC}"
fi

# Final instructions
echo
echo -e "${BLUE}====== Setup Complete ======${NC}"
echo
echo -e "${GREEN}The CI/CD CTTT integration for key rotation has been set up successfully.${NC}"
echo
echo "To verify the setup:"
echo -e "${YELLOW}1. Run a test key rotation:${NC}"
echo "   aixtiv claude:secrets -a rotate-sa-key -i test-sa-key -p api-for-warp-drive -s github-cicd-cttt@api-for-warp-drive.iam.gserviceaccount.com --dryRun"
echo
echo -e "${YELLOW}2. Verify the GitHub Actions workflow:${NC}"
echo "   gh workflow view key-rotation.yml"
echo
echo -e "${YELLOW}3. Trigger a CI/CD CTTT test:${NC}"
echo "   npm run cicd:test:pre-rotation"
echo
echo -e "${BLUE}============================${NC}"