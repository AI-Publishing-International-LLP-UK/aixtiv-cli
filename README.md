# Aixtiv CLI

Command Line Interface for SallyPort Security Management and MCP servers.

## Security Notice - CVE-2024-45337

This CLI includes security fixes for the critical SSH authentication bypass vulnerability (CVE-2024-45337) affecting ModelContextProtocol servers.

### Security Tools

- `./macos-ssh-security.sh` - Apply security fixes for local MacOS environment and generate instructions for remote instances
- `./mcp-security-detector.sh` - Check systems for the vulnerability and detect exploitation attempts
- `cat gcp-fix-instructions.txt` - Instructions for securing GCP instances

## Installation

```
cd /Users/as/asoos/aixtiv-cli
chmod +x bin/aixtiv.js
```

Add to your shell for easy access:
```
alias aixtiv='cd /Users/as/asoos/aixtiv-cli && node bin/aixtiv.js'
```

## Commands

Use the following command to see all available options:

```
aixtiv --help
```

### MCP Server Security Management

```
aixtiv mcp:security --check    # Check for security vulnerabilities
aixtiv mcp:security --patch    # Apply security patches
aixtiv mcp:security --monitor  # Set up security monitoring
```

## Integration Gateway

The Integration Gateway serves as a central control system for domain management, hosting configuration, and security in the Aixtiv Symphony ecosystem.

### Multi-Site Hosting Management

- Centralized Configuration: Manages multiple domains through a single firebase.json configuration
- Dynamic Site Generation: Automatically creates site configurations for new domains
- Special Character Support: Handles international domains with non-ASCII characters using punycode
- Consistent Security Headers: Applies standardized security policies across all sites

### Domain Management System

- Site ID Mapping: Maintains a robust mapping between domain names and Firebase site IDs
- DNS Configuration: Integrates with GoDaddy API for automated DNS record management
- Batch Processing: Processes large numbers of domains efficiently while respecting rate limits
- Error Recovery: Implements sophisticated error handling with automatic retries for failed operations

### Security Framework

- Content Security Policy: Implements robust CSP headers to prevent XSS attacks
- SSL Management: Automates certificate provisioning and renewal
- Certificate Monitoring: Provides alerts for expiring SSL certificates
- Security Headers: Configures X-Frame-Options, X-Content-Type-Options, and other security headers

## Support

For help with the Aixtiv CLI, contact the Symphony support team.

# Aixtiv CLI

The Aixtiv Command Line Interface for Symphony Orchestrating Operating System (ASOOS) management.

## Features

- SallyPort Security Management
- Agent Orchestration and Management
- Domain Management
- Dr. Claude Integration
- Dream Commander Integration
- S2DO Blockchain Governance

## Installation

```bash
npm install -g aixtiv-cli
```

## New Unified Agent System

The Aixtiv CLI now features a unified agent system that consolidates agent and co-pilot management into a single, coherent framework with a standardized squadron-based designation system.

### Quick Start with Unified Agents

```bash
# Register a new agent
aixtiv agent:register --name "Dr. Lucy" --squadron S02 --number 1 --type RIX

# List all agents
aixtiv agent:list

# Grant resource access
aixtiv resource:grant --principal "user@example.com" --agent S02-01 --resource "project-123"
```

See the [Unified Agent System Documentation](./docs/unified-agent-system.md) for more details.

## Legacy Commands

### Authentication

```bash
aixtiv auth:verify --email user@example.com
```

### Agent Management (Legacy)

```bash
# Grant agent access
aixtiv agent:grant -e user@example.com -a 001 -r resource-123 -t full

# Revoke agent access
aixtiv agent:revoke -e user@example.com -a 001 -r resource-123

# Activate agents
aixtiv agent:activate
```

### Co-pilot Management (Legacy)

```bash
# Link a co-pilot
aixtiv copilot:link -e user@example.com -c lucy

# List co-pilots
aixtiv copilot:list -e user@example.com

# Grant co-pilot access
aixtiv copilot:grant -e user@example.com -c lucy -r resource-123 -t readonly
```

### Domain Management

```bash
# Manage domains
aixtiv domain:manage --action list

# Configure SSL
aixtiv domain:ssl --action verify --domain example.com
```

### Dr. Claude

```bash
# Delegate a project
aixtiv claude:agent:delegate -p "Project Name" -d "Project description"

# Generate code
aixtiv claude:code:generate -t "Create a React component"

# Check agent status
aixtiv claude:status
```

