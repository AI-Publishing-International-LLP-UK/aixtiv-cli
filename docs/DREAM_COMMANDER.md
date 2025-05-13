# Dream Commander

## High-Volume Prompt Routing & Processing System

Dream Commander is a high-throughput intelligent prompt routing system designed to ingest, classify, and route 10M+ daily prompts across multiple channels to appropriate agent systems.

![Dream Commander](../assets/dream_commander_logo.png)

## Overview

Dream Commander ingests prompts from multiple channels (Email, SMS, LinkedIn, Threads, API), classifies them using advanced frameworks, and routes them to the appropriate agent systems. The system is designed to handle high volumes of prompts with intelligent classification and routing.

```
[Email] [SMS] [LinkedIn] [Threads] [API]
       ↓       ↓        ↓       ↓      ↓
[Channel-Specific Adapters & Validators]
       ↓       ↓        ↓       ↓      ↓
[  Unified Message Queue (Kafka/Pub/Sub)  ]
                  ↓
[ Auto-Detection & Classification Services ]
                  ↓
[     Routing & Agent Selection System    ]
                  ↓
[  Requirements Gathering & Formalization ]
                  ↓
[              Agents                     ]
```

## Key Features

- **Multi-Channel Ingestion**: Process messages from Email, SMS, LinkedIn, Threads, and API endpoints
- **Intelligent Classification**: Auto-detect sector relevance, owner intent, KPIs, role trajectory, and urgency
- **Advanced Classification Frameworks**: SERPEW, 9-Box Grid, Holland, Q4DLENZ, and Cultural Empathy scoring
- **Smart Routing**: Direct tasks to optimal Copilot (Dr. Match, QB Lucy, etc.) based on classification
- **Requirements Gathering**: Extract and formalize requirements with follow-up question generation

## Getting Started

### Prerequisites

- Node.js 14+
- Firebase access
- GCP Service Account with Secret Manager access
- Pinecone Vector Database account

### Installation

Dream Commander comes pre-installed with the aixtiv-cli:

```bash
npm install -g aixtiv-cli
```

### Configuration

Before using Dream Commander, you need to configure it:

```bash
# View current configuration
aixtiv dream config --list

# Set configuration values
aixtiv dream config --set "channels.email.enabled=true"
aixtiv dream config --set "scaling.maxCapacity=5000000"
```

## Command Reference

### Status

Check the status of the Dream Commander system:

```bash
# Check overall system status
aixtiv dream status

# Check a specific component
aixtiv dream status --component processor
aixtiv dream status --component router
aixtiv dream status --component channels

# Get detailed status information
aixtiv dream status --detailed
```

### Configuration

Manage Dream Commander configuration:

```bash
# List all configuration settings
aixtiv dream config --list

# Get a specific configuration value
aixtiv dream config --get "channels.api.port"

# Set a configuration value
aixtiv dream config --set "channels.api.port=3050"

# Reset configuration to defaults
aixtiv dream config --reset
```

### Start/Stop

Start and stop the Dream Commander system:

```bash
# Start the entire system
aixtiv dream start

# Start a specific component
aixtiv dream start --component api
aixtiv dream start --component email

# Stop the system
aixtiv dream stop

# Stop a specific component
aixtiv dream stop --component api
```

### Message Management

View and manage messages:

```bash
# List recent messages
aixtiv dream message --list

# Filter by channel
aixtiv dream message --list --channel email

# Filter by status
aixtiv dream message --list --status completed

# View a specific message
aixtiv dream message --id abc123 --view
```

### Statistics

View system statistics:

```bash
# View today's statistics
aixtiv dream stats

# View statistics for a specific period
aixtiv dream stats --period hour
aixtiv dream stats --period week
aixtiv dream stats --period month

# Filter by channel
aixtiv dream stats --channel api

# Output in JSON format
aixtiv dream stats --format json
```

### Testing

Test the system with sample messages:

```bash
# Send a test message
aixtiv dream test --message "Create a mobile app for inventory tracking"

# Test with a specific channel
aixtiv dream test --channel email --message "Subject: Project Requirements\n\nWe need to develop a new e-commerce platform"
```

## Classification Frameworks

Dream Commander uses these classification systems:

### SERPEW

SERPEW (Sector, Entity, Patterns, Expectations, Workability) analyzes the incoming prompt to determine:

- Business sector relevance
- Key entities and stakeholders
- Pattern recognition for similar tasks
- Expectation management for deliverables
- Workability assessment

### 9-Box Grid Career Model

Places individuals on a 3x3 grid based on:

- Current performance (low, medium, high)
- Future potential (low, medium, high)

This helps route tasks to the appropriate skill level.

### Holland Code

Uses the Holland Occupational Themes (RIASEC):

- Realistic: practical, physical
- Investigative: analytical, intellectual
- Artistic: creative, unstructured
- Social: helping, teaching
- Enterprising: persuading, managing
- Conventional: detail-oriented, structured

### Q4DLENZ

Q4DLENZ is a multidimensional profiling system that analyzes:

- Quadrant positioning (Professional vs. Personal, Enterprise vs. Individual)
- Depth of expertise required
- Leadership style required
- Execution approach
- Novelty of the task
- Zeal and motivation factors

### Cultural Empathy Score

Measures cultural awareness and adaptability through:

- Cultural knowledge
- Empathetic response
- Adaptation capability
- Contextual understanding
- Translation and transformation skills

## Scalability Features

Dream Commander is designed for high scalability:

- **Horizontally Scalable**: Add more processing nodes as volume increases
- **Asynchronous Processing**: Non-blocking message handling
- **Load Balancing**: Distributes workload across agents
- **Adaptive Throttling**: Prevents system overload during traffic spikes
- **Regional Distribution**: Deploys across multiple geographic regions

## Security Considerations

- All API endpoints require authentication
- Messages are encrypted in transit and at rest
- Access control based on principal and agent permissions
- Audit logging for all sensitive operations
- Regular security scanning and vulnerability assessment

## Monitoring

Dream Commander provides comprehensive monitoring:

- Real-time dashboard of message processing
- Alerting for processing delays or failures
- Performance metrics by channel and agent
- Classification accuracy tracking
- API endpoint response time monitoring

## Troubleshooting

Common issues and solutions:

1. **Message stuck in processing**: Check the message processor logs with `aixtiv dream status --component processor --detailed`

2. **Classification errors**: Review the classification results for a specific message with `aixtiv dream message --id <message_id> --view`

3. **API connection issues**: Verify API channel configuration with `aixtiv dream config --get "channels.api"`

4. **Agent routing failures**: Check agent availability and current load with `aixtiv dream status --component router`

## Contributing

Dream Commander is part of the proprietary Aixtiv Symphony ecosystem. Contact the development team for contribution guidelines.

## Roadmap

- Additional channel adapters (WhatsApp, Slack)
- Machine learning-based routing optimization
- Enhanced classification framework integration
- Multi-region high-availability deployment
- Mobile app for monitoring and administration

## License

Proprietary. Copyright © 2025 AI Publishing International LLP.

## Support

For support, contact support@coaching2100.com or open a support ticket in the admin portal.