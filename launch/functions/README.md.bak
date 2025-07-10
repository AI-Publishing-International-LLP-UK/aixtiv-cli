# Aixtiv CLI Owner-Subscriber V1-V2 Immersive System - Firebase Functions

This directory contains the Firebase Cloud Functions for the Aixtiv CLI Owner-Subscriber V1-V2 Immersive System. These functions provide the backend processing capabilities for the system, including Universal Dispatcher, Memory System, and Agent Trigger functionality.

## Function Modules

- **index.js** - Main entry point that exports all functions
- **universalDispatcherFunctions.js** - Functions for handling the Universal Dispatcher functionality
- **memoryFunctions.js** - Functions for memory storage, retrieval, and analysis
- **firebase_agent_trigger.js** - Functions for agent triggering and automated actions
- **dr-claude.js** - Functions for Dr. Claude orchestration

## Function Groups

### Universal Dispatcher Functions

- `handleDispatch` - Processes dispatch requests from clients
- `getDispatchStatus` - Retrieves the status of a dispatch
- `cancelDispatch` - Cancels an in-progress dispatch
- `onPromptRunCreated` - Firestore trigger for new prompt runs
- `onPromptRunUpdated` - Firestore trigger for prompt run updates
- `cleanupStaleDispatches` - Scheduled function to clean up stale dispatches
- `routeToAgent` - Routes requests to specific agents

### Memory System Functions

- `addMemory` - Adds a new memory entry
- `queryMemories` - Queries memory entries with filtering
- `getMemoryStats` - Retrieves memory statistics and analytics
- `clearSessionMemories` - Clears memories for a specific session
- `analyzeMemoryImportance` - Firestore trigger for memory importance analysis
- `archiveOldMemories` - Scheduled function to archive old memories

### Agent Trigger Functions

- `triggerAgent` - Triggers a specific agent with a prompt
- `onChatMessageCreated` - Firestore trigger for new chat messages
- `scheduledAgentActions` - Scheduled function for periodic agent actions
- `processScheduledAgentActions` - Firestore trigger for scheduled agent actions

### HTTP Endpoints

- `drClaude` - Dr. Claude orchestration endpoint
- `contextStorage` - Endpoint for storing and retrieving context data
- `modelMetrics` - Endpoint for retrieving model performance metrics
- `healthCheck` - Health check endpoint for the functions

## Testing

Use the `test-functions.js` script to test the functions locally with the Firebase Emulator:

```bash
# Start the Firebase Emulator
firebase emulators:start

# In another terminal window, run the test script
node test-functions.js
```

## Deployment

Deploy the functions to Firebase:

```bash
firebase deploy --only functions
```

## Dependencies

The functions depend on the following packages:

- firebase-functions
- firebase-admin
- uuid
- axios

## Configuration

Functions can be configured through Firebase Functions Config. Set configuration values with:

```bash
firebase functions:config:set dispatcher.requireAuth=true
```

## Monitoring

Monitor function execution and errors through the Firebase Console or using the Google Cloud Console.
