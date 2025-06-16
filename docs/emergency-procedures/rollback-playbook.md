# Rollback Playbook: Emergency Procedure

## Overview
This playbook provides systematic procedures for rolling back deployments in case of critical issues. It covers the detection of issues requiring rollback, step-by-step rollback procedures for different deployment scenarios, and verification methods to ensure successful recovery.

**Purpose**: To minimize downtime and impact by providing clear, executable rollback procedures for all deployment types in the Aixtiv Symphony ecosystem.

**Audience**: Operations team, on-call engineers, release managers, and incident responders.

**Prerequisites**: Proper access credentials and familiarity with deployment mechanisms.

## 1. Emergency Rollback Framework

### Detection Phase
Before initiating a rollback, confirm that the issue meets rollback criteria:

#### 1.1 Rollback Triggers
- Security vulnerability exposure
- Data integrity issues
- Critical functionality broken
- Performance degradation below SLA thresholds
- Widespread user impact

#### 1.2 Assessment Checklist
- [ ] Impact scope identified (users affected, systems impacted)
- [ ] Issue traced to a specific deployment
- [ ] Alternative mitigations considered
- [ ] Decision authority contacted
- [ ] Rollback approved by service owner

#### 1.3 Decision Authority Matrix
| Severity | Decision Authority | Secondary Authority |
|----------|-------------------|-------------------|
| Critical (P0) | CTO or VP Engineering | On-call Engineering Lead |
| High (P1) | Engineering Manager | Senior Engineer |
| Medium (P2) | Team Lead | Engineering Manager |

### General Rollback Procedure
1. Declare incident and notify stakeholders
2. Identify the specific deployment to roll back
3. Select the appropriate rollback procedure based on deployment type
4. Execute the rollback
5. Verify successful rollback
6. Document the incident and rollback

## 2. Firebase Deployment Rollback

### 2.1 Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Admin access to Firebase project
- Authentication token with appropriate permissions
- Access to deployment history

### 2.2 Identifying Deployment to Roll Back
```bash
# List recent deployments
firebase projects:list
firebase hosting:releases --project=[PROJECT_ID] list
```

### 2.3 Execution Steps
```bash
# Authenticate if needed
firebase login

# Rollback to previous version
firebase hosting:clone [SOURCE_SITE]:previous [DESTINATION_SITE]:live --project=[PROJECT_ID]

# Alternative: rollback to specific version
firebase hosting:clone [SOURCE_SITE]:[VERSION] [DESTINATION_SITE]:live --project=[PROJECT_ID]
```

### 2.4 Verification
- Verify site loads correctly: `curl -I https://[PROJECT_ID].web.app`
- Check functionality in key user flows
- Confirm Cloud Functions operate correctly: `firebase functions:log --project=[PROJECT_ID]`

### 2.5 Troubleshooting
- If authentication fails: `firebase logout` then `firebase login`
- If deployment is locked: `firebase hosting:releases --project=[PROJECT_ID] unblock`
- If Firestore rules need rollback: `firebase firestore:rules:rollback --project=[PROJECT_ID]`

## 3. NPM Package Rollback

### 3.1 Prerequisites
- npm account with publish rights
- Authentication to npm registry
- Access to package version history
- npm version ≥ 6.x

### 3.2 Identifying Package to Roll Back
```bash
# View package info
npm view aixtiv-cli versions

# View package details
npm info aixtiv-cli
```

### 3.3 Execution Steps
#### For Complete Unpublishing (if < 72 hours since publish)
```bash
# Unpublish specific version
npm unpublish aixtiv-cli@x.y.z

# Republish previous version if needed
cd /path/to/previous/version
npm publish
```

#### For Deprecation (if > 72 hours since publish)
```bash
# Deprecate problematic version
npm deprecate aixtiv-cli@x.y.z "Critical issue found - please use version x.y.(z-1)"

# Publish new version with fix
npm version patch
npm publish
```

### 3.4 Verification
```bash
# Verify package listing
npm view aixtiv-cli versions

# Install and test rollback version
npm install -g aixtiv-cli@x.y.(z-1)
aixtiv --version
```

### 3.5 Troubleshooting
- If unpublish fails due to time limit: use deprecation flow
- If authentication fails: `npm logout` and then `npm login`
- If conflicts in package-lock.json: `npm cache clean --force`

## 4. GoDaddy/Website Deployment Rollback

### 4.1 Prerequisites
- SSH access to hosting server
- GoDaddy credentials with appropriate permissions
- Access to deployment backups
- rsync installed

### 4.2 Identifying Current State
```bash
# Check current deployment
ssh $GODADDY_USERNAME@$GODADDY_HOST "ls -la $GODADDY_PATH/current"
ssh $GODADDY_USERNAME@$GODADDY_HOST "ls -la $GODADDY_PATH/releases"
```

