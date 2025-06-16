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

const functions = require('firebase-functions');
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
  storePromptInPinecone
} = require('../src/functions/pineconeIntegration');

/**
 * HTTP function to search for similar memories
 */
exports.searchMemories = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to search memories'
    );
  }
  
  try {
    const { queryText, filter = {}, topK = 10 } = data;
    
    if (!queryText) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Query text is required'
      );
    }
    
    // Add user ID to filter if not specified
    const searchFilter = {
      ...filter,
      userId: filter.userId || context.auth.uid
    };
    
    // Search Pinecone for similar memories
    const results = await searchPinecone('aixtiv-memories', queryText, searchFilter, topK);
    
    return { results };
  } catch (error) {
    console.error('Error searching memories:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to search for similar prompts
 */
exports.searchPrompts = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to search prompts'
    );
  }
  
  try {
    const { queryText, filter = {}, topK = 10 } = data;
    
    if (!queryText) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Query text is required'
      );
    }
    
    // Add user ID to filter if not specified
    const searchFilter = {
      ...filter,
      userId: filter.userId || context.auth.uid
    };
    
    // Search Pinecone for similar prompts
    const results = await searchPinecone('aixtiv-prompts', queryText, searchFilter, topK);
    
    return { results };
  } catch (error) {
    console.error('Error searching prompts:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to store a memory in Pinecone
 */
exports.storeMemory = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to store memories'
    );
  }
  
  try {
    const { memory } = data;
    
    if (!memory || !memory.content) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Memory object with content is required'
      );
    }
    
    // Add user ID to memory if not specified
    memory.userId = memory.userId || context.auth.uid;
    
    // Generate a unique ID if not provided
    memory.id = memory.id || uuidv4();
    
    // Store the memory in Pinecone
    const success = await storeMemoryInPinecone(memory);
    
    if (!success) {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to store memory in Pinecone'
      );
    }
    
    return { success: true, memoryId: memory.id };
  } catch (error) {
    console.error('Error storing memory:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to store a prompt in Pinecone
 */
exports.storePrompt = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to store prompts'
    );
  }
  
  try {
    const { prompt } = data;
    
    if (!prompt || !prompt.content) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Prompt object with content is required'
      );
    }
    
    // Add user ID to prompt if not specified
    prompt.userId = prompt.userId || context.auth.uid;
    
    // Generate a unique ID if not provided
    prompt.id = prompt.id || prompt.promptId || uuidv4();
    
    // Store the prompt in Pinecone
    const success = await storePromptInPinecone(prompt);
    
    if (!success) {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to store prompt in Pinecone'
      );
    }
    
    return { success: true, promptId: prompt.id };
  } catch (error) {
    console.error('Error storing prompt:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to delete items from Pinecone
 */
exports.deleteFromPinecone = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth && !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin authentication required to delete from Pinecone'
    );
  }
  
  try {
    const { indexName, ids } = data;
    
    if (!indexName || !ids || !Array.isArray(ids) || ids.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Index name and array of IDs are required'
      );
    }
    
    // Delete the items from Pinecone
    const success = await deleteFromPinecone(indexName, ids);
    
    if (!success) {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to delete items from Pinecone'
      );
    }
    
    return { success: true, deletedCount: ids.length };
  } catch (error) {
    console.error('Error deleting from Pinecone:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * Firestore trigger to store chat history in Pinecone
 */
exports.onChatHistoryCreated = functions.firestore
  .document('chat_history/{memoryId}')
  .onCreate(async (snapshot, context) => {
    try {
      const memory = snapshot.data();
      
      // Skip if memory doesn't have content
      if (!memory.content) {
        console.log(`Memory ${context.params.memoryId} has no content, skipping Pinecone storage`);
        return null;
      }
      
      // Store the memory in Pinecone
      const success = await storeMemoryInPinecone({
        ...memory,
        id: context.params.memoryId
      });
      
      if (success) {
        console.log(`Memory ${context.params.memoryId} stored in Pinecone`);
        
        // Update the document with Pinecone status
        return snapshot.ref.update({
          pineconeStored: true,
          pineconeTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.error(`Failed to store memory ${context.params.memoryId} in Pinecone`);
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
exports.onPromptRunCreated = functions.firestore
  .document('prompt_runs/{promptId}')
  .onCreate(async (snapshot, context) => {
    try {
      const promptRun = snapshot.data();
      
      // Skip if prompt doesn't have content
      if (!promptRun.prompt || !promptRun.prompt.content) {
        console.log(`Prompt run ${context.params.promptId} has no content, skipping Pinecone storage`);
        return null;
      }
      
      // Store the prompt in Pinecone
      const success = await storePromptInPinecone({
        id: context.params.promptId,
        content: promptRun.prompt.content,
        userId: promptRun.userId,
        agentId: promptRun.agentId,
        type: promptRun.prompt.type || 'default',
        category: promptRun.prompt.category || 'general',
        timestamp: promptRun.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          ...promptRun.options,
          status: promptRun.status
        }
      });
      
      if (success) {
        console.log(`Prompt run ${context.params.promptId} stored in Pinecone`);
        
        // Update the document with Pinecone status
        return snapshot.ref.update({
          pineconeStored: true,
          pineconeTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.error(`Failed to store prompt run ${context.params.promptId} in Pinecone`);
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
exports.ensurePineconeIndexes = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      console.log('Ensuring Pinecone indexes exist');
      
      // Create indexes if they don't exist
      const memoryIndexCreated = await createIndexIfNotExists('aixtiv-memories');
      const promptIndexCreated = await createIndexIfNotExists('aixtiv-prompts');
      
      console.log(`Pinecone indexes status: memories=${memoryIndexCreated}, prompts=${promptIndexCreated}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error ensuring Pinecone indexes:', error);
      return { error: error.message };
    }
  });