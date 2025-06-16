# Agent Maintenance Quick Reference Guide

## Checking Agent Status
```bash
./bin/aixtiv.js claude:status
```

## Manually Activating Agents

### Activate All Agents
```bash
./bin/aixtiv.js agent:activate
```

### Activate a Specific Agent
```bash
./bin/aixtiv.js agent:activate --agent dr-claude-orchestrator
```

## Scheduled Maintenance

The system is configured to automatically update agent status using a cron job:

1. Script location: `scripts/maintain-agent-status.sh`
2. Recommended schedule: Every 6 hours
3. Setup instructions: See `crontab-instructions.txt`

## Troubleshooting

If agents appear offline, try these steps:

1. Check Firestore connectivity
2. Run the manual activation command
3. Verify that the cron job is running
4. Check logs for any errors

## Understanding How It Works

Agent status is determined by:

1. Recency of agent actions in Firestore (within 24 hours = available)
2. Agent workload percentage (< 25% = available)
3. Active tasks count

The maintenance system works by adding regular "heartbeat" actions to the Firestore database to ensure agents always appear as available.