## Configuration

The CLI uses the following environment variables:

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `AIXTIV_API_KEY`: API key for Aixtiv services

## License

Copyright © 2025 Aixtiv Inc. All rights reserved.

# 🌟 Aixtiv CLI - Symphony Orchestration System

A command-line interface for managing the Aixtiv Symphony ecosystem, providing RIX/CRX orchestration, Pinecone vector database integration, and CI/CD CTTT pipeline connectivity.

[![GitHub Repository](https://img.shields.io/badge/GitHub-AIXTIV--SYMPHONY-blue?logo=github)](https://github.com/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![CI/CD CTTT](https://img.shields.io/badge/CI%2FCD-CTTT%20Enabled-blue.svg)](https://github.com/aixtiv/aixtiv-cli/actions)
[![Version](https://img.shields.io/badge/version-1.0.3-orange.svg)](package.json)

## ⚡ About

Aixtiv CLI is the unified orchestration layer for the Aixtiv Symphony System, providing seamless integration between RIX/CRX agents, Pinecone vector database, and CI/CD CTTT pipeline.

- Owner: Phillip Corey Roark (pr@coaching2100.com)
- Organization: coaching2100.com

## 🚀 Features

- 🔐 Secure delegation and access control
- 🚀 CI/CD CTTT (Continuous Integration/Deployment with Comprehensive Testing and Telemetry Tracking)
- 🧠 RIX/CRX Matrix System (11x11x11 = 1,331 combinations)
- 🔍 Pinecone vector database integration for semantic search
- 📊 Universal Dispatcher with Owner-Subscriber pattern
- 🌐 Domain management with Firebase and GCP integration
- 🤖 Claude Orchestration Auto Scaling for intelligent resource management
- 🎼 Symphony Interface - Zero-drift, always-on, bonded-agent-powered interface
- 🔑 GCP Secret Manager integration with automated API key rotation
- 🚨 Dream Commander - High-volume prompt routing and processing system
- 📈 Comprehensive feedback loops for continuous improvement

## 🏛️ Architecture Overview

### RIX/CRX Matrix System (11x11x11 = 1,331 combinations)

The Registered Intelligence Experts (RIX) system organizes agents in an 11x11x11 matrix, with Cross-Wing RIX (CRX) enabling multi-domain intelligence. The system includes:

- **6 Squadrons** (01-06) each with 11 pilots
- **Squadron Leaders**:
  - **Squadron 01**: Dr. Lucy RIX - Organizational Innovation, Advancing Tech Solutions
  - **Squadron 02**: Dr. Grant - Security and Authentication
  - **Squadron 03**: Dr. Sabina - Service, Support and Sales Customer Sciences Leadership
  - **Squadron 04**: Dr. Claude - RIX and Solving Significant Challenges and Excellence in Performance + Orchestrations
  - **Squadron 05**: Dr. Maria - Healthy Workforce Aging, Softskills, CRX Development, Testing and Quality Assurance
  - **Squadron 06**: Dr. Cypriot - Co-pilot Consistency and compliance with S2D0, AIRewards

### Universal Dispatcher

The central nervous system of Aixtiv CLI, implementing the Owner-Subscriber pattern:

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
│Dr. Memoria│ │ Dr. Match │ │Dr. Lucy  │ │Claude     │ │More    │
│LinkedIn   │ │LinkedIn   │ │GitHub App│ │Services   │ │Services│
└───────────┘ └───────────┘ └──────────┘ └───────────┘ └───────┘
```

### CI/CD CTTT Integration

Fully integrated CI/CD pipeline with Comprehensive Testing and Telemetry Tracking:

- **Continuous Integration**: Automated builds and tests on each commit
- **Continuous Deployment**: Automated deployment to staging and production
- **Comprehensive Testing**: Unit, integration, and end-to-end tests
- **Telemetry Tracking**: Performance monitoring and usage analytics
- **Real-time Health Checks**: Monitoring of all system components

### Pinecone Vector Database Integration

Aixtiv CLI seamlessly integrates with Pinecone for vector search capabilities:

- **Unified Vector Space**: All agents contribute to and query from shared vector namespace
- **Specialized Indexes**: Dedicated indexes for different data types and agent functions
- **Automatic Indexing**: Firestore triggers automatically update vector database
- **Semantic Routing**: Content-aware dispatching based on similarity

### Feedback Loop System

The system implements advanced feedback loops:

1. **Collection Phase**: Gather data from all sources
2. **Processing Phase**: Agent-specific processing and enrichment
3. **Embedding Phase**: Vector embedding generation
4. **Storage Phase**: Structured storage in Firestore and Pinecone
5. **Query Phase**: Semantic search and retrieval
6. **Feedback Phase**: User feedback collection and performance metrics

## Symphony Interface

The Symphony Interface provides a zero-drift, always-on, bonded-agent-powered interface that makes users feel heard, helped, and impressed — even on their first visit. It features:

- 🔄 Error recovery systems
- 💰 Optimized purchase flow
- 👏 Praise capture mechanisms
- 🤖 Agent fallback systems

To launch the Symphony Interface locally:

```bash
# Install dependencies
./install-symphony-deps.sh

# Start the Symphony interface
./start-symphony-fixed.sh
```

Then visit http://localhost:3030 in your browser.

For production deployment:

```bash
./symphony-production-deploy.sh production
```

For detailed information, see the [Symphony Implementation Guide](SYMPHONY_IMPLEMENTATION_GUIDE.md)

## 🛠️ Usage

### Basic Commands

```bash
aixtiv auth:verify --email someone@example.com
aixtiv agent:grant --email user@example.com --agent agent007 --resource secret-doc --type full
aixtiv agent:revoke --email user@example.com --agent agent007 --resource secret-doc
aixtiv resource:scan --agent agent007
```

### Setup

Install dependencies:

```bash
npm install
```

Set environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./config/service-account-key.json
```

Run CLI:

```bash
node bin/aixtiv.js
```

## 🔍 Commands Reference

### Authentication

```bash
# Check system status
aixtiv auth:verify

# Verify a specific principal
aixtiv auth:verify --email pr@coaching2100.com
```

### Agent Management

```bash
# Grant full access
aixtiv agent:grant --email pr@coaching2100.com --agent 001 --resource pr-2bd91160bf21ba21

# Grant readonly access
aixtiv agent:grant --email user@example.com --agent 002 --resource resource-id --type readonly

# Revoke agent access
aixtiv agent:revoke --email pr@coaching2100.com --agent 001 --resource pr-2bd91160bf21ba21
```

### Co-Pilot Management

```bash
# Link a co-pilot to a principal
aixtiv copilot:link --email pr@coaching2100.com --copilot lucy

# List all co-pilots
aixtiv copilot:list

# Verify co-pilot for higher access levels
aixtiv copilot:verify --email lucy@drlucy.live --principal pr@coaching2100.com
```

### Claude Orchestration

```bash
# Check Claude Orchestration status
aixtiv claude:status

# View auto-scaling metrics
aixtiv claude:metrics

# Execute live workflows with real API integrations
aixtiv claude:live --workflow linkedin --userId user123 --accessToken token123
aixtiv claude:live --workflow github --userId user123 --accessToken token123 --repository owner/repo-name
aixtiv claude:live --workflow claude --userId user123 --prompt "Generate a blog post about AI" --format markdown
```

The `claude:live` command connects with:

- LinkedIn for profile/post indexing in Pinecone
- GitHub for repository analysis
- Claude AI for content generation

For detailed information, see the [Claude Orchestration documentation](docs/CLAUDE_ORCHESTRATION.md).

### Pinecone Integration

```bash
# Check Pinecone connection status
aixtiv pinecone:status

# Show Pinecone usage statistics
aixtiv pinecone:stats

# Search across all Pinecone indexes
aixtiv pinecone:search "Marketing strategy for enterprise customers"

# Get index information
aixtiv pinecone:index aixtiv-memories
```

### Unified Search

```bash
# Search across all knowledge
aixtiv search "Customer retention strategies"

# Search LinkedIn knowledge
aixtiv search:linkedin "B2B marketing tactics"

# Search GitHub knowledge
aixtiv search:github "Authentication best practices"
```

### Domain and SSL Management

```bash
# List all domains
aixtiv domain list

# Add a new domain
aixtiv domain add drclaude.live --type character --firebase-project dr-claude-live

# Verify domain configuration
aixtiv domain verify drclaude.live

# Check SSL certificate status for a domain
aixtiv domain ssl-check drclaude.live
```

### CI/CD CTTT Commands

```bash
# Check CI/CD pipeline status
aixtiv cicd:status

# View latest build status
aixtiv cicd:build:status

# View test coverage
aixtiv cicd:test:coverage

# View telemetry dashboard
aixtiv cicd:telemetry:dashboard

# Run all tests
aixtiv cicd:test:run

# Analyze code quality
aixtiv cicd:analyze:code
```

### Secret Management with CI/CD CTTT Integration

```bash
# List all secrets in the project
aixtiv claude:secrets -a list -p api-for-warp-drive

# Create a new secret
aixtiv claude:secrets -a create -i my-secret -p api-for-warp-drive --value "my-secret-value"

# Rotate a service account key
aixtiv claude:secrets -a rotate-sa-key -i sa-key-secret -p api-for-warp-drive -s service-account@api-for-warp-drive.iam.gserviceaccount.com

# Rotate an API key
aixtiv claude:secrets -a rotate-api-key -i api-key-secret -p api-for-warp-drive -k my-api-key

# View CI/CD CTTT status for key rotation
aixtiv cicd:status --component key-rotation

# Trigger a manual key rotation with CTTT integration
aixtiv cicd:trigger key-rotation --environment production

# Verify keys after rotation
aixtiv cicd:verify:keys
```

For detailed information on GCP Secret Manager integration, see the [GCP Secret Manager documentation](docs/GCP_SECRET_MANAGER.md).

## 📊 Monitoring and Metrics

The system tracks comprehensive metrics:

- `responseTimeAverage`: Speed of response processing
- `userSatisfactionScore`: User satisfaction rating
- `taskCompletionRate`: Percentage of tasks successfully completed
- `interactionQualityScore`: Quality of agent interactions
- `memoryAccuracyScore`: Accuracy of memory retrievals
- `goalAlignmentScore`: Alignment with user objectives
- `agentCollaborationScore`: Effectiveness of multi-agent collaboration

## 📁 Project Structure

```
aixtiv-cli/
├── bin/
│   └── aixtiv.js            # Entrypoint
├── commands/
│   ├── init/                # Project initialization
│   │   └── index.js
│   ├── auth/
│   │   └── verify.js
│   ├── agent/
│   │   ├── grant.js
│   │   └── revoke.js
│   ├── domain/              # Domain management
│   │   ├── index.js
│   │   ├── manage.js
│   │   └── ssl.js
│   ├── resource/
│   │   └── scan.js
│   ├── claude/              # Claude Orchestration
│   │   ├── status.js
│   │   ├── metrics.js
│   │   ├── config.js
│   │   ├── logs.js
│   │   ├── live.js         # Live workflow orchestration
│   │   └── agent/          # Agent delegation
│   │       └── delegate.js
│   └── copilot/             # Co-pilot commands
│       ├── link.js
│       ├── unlink.js
│       ├── list.js
│       ├── verify.js
│       └── grant.js
├── lib/
│   ├── firestore.js         # All DB ops
│   ├── telemetry/           # Telemetry tracking
│   │   └── index.js
│   └── agent-tracking.js    # Agent tracking
├── src/
│   ├── functions/           # Core functionality
│   │   ├── universalDispatcher.js
│   │   └── pinecone-integration-updated.js
│   ├── services/            # Service integration
│   │   ├── rix-crx/         # RIX/CRX service
│   │   │   └── index.js
│   │   └── secrets/         # Secret management
│   └── session_memory/      # Memory templates
│       └── universal_agent_trace_template.json
├── functions/               # Firebase functions
│   ├── pineconeIntegrationFunctions.js
│   └── universalDispatcherFunctions.js
├── scripts/
│   └── domain-ssl-check.sh  # SSL certificate checker
├── docs/
│   ├── CLAUDE_ORCHESTRATION.md
│   ├── PINECONE_INTEGRATION.md
│   ├── AGENT_LINKEDIN_PINECONE_INTEGRATION.md
│   └── RIX_CRX_STRUCTURE.md
├── config/
│   └── firebase.json        # Optional override
├── package.json
└── README.md
```

## 🔒 Security

- All API keys stored in GCP Secret Manager
- Vector namespace isolation for data separation
- Agent-specific credential management
- Regular token rotation
- Access control and audit logging

## 📜 License

© 2025 Copyright AI Publishing International LLP. All Rights Reserved.

Developed with assistance from the Pilots of Vision Lake and Claude Code Generator. This is Human Driven and 100% Human Project Amplified by attributes of AI Technology.
