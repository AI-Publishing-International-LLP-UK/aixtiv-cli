# ASOOS Divinity Wing Interface

The ASOOS (Aixtiv Symphony Orchestrating Operating System) Divinity Wing Interface provides a comprehensive management system for the agent ecosystem, supporting lifecycle management, task tracking via Dewey Digital Cards, and integration with the S2DO workflow.

## Overview

This interface serves as the central command hub for the ASOOS system, providing:

- Agent Management across tiers 01 (Core), 02 (Deploy), and 03 (Engage)
- Dewey Digital Card tracking for agent tasks and performance
- S2DO (Scan-to-Do) workflow integration
- Claude Interface for conversational interaction

## Deployment

The interface is deployed to Firebase Hosting with multiple targets:

- Main ASOOS interface: https://api-for-warp-drive-coaching2100-com.web.app
- Anthology subdomain: https://api-for-warp-drive.web.app

## Architecture

The application follows a modular React component structure:

```
src/
├── components/
│   ├── agents/
│   │   └── AgentManager.jsx
│   ├── claude/
│   │   └── ClaudeInterface.jsx
│   └── dewey/
│       └── DeweyCard.jsx
├── styles/
│   └── main.css
├── App.jsx
└── index.js
```

## Features

### Agent Management

- View and filter agents by tier, status, and Opus assignment
- Activate/deactivate agents
- View agent performance metrics and task history

### Dewey Digital Cards

- Track agent tasks and performance
- View blockchain-backed NFT references
- Monitor task completion status

### S2DO Workflow

The S2DO workflow follows these stages:

1. Task Created → Tier 01 Core agent prototypes it
2. Task Assigned → Tier 02 Deploy agent executes
3. Task Completed → Tier 03 Engage agent humanizes, refines, delivers
4. Task Rated/Archived → Becomes part of Dewey Card memory with lifecycle tags

### Claude Interface

- Conversational interface with Dr. Claude
- Task delegation and status monitoring
- Integration with the agent ecosystem

## Development

To run the application locally:

```bash
npm install
npm start
```

To deploy updates:

```bash
npm run deploy
```

## CI/CD Pipeline

Continuous deployment is configured via GitHub Actions in `.github/workflows/deploy-asoos.yml`. The workflow automatically deploys changes to Firebase Hosting when changes are pushed to the `opus1` branch.
