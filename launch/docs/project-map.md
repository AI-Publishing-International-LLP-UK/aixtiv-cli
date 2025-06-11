# Aixtiv CLI Project Map

## Overview

This document provides a comprehensive map of the Aixtiv CLI ecosystem, showing key components, integration points, and features. Use this as a guide to navigate the project structure and understand how different modules relate to each other.

## Core Components

### Authentication & Security Layer (SallyPort)

```yaml
Status: ACTIVE
Key Components:
  - Principal-Agent Relationship Management
  - Resource Access Control
  - Token Management
  - Verification Services
Integration Points:
  - Firestore/Firebase Backend
  - GCP Secret Manager
  - OAuth2 Provider
```

### Symphony Interface

```yaml
Status: ACTIVE
Key Components:
  - Zero-drift Interface System
  - Error Recovery Mechanisms
  - Purchase Flow Optimization
  - Agent Fallback Systems
  - Praise Capture Mechanisms
Integration Points:
  - RIX/CRX Matrix System
  - Universal Dispatcher
  - Feedback Loops
Deployment:
  - Local: ./start-symphony-fixed.sh
  - Production: ./symphony-production-deploy.sh production
```

### RIX/CRX Matrix System

```yaml
Status: ACTIVE
Components:
  - 6 Squadrons (01-06), each with 11 pilots
  - Cross-Wing RIX (CRX) enabling multi-domain intelligence
  - 11x11x11 Matrix (1,331 total combinations)
Integration Points:
  - Squadron Leaders (Dr. Lucy, Dr. Grant, Dr. Sabina, etc.)
  - Vector Database
  - Universal Dispatcher
```

### Universal Dispatcher

```yaml
Status: ACTIVE
Components:
  - Owner-Subscriber Pattern Implementation
  - Service Bus
  - Agent Routing System
Integration Points:
  - Agent Manager
  - OAuth2 Layer
  - Pinecone Hub
  - All Service Components
Location:
  - /src/functions/universalDispatcher.js
  - /functions/universalDispatcherFunctions.js
```

### Dream Commander

```yaml
Status: ACTIVE
Features:
  - High-Volume Prompt Routing
  - Multi-Channel Ingestion
  - Intelligent Classification (SERPEW, 9-Box Grid, etc.)
  - Smart Routing to Optimal Copilots
  - Requirements Gathering
Integration Points:
  - Message Queue Systems
  - Classification Services
  - Agent Systems
Command Interface:
  - aixtiv dream status
  - aixtiv dream config
  - aixtiv dream start/stop
  - aixtiv dream message
  - aixtiv dream stats
  - aixtiv dream test
```

### Claude Orchestration

```yaml
Status: ACTIVE
Components:
  - Auto-scaling System
  - Project Management
  - Code Generation
  - Live Workflows (LinkedIn, GitHub, Claude)
  - UX Check System
  - Secret Management
Integration Points:
  - Anthropic API
  - Firestore/Firebase
  - GitHub
  - LinkedIn API
Commands:
  - claude:status
  - claude:agent:delegate
  - claude:code:generate
  - claude:live
  - claude:ux-check
  - claude:secrets
```

### Copilot System

```yaml
Status: ACTIVE
Components:
  - Copilot Relationship Management
  - Voice & Speech Capabilities
  - Speaker Recognition
  - Response Preview Panel
  - Emotion Tuning
Integration Points:
  - Google Cloud Speech APIs
  - Anthropic API
  - SallyPort Security Framework
Commands:
  - copilot:link/unlink
  - copilot:voice
  - copilot:speaker
  - copilot:preview
  - copilot:emotion
```

## Infrastructure Components

### Domain & SSL Management

```yaml
Status: ACTIVE
Components:
  - Domain Configuration
  - SSL Certificate Management
  - Firebase Hosting Integration
  - GoDaddy DNS Integration
Commands:
  - domain list
  - domain add
  - domain verify
  - domain firebase-setup
  - domain ssl-check
```

