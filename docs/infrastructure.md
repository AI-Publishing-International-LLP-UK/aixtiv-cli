# Infrastructure Overview

## 🚀 MOCOA (us-west1-a/b, eu-west1)
"Client-Facing Deployment & Live Services Environment"

### Core Purpose:
MOCOA is the execution layer of your intelligence platform — the live interface through which clients, applications, and public services access deployed agents, services, and intelligence outputs.

### Responsibilities:
- Hosting deployed RIX, QRIX, and CRX agents tailored to specific client or product needs
- Managing latency-sensitive user interactions and real-time inferencing
- Serving as the UI/API gateway and public endpoint hub
- Ensuring global availability and compliance (via eu-west1 for GDPR-aligned regions)
- Integrating load balancing, CDN, and user personalization layers

## 🧠 MOCORIX (us-west1-c)
"Intelligence Development & Real-Time Model Training Environment"

### Responsibilities:
AI model training, refinement, and staging for:
- RIX (Refined Intelligence Expert)
- QRIX (Quantum-Neared Math Simulator)
- CRX (Prescribed Companion Expert)
- Hosting testbeds, experimentation zones, and emergent behavior detection systems

## 🧠 MOCORIX2 (us-central1)
"Master Orchestration Hub & Super-Agent Governance"

### Core Purpose:
The strategic command center for all AI agents and orchestration logic — governed by Dr. Claude (dr-claude01), it houses the full 325,000-agent orchestration system.

### Responsibilities:
How the AI ecosystem evolves in real-time. This makes MOCORIX2 the AI Central Intelligence HQ.

## Summary Map

| Group    | Region/Zone | Role | Agent |
|----------|-------------|------|-------|
| MOCOA     | us-west1-a/b, eu-west1 | Client interface, live services, deployed AI agents | dr-claude02, dr-claude03, dr-claude04 |
| MOCORIX  | us-west1-c  | AI R&D and live model training (RIX, QRIX, CRX) | dr-claude05 |
| MOCORIX2 | us-central1 | Agent orchestration and super-agent governance | dr-claude01 |

