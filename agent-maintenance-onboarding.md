# Agent Maintenance Onboarding Guide

## Welcome to the Aixtiv CLI System!

This guide will help you understand how to maintain and troubleshoot the agent status system in Aixtiv CLI.

## Overview

The Aixtiv CLI includes a sophisticated agent system that:

* Shows status of various solution agents (Dr. Claude, Dr. Lucy, etc.)
* Allows delegation of tasks to these agents
* Requires regular maintenance to keep agents appearing as "available"

## Common Tasks

### Checking Agent Status

To see the status of all agents:

```bash
./bin/aixtiv.js claude:status
```

This will display a table showing all agents, their status, workload, and last active time.

### Manually Activating Agents

If agents are showing as "offline", you can manually activate them:

```bash
# Activate all agents
./bin/aixtiv.js agent:activate

# Activate a specific agent
./bin/aixtiv.js agent:activate --agent dr-claude-orchestrator
```

### Scheduled Maintenance

A cron job should be running that handles this automatically:

* Script: `scripts/maintain-agent-status.sh`
* Schedule: Every 6 hours
* Logs: Check `logs/agent-maintenance.log` for any issues

## Technical Details

### How Agent Status Works

Agent status is determined by:

1. **Recent Activity**: Agents with activity in the last 24 hours show as "available"
2. **Workload**: Agents with workload < 25% show as "available" (if recently active)
3. **Activity Records**: Stored in Firestore under the `agentActions` collection

### Key Files

* `commands/claude/status.js` - Controls status display logic
* `commands/agent/activate.js` - Implements the activation command
* `scripts/maintain-agent-status.sh` - Scheduled maintenance script

## Getting Help

If you encounter issues:

1. Check the main guide: `agent-maintenance-guide.md`
2. Review the logs: `logs/agent-maintenance.log`
3. Ask a team member who has worked with the system

Welcome to the team!
