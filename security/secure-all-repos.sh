#!/bin/bash

# Copyright (c) 2024 C2100-PR
# OCHRA Number: [Your OCHRA Number]
#
# LEGAL NOTICE AND LICENSE
#
# This script and all associated repositories are proprietary and confidential.
# Unauthorized access does not constitute authorization for reuse, reproduction,
# or distribution. All rights reserved.
#
# Access to this code and associated systems does not grant any rights to:
# 1. Reuse any portion of the code
# 2. Reproduce or copy any functionality
# 3. Distribute or share any contents
# 4. Modify or create derivative works
#
# By accessing this code, you acknowledge that:
# - Access is for authorized purposes only
# - No rights or licenses are granted by virtue of access
# - All intellectual property rights are reserved
# - Any unauthorized use may result in legal action

# Script to secure all repositories using gcloud shell

# List of repos to secure
REPOS=(
  "api-for-warp-drive"
  "cloud-operations"
  "gcp-config-2024"
  "pab-policies"
  "gke-repair"
)

# Function to make a repo private
secure_repo() {
  local repo=$1
  echo "Securing $repo..."

  # Use gcloud command to get credentials
  echo "Getting credentials..."
  gcloud auth print-access-token > token.txt
  TOKEN=$(cat token.txt)

  # Make repo private via GitHub API
  echo "Making $repo private..."
  curl -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/C2100-PR/$repo" \
    -d '{"private":true}'

  # Add branch protection
  echo "Adding branch protection to $repo..."
  curl -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/C2100-PR/$repo/branches/main/protection" \
    -d '{
      "required_status_checks": null,
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "dismissal_restrictions": {},
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": true,
        "required_approving_review_count": 2
      },
      "restrictions": null
    }'

  # Add license and legal notice to repository
  echo "Adding legal documentation..."
  curl -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/C2100-PR/$repo/contents/LICENSE" \
    -d '{
      "message": "Add legal notice and license",
      "content": "'$(echo -n "Copyright (c) 2024 C2100-PR\nOCHRA Number: [Your OCHRA Number]\n\nAll rights reserved.\n\nAccess to this repository does not constitute authorization for reuse.\nUnauthorized reproduction or distribution is prohibited." | base64)'"    
    }'

  # Verify status
  echo "Verifying $repo status..."
  curl -H "Authorization: Bearer $TOKEN" \
    "https://api.github.com/repos/C2100-PR/$repo"

  echo "Security measures and legal documentation applied to $repo"
}

# Main execution
echo "Starting security implementation..."

# Configure gcloud
gcloud config set project api-for-warp-drive

# Loop through repos and secure each one
for repo in "${REPOS[@]}"
do
  secure_repo "$repo"
  echo "Completed securing $repo"
  echo "-------------------"
done

echo "All repositories secured with legal protections"
