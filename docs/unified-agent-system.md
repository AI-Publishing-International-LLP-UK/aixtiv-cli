# Unified Agent System Documentation

## Overview

The Aixtiv CLI Unified Agent System consolidates agent and co-pilot management into a single, coherent framework with a standardized squadron-based designation system. This new approach simplifies the mental model for users while providing a flexible and extensible system for managing all agent types.

## Key Concepts

### Squadron Designations

Agents are organized into squadrons, each with a specific focus:

| Squadron | Name | Description |
|----------|------|-------------|
| S01 | Command Squadron | Strategic oversight and mission coordination |
| S02 | Science Squadron | Research, analysis, and knowledge systems |
| S03 | Engineering Squadron | Development, deployment, and technical implementation |
| S04 | Operations Squadron | Day-to-day execution and operational management |
| S05 | Intelligence Squadron | Data intelligence, insights, and strategic recommendations |
| S06 | Support Squadron | Assistance, collaboration, and specialized support |

### Agent Types

All agents share a common schema but can be specialized with different types:

| Type | Description | Capabilities |
|------|-------------|-------------|
| BASE | Standard capability agent | Basic interaction, task execution |
| RIX | Enhanced reasoning and intelligence agent | Advanced reasoning, complex decision-making, autonomous operation |
| QRIX | Composite agent with quantum reasoning capabilities | Cross-domain integration, multi-agent orchestration, quantum reasoning |
| COPILOT | Collaborative assistant with human partnership focus | Human collaboration, assistance, augmentation |

### Agent ID Format

Agent IDs follow the format `{Squadron}-{Number}`, for example:
- `S01-01` - First agent in Command Squadron
- `S02-03` - Third agent in Science Squadron
- `S06-42` - Forty-second agent in Support Squadron

## Command Reference

### Agent Management

#### Register a New Agent

```bash
aixtiv agent:register --name "Dr. Lucy" --squadron S02 --number 1 --type RIX --description "Lead scientist" --roles "research,analysis" --collaborator "user@example.com"
```

#### Get Agent Information

```bash
aixtiv agent:get --id S02-01
```

#### List Agents

```bash
aixtiv agent:list --squadron S02 --type RIX
```

#### Update an Agent

```bash
aixtiv agent:update --id S02-01 --name "Dr. Lucy 2.0" --description "Updated scientist" --active true
```

#### Extend an Agent

```bash
aixtiv agent:extend --id S02-01 --newType QRIX --capabilities "cross-domain-analysis,system-integration"
```

### Resource Management

#### Grant Resource Access

```bash
aixtiv resource:grant --principal "user@example.com" --agent S02-01 --resource "project-123" --type readonly
```

#### Revoke Resource Access

```bash
aixtiv resource:revoke --principal "user@example.com" --agent S02-01 --resource "project-123"
```

#### Scan Resources

```bash
aixtiv resource:scan --agent S02-01
```

## Migration from Legacy System

If you're currently using the separate agent and co-pilot commands, you can migrate to the unified system using:

```bash
aixtiv agent:migrate
```

This will:
1. Convert existing agents to the unified schema (squadron S04 by default)
2. Convert co-pilots to COPILOT type agents (squadron S06 by default)
3. Preserve all relationships and access permissions
4. Maintain backward compatibility for existing scripts

## Backward Compatibility

Legacy commands will continue to work but will display deprecation warnings:

- `agent:grant` → `resource:grant`
- `agent:revoke` → `resource:revoke`
- `agent:activate` → `agent:update`
- `copilot:link` → `agent:register` with type COPILOT
- `copilot:unlink` → `agent:update`
- `copilot:list` → `agent:list` with type COPILOT
- `copilot:verify` → `agent:update`
- `copilot:grant` → `resource:grant`
- `copilot:expiration` → `agent:update`

## Examples

### Create a RIX Agent

```bash
aixtiv agent:register \
  --name "Dr. Lucy" \
  --squadron S02 \
  --number 1 \
  --type RIX \
  --description "Lead scientist for research projects" \
  --roles "research,analysis,advisor" \
  --actions "deploy data science projects,run simulations" \
  --lifecycles "project,software" \
  --sectors "Technology,Manufacturing,Food" \
  --collaborator "phillip@example.com"
```

### Create a Co-Pilot Agent

```bash
aixtiv agent:register \
  --name "Dr. Grant" \
  --squadron S06 \
  --number 1 \
  --type COPILOT \
  --description "Security advisor" \
  --roles "advisor,assistant" \
  --collaborator "user@example.com"
```

### Upgrade a Base Agent to QRIX

```bash
aixtiv agent:extend \
  --id S04-01 \
  --newType QRIX \
  --capabilities "multi-agent-orchestration,quantum-reasoning" \
  --components "agent-S02-01,agent-S03-02" \
  --coreNodes "quantum-node-1,quantum-node-2"
```

### Grant Resource Access to Multiple Agents

```bash
aixtiv resource:grant --principal "user@example.com" --agent S02-01 --resource "project-123" --type readonly
aixtiv resource:grant --principal "user@example.com" --agent S06-01 --resource "project-123" --type delegated
```

## Benefits of the Unified System

1. **Simplified Mental Model**: Users only need to understand one system instead of separate agent and co-pilot concepts
2. **Consistent Naming**: Squadron-based naming provides clear organizational structure
3. **Extensible Architecture**: Agents can evolve without re-registration
4. **Backward Compatibility**: Legacy commands continue to work while encouraging migration
5. **Enhanced Capabilities**: Unified schema supports richer metadata and relationships

