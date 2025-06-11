# Dr. Claude Command Suite

## Overview

The Dr. Claude Command Suite provides a comprehensive set of tools for project management, GitHub automation, code generation, and blockchain governance within the Aixtiv CLI ecosystem. This suite enhances agent orchestration capabilities and provides better integration with external services.

## Components

### Authentication and Security

- OAuth2 CLI tools for secure authentication
- SAML SSO integration
- Security documentation and templates

### Google Drive Integration

- Service account integration
- Deployment scripts
- Coaching2100 setup utilities

### Core Protocols

- Memory system implementation
- S2DO governance system with blockchain verification
- Compliance tracking and certification

### Deployment

- Deployment reporting
- Emergency fixes
- CI/CD integration

### Blockchain Governance

- S2DO protocol integration
- Verifiable workflow execution
- Compliance certification
- Tamper-proof audit trails

## Usage

The Dr. Claude Command Suite can be accessed through the Aixtiv CLI using various commands related to agents, automation, orchestration, and governance.

## Files and Directories

- `oauth2-cli/`: Authentication and security utilities
- `integrations/google-drive/`: Google Drive integration components
- `core-protocols/memory-system/`: Memory system implementation
- `core-protocols/s2do/`: S2DO governance system with blockchain verification
- `functions/drive-integration/`: Cloud functions for Drive integration
- `emergency-fixes/`: Quick fixes for critical issues
- `patches/`: Git patches for common operations
- `commands/claude/governance/`: S2DO governance integration commands

## Documentation

Additional documentation can be found in:

- `dr-claude-services.md`: Service access guide
- `docs/CLAUDE_S2DO_INTEGRATION.md`: S2DO governance integration
- `deployment-report.md`: Deployment status
- `deployment-final-report.md`: Deployment summary

## S2DO Blockchain Governance

The S2DO blockchain governance integration allows Dr. Claude to create, approve, and verify blockchain-backed governance workflows. Key commands include:

### Create Governance Workflow

```bash
aixtiv claude:governance:s2do -w "Workflow Name" -d "Description" -s "Step1,Step2,Step3"
```

### Approve Workflow Step

```bash
aixtiv claude:governance:approve -w workflow-id -s step-id
```

### Verify Blockchain Integrity

```bash
aixtiv claude:governance:verify -w workflow-id --detailed
```

This integration ensures all agent activities are properly governed, tracked, and verifiable through blockchain technology.

For more details on the S2DO governance integration, see `docs/CLAUDE_S2DO_INTEGRATION.md`.
