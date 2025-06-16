# Aixtiv CLI: Mock-to-Production Implementation Plan

## Overview
This implementation plan outlines the step-by-step process for transitioning the Aixtiv CLI from mock implementations to production-ready real service calls. The plan preserves Pinecone as the vector database while ensuring all simulations, fake delays, and hardcoded responses are replaced with real API calls, database interactions, and service integrations.

## 1. Systematic Approach for Identifying and Replacing Mock Code

### 1.1 Codebase Audit and Inventory
- [ ] Create a complete inventory of mock implementations using grep:
  ```bash
  grep -r "mock\|setTimeout\|simulate" --include="*.js" .
  ```
- [ ] Categorize mock code by function type:
  - Authentication and security (SallyPort)
  - Agent orchestration (Wing, Claude)
  - Domain management
  - Data storage operations
  - API calls

### 1.2 Prioritization Matrix
| Priority | Component | Reason | Files |
|----------|-----------|--------|-------|
| 1 | Core Auth & Firestore | Foundation for all other services | `lib/firestore.js`, `lib/agent-tracking.js` |
| 2 | SallyPort | Security framework required by other modules | `src/cli/commands/sallyport/index.js` |
| 3 | Claude Code & Automation | Key user-facing features | `commands/claude/code/generate.js` |
| 4 | Domain Management | Critical for production deployment | `commands/domain/index.js` |
| 5 | Wing & Agent Orchestration | Advanced features | `src/cli/next-gen-aixtiv.js` |

### 1.3 Replacement Strategy for Each Component Type

#### 1.3.1 Mock API Calls → Real API Clients
- Replace all `mockFunction` implementations with real API clients
- Create proper API client wrappers with:
  - Authentication
  - Error handling
  - Retry logic
  - Rate limiting
  - Logging

Example pattern:
```javascript
// FROM:
async function mockFunction() {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, data: {...} };
}

// TO:
async function realFunction(params) {
  try {
    const response = await apiClient.post('/endpoint', params);
    return response.data;
  } catch (error) {
    logger.error('API call failed', error);
    throw new ApiError('Operation failed', error);
  }
}
```

#### 1.3.2 Simulated Delays → Real Async Operations
- Remove all `setTimeout` delays used for simulation
- Replace with real Promise-based async operations
- Implement proper event-driven architecture for long-running operations

#### 1.3.3 Mock Data → Real Database Queries
- Replace hardcoded data structures with actual database queries
- Implement proper data layer abstractions for Firestore and Pinecone
- Create migration scripts for initial data population

## 2. Integration with Real Services

### 2.1 Firestore Integration

#### 2.1.1 Fix Firestore Connection
- [ ] Debug and fix the current Firestore connection issue:
  - Service account may not be correctly initialized
  - Project ID may be missing
  - Permissions may be incorrect

```javascript
// Fix in lib/firestore.js
if (!admin.apps.length) {
  try {
    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id // Ensure project ID is included
      });
      console.log(`Firestore initialized with project: ${serviceAccount.project_id}`);
    } else {
      // Provide better error handling for missing credentials
      throw new Error('No service account credentials found');
    }
  } catch (error) {
    console.error('Firestore initialization failed:', error.message);
    // Fallback to a local mock for development if needed
  }
}
```

#### 2.1.2 Database Schema and Collections
- [ ] Define and document the complete Firestore schema:
  - `agentActions` - Track agent activities and attribution
  - `agentAuthorizations` - Security permissions
  - `config` - System configuration including SallyPort settings
  - `resources` - Managed resources
  - `copilotRelationships` - Copilot to principal mappings
  - `principals` - User records

- [ ] Create data validation and sanitization middleware

#### 2.1.3 Transaction & Batch Operations
- [ ] Implement proper transaction handling for multi-document operations
- [ ] Use batch writes for bulk operations

### 2.2 Pinecone Integration (Vector Database)

#### 2.2.1 Pinecone Client Implementation
- [ ] Create a dedicated Pinecone client module:
  ```
  lib/pinecone.js
  ```
- [ ] Implement vector embedding generation and storage
- [ ] Add index management functions
- [ ] Create semantic search utilities

#### 2.2.2 Vector Search Integration
- [ ] Integrate Pinecone searches into Dr. Claude components
- [ ] Add context-aware retrieval for agent instructions
- [ ] Implement proper indexing for different knowledge domains

### 2.3 API Endpoints Integration

#### 2.3.1 Dr. Claude API
- [ ] Fix the endpoint issue with `https://drclaude.live/code-generate`
- [ ] Implement proper API key authentication
- [ ] Add retry logic and circuit breakers

#### 2.3.2 API Client Factory
- [ ] Create a centralized API client factory to ensure consistent configuration:
  ```javascript
  // lib/api-client.js
  const createApiClient = (baseURL, options = {}) => {
    return axios.create({
      baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Aixtiv-Region': process.env.AIXTIV_REGION || 'us-west1-b',
        'Authorization': `Bearer ${getApiKey(options.service)}`
      },
      // Use proper SSL verification in production
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      })
    });
  };
  ```

#### 2.3.3 Service Integration Mapping
| Service | Endpoint Base URL | Client Config |
|---------|------------------|---------------|
| Dr. Claude | https://api.claude.aixtiv.com | Anthropic model settings |
| SallyPort | https://sallyport.aixtiv.com | API key + JWT |
| Domain Mgmt | https://domains.aixtiv.com | API key |
| Wing | https://wing.aixtiv.com | Agent JWT |

## 3. Environment Configuration and Setup

### 3.1 Environment Variables
- [ ] Create a comprehensive `.env.example` file with all required variables
- [ ] Document each environment variable with purpose and format
- [ ] Implement environment variable validation on startup