### 4.3 Execution Steps
```bash
# Connect to server
ssh $GODADDY_USERNAME@$GODADDY_HOST

# Navigate to deployments
cd $GODADDY_PATH

# Identify previous stable release
ls -la releases/

# Update symlink to previous version
rm -f current
ln -s releases/PREVIOUS_VERSION_FOLDER current

# Clear cache if applicable
rm -rf public/cache/*
```

### 4.4 Verification
```bash
# Verify symlink points to correct release
ls -la current

# Check web server status
systemctl status nginx

# Verify site is responding
curl -I https://yourdomain.com
```

### 4.5 Troubleshooting
- If symlink update fails: manually copy previous version `cp -r releases/PREVIOUS_VERSION_FOLDER/* current/`
- If permissions issue: `chmod -R 755 current/`
- If web server issues: `systemctl restart nginx`

## 5. Gateway API Integration

### 5.1 Authentication Requirements
- API Gateway credentials must be obtained
- Token rotation may be necessary post-rollback
- Authorization level: Admin or Super Claude

```bash
# Obtain temporary admin token for rollback operations
aixtiv auth:verify -e admin@aixtiv.com -a 000

# Execute API rollback
curl -X POST https://api.aixtiv.com/v1/rollback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service":"SERVICE_NAME","version":"TARGET_VERSION"}'
```

### 5.2 Service Registry Update
```bash
# Update service registry with rollback information
aixtiv service:update -s SERVICE_NAME -v PREVIOUS_VERSION -r "emergency rollback"
```

## 6. Blockchain Validation (S2DO Contracts)

### 6.1 Validation Steps
1. Verify the S2DO contract state before rollback:
```bash
aixtiv claude:automation:github -r aixtiv-cli -a secure -b main
```

2. Record rollback operation on blockchain:
```bash
# Initiate S2DO contract for rollback operation
aixtiv blockchain:record-operation \
  --type rollback \
  --service SERVICE_NAME \
  --from VERSION_FROM \
  --to VERSION_TO \
  --reason "Critical issue: DESCRIPTION"
```

3. Verify transaction completion:
```bash
aixtiv blockchain:verify-transaction --id TRANSACTION_ID
```

### 6.2 Approval Chain
- Requires multi-signature approval for completion
- CRX/RIX agent verification required
- Recovery token generation via Dr. Grant security protocol

## 7. Post-Rollback Procedures

### 7.1 Documentation Requirements
- Record incident in Flight Memory System:
```bash
aixtiv claude:agent:delegate \
  --project "Rollback Documentation" \
  --description "Document rollback of SERVICE from VERSION_NEW to VERSION_OLD" \
  --priority high \
  --assign-to dr-memoria
```

- Update status dashboards:
```bash
aixtiv status:update --service SERVICE_NAME --status "recovered" --message "Rolled back to stable version"
```

### 7.2 Stakeholder Communication
1. Internal notification:
```bash
aixtiv notify:team --severity SEVERITY --message "Rollback completed for SERVICE_NAME to version VERSION_OLD"
```

2. Customer communication (if external impact):
```bash
aixtiv notify:customers --affected-service SERVICE_NAME --message "Service restored to stable version"
```

### 7.3 Root Cause Analysis
Schedule post-incident review within 24-48 hours:
```bash
aixtiv claude:agent:delegate \
  --project "Post-Incident Review" \
  --description "Analyze root cause of incident requiring rollback of SERVICE_NAME" \
  --priority high \
  --deadline 2d
```

## Appendix A: Emergency Contacts

| Role | Contact | Alternative Contact |
|------|---------|---------------------|
| On-Call Engineer | oncall@aixtiv.com | +1-555-123-4567 |
| Release Manager | releases@aixtiv.com | +1-555-123-4568 |
| Security Team | security@aixtiv.com | +1-555-123-4569 |
| Infrastructure Lead | infra@aixtiv.com | +1-555-123-4570 |

## Appendix B: Rollback Decision Flowchart

1. **Detect Issue**
   - Monitor alerts, user reports, performance metrics

2. **Assess Impact**
   - User impact scope
   - Data corruption risk
   - Security implications

3. **Decision Point**
   - If recoverable without rollback → Apply hotfix
   - If critical with no quick fix → Proceed to rollback

4. **Select Rollback Strategy**
   - Based on deployment type
   - Based on time since deployment
   - Based on data migration status

5. **Execute Rollback**
   - Follow specific procedure
   - Update registry and blockchain

6. **Verify Recovery**
   - Functionality testing
   - Performance validation
   - Security checks

7. **Communication**
   - Internal teams
   - External stakeholders
   - Status updates

8. **Documentation & Follow-up**
   - Incident record
   - RCA planning
   - Prevention measures

---

Last Updated: [Date]  
Version: 1.0  
Approved By: [Name and Role]

