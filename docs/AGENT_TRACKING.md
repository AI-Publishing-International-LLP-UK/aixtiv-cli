# Agent Tracking System

This document provides an overview of the Agent Tracking System used in the Aixtiv Symphony ecosystem. The system provides comprehensive tracking and attribution for all actions performed within the system, regardless of whether they were performed by human operators, AI assistants, CI/CD pipelines, or other automated tools.

## Purpose

The Agent Tracking System serves several key purposes:

1. **Audit Trail**: Maintain a complete history of all operations performed on the system
2. **Attribution**: Clearly identify which agent (human or automated) performed each action
3. **Compliance**: Support regulatory and security compliance requirements
4. **Performance Monitoring**: Track effectiveness and efficiency of automated agents
5. **Troubleshooting**: Aid in diagnosing issues by providing action context

## Agent Types

The following agent types are recognized by the system:

| Agent Type | Description | Example ID |
|------------|-------------|------------|
| Human Operators | Human users with direct system access | `HUMAN-ADMIN` |
| AI Assistants | AI systems operating within constraints | `ANTHROPIC-AGENT-01-CLAUDE` |
| CI/CD Systems | Automated build and deployment systems | `CI-GITHUB-BUILD` |
| Scheduled Jobs | Time-based automated operations | `SCHEDULER-BACKUP` |
| Custom Tools | Special-purpose automation scripts | `TOOL-DOMAIN-SCANNER` |

## Using the Agent Tracking System

### Setting Agent ID

To attribute actions to a specific agent, set the `AGENT_ID` environment variable:

```bash
# For CLI operations
export AGENT_ID="HUMAN-ADMIN"
aixtiv domain:add example.com

# For scripts
export AGENT_ID="SCRIPT-SSL-PROVISIONING"
./scripts/batch-ssl-provision.sh
```

### JavaScript API

For Node.js applications and CLI commands:

```javascript
const { setAgentId, logAgentAction } = require('../lib/agent-tracking');

// Set the agent ID
setAgentId('API-SERVICE');

// Log an action
await logAgentAction('domain_add', { domain: 'example.com' });
```

### Bash Script Integration

For shell scripts:

```bash
#!/bin/bash
source "$(dirname "$0")/../bin/agent-tracking.sh"

# The agent ID is read from the AGENT_ID environment variable
# or defaults to "UNSPECIFIED_AGENT"

# Log actions throughout your script
log_agent_action "script_start" "Starting domain verification"

# Run commands...

log_agent_action "script_complete" "Domain verification completed"
```

### Python Integration

For Python automation scripts:

```python
from automation.agent_tracking import log_agent_action, set_agent_id

# Set the agent ID
set_agent_id("PYTHON-AUTOMATION")

# Log actions
log_agent_action("automation_start", "Starting domain synchronization")

# Run your Python code...

log_agent_action("automation_complete", "Domain synchronization complete")
```

### GitHub Actions Integration

For GitHub Workflows:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup agent tracking
        run: |
          export AGENT_ID="GITHUB-WORKFLOW-${{ github.workflow }}"
          source bin/agent-tracking.sh
          log_agent_action "workflow_start" "Starting GitHub workflow"
```

## Viewing Agent Activity

### Command Line

To view recent agent activity:

```bash
# Show all recent activity
npm run agent:report

# Show activity for a specific agent
npm run agent:report -- --agent="ANTHROPIC-AGENT-01-CLAUDE"

# Show activity within a time range
npm run agent:report -- --from="2023-05-01" --to="2023-05-31"
```

### Cloud Console

If cloud integration is enabled:

1. Open the Google Cloud Console
2. Navigate to Logging > Logs Explorer
3. Filter for `resource.type="global" AND logName="projects/api-for-warp-drive/logs/agent-actions"`

### Firestore Database

If Firestore integration is enabled:

1. Access the Firebase Console
2. Navigate to Firestore Database
3. Browse the `agentActions` collection

## Best Practices

1. **Always Set Agent ID**: Always explicitly set the agent ID for automated scripts
2. **Meaningful Action Names**: Use descriptive names for actions (e.g., `domain_add` rather than `add`)
3. **Include Relevant Details**: Provide context in the action details
4. **Track Start and End**: Log both the beginning and completion of significant operations
5. **Handle Failures**: Log failures along with success cases
6. **Regular Auditing**: Periodically review agent activity logs

## Troubleshooting

### Missing Agent ID

If actions are being recorded with `UNSPECIFIED_AGENT`:

1. Ensure the `AGENT_ID` environment variable is set
2. Verify that agent tracking is initialized in the script

### Actions Not Being Recorded

If actions are not appearing in logs:

1. Check that `log_agent_action` is being called correctly
2. Verify that the agent tracking script is sourced correctly
3. Ensure file permissions are set correctly on tracking scripts

### Cloud Logging Integration Issues

If actions aren't appearing in Cloud Logging:

1. Verify `AGENT_TRACKING_CLOUD` is set to `true`
2. Check that `gcloud` CLI is available and authenticated
3. Verify the project ID is set correctly

## Further Information

For implementation details, see [AGENT_TRACKING_IMPLEMENTATION.md](./AGENT_TRACKING_IMPLEMENTATION.md).