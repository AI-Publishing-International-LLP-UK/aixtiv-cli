# Agent Tracking Implementation

This document details the implementation of the Agent Tracking system for the Aixtiv Symphony ecosystem, allowing comprehensive monitoring and attribution of actions performed by various agents (both human and AI).

## Overview

The Agent Tracking system records all actions performed by agents with proper attribution, enabling:

- Complete audit trail of all system changes
- Attribution of actions to specific agents
- Performance monitoring of automated agents
- Security compliance and operational traceability

## Implementation Components

### 1. JavaScript Library (`lib/agent-tracking.js`)

Core tracking library for Node.js applications including:

- `logAgentAction(action, details)`: Records an action with attribution
- `getCurrentAgentId()`: Retrieves the current agent identifier
- `setAgentId(agentId)`: Sets the current agent identifier
- `requireAgentId()`: Express middleware to require agent identification
- `withAgentAttribution(fn, actionName)`: Higher-order function wrapper for tracking

### 2. Shell Script Integration (`bin/agent-tracking.sh`)

Bash script for integrating agent tracking in shell scripts:

- `log_agent_action <action_type> <description>`: Records an action from a shell script
- Environment variable support (`AGENT_ID`)
- Local logging with timestamp and structured format
- Optional Cloud Logging integration

### 3. Python Implementation (`automation/agent_tracking.py`)

Python library for CI/CD pipelines and automation scripts:

- `log_agent_action(action_type, description)`: Records an action in Python
- Integration with BigQuery for analytics
- Integration with Cloud Logging for centralized logs

### 4. Firestore Database Schema

The system uses Firebase Firestore for storing action records:

```
Collection: agentActions
Document: <auto-id>
Fields:
  - timestamp: Timestamp
  - performed_by: String (agent ID)
  - action: String
  - details: Map
  - status: String (success, failed, etc.)
  - duration_ms: Number (optional)
```

### 5. Setup Script (`scripts/setup-agent-tracking.sh`)

This script sets up the agent tracking system:

- Creates necessary directories
- Configures environment variables
- Installs dependencies
- Sets up Cloud Logging integration
- Initializes Firestore with the proper schema

## Agent Identification

Agents are identified using the following convention:

| Agent Type | ID Format | Example |
|------------|-----------|---------|
| Human Operators | `HUMAN-<name>` | `HUMAN-ADMIN` |
| AI Assistants | `<provider>-Agent-<number>-<name>` | `ANTHROPIC-AGENT-01-CLAUDE` |
| CI/CD Systems | `CI-<system>-<job>` | `CI-GITHUB-BUILD` |
| Custom Tools | `TOOL-<name>` | `TOOL-DOMAIN-SCANNER` |

## Integration Points

The agent tracking system integrates with:

1. **CLI Commands**: All CLI commands automatically track agent activity
2. **CI/CD Pipelines**: GitHub Actions and Cloud Build workflows
3. **Infrastructure Automation**: Terraform and deployment scripts
4. **API Requests**: Express middleware for API attribution

## Usage Examples

### JavaScript Usage

```javascript
const { logAgentAction } = require('../lib/agent-tracking');

async function deployService() {
  await logAgentAction('deploy_start', { service: 'api-gateway' });
  
  try {
    // Deployment logic
    await logAgentAction('deploy_complete', { status: 'success' });
  } catch (error) {
    await logAgentAction('deploy_failed', { error: error.message });
    throw error;
  }
}
```

### Bash Script Usage

```bash
#!/bin/bash
source "$(dirname "$0")/../bin/agent-tracking.sh"

# Set agent ID for this script
export AGENT_ID="DEPLOYMENT_SCRIPT"

log_agent_action "deployment_start" "Starting deployment of API Gateway"

# Deployment commands
kubectl apply -f deployment.yaml

log_agent_action "deployment_complete" "Deployment completed successfully"
```

### Python Usage

```python
from automation.agent_tracking import log_agent_action

def train_model(model_name):
    log_agent_action("model_training_start", f"Starting training for {model_name}")
    
    # Training logic
    
    log_agent_action("model_training_complete", f"Training completed for {model_name}")
```

## Data Retention and Privacy

- Agent action logs are retained for 90 days
- Personal identification information is minimized
- Access to logs is restricted to administrators
- Regular audit of log access is performed

## Implementation Checklist

- [x] Core JavaScript library
- [x] Bash script integration
- [x] Python implementation
- [x] Firestore schema design
- [x] Setup script
- [x] Integration with CLI
- [x] Integration with CI/CD
- [ ] Integration with Vertex AI
- [ ] Dashboard for monitoring agent activity
- [ ] Anomaly detection for agent behavior

## Future Enhancements

1. **Real-time Monitoring Dashboard**: Web UI for visualizing agent activity
2. **Agent Performance Metrics**: Analytics on agent effectiveness
3. **Anomaly Detection**: Automated detection of unusual agent behavior
4. **Role-Based Access Control**: Granular permissions for agent operations
5. **Agent Collaboration Framework**: Support for multi-agent collaborations

## References

- [AGENT_TRACKING.md](./AGENT_TRACKING.md) - User documentation
- [GitHub CI/CD Integration](../workflows/github-ci-cd-pipeline.yaml)
- [Cloud Build Integration](../cloudbuild-ci-cttt.yaml)
- [Terraform Infrastructure](../terraform/agent-tracking/main.tf)