```
# .env.example
# Core Configuration
NODE_ENV=production
AIXTIV_REGION=us-west1-b
AIXTIV_ZONE=us-west1-b
LOG_LEVEL=info

# Authentication
GOOGLE_APPLICATION_CREDENTIALS=./config/service-account-key.json
JWT_SECRET=your-jwt-secret

# Service Endpoints
CLAUDE_API_ENDPOINT=https://api.claude.aixtiv.com
SALLYPORT_API_ENDPOINT=https://sallyport.aixtiv.com
DOMAIN_API_ENDPOINT=https://domains.aixtiv.com
WING_API_ENDPOINT=https://wing.aixtiv.com

# Database Configuration
FIRESTORE_PROJECT_ID=your-project-id
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west-1
PINECONE_INDEX=aixtiv-semantic-index
```

### 3.2 Configuration Management
- [ ] Implement a layered configuration approach:
  - Environment variables for sensitive values
  - JSON/YAML files for structured configuration
  - Firestore for dynamic configuration

- [ ] Create a configuration service that can read from all sources:
  ```javascript
  // lib/config.js
  const getConfig = async (key, defaultValue = null) => {
    // Check environment variables
    const envValue = process.env[key];
    if (envValue !== undefined) return envValue;
    
    // Check local configuration files
    try {
      const localConfig = require('../config/local.json');
      if (localConfig[key] !== undefined) return localConfig[key];
    } catch (error) {
      // Local config might not exist
    }
    
    // Check Firestore dynamic configuration
    try {
      const configDoc = await firestore.collection('config').doc('system').get();
      if (configDoc.exists && configDoc.data()[key] !== undefined) {
        return configDoc.data()[key];
      }
    } catch (error) {
      logger.warn(`Error retrieving config from Firestore: ${error.message}`);
    }
    
    return defaultValue;
  };
  ```

### 3.3 Credential Management
- [ ] Implement secure credential handling:
  - Use environment variables for API keys
  - Store service account JSON in secured location
  - Add support for Secret Manager integration
  - Implement runtime credential validation

## 4. Testing and Verification

### 4.1 Test Plan by Component

#### 4.1.1 Unit Tests
- [ ] Write unit tests for each component:
  - API clients
  - Database adapters
  - Service integrations
  - Command handlers

#### 4.1.2 Integration Tests
- [ ] Create integration tests that verify:
  - Firestore operations complete successfully
  - Pinecone queries return expected results
  - API endpoints respond correctly

#### 4.1.3 End-to-End Tests
- [ ] Develop E2E test scenarios for common workflows:
  - Authentication and authorization flow
  - Domain management operations
  - Code generation and project delegation
  - Agent orchestration

### 4.2 Mocking for Tests
- [ ] Create test mocks for external services:
  - Implement dedicated test mocks (different from production simulations)
  - Use proper test doubles (stubs, spies, mocks)
  - Set up local emulators (Firebase emulator suite)

### 4.3 Validation Suite
- [ ] Create a comprehensive validation suite:
  ```bash
  # Run full validation
  node scripts/validate.js
  
  # Validate specific components
  node scripts/validate.js --component firestore
  node scripts/validate.js --component api
  node scripts/validate.js --component pinecone
  ```

### 4.4 Monitoring and Logging
- [ ] Implement proper logging with Winston:
  ```javascript
  // lib/logger.js
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ]
  });
  ```

- [ ] Add performance tracking and metrics collection
- [ ] Implement error tracking and reporting

## 5. Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)
- Fix Firestore connection and authentication
- Implement proper configuration management
- Set up logging and monitoring
- Create API client framework

### Phase 2: SallyPort & Security (Weeks 2-3)
- Replace mock security implementations with real auth
- Implement proper JWT validation
- Connect to IAM and permission systems

### Phase 3: Dr. Claude & API Integration (Weeks 3-4)
- Fix the Dr. Claude API endpoint issues
- Implement all agent-related real service calls
- Connect to Pinecone for vector searches

### Phase 4: Domain Management & Deployment (Weeks 4-5)
- Replace domain management mocks with real API calls
- Implement real DNS and certificate verification
- Connect to actual domain registrars and Firebase

### Phase 5: Testing & Finalization (Weeks 5-6)
- Run full test suite across all components
- Fix any integration issues or edge cases
- Complete documentation
- Deploy to production

## 6. File-Specific Implementation Details

### src/cli/next-gen-aixtiv.js
- Replace all setTimeout calls with real async operations
- Remove mock data generation and use real data services
- Create proper API clients for each domain

### src/cli/commands/sallyport/index.js
- Replace all mockVerifyAuthentication, mockGrantAccess, etc. with real implementations
- Implement proper auth using JWT and API calls
- Connect to the real SallyPort security service

### commands/claude/code/generate.js
- Fix the API endpoint configuration
- Add proper error handling and retry logic
- Implement real-time status updates

### lib/firestore.js
- Fix initialization issues
- Add proper error handling
- Implement connection pooling and optimization

### bin/aixtiv.js
- Add environment validation on startup
- Implement better command organization
- Add telemetry and usage reporting

## 7. Conclusion

This implementation plan provides a systematic approach to transitioning the Aixtiv CLI from mock implementations to production-ready code. By following this plan, all simulated components will be replaced with real service calls while maintaining Pinecone as the vector database.

The plan addresses all key components identified in the initial assessment:
- Core authentication and Firestore integration
- API endpoint connections
- Removal of simulated delays
- Integration with real databases
- Comprehensive testing and validation

Once completed, the Aixtiv CLI will be a production-grade tool ready for enterprise deployment.

