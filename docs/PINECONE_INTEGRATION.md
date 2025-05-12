# Pinecone Integration Guide

## Overview

This document provides guidance for the Pinecone vector database integration with the Aixtiv CLI system. The integration enables semantic search capabilities across prompts, memories, and agent outputs within the Universal Dispatcher and memory systems.

## Components

The Pinecone integration consists of the following components:

1. **Core Integration Module** (`src/functions/pinecone-integration-updated.js`)
   - Handles embedding generation via OpenAI or Vertex AI
   - Manages Pinecone index creation and queries
   - Provides vector storage and retrieval functions

2. **Secret Management** (`src/services/secrets/`)
   - Securely accesses API keys from GCP Secret Manager
   - Provides fallback to local configuration files
   - Manages credentials for multiple AI providers

3. **Provider Factory** (`src/services/secrets/provider-factory.js`)
   - Creates configured API clients for different providers
   - Supports OpenAI, Anthropic, Pinecone, and Vertex AI
   - Implements embedding generation for different providers

4. **Firebase Functions** (`functions/pineconeIntegrationFunctions.js`)
   - Exposes HTTP endpoints for Pinecone operations
   - Provides Firestore triggers for automatic indexing
   - Implements scheduled jobs for index maintenance

## Configuration

### Required API Keys

- **Pinecone API Key**: Stored in GCP Secret Manager as `pineconeconnect`
- **OpenAI API Key**: Stored in GCP Secret Manager as `dr-lucy-openai-key` or `openai-api-key`
- **Vertex AI Key**: Stored in GCP Secret Manager as `gemini_api_project_key`

### Environment Settings

- **Pinecone Environment**: `us-west1-gcp` (default)
- **Vector Dimension**: 1536 (for OpenAI ada-002 embeddings)

## Integration with Other Systems

### Universal Dispatcher

The Pinecone integration enhances the Universal Dispatcher by:

1. Providing semantic routing based on similarity to previous requests
2. Enabling content-aware dispatching to appropriate agents
3. Supporting contextual recommendations based on semantic search

### Memory System

The memory system uses Pinecone to:

1. Store vector embeddings of session memories
2. Enable semantic search across user interactions
3. Support the bonded copilot reference system

### Dr. Match Agent

Dr. Match utilizes Pinecone to:

1. Find semantically similar past brainstorming sessions
2. Leverage vector search for contextual recommendations
3. Enable knowledge continuity across sessions

## Usage Examples

### Store a Memory

```javascript
const pineconeIntegration = require('../src/functions/pinecone-integration-updated');

await pineconeIntegration.storeMemoryInPinecone({
  content: "User request about marketing strategy",
  userId: "user123",
  sessionId: "session456",
  copilotId: "dr-match",
  type: "user_input",
  category: "marketing",
  importance: 7
});
```

### Search for Similar Content

```javascript
const pineconeIntegration = require('../src/functions/pinecone-integration-updated');

const results = await pineconeIntegration.searchSimilarMemories(
  "Strategy for marketing to enterprise customers",
  { userId: "user123" },
  5
);
```

## Deployment Notes

1. Ensure GCP Secret Manager has the necessary API keys configured
2. Deploy Firebase Functions to expose HTTP endpoints
3. Verify Pinecone indexes are created properly
4. Test semantic search functionality

## Troubleshooting

- **API Key Issues**: Verify key availability in GCP Secret Manager
- **Embedding Generation Errors**: Check OpenAI or Vertex AI API access
- **Search Not Returning Results**: Verify index existence and content

## Security Considerations

- All API keys are stored in GCP Secret Manager
- Local fallback configurations should not contain production keys
- API requests are authenticated via Firebase Auth

(c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
Developed with assistance from the Pilots of Vision Lake and
Claude Code Generator. This is Human Driven and 100% Human Project
Amplified by attributes of AI Technology.