### CI/CD CTTT Pipeline

```yaml
Status: ACTIVE
Components:
  - Continuous Integration
  - Continuous Deployment
  - Comprehensive Testing
  - Telemetry Tracking
Integration Points:
  - GitHub Actions
  - Cloud Build
  - GCP Monitoring
  - Firebase
Workflows:
  - .github/workflows/*.yml
  - cloudbuild-*.yaml
```

### Pinecone Vector Database Integration

```yaml
Status: ACTIVE
Components:
  - Unified Vector Space
  - Specialized Indexes
  - Automatic Indexing
  - Semantic Routing
Files:
  - /src/functions/pinecone-integration-updated.js
  - /functions/pineconeIntegrationFunctions.js
```

## Command Structure

```
aixtiv-cli/
├── bin/
│   └── aixtiv.js            # Main entry point
├── commands/
│   ├── agent/               # Agent management
│   ├── auth/                # Authentication
│   ├── claude/              # Claude Orchestration
│   │   ├── agent/           # Agent delegation
│   │   ├── automation/      # Automation
│   │   ├── code/            # Code generation
│   │   ├── project/         # Project management
│   │   ├── ux-check.js      # UX preview tool
│   │   └── video.js         # Video generation
│   ├── copilot/             # Copilot commands
│   │   ├── speaker.js       # Speaker recognition
│   │   ├── preview.js       # Response preview panel
│   │   ├── emotion.js       # Emotion tuning
│   │   └── voice.js         # Voice capabilities
│   ├── domain/              # Domain management
│   ├── init/                # Project initialization
│   ├── nlp/                 # NLP features
│   ├── resource/            # Resource management
│   └── summon/              # Visionary summoning
└── dreamCommander.js        # Dream Commander system
```

## Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                       Aixtiv CLI                            │
└───────────────┬─────────────────┬────────────────┬─────────┘
                │                 │                │
    ┌───────────▼──────┐  ┌──────▼───────┐  ┌─────▼─────────┐
    │  Agent Manager   │  │ OAuth2 Layer │  │ Pinecone Hub  │
    └───────────┬──────┘  └──────┬───────┘  └─────┬─────────┘
                │                │                │
┌───────────────▼────────────────▼────────────────▼─────────────┐
│                        Service Bus                             │
└──────┬─────────────┬─────────────┬────────────┬───────────────┘
       │             │             │            │
┌──────▼────┐ ┌──────▼────┐ ┌─────▼────┐ ┌─────▼─────┐ ┌───────┐
│Dr. Memoria│ │ Dr. Match │ │Dr. Lucy  │ │Claude     │ │Dream   │
│LinkedIn   │ │LinkedIn   │ │GitHub App│ │Services   │ │Commander│
└───────────┘ └───────────┘ └──────────┘ └───────────┘ └───────┘
```

## New Features (Last 3 Months)

1. **Symphony Interface**

   - Zero-drift, always-on interface
   - Error recovery systems
   - Praise capture mechanisms

2. **Dream Commander**

   - High-volume prompt routing
   - Multi-channel ingestion
   - Smart classification frameworks

3. **Speaker Recognition**

   - Voice biometrics
   - Enrollment and verification
   - Speaker identification

4. **UX Check Tool**

   - Visual UI review
   - Accessibility analysis
   - Before/after comparison

5. **Copilot Response Preview**

   - Preview panel with transparency
   - "What the agent sees" view
   - Approval workflow

6. **Emotion Tuning**

   - Agent tone adjustment
   - Personalized response styling
   - Sentiment adaptation

7. **Secret Management**
   - Automated API key rotation
   - Secure credentials handling
   - Audit logging

## Contact

- Technical Lead: Phillip Roark (pr@coaching2100.com)
- Repository: github.com/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY
- Status Dashboard: anthology-ai-publishing.c2100-pr.com
