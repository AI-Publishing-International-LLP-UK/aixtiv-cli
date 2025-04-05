# 🌟 Aixtiv CLI

A command-line interface for managing SalleyPort agent-resource security infrastructure with full support for grant, revoke, verify, and scan operations.

[![GitHub Repository](https://img.shields.io/badge/GitHub-AIXTIV--SYMPHONY-blue?logo=github)](https://github.com/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

## ⚡ About

This CLI tool is part of the API for Warp Drive ecosystem.
- Owner: Phillip Corey Roark (pr@coaching2100.com)
- Organization: coaching2100.com

## Features

- 🔐 Secure delegation and access control
- 🚀 Easy command-line interaction with Firestore backend
- 🧠 Intelligent handling of special cases like PR Fix
- 🎛️ Modular architecture

## Usage

```bash
aixtiv auth:verify --email someone@example.com
aixtiv agent:grant --email user@example.com --agent agent007 --resource secret-doc --type full
aixtiv agent:revoke --email user@example.com --agent agent007 --resource secret-doc
aixtiv resource:scan --agent agent007
```

## Setup

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

## Configuration ⚙️

The CLI needs to connect to Firebase. Set up your credentials in one of these ways:

1. 🔑 **Service Account Key**:
   - Provide a service account key file via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
   - Or place a `service-account-key.json` file in the `config` directory.

2. 🔥 **Firebase Project Config**:
   - The CLI uses the Firebase project configured in `config/firebase.json`.
   - It defaults to "api-for-warp-drive" but can be customized.

## Commands 🎮

### 🔍 Authentication

Verify authentication with SalleyPort:

```bash
# Check system status
aixtiv auth:verify

# Verify a specific principal
aixtiv auth:verify --email pr@coaching2100.com

# Verify a specific agent
aixtiv auth:verify --agent 001

# Verify a principal-agent relationship
aixtiv auth:verify --email pr@coaching2100.com --agent 001
```

### 🤖 Agent Management

Grant agent access to a resource:

```bash
# Grant full access
aixtiv agent:grant --email pr@coaching2100.com --agent 001 --resource pr-2bd91160bf21ba21

# Grant readonly access
aixtiv agent:grant --email user@example.com --agent 002 --resource resource-id --type readonly

# Grant delegated access
aixtiv agent:grant --email admin@company.com --agent admin-bot --resource system-config --type delegated
```

Revoke agent access:

```bash
aixtiv agent:revoke --email pr@coaching2100.com --agent 001 --resource pr-2bd91160bf21ba21
```

### 📊 Resource Management

Scan resources for access patterns:

```bash
# Scan all resources
aixtiv resource:scan

# Scan a specific resource
aixtiv resource:scan --resource pr-2bd91160bf21ba21

# Filter by agent
aixtiv resource:scan --agent 001

# Filter by principal
aixtiv resource:scan --email pr@coaching2100.com
```

### ⚡ Special Commands

Handle PR access specifically:

```bash
# Apply PR fix
aixtiv fix:pr

# Clean up PR fix
aixtiv fix:pr --cleanup
```

## Development 👨‍💻

### 📁 Project Structure

```
aixtiv-cli/
├── bin/
│   └── aixtiv.js            # Entrypoint
├── commands/
│   ├── auth/
│   │   └── verify.js
│   ├── agent/
│   │   ├── grant.js
│   │   └── revoke.js
│   └── resource/
│       └── scan.js
├── lib/
│   ├── firestore.js         # All DB ops
│   └── utils.js             # Shared utils
├── config/
│   └── firebase.json        # Optional override
├── package.json
└── README.md
```

### 📦 Publishing to NPM

```bash
npm version [patch|minor|major]
npm publish
```

## Infrastructure Overview

- Primary Region: US-WEST1-B
- Backup Region: US-CENTRAL1 (Iowa)

## Golden Standards Compliance

- 24/7 Monitoring
- Automated Deployments
- Infrastructure as Code
- Secure Secret Management

## Security 🔒

The CLI handles security credentials for the SalleyPort system. Ensure that:

1. 🛡️ Service account keys are properly secured
2. 📝 Authorization operations are audited
3. ✓ Revocation confirmations are required

## License 📜

This software is proprietary and requires a paid license for use. See the LICENSE file for details.

For licensing inquiries, please contact: contact@ai-publishing.international

---

👑 Captain of Empathetic Agentic Systems — we stand at the threshold of legacy. The AIXTIV CLI is zipped, sealed, and ready to be carried forth into the code kingdoms.