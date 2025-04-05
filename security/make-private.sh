#!/bin/bash

# Script to make repository private
git config --global url."https://${GH_TOKEN}@github.com/".insteadOf "https://github.com/"

# Update repository settings
curl -X PATCH \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token ${GH_TOKEN}" \
  https://api.github.com/repos/C2100-PR/api-for-warp-drive \
  -d '{"private":true,"has_issues":true,"has_projects":true,"has_wiki":true}'

# Add branch protection
curl -X PUT \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token ${GH_TOKEN}" \
  https://api.github.com/repos/C2100-PR/api-for-warp-drive/branches/main/protection \
  -d '{"required_status_checks":null,"enforce_admins":true,"required_pull_request_reviews":{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1},"restrictions":null}'

# Verify status
curl -H "Authorization: token ${GH_TOKEN}" \
  https://api.github.com/repos/C2100-PR/api-for-warp-drive