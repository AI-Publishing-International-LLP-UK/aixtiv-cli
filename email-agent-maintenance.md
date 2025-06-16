Subject: New Agent Maintenance System for Aixtiv CLI

Hi Team,

We've implemented an improved agent maintenance system for the Aixtiv CLI. This update fixes the issue where agents were incorrectly showing as "offline" in the status display.

## Key Improvements

1. All agents now correctly show as "available" in the status display
2. We've added a new command: `aixtiv agent:activate` to manually update agent status
3. A scheduled maintenance task now runs every 6 hours to keep agents active

## Quick Reference

### Checking Agent Status
```bash
./bin/aixtiv.js claude:status
```

### Manually Activating Agents
```bash
# All agents
./bin/aixtiv.js agent:activate

# Specific agent
./bin/aixtiv.js agent:activate --agent dr-claude-orchestrator
```

## Documentation

For more details, please refer to the `agent-maintenance-guide.md` file in the repository.

Let me know if you have any questions!

Best regards,
[Your Name]
