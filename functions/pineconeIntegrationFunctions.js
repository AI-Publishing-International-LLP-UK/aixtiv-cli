/**
 * Pinecone Integration Firebase Cloud Functions
 *
 * This module provides Firebase Cloud Functions for Pinecone vector database integration,
 * enabling semantic search across prompts, memories, and agent outputs.
 *
 * @module pineconeIntegrationFunctions
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import Pinecone integration utilities
const {
  initPinecone,
  generateEmbeddings,
  createIndexIfNotExists,
  storeInPinecone,
  searchPinecone,
  deleteFromPinecone,
  storeMemoryInPinecone,
  storePromptInPinecone,
} = require('../src/functions/pineconeIntegration');

/**
 * HTTP function to search for similar memories
 */
exports.searchMemories = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  // Verify authentication
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'Authentication required to search memories'
    );
  }

  try {
    const { queryText, filter = {}, topK = 10 } = data;

    if (!queryText) {
      throw new HttpsError('invalid-argument', 'Query text is required');
    }

    // Add user ID to filter if not specified
    const searchFilter = {
      ...filter,
      userId: filter.userId || auth.uid,
    };

    // Search Pinecone for similar memories
    const results = await searchPinecone('aixtiv-memories', queryText, searchFilter, topK);

    return { results };
  } catch (error) {
    console.error('Error searching memories:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to search for similar prompts
 */
exports.searchPrompts = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  // Verify authentication
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'Authentication required to search prompts'
    );
  }

  try {
    const { queryText, filter = {}, topK = 10 } = data;

    if (!queryText) {
      throw new HttpsError('invalid-argument', 'Query text is required');
    }

    // Add user ID to filter if not specified
    const searchFilter = {
      ...filter,
      userId: filter.userId || auth.uid,
    };

    // Search Pinecone for similar prompts
    const results = await searchPinecone('aixtiv-prompts', queryText, searchFilter, topK);

    return { results };
  } catch (error) {
    console.error('Error searching prompts:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to store a memory in Pinecone
 */
exports.storeMemory = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  // Verify authentication
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'Authentication required to store memories'
    );
  }

  try {
    const { memory } = data;

    if (!memory || !memory.content) {
      throw new HttpsError(
        'invalid-argument',
        'Memory object with content is required'
      );
    }

    // Add user ID to memory if not specified
    memory.userId = memory.userId || auth.uid;

    // Generate a unique ID if not provided
    memory.id = memory.id || uuidv4();

    // Store the memory in Pinecone
    const success = await storeMemoryInPinecone(memory);

    if (!success) {
      throw new HttpsError('internal', 'Failed to store memory in Pinecone');
    }

    return { success: true, memoryId: memory.id };
  } catch (error) {
    console.error('Error storing memory:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to store a prompt in Pinecone
 */
exports.storePrompt = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  // Verify authentication
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'Authentication required to store prompts'
    );
  }

  try {
    const { prompt } = data;

    if (!prompt || !prompt.content) {
      throw new HttpsError(
        'invalid-argument',
        'Prompt object with content is required'
      );
    }

    // Add user ID to prompt if not specified
    prompt.userId = prompt.userId || auth.uid;

    // Generate a unique ID if not provided
    prompt.id = prompt.id || prompt.promptId || uuidv4();

    // Store the prompt in Pinecone
    const success = await storePromptInPinecone(prompt);

    if (!success) {
      throw new HttpsError('internal', 'Failed to store prompt in Pinecone');
    }

    return { success: true, promptId: prompt.id };
  } catch (error) {
    console.error('Error storing prompt:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to delete items from Pinecone
 */
exports.deleteFromPinecone = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  // Verify authentication
  if (!auth || !auth.token.admin) {
    throw new HttpsError(
      'permission-denied',
      'Admin authentication required to delete from Pinecone'
    );
  }

  try {
    const { indexName, ids } = data;

    if (!indexName || !ids || !Array.isArray(ids) || ids.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'Index name and array of IDs are required'
      );
    }

    // Delete the items from Pinecone
    const success = await deleteFromPinecone(indexName, ids);

    if (!success) {
      throw new HttpsError('internal', 'Failed to delete items from Pinecone');
    }

    return { success: true, deletedCount: ids.length };
  } catch (error) {
    console.error('Error deleting from Pinecone:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * Firestore trigger to store chat history in Pinecone
 */
exports.onPineconeChatHistoryCreated = onDocumentCreated({
  document: 'chat_history/{memoryId}',
  region: 'us-west1',
  memory: '256MiB'
}, async (event) => {
  try {
    // In v2, we need to check if data exists first
    if (!event.data) {
      console.log('No data associated with the event');
      return null;
    }

    const memory = event.data.data();
    const memoryId = event.params.memoryId;

    // Skip if memory doesn't have content
    if (!memory.content) {
      console.log(`Memory ${memoryId} has no content, skipping Pinecone storage`);
      return null;
    }

    // Store the memory in Pinecone
    const success = await storeMemoryInPinecone({
      ...memory,
      id: memoryId,
    });

    if (success) {
      console.log(`Memory ${memoryId} stored in Pinecone`);

      // Update the document with Pinecone status
      return event.data.ref.update({
        pineconeStored: true,
        pineconeTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.error(`Failed to store memory ${memoryId} in Pinecone`);
      return null;
    }
  } catch (error) {
    console.error('Error processing chat history for Pinecone:', error);
    return null;
  }
});

/**
 * Firestore trigger to store prompt runs in Pinecone
 */
exports.onPineconePromptRunCreated = onDocumentCreated({
  document: 'prompt_runs/{promptId}',
  region: 'us-west1',
  memory: '256MiB'
}, async (event) => {
  try {
    if (!event.data) {
      console.log('No data associated with the event');
      return null;
    }

    const promptRun = event.data.data();
    const promptId = event.params.promptId;

    // Skip if prompt doesn't have content
    if (!promptRun.prompt || !promptRun.prompt.content) {
      console.log(
        `Prompt run ${promptId} has no content, skipping Pinecone storage`
      );
      return null;
    }

    // Store the prompt in Pinecone
    const success = await storePromptInPinecone({
      id: promptId,
      content: promptRun.prompt.content,
      userId: promptRun.userId,
      agentId: promptRun.agentId,
      type: promptRun.prompt.type || 'default',
      category: promptRun.prompt.category || 'general',
      timestamp: promptRun.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        ...promptRun.options,
        status: promptRun.status,
      },
    });

    if (success) {
      console.log(`Prompt run ${promptId} stored in Pinecone`);

      // Update the document with Pinecone status
      return event.data.ref.update({
        pineconeStored: true,
        pineconeTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.error(`Failed to store prompt run ${promptId} in Pinecone`);
      return null;
    }
  } catch (error) {
    console.error('Error processing prompt run for Pinecone:', error);
    return null;
  }
});

/**
 * Scheduled function to ensure Pinecone indexes exist
 */
exports.ensurePineconeIndexes = onSchedule({
  schedule: 'every 24 hours',
  region: 'us-west1',
  memory: '256MiB'
}, async (context) => {
  try {
    console.log('Ensuring Pinecone indexes exist');

    // Create indexes if they don't exist
    const memoryIndexCreated = await createIndexIfNotExists('aixtiv-memories');
    const promptIndexCreated = await createIndexIfNotExists('aixtiv-prompts');

    console.log(
      `Pinecone indexes status: memories=${memoryIndexCreated}, prompts=${promptIndexCreated}`
    );

    return { success: true };
  } catch (error) {
    console.error('Error ensuring Pinecone indexes:', error);
    return { error: error.message };
  }
